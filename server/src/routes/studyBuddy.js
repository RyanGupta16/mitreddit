const express = require('express');
const StudyBuddy = require('../models/StudyBuddy');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Debug endpoint to test authentication
router.get('/debug-auth', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Authentication working',
            user: {
                id: req.user.userId,
                // Don't send full user data for security
            }
        });
    } catch (error) {
        console.error('Auth debug error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new study buddy request
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { subject, topic, description, urgency, helpType, preferredTime, meetingType } = req.body;
        
        const studyRequest = new StudyBuddy({
            requester: req.user.userId,
            subject,
            topic,
            description,
            urgency,
            helpType,
            preferredTime,
            meetingType
        });

        await studyRequest.save();
        await studyRequest.populate('requester', 'name branch year');
        
        res.status(201).json(studyRequest);
    } catch (error) {
        console.error('Error creating study buddy request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all open study buddy requests
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { subject, helpType, urgency, page = 1, limit = 10 } = req.query;
        
        const filter = { 
            status: 'open',
            requester: { $ne: req.user.userId } // Don't show user's own requests
        };
        
        if (subject) filter.subject = subject;
        if (helpType) filter.helpType = helpType;
        if (urgency) filter.urgency = urgency;

        const studyRequests = await StudyBuddy.find(filter)
            .populate('requester', 'name branch year')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await StudyBuddy.countDocuments(filter);

        res.json({
            studyRequests,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error fetching study buddy requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's own study buddy requests
router.get('/my-requests', authenticateToken, async (req, res) => {
    try {
        const requests = await StudyBuddy.find({ requester: req.user.userId })
            .populate('helper', 'name branch year')
            .populate('responses.helper', 'name branch year')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error('Error fetching user requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get requests user is helping with
router.get('/helping', authenticateToken, async (req, res) => {
    try {
        const requests = await StudyBuddy.find({ helper: req.user.userId })
            .populate('requester', 'name branch year')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error('Error fetching helping requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Respond to a study buddy request
router.post('/:id/respond', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;
        const studyRequest = await StudyBuddy.findById(req.params.id);

        if (!studyRequest) {
            return res.status(404).json({ message: 'Study request not found' });
        }

        if (studyRequest.requester.toString() === req.user.userId) {
            return res.status(400).json({ message: 'Cannot respond to your own request' });
        }

        if (studyRequest.status !== 'open') {
            return res.status(400).json({ message: 'This request is no longer open' });
        }

        // Check if user already responded
        const existingResponse = studyRequest.responses.find(
            response => response.helper.toString() === req.user.userId
        );

        if (existingResponse) {
            return res.status(400).json({ message: 'You have already responded to this request' });
        }

        studyRequest.responses.push({
            helper: req.user.userId,
            message
        });

        await studyRequest.save();
        await studyRequest.populate('responses.helper', 'name branch year');
        
        res.json(studyRequest);
    } catch (error) {
        console.error('Error responding to study request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Accept a helper for the request
router.post('/:id/accept/:helperId', authenticateToken, async (req, res) => {
    try {
        const studyRequest = await StudyBuddy.findById(req.params.id);

        if (!studyRequest) {
            return res.status(404).json({ message: 'Study request not found' });
        }

        if (studyRequest.requester.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Only the requester can accept helpers' });
        }

        if (studyRequest.status !== 'open') {
            return res.status(400).json({ message: 'This request is no longer open' });
        }

        studyRequest.helper = req.params.helperId;
        studyRequest.status = 'matched';
        await studyRequest.save();

        await studyRequest.populate(['requester', 'helper'], 'name branch year');
        
        res.json(studyRequest);
    } catch (error) {
        console.error('Error accepting helper:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark request as completed
router.post('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const { rating, feedback } = req.body;
        const studyRequest = await StudyBuddy.findById(req.params.id);

        if (!studyRequest) {
            return res.status(404).json({ message: 'Study request not found' });
        }

        if (studyRequest.requester.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Only the requester can mark as completed' });
        }

        studyRequest.status = 'completed';
        studyRequest.completedAt = new Date();
        if (rating) studyRequest.rating = rating;
        if (feedback) studyRequest.feedback = feedback;

        await studyRequest.save();
        
        res.json(studyRequest);
    } catch (error) {
        console.error('Error completing request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a study buddy request
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const studyRequest = await StudyBuddy.findById(req.params.id);

        if (!studyRequest) {
            return res.status(404).json({ message: 'Study request not found' });
        }

        if (studyRequest.requester.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Only the requester can delete this request' });
        }

        await StudyBuddy.findByIdAndDelete(req.params.id);
        res.json({ message: 'Study request deleted successfully' });
    } catch (error) {
        console.error('Error deleting study request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
