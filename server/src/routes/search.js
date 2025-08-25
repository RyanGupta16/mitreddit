const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const Event = require('../models/Event');
const News = require('../models/News');
const Restaurant = require('../models/Restaurant');
const Comment = require('../models/Comment');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/search
// @desc    Global search across all content types
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { 
            q: query, 
            type = 'all',
            limit = 10,
            page = 1
        } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }
        
        const searchQuery = query.trim();
        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        const skip = (pageNum - 1) * limitNum;
        
        let results = {};
        
        if (type === 'all' || type === 'posts') {
            try {
                const posts = await Post.find({
                    $text: { $search: searchQuery },
                    isDeleted: false
                })
                .populate('author', 'name username avatar')
                .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
                .limit(type === 'posts' ? limitNum : 5);
                
                results.posts = posts.map(post => {
                    const postObj = post.toObject();
                    if (req.user) {
                        postObj.userVote = post.getUserVote(req.user._id);
                    }
                    return postObj;
                });
            } catch (error) {
                console.error('Search posts error:', error);
                results.posts = [];
            }
        }
        
        if (type === 'all' || type === 'users') {
            try {
                const users = await User.find({
                    $or: [
                        { name: { $regex: searchQuery, $options: 'i' } },
                        { username: { $regex: searchQuery, $options: 'i' } }
                    ],
                    isDeleted: false
                })
                .select('name username avatar branch year stats.karmaScore')
                .sort({ 'stats.karmaScore': -1 })
                .limit(type === 'users' ? limitNum : 5);
                
                results.users = users;
            } catch (error) {
                console.error('Search users error:', error);
                results.users = [];
            }
        }
        
        if (type === 'all' || type === 'events') {
            try {
                const events = await Event.find({
                    $text: { $search: searchQuery },
                    isDeleted: false,
                    status: 'published'
                })
                .populate('organizer', 'name username avatar')
                .sort({ score: { $meta: 'textScore' }, startDate: 1 })
                .limit(type === 'events' ? limitNum : 3);
                
                results.events = events.map(event => {
                    const eventObj = event.toObject();
                    if (req.user) {
                        eventObj.userStatus = event.getUserStatus(req.user._id);
                    }
                    return eventObj;
                });
            } catch (error) {
                console.error('Search events error:', error);
                results.events = [];
            }
        }
        
        if (type === 'all' || type === 'news') {
            try {
                let newsQuery = {
                    $text: { $search: searchQuery },
                    isDeleted: false,
                    status: 'published'
                };
                
                // Apply visibility filters
                if (!req.user) {
                    newsQuery.visibility = 'public';
                } else if (req.user.role === 'student') {
                    newsQuery.visibility = { $in: ['public', 'students_only'] };
                } else if (req.user.role === 'faculty') {
                    newsQuery.visibility = { $in: ['public', 'students_only', 'faculty_only'] };
                }
                
                const news = await News.find(newsQuery)
                    .populate('author', 'name username avatar')
                    .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
                    .limit(type === 'news' ? limitNum : 3);
                
                results.news = news.map(article => {
                    const articleObj = article.toObject();
                    if (req.user) {
                        articleObj.userReaction = article.getUserReaction(req.user._id);
                    }
                    return articleObj;
                });
            } catch (error) {
                console.error('Search news error:', error);
                results.news = [];
            }
        }
        
        if (type === 'all' || type === 'restaurants') {
            try {
                const restaurants = await Restaurant.find({
                    $text: { $search: searchQuery },
                    isDeleted: false,
                    status: 'active'
                })
                .populate('owner', 'name username')
                .sort({ score: { $meta: 'textScore' }, 'averageRating.overall': -1 })
                .limit(type === 'restaurants' ? limitNum : 3);
                
                results.restaurants = restaurants.map(restaurant => {
                    const restaurantObj = restaurant.toObject();
                    if (req.user) {
                        restaurantObj.isFavorite = restaurant.isFavoritedBy(req.user._id);
                    }
                    return restaurantObj;
                });
            } catch (error) {
                console.error('Search restaurants error:', error);
                results.restaurants = [];
            }
        }
        
        if (type === 'all' || type === 'comments') {
            try {
                const comments = await Comment.find({
                    $text: { $search: searchQuery },
                    isDeleted: false
                })
                .populate('author', 'name username avatar')
                .populate('post', 'title')
                .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
                .limit(type === 'comments' ? limitNum : 3);
                
                results.comments = comments.map(comment => {
                    const commentObj = comment.toObject();
                    if (req.user) {
                        commentObj.userVote = comment.getUserVote(req.user._id);
                    }
                    return commentObj;
                });
            } catch (error) {
                console.error('Search comments error:', error);
                results.comments = [];
            }
        }
        
        // Calculate total results
        const totalResults = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        
        res.json({
            success: true,
            data: {
                query: searchQuery,
                type,
                results,
                totalResults,
                pagination: type !== 'all' ? {
                    page: pageNum,
                    limit: limitNum,
                    hasMore: (results[type]?.length || 0) === limitNum
                } : null
            }
        });
        
    } catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing search'
        });
    }
});

// @route   GET /api/search/suggestions
// @desc    Get search suggestions/autocomplete
// @access  Public
router.get('/suggestions', async (req, res) => {
    try {
        const { q: query, limit = 10 } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.json({
                success: true,
                data: { suggestions: [] }
            });
        }
        
        const searchRegex = new RegExp(query.trim(), 'i');
        const limitNum = Math.min(parseInt(limit), 20); // Max 20 suggestions
        
        const suggestions = [];
        
        // User suggestions
        try {
            const users = await User.find({
                $or: [
                    { username: { $regex: searchRegex } },
                    { name: { $regex: searchRegex } }
                ],
                isDeleted: false
            })
            .select('name username avatar')
            .limit(Math.ceil(limitNum / 4));
            
            users.forEach(user => {
                suggestions.push({
                    type: 'user',
                    id: user._id,
                    title: user.name,
                    subtitle: `@${user.username}`,
                    avatar: user.avatar,
                    url: `/user/${user.username}`
                });
            });
        } catch (error) {
            console.error('User suggestions error:', error);
        }
        
        // Post title suggestions
        try {
            const posts = await Post.find({
                title: { $regex: searchRegex },
                isDeleted: false
            })
            .select('title category createdAt')
            .sort({ createdAt: -1 })
            .limit(Math.ceil(limitNum / 4));
            
            posts.forEach(post => {
                suggestions.push({
                    type: 'post',
                    id: post._id,
                    title: post.title,
                    subtitle: `in ${post.category}`,
                    url: `/post/${post._id}`
                });
            });
        } catch (error) {
            console.error('Post suggestions error:', error);
        }
        
        // Event suggestions
        try {
            const events = await Event.find({
                title: { $regex: searchRegex },
                isDeleted: false,
                status: 'published',
                startDate: { $gte: new Date() }
            })
            .select('title location.venue startDate')
            .sort({ startDate: 1 })
            .limit(Math.ceil(limitNum / 4));
            
            events.forEach(event => {
                suggestions.push({
                    type: 'event',
                    id: event._id,
                    title: event.title,
                    subtitle: `at ${event.location.venue}`,
                    url: `/event/${event._id}`
                });
            });
        } catch (error) {
            console.error('Event suggestions error:', error);
        }
        
        // Restaurant suggestions
        try {
            const restaurants = await Restaurant.find({
                name: { $regex: searchRegex },
                isDeleted: false,
                status: 'active'
            })
            .select('name location.area averageRating.overall')
            .sort({ 'averageRating.overall': -1 })
            .limit(Math.ceil(limitNum / 4));
            
            restaurants.forEach(restaurant => {
                suggestions.push({
                    type: 'restaurant',
                    id: restaurant._id,
                    title: restaurant.name,
                    subtitle: `in ${restaurant.location.area}`,
                    rating: restaurant.averageRating.overall,
                    url: `/restaurant/${restaurant._id}`
                });
            });
        } catch (error) {
            console.error('Restaurant suggestions error:', error);
        }
        
        // Sort suggestions by relevance and limit
        const sortedSuggestions = suggestions
            .sort((a, b) => {
                // Prioritize exact matches
                const aExact = a.title.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
                const bExact = b.title.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
                
                if (aExact !== bExact) return bExact - aExact;
                
                // Then by type priority (users, events, restaurants, posts)
                const typePriority = { user: 4, event: 3, restaurant: 2, post: 1 };
                return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
            })
            .slice(0, limitNum);
        
        res.json({
            success: true,
            data: {
                query: query.trim(),
                suggestions: sortedSuggestions
            }
        });
        
    } catch (error) {
        console.error('Search suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching search suggestions'
        });
    }
});

// @route   GET /api/search/trending
// @desc    Get trending search terms
// @access  Public
router.get('/trending', async (req, res) => {
    try {
        // For now, return some hardcoded trending searches
        // In a real app, you'd track search queries and their frequency
        const trendingSearches = [
            { term: 'campus events', count: 150, type: 'general' },
            { term: 'manipal fest', count: 120, type: 'event' },
            { term: 'placement news', count: 100, type: 'news' },
            { term: 'food near hostel', count: 85, type: 'restaurant' },
            { term: 'study groups', count: 70, type: 'general' },
            { term: 'internship opportunities', count: 65, type: 'news' },
            { term: 'hostel mess', count: 60, type: 'restaurant' },
            { term: 'cultural activities', count: 55, type: 'event' },
            { term: 'exam schedules', count: 50, type: 'news' },
            { term: 'sports tournament', count: 45, type: 'event' }
        ];
        
        res.json({
            success: true,
            data: { trending: trendingSearches }
        });
        
    } catch (error) {
        console.error('Get trending searches error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trending searches'
        });
    }
});

// @route   GET /api/search/categories
// @desc    Get available search categories
// @access  Public
router.get('/categories', async (req, res) => {
    try {
        const categories = {
            posts: [
                'general', 'academic', 'events', 'sports', 'cultural', 'placements',
                'internships', 'clubs', 'hostels', 'food', 'transport', 'help',
                'buy_sell', 'lost_found', 'roommates', 'announcements'
            ],
            events: [
                'academic', 'cultural', 'sports', 'technical', 'workshop',
                'seminar', 'competition', 'social', 'club_activity', 'fest',
                'placement', 'other'
            ],
            news: [
                'academic', 'campus', 'placements', 'events', 'sports',
                'cultural', 'achievements', 'announcements', 'admissions',
                'research', 'faculty', 'international', 'technology', 'general'
            ],
            restaurants: [
                'restaurant', 'cafe', 'food_truck', 'cloud_kitchen', 'bakery',
                'sweet_shop', 'juice_center', 'ice_cream_parlor', 'dhaba',
                'mess', 'catering', 'tiffin_service'
            ],
            areas: [
                'Manipal', 'Udupi', 'Kaup', 'Karkala', 'Kundapura',
                'Brahmavar', 'Hebri', 'other'
            ],
            cuisine: [
                'South Indian', 'North Indian', 'Chinese', 'Continental',
                'Italian', 'Mexican', 'Thai', 'Japanese', 'Korean',
                'Fast Food', 'Street Food', 'Beverages', 'Desserts',
                'Bakery', 'Snacks', 'Seafood', 'Vegetarian', 'Vegan',
                'Jain', 'Coastal', 'other'
            ]
        };
        
        res.json({
            success: true,
            data: categories
        });
        
    } catch (error) {
        console.error('Get search categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching search categories'
        });
    }
});

module.exports = router;
