const express = require('express');
const News = require('../models/News');
const User = require('../models/User');
const { authenticateToken, optionalAuth, requireModerator, userRateLimit } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/news
// @desc    Get news articles with filtering and pagination
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            author,
            search,
            sort = 'latest',
            timeframe = 'all'
        } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // Build query
        let query = { 
            isDeleted: false,
            status: 'published'
        };
        
        // Check visibility based on user role
        if (!req.user) {
            query.visibility = 'public';
        } else if (req.user.role === 'student') {
            query.visibility = { $in: ['public', 'students_only'] };
        } else if (req.user.role === 'faculty') {
            query.visibility = { $in: ['public', 'students_only', 'faculty_only'] };
        }
        // Admin can see all
        
        if (category) {
            query.category = category;
        }
        
        if (author) {
            const authorUser = await User.findOne({ username: author });
            if (authorUser) {
                query.author = authorUser._id;
            }
        }
        
        if (search) {
            query.$text = { $search: search };
        }
        
        // Time-based filtering
        if (timeframe !== 'all') {
            let hours = 24;
            switch (timeframe) {
                case '1h': hours = 1; break;
                case '6h': hours = 6; break;
                case '24h': hours = 24; break;
                case '7d': hours = 168; break;
                case '30d': hours = 720; break;
            }
            
            query.publishedAt = { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) };
        }
        
        let news;
        
        // Different sorting algorithms
        switch (sort) {
            case 'trending':
                news = await News.getTrending({ 
                    limit: limitNum, 
                    category,
                    timeframe: timeframe === '1h' ? 1 : timeframe === '6h' ? 6 : 24
                });
                break;
                
            case 'popular':
                news = await News.find(query)
                    .populate('author', 'name username avatar')
                    .sort({ viewsCount: -1, publishedAt: -1 })
                    .skip(skip)
                    .limit(limitNum);
                break;
                
            case 'reactions':
                news = await News.aggregate([
                    { $match: query },
                    {
                        $addFields: {
                            totalReactions: {
                                $add: [
                                    { $size: '$reactions.like' },
                                    { $size: '$reactions.helpful' },
                                    { $size: '$reactions.sad' },
                                    { $size: '$reactions.angry' }
                                ]
                            }
                        }
                    },
                    { $sort: { totalReactions: -1, publishedAt: -1 } },
                    { $skip: skip },
                    { $limit: limitNum },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'author',
                            pipeline: [
                                { $project: { name: 1, username: 1, avatar: 1 } }
                            ]
                        }
                    },
                    { $unwind: '$author' }
                ]);
                break;
                
            case 'latest':
            default:
                news = await News.find(query)
                    .populate('author', 'name username avatar')
                    .sort({ isPinned: -1, isBreaking: -1, publishedAt: -1 })
                    .skip(skip)
                    .limit(limitNum);
        }
        
        // Add user reaction information if authenticated
        if (req.user && Array.isArray(news)) {
            news = news.map(article => {
                const articleObj = article.toObject ? article.toObject() : article;
                articleObj.userReaction = article.getUserReaction ? article.getUserReaction(req.user._id) : null;
                return articleObj;
            });
        }
        
        const total = await News.countDocuments(query);
        
        res.json({
            success: true,
            data: {
                news,
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
        console.error('Get news error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching news'
        });
    }
});

// @route   GET /api/news/breaking
// @desc    Get breaking news
// @access  Public
router.get('/breaking', async (req, res) => {
    try {
        const breakingNews = await News.getBreaking();
        
        res.json({
            success: true,
            data: breakingNews
        });
        
    } catch (error) {
        console.error('Get breaking news error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching breaking news'
        });
    }
});

// @route   GET /api/news/featured
// @desc    Get featured news
// @access  Public
router.get('/featured', async (req, res) => {
    try {
        const featuredNews = await News.getFeatured();
        
        res.json({
            success: true,
            data: featuredNews
        });
        
    } catch (error) {
        console.error('Get featured news error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching featured news'
        });
    }
});

// @route   GET /api/news/trending
// @desc    Get trending news
// @access  Public
router.get('/trending', async (req, res) => {
    try {
        const { limit = 10, category, timeframe = 24 } = req.query;
        
        const trending = await News.getTrending({
            limit: parseInt(limit),
            category,
            timeframe: parseInt(timeframe)
        });
        
        res.json({
            success: true,
            data: trending
        });
        
    } catch (error) {
        console.error('Get trending news error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trending news'
        });
    }
});

// @route   GET /api/news/category/:category
// @desc    Get news by category
// @access  Public
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const news = await News.getByCategory(category, { 
            limit: limitNum, 
            skip 
        });
        
        const total = await News.countDocuments({
            category,
            isDeleted: false,
            status: 'published'
        });
        
        res.json({
            success: true,
            data: {
                news,
                category,
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
        console.error('Get news by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching news by category'
        });
    }
});

// @route   GET /api/news/:slug
// @desc    Get single news article by slug or ID
// @access  Public
router.get('/:slug', optionalAuth, async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Try to find by slug first, then by ID
        let news = await News.findOne({ slug, isDeleted: false })
            .populate('author', 'name username avatar branch year')
            .populate('relatedNews', 'title slug featuredImage publishedAt category');
        
        if (!news) {
            news = await News.findById(slug)
                .populate('author', 'name username avatar branch year')
                .populate('relatedNews', 'title slug featuredImage publishedAt category');
        }
        
        if (!news || news.isDeleted || news.status !== 'published') {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }
        
        // Check visibility
        if (!req.user && news.visibility !== 'public') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        if (req.user) {
            if (news.visibility === 'students_only' && req.user.role === 'guest') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - Students only'
                });
            }
            
            if (news.visibility === 'faculty_only' && !['faculty', 'admin'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - Faculty only'
                });
            }
            
            if (news.visibility === 'admin_only' && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - Admin only'
                });
            }
        }
        
        // Increment view count (but not for the author)
        if (!req.user || req.user._id.toString() !== news.author._id.toString()) {
            await news.incrementViews();
        }
        
        let newsData = news.toObject();
        if (req.user) {
            newsData.userReaction = news.getUserReaction(req.user._id);
            newsData.isAuthor = req.user._id.toString() === news.author._id.toString();
        }
        
        res.json({
            success: true,
            data: newsData
        });
        
    } catch (error) {
        console.error('Get news article error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching news article'
        });
    }
});

// @route   POST /api/news
// @desc    Create a new news article
// @access  Private (Moderator/Admin only)
router.post('/', authenticateToken, requireModerator, userRateLimit(10, 60 * 60 * 1000), async (req, res) => {
    try {
        const newsData = {
            ...req.body,
            author: req.user._id
        };
        
        const news = new News(newsData);
        await news.save();
        
        await news.populate('author', 'name username avatar');
        
        res.status(201).json({
            success: true,
            message: 'News article created successfully',
            data: news
        });
        
    } catch (error) {
        console.error('Create news error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: errors[0]
            });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A news article with this slug already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating news article'
        });
    }
});

// @route   PUT /api/news/:id
// @desc    Update a news article
// @access  Private (Author/Admin only)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        
        if (!news || news.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }
        
        // Check permissions
        if (news.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this article'
            });
        }
        
        // Store edit history
        if (req.body.content && req.body.content !== news.content) {
            news.editHistory.push({
                editedBy: req.user._id,
                editedAt: new Date(),
                changes: 'Content updated',
                reason: req.body.editReason || 'Content update'
            });
        }
        
        // Update fields
        Object.assign(news, req.body);
        
        await news.save();
        await news.populate('author', 'name username avatar');
        
        res.json({
            success: true,
            message: 'News article updated successfully',
            data: news
        });
        
    } catch (error) {
        console.error('Update news error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating news article'
        });
    }
});

// @route   DELETE /api/news/:id
// @desc    Delete a news article
// @access  Private (Author/Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        
        if (!news || news.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }
        
        // Check permissions
        if (news.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this article'
            });
        }
        
        await news.softDelete(req.user._id);
        
        res.json({
            success: true,
            message: 'News article deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete news error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting news article'
        });
    }
});

// @route   POST /api/news/:id/react
// @desc    Add reaction to news article
// @access  Private
router.post('/:id/react', authenticateToken, userRateLimit(20, 60 * 1000), async (req, res) => {
    try {
        const { type } = req.body;
        
        if (!['like', 'helpful', 'sad', 'angry'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reaction type'
            });
        }
        
        const news = await News.findById(req.params.id);
        
        if (!news || news.isDeleted || news.status !== 'published') {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }
        
        await news.addReaction(req.user._id, type);
        
        res.json({
            success: true,
            message: `Reacted with ${type}`,
            data: {
                totalReactions: news.totalReactions,
                userReaction: type
            }
        });
        
    } catch (error) {
        console.error('React to news error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding reaction'
        });
    }
});

// @route   DELETE /api/news/:id/react
// @desc    Remove reaction from news article
// @access  Private
router.delete('/:id/react', authenticateToken, async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        
        if (!news || news.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }
        
        await news.removeReaction(req.user._id);
        
        res.json({
            success: true,
            message: 'Reaction removed',
            data: {
                totalReactions: news.totalReactions,
                userReaction: null
            }
        });
        
    } catch (error) {
        console.error('Remove reaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing reaction'
        });
    }
});

// @route   POST /api/news/:id/comment
// @desc    Add comment to news article
// @access  Private
router.post('/:id/comment', authenticateToken, userRateLimit(10, 60 * 1000), async (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
        }
        
        const news = await News.findById(req.params.id);
        
        if (!news || news.isDeleted || news.status !== 'published') {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }
        
        if (!news.commentsEnabled) {
            return res.status(400).json({
                success: false,
                message: 'Comments are disabled for this article'
            });
        }
        
        await news.addComment(req.user._id, content);
        
        res.json({
            success: true,
            message: 'Comment added successfully',
            data: {
                commentsCount: news.comments.length
            }
        });
        
    } catch (error) {
        console.error('Add comment to news error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error adding comment'
        });
    }
});

// @route   POST /api/news/:id/share
// @desc    Increment share count
// @access  Public
router.post('/:id/share', async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        
        if (!news || news.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }
        
        await news.incrementShares();
        
        res.json({
            success: true,
            message: 'Share count updated',
            data: { sharesCount: news.sharesCount }
        });
        
    } catch (error) {
        console.error('Share news error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating share count'
        });
    }
});

module.exports = router;
