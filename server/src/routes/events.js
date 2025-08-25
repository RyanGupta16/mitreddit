const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const { authenticateToken, optionalAuth, requireOwnershipOrAdmin, userRateLimit } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/events
// @desc    Get events with filtering and pagination
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            category,
            area,
            startDate,
            endDate,
            search,
            sort = 'upcoming',
            isOnline,
            isFree
        } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // Build query
        let query = { 
            isDeleted: false,
            status: 'published'
        };
        
        if (category) {
            query.category = category;
        }
        
        if (area) {
            query['location.venue'] = new RegExp(area, 'i');
        }
        
        if (isOnline === 'true') {
            query['location.isOnline'] = true;
        } else if (isOnline === 'false') {
            query['location.isOnline'] = false;
        }
        
        if (isFree === 'true') {
            query['fee.amount'] = 0;
        } else if (isFree === 'false') {
            query['fee.amount'] = { $gt: 0 };
        }
        
        // Date filtering
        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.startDate.$lte = new Date(endDate);
        }
        
        if (search) {
            query.$text = { $search: search };
        }
        
        // Sorting
        let sortQuery = {};
        switch (sort) {
            case 'upcoming':
                query.startDate = { ...query.startDate, $gte: new Date() };
                sortQuery = { startDate: 1 };
                break;
            case 'popular':
                sortQuery = { attendeeCount: -1, startDate: 1 };
                break;
            case 'newest':
                sortQuery = { createdAt: -1 };
                break;
            case 'rating':
                sortQuery = { averageRating: -1, startDate: 1 };
                break;
            default:
                sortQuery = { startDate: 1 };
        }
        
        const events = await Event.find(query)
            .populate('organizer', 'name username avatar')
            .sort(sortQuery)
            .skip(skip)
            .limit(limitNum);
        
        // Add user registration status if authenticated
        const eventsWithStatus = events.map(event => {
            const eventObj = event.toObject();
            if (req.user) {
                eventObj.userStatus = event.getUserStatus(req.user._id);
                eventObj.isOrganizer = event.organizer._id.toString() === req.user._id.toString();
            }
            return eventObj;
        });
        
        const total = await Event.countDocuments(query);
        
        res.json({
            success: true,
            data: {
                events: eventsWithStatus,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                    hasNext: pageNum * limitNum < total,
                    hasPrev: pageNum > 1
                }
            }
        });
        
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching events'
        });
    }
});

// @route   GET /api/events/trending
// @desc    Get trending events
// @access  Public
router.get('/trending', async (req, res) => {
    try {
        const { limit = 10, timeframe = 7 } = req.query;
        
        const events = await Event.getTrending({
            limit: parseInt(limit),
            timeframe: parseInt(timeframe)
        });
        
        res.json({
            success: true,
            data: events
        });
        
    } catch (error) {
        console.error('Get trending events error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trending events'
        });
    }
});

// @route   GET /api/events/upcoming
// @desc    Get upcoming events
// @access  Public
router.get('/upcoming', async (req, res) => {
    try {
        const { limit = 20, category, location } = req.query;
        
        const events = await Event.getUpcoming({
            limit: parseInt(limit),
            category,
            location
        });
        
        res.json({
            success: true,
            data: events
        });
        
    } catch (error) {
        console.error('Get upcoming events error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching upcoming events'
        });
    }
});

// @route   GET /api/events/:id
// @desc    Get single event by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'name username avatar branch year')
            .populate('attendees.user', 'name username avatar');
        
        if (!event || event.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        // Increment view count (but not for the organizer)
        if (!req.user || req.user._id.toString() !== event.organizer._id.toString()) {
            await event.incrementViews();
        }
        
        let eventData = event.toObject();
        if (req.user) {
            eventData.userStatus = event.getUserStatus(req.user._id);
            eventData.isOrganizer = req.user._id.toString() === event.organizer._id.toString();
        }
        
        res.json({
            success: true,
            data: eventData
        });
        
    } catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching event'
        });
    }
});

// @route   POST /api/events
// @desc    Create a new event
// @access  Private
router.post('/', authenticateToken, userRateLimit(5, 60 * 60 * 1000), async (req, res) => {
    try {
        const eventData = {
            ...req.body,
            organizer: req.user._id,
            metadata: {
                createdBy: req.user._id
            }
        };
        
        const event = new Event(eventData);
        await event.save();
        
        await event.populate('organizer', 'name username avatar');
        
        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: event
        });
        
    } catch (error) {
        console.error('Create event error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: errors[0]
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating event'
        });
    }
});

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private (Organizer only)
router.put('/:id', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event || event.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        // Update event
        Object.assign(event, req.body);
        event.metadata.lastUpdatedBy = req.user._id;
        
        await event.save();
        await event.populate('organizer', 'name username avatar');
        
        res.json({
            success: true,
            message: 'Event updated successfully',
            data: event
        });
        
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating event'
        });
    }
});

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private (Organizer only)
router.delete('/:id', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event || event.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        await event.softDelete(req.user._id);
        
        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting event'
        });
    }
});

// @route   POST /api/events/:id/register
// @desc    Register for an event
// @access  Private
router.post('/:id/register', authenticateToken, userRateLimit(10, 60 * 1000), async (req, res) => {
    try {
        const { status = 'going' } = req.body;
        
        if (!['going', 'interested', 'not_going'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid registration status'
            });
        }
        
        const event = await Event.findById(req.params.id);
        
        if (!event || event.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        if (event.status !== 'published') {
            return res.status(400).json({
                success: false,
                message: 'Event is not available for registration'
            });
        }
        
        if (!event.isRegistrationOpen) {
            return res.status(400).json({
                success: false,
                message: 'Registration is closed for this event'
            });
        }
        
        await event.registerUser(req.user._id, status);
        
        res.json({
            success: true,
            message: `Registration updated to: ${status}`,
            data: {
                status,
                attendeeCount: event.attendeeCount,
                interestedCount: event.interestedCount
            }
        });
        
    } catch (error) {
        console.error('Register for event error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering for event'
        });
    }
});

// @route   DELETE /api/events/:id/register
// @desc    Unregister from an event
// @access  Private
router.delete('/:id/register', authenticateToken, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event || event.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        await event.unregisterUser(req.user._id);
        
        res.json({
            success: true,
            message: 'Successfully unregistered from event',
            data: {
                attendeeCount: event.attendeeCount,
                interestedCount: event.interestedCount
            }
        });
        
    } catch (error) {
        console.error('Unregister from event error:', error);
        res.status(500).json({
            success: false,
            message: 'Error unregistering from event'
        });
    }
});

// @route   POST /api/events/:id/rate
// @desc    Rate an event
// @access  Private
router.post('/:id/rate', authenticateToken, userRateLimit(5, 24 * 60 * 60 * 1000), async (req, res) => {
    try {
        const { rating, review } = req.body;
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }
        
        const event = await Event.findById(req.params.id);
        
        if (!event || event.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        // Check if event has ended
        if (!event.isPast) {
            return res.status(400).json({
                success: false,
                message: 'You can only rate events after they have ended'
            });
        }
        
        await event.addRating(req.user._id, rating, review);
        
        res.json({
            success: true,
            message: 'Rating submitted successfully',
            data: {
                averageRating: event.averageRating,
                totalRatings: event.ratings.length
            }
        });
        
    } catch (error) {
        console.error('Rate event error:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting rating'
        });
    }
});

// @route   POST /api/events/:id/share
// @desc    Increment share count
// @access  Public
router.post('/:id/share', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event || event.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        await event.incrementShares();
        
        res.json({
            success: true,
            message: 'Share count updated',
            data: { sharesCount: event.sharesCount }
        });
        
    } catch (error) {
        console.error('Share event error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating share count'
        });
    }
});

// @route   POST /api/events/:id/updates
// @desc    Add update to an event
// @access  Private (Organizer only)
router.post('/:id/updates', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required for updates'
            });
        }
        
        const event = await Event.findById(req.params.id);
        
        if (!event || event.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        await event.addUpdate(title, content, req.user._id);
        
        res.json({
            success: true,
            message: 'Update added successfully',
            data: {
                updatesCount: event.updates.length
            }
        });
        
    } catch (error) {
        console.error('Add event update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding event update'
        });
    }
});

module.exports = router;
