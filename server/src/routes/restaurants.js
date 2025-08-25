const express = require('express');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { authenticateToken, optionalAuth, requireOwnershipOrAdmin, userRateLimit } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/restaurants
// @desc    Get restaurants with filtering and pagination
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            search,
            area,
            category,
            cuisine,
            priceRange,
            minRating,
            isOpen,
            services,
            sortBy = 'rating'
        } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // Parse services if provided
        let parsedServices = {};
        if (services) {
            try {
                parsedServices = JSON.parse(services);
            } catch (e) {
                // Ignore parsing error
            }
        }
        
        const restaurants = await Restaurant.searchRestaurants({
            query: search,
            area,
            category,
            cuisine: cuisine ? cuisine.split(',') : undefined,
            priceRange,
            minRating: minRating ? parseFloat(minRating) : undefined,
            services: parsedServices,
            sortBy,
            limit: limitNum,
            skip
        });
        
        // Add user favorite status if authenticated
        const restaurantsWithStatus = restaurants.map(restaurant => {
            const restaurantObj = restaurant.toObject();
            if (req.user) {
                restaurantObj.isFavorite = restaurant.isFavoritedBy(req.user._id);
                restaurantObj.isOwner = restaurant.owner && restaurant.owner._id.toString() === req.user._id.toString();
            }
            return restaurantObj;
        });
        
        // Build query for total count
        let countQuery = { isDeleted: false, status: 'active' };
        if (search) countQuery.$text = { $search: search };
        if (area) countQuery['location.area'] = area;
        if (category) countQuery.category = category;
        if (cuisine) countQuery.cuisine = { $in: cuisine.split(',') };
        if (priceRange) countQuery.priceRange = priceRange;
        if (minRating) countQuery['averageRating.overall'] = { $gte: parseFloat(minRating) };
        
        const total = await Restaurant.countDocuments(countQuery);
        
        res.json({
            success: true,
            data: {
                restaurants: restaurantsWithStatus,
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
        console.error('Get restaurants error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching restaurants'
        });
    }
});

// @route   GET /api/restaurants/nearby
// @desc    Get restaurants near a location
// @access  Public
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, maxDistance = 10000 } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }
        
        const restaurants = await Restaurant.getNearby({
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
        }, parseInt(maxDistance));
        
        res.json({
            success: true,
            data: restaurants
        });
        
    } catch (error) {
        console.error('Get nearby restaurants error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching nearby restaurants'
        });
    }
});

// @route   GET /api/restaurants/popular
// @desc    Get popular restaurants
// @access  Public
router.get('/popular', async (req, res) => {
    try {
        const { limit = 20, area } = req.query;
        
        let query = { 
            isDeleted: false, 
            status: 'active',
            'averageRating.overall': { $gte: 4.0 }
        };
        
        if (area) {
            query['location.area'] = area;
        }
        
        const restaurants = await Restaurant.find(query)
            .populate('owner', 'name username')
            .sort({ 
                favoriteCount: -1,
                'averageRating.overall': -1,
                viewsCount: -1
            })
            .limit(parseInt(limit));
        
        res.json({
            success: true,
            data: restaurants
        });
        
    } catch (error) {
        console.error('Get popular restaurants error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching popular restaurants'
        });
    }
});

// @route   GET /api/restaurants/:id
// @desc    Get single restaurant by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id)
            .populate('owner', 'name username avatar')
            .populate('reviews.user', 'name username avatar');
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        // Increment view count (but not for the owner)
        if (!req.user || !restaurant.owner || req.user._id.toString() !== restaurant.owner._id.toString()) {
            await restaurant.incrementViews();
        }
        
        let restaurantData = restaurant.toObject();
        if (req.user) {
            restaurantData.isFavorite = restaurant.isFavoritedBy(req.user._id);
            restaurantData.isOwner = restaurant.owner && req.user._id.toString() === restaurant.owner._id.toString();
            
            // Check if user has reviewed
            restaurantData.userReview = restaurant.reviews.find(
                review => review.user._id.toString() === req.user._id.toString()
            );
        }
        
        // Get active offers
        restaurantData.activeOffers = restaurant.getActiveOffers();
        
        res.json({
            success: true,
            data: restaurantData
        });
        
    } catch (error) {
        console.error('Get restaurant error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching restaurant'
        });
    }
});

// @route   POST /api/restaurants
// @desc    Create a new restaurant
// @access  Private
router.post('/', authenticateToken, userRateLimit(3, 24 * 60 * 60 * 1000), async (req, res) => {
    try {
        const restaurantData = {
            ...req.body,
            owner: req.user._id
        };
        
        const restaurant = new Restaurant(restaurantData);
        await restaurant.save();
        
        await restaurant.populate('owner', 'name username avatar');
        
        res.status(201).json({
            success: true,
            message: 'Restaurant created successfully',
            data: restaurant
        });
        
    } catch (error) {
        console.error('Create restaurant error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: errors[0]
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating restaurant'
        });
    }
});

// @route   PUT /api/restaurants/:id
// @desc    Update a restaurant
// @access  Private (Owner or Admin)
router.put('/:id', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        // Update restaurant
        Object.assign(restaurant, req.body);
        await restaurant.save();
        
        await restaurant.populate('owner', 'name username avatar');
        
        res.json({
            success: true,
            message: 'Restaurant updated successfully',
            data: restaurant
        });
        
    } catch (error) {
        console.error('Update restaurant error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating restaurant'
        });
    }
});

// @route   DELETE /api/restaurants/:id
// @desc    Delete a restaurant
// @access  Private (Owner or Admin)
router.delete('/:id', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        await restaurant.softDelete(req.user._id);
        
        res.json({
            success: true,
            message: 'Restaurant deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete restaurant error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting restaurant'
        });
    }
});

// @route   POST /api/restaurants/:id/review
// @desc    Add/update review for a restaurant
// @access  Private
router.post('/:id/review', authenticateToken, userRateLimit(5, 24 * 60 * 60 * 1000), async (req, res) => {
    try {
        const { rating, comment, foodRating, serviceRating, ambienceRating, valueForMoneyRating, orderType } = req.body;
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }
        
        const restaurant = await Restaurant.findById(req.params.id);
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        // Prevent reviewing own restaurant
        if (restaurant.owner && restaurant.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot review your own restaurant'
            });
        }
        
        const reviewData = {
            rating,
            comment: comment || '',
            foodRating: foodRating || rating,
            serviceRating: serviceRating || rating,
            ambienceRating: ambienceRating || rating,
            valueForMoneyRating: valueForMoneyRating || rating,
            orderType,
            visitDate: new Date()
        };
        
        await restaurant.addReview(req.user._id, reviewData);
        
        res.json({
            success: true,
            message: 'Review added successfully',
            data: {
                averageRating: restaurant.averageRating,
                totalReviews: restaurant.totalReviews
            }
        });
        
    } catch (error) {
        console.error('Add restaurant review error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding review'
        });
    }
});

// @route   POST /api/restaurants/:id/favorite
// @desc    Add/remove restaurant from favorites
// @access  Private
router.post('/:id/favorite', authenticateToken, async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        const isFavorite = restaurant.isFavoritedBy(req.user._id);
        
        if (isFavorite) {
            await restaurant.removeFromFavorites(req.user._id);
            res.json({
                success: true,
                message: 'Restaurant removed from favorites',
                data: { 
                    isFavorite: false,
                    favoriteCount: restaurant.favoriteCount
                }
            });
        } else {
            await restaurant.addToFavorites(req.user._id);
            res.json({
                success: true,
                message: 'Restaurant added to favorites',
                data: { 
                    isFavorite: true,
                    favoriteCount: restaurant.favoriteCount
                }
            });
        }
        
    } catch (error) {
        console.error('Toggle restaurant favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating favorites'
        });
    }
});

// @route   POST /api/restaurants/:id/contact
// @desc    Track contact attempt (increment contact count)
// @access  Public
router.post('/:id/contact', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        await restaurant.incrementContacts();
        
        res.json({
            success: true,
            message: 'Contact tracked',
            data: { contactsCount: restaurant.contactsCount }
        });
        
    } catch (error) {
        console.error('Track restaurant contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Error tracking contact'
        });
    }
});

// @route   GET /api/restaurants/:id/menu
// @desc    Get restaurant menu
// @access  Public
router.get('/:id/menu', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id).select('name menu');
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                restaurantName: restaurant.name,
                menu: restaurant.menu
            }
        });
        
    } catch (error) {
        console.error('Get restaurant menu error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching menu'
        });
    }
});

// @route   PUT /api/restaurants/:id/menu
// @desc    Update restaurant menu
// @access  Private (Owner only)
router.put('/:id/menu', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const { menu } = req.body;
        
        if (!Array.isArray(menu)) {
            return res.status(400).json({
                success: false,
                message: 'Menu must be an array'
            });
        }
        
        const restaurant = await Restaurant.findById(req.params.id);
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        restaurant.menu = menu;
        await restaurant.save();
        
        res.json({
            success: true,
            message: 'Menu updated successfully',
            data: restaurant.menu
        });
        
    } catch (error) {
        console.error('Update restaurant menu error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating menu'
        });
    }
});

// @route   POST /api/restaurants/:id/offers
// @desc    Add offer to restaurant
// @access  Private (Owner only)
router.post('/:id/offers', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        await restaurant.addOffer(req.body);
        
        res.json({
            success: true,
            message: 'Offer added successfully',
            data: restaurant.offers[restaurant.offers.length - 1]
        });
        
    } catch (error) {
        console.error('Add restaurant offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding offer'
        });
    }
});

// @route   GET /api/restaurants/:id/offers
// @desc    Get active offers for restaurant
// @access  Public
router.get('/:id/offers', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        const activeOffers = restaurant.getActiveOffers();
        
        res.json({
            success: true,
            data: activeOffers
        });
        
    } catch (error) {
        console.error('Get restaurant offers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching offers'
        });
    }
});

// @route   POST /api/restaurants/:id/report
// @desc    Report a restaurant
// @access  Private
router.post('/:id/report', authenticateToken, userRateLimit(3, 24 * 60 * 60 * 1000), async (req, res) => {
    try {
        const { reason, description } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Report reason is required'
            });
        }
        
        const restaurant = await Restaurant.findById(req.params.id);
        
        if (!restaurant || restaurant.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        // Check if user already reported
        const existingReport = restaurant.reports.find(
            report => report.reportedBy.toString() === req.user._id.toString()
        );
        
        if (existingReport) {
            return res.status(400).json({
                success: false,
                message: 'You have already reported this restaurant'
            });
        }
        
        restaurant.reports.push({
            reportedBy: req.user._id,
            reason,
            description: description || '',
            reportedAt: new Date()
        });
        
        await restaurant.save();
        
        res.json({
            success: true,
            message: 'Restaurant reported successfully. Our team will review it.'
        });
        
    } catch (error) {
        console.error('Report restaurant error:', error);
        res.status(500).json({
            success: false,
            message: 'Error reporting restaurant'
        });
    }
});

module.exports = router;
