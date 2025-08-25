const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const { 
    authenticateToken, 
    optionalAuth, 
    requireOwnershipOrAdmin,
    userRateLimit,
    requireModerator
} = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/posts
// @desc    Get posts with pagination and filtering
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = 'hot',
            category,
            author,
            search,
            timeframe = '24h'
        } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // Build query
        let query = { isDeleted: false };
        
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
        
        // Time-based filtering for trending/top posts
        if (['trending', 'top'].includes(sort) && timeframe) {
            let hours = 24;
            switch (timeframe) {
                case '1h': hours = 1; break;
                case '6h': hours = 6; break;
                case '24h': hours = 24; break;
                case '7d': hours = 168; break;
                case '30d': hours = 720; break;
                case 'all': hours = null; break;
            }
            
            if (hours) {
                query.createdAt = { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) };
            }
        }
        
        let posts;
        
        // Different sorting algorithms
        switch (sort) {
            case 'hot':
                posts = await Post.getHotPosts({ 
                    limit: limitNum, 
                    skip, 
                    category 
                });
                break;
                
            case 'new':
                posts = await Post.find(query)
                    .populate('author', 'name username avatar branch year')
                    .sort({ createdAt: -1 })
                    .limit(limitNum)
                    .skip(skip);
                break;
                
            case 'top':
                posts = await Post.find(query)
                    .populate('author', 'name username avatar branch year')
                    .sort({ 'votes.score': -1, createdAt: -1 })
                    .limit(limitNum)
                    .skip(skip);
                break;
                
            case 'trending':
                posts = await Post.getTrendingPosts({ 
                    limit: limitNum, 
                    category,
                    timeframe: timeframe === '1h' ? 1 : timeframe === '6h' ? 6 : 24
                });
                break;
                
            case 'controversial':
                posts = await Post.aggregate([
                    { $match: query },
                    {
                        $addFields: {
                            controversyScore: {
                                $cond: [
                                    { $or: [
                                        { $eq: [{ $size: '$votes.upvotes' }, 0] },
                                        { $eq: [{ $size: '$votes.downvotes' }, 0] }
                                    ]},
                                    0,
                                    {
                                        $multiply: [
                                            {
                                                $min: [
                                                    { $divide: [{ $size: '$votes.downvotes' }, { $size: '$votes.upvotes' }] },
                                                    { $divide: [{ $size: '$votes.upvotes' }, { $size: '$votes.downvotes' }] }
                                                ]
                                            },
                                            { $add: [{ $size: '$votes.upvotes' }, { $size: '$votes.downvotes' }] }
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    { $sort: { controversyScore: -1 } },
                    { $skip: skip },
                    { $limit: limitNum },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'author',
                            pipeline: [
                                { $project: { name: 1, username: 1, avatar: 1, branch: 1, year: 1 } }
                            ]
                        }
                    },
                    { $unwind: '$author' }
                ]);
                break;
                
            default:
                posts = await Post.find(query)
                    .populate('author', 'name username avatar branch year')
                    .sort({ createdAt: -1 })
                    .limit(limitNum)
                    .skip(skip);
        }
        
        // Add user vote information if authenticated
        if (req.user) {
            posts = posts.map(post => {
                const postObj = post.toObject ? post.toObject() : post;
                postObj.userVote = post.getUserVote ? post.getUserVote(req.user._id) : null;
                return postObj;
            });
        }
        
        // Get total count for pagination
        const total = await Post.countDocuments(query);
        
        res.json({
            success: true,
            data: {
                posts,
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
        console.error('Get posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching posts'
        });
    }
});

// @route   GET /api/posts/:id
// @desc    Get single post by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'name username avatar branch year stats.karmaScore')
            .populate('editHistory.editedBy', 'name username');
        
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        // Increment view count (but not for the author)
        if (!req.user || req.user._id.toString() !== post.author._id.toString()) {
            await post.incrementViews();
        }
        
        // Add user vote information if authenticated
        let postData = post.toObject();
        if (req.user) {
            postData.userVote = post.getUserVote(req.user._id);
            postData.isAuthor = req.user._id.toString() === post.author._id.toString();
        }
        
        res.json({
            success: true,
            data: postData
        });
        
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching post'
        });
    }
});

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', authenticateToken, userRateLimit(5, 60 * 60 * 1000), async (req, res) => {
    try {
        const { title, content, category, type, imageUrl, linkUrl, tags } = req.body;
        
        // Validation
        if (!title || !category) {
            return res.status(400).json({
                success: false,
                message: 'Title and category are required'
            });
        }
        
        if (title.length < 5 || title.length > 300) {
            return res.status(400).json({
                success: false,
                message: 'Title must be between 5 and 300 characters'
            });
        }
        
        // Create post object
        const postData = {
            title: title.trim(),
            content: content ? content.trim() : '',
            author: req.user._id,
            category,
            type: type || 'text'
        };
        
        // Add media URLs if provided
        if (type === 'image' && imageUrl) {
            postData.imageUrl = imageUrl;
        }
        
        if (type === 'link' && linkUrl) {
            postData.linkUrl = linkUrl;
        }
        
        // Add tags if provided
        if (tags && Array.isArray(tags)) {
            postData.tags = tags.map(tag => tag.toString().trim()).filter(tag => tag.length > 0);
        }
        
        const post = new Post(postData);
        await post.save();
        
        // Populate author information
        await post.populate('author', 'name username avatar branch year');
        
        // Update user stats
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 'stats.postsCount': 1 }
        });
        
        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            data: post
        });
        
    } catch (error) {
        console.error('Create post error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: errors[0]
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating post'
        });
    }
});

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private (Author or Admin)
router.put('/:id', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        
        const post = await Post.findById(req.params.id);
        
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        // Check if post is locked
        if (post.isLocked && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Post is locked and cannot be edited'
            });
        }
        
        // Store previous content for edit history
        const previousContent = post.content;
        
        // Update fields
        if (title && title.length >= 5 && title.length <= 300) {
            post.title = title.trim();
        }
        
        if (content !== undefined) {
            post.content = content.trim();
        }
        
        if (tags && Array.isArray(tags)) {
            post.tags = tags.map(tag => tag.toString().trim()).filter(tag => tag.length > 0);
        }
        
        // Add to edit history if content changed
        if (previousContent !== post.content) {
            post.editHistory.push({
                editedBy: req.user._id,
                previousContent,
                editedAt: new Date(),
                reason: req.body.editReason || 'Content updated'
            });
        }
        
        await post.save();
        await post.populate('author', 'name username avatar branch year');
        
        res.json({
            success: true,
            message: 'Post updated successfully',
            data: post
        });
        
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating post'
        });
    }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post (soft delete)
// @access  Private (Author or Admin)
router.delete('/:id', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        // Soft delete
        await post.softDelete(req.user._id);
        
        // Update user stats
        await User.findByIdAndUpdate(post.author, {
            $inc: { 'stats.postsCount': -1 }
        });
        
        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting post'
        });
    }
});

// @route   POST /api/posts/:id/vote
// @desc    Vote on a post (upvote/downvote)
// @access  Private
router.post('/:id/vote', authenticateToken, userRateLimit(30, 60 * 1000), async (req, res) => {
    try {
        const { type } = req.body; // 'upvote' or 'downvote'
        
        if (!['upvote', 'downvote'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vote type. Must be "upvote" or "downvote"'
            });
        }
        
        const post = await Post.findById(req.params.id);
        
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        // Prevent voting on own posts
        if (post.author.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot vote on your own post'
            });
        }
        
        const previousVote = post.getUserVote(req.user._id);
        
        // Apply vote
        if (type === 'upvote') {
            await post.upvote(req.user._id);
        } else {
            await post.downvote(req.user._id);
        }
        
        // Update author karma
        const author = await User.findById(post.author);
        if (author) {
            // Adjust karma based on vote change
            if (previousVote === null && type === 'upvote') {
                author.stats.upvotesReceived += 1;
            } else if (previousVote === null && type === 'downvote') {
                author.stats.downvotesReceived += 1;
            } else if (previousVote === 'upvote' && type === 'downvote') {
                author.stats.upvotesReceived -= 1;
                author.stats.downvotesReceived += 1;
            } else if (previousVote === 'downvote' && type === 'upvote') {
                author.stats.downvotesReceived -= 1;
                author.stats.upvotesReceived += 1;
            } else if (previousVote === 'upvote' && type === 'upvote') {
                author.stats.upvotesReceived -= 1; // Remove upvote
            } else if (previousVote === 'downvote' && type === 'downvote') {
                author.stats.downvotesReceived -= 1; // Remove downvote
            }
            
            await author.updateKarmaScore();
        }
        
        const currentVote = post.getUserVote(req.user._id);
        
        res.json({
            success: true,
            message: `${currentVote === type ? 'Vote added' : currentVote === null ? 'Vote removed' : 'Vote changed'}`,
            data: {
                score: post.votes.score,
                upvotesCount: post.votes.upvotes.length,
                downvotesCount: post.votes.downvotes.length,
                userVote: currentVote
            }
        });
        
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing vote'
        });
    }
});

// @route   POST /api/posts/:id/save
// @desc    Save/unsave a post
// @access  Private
router.post('/:id/save', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        const user = await User.findById(req.user._id);
        const isSaved = user.savedPosts.includes(post._id);
        
        if (isSaved) {
            // Unsave
            user.savedPosts = user.savedPosts.filter(
                savedPostId => savedPostId.toString() !== post._id.toString()
            );
            await user.save();
            
            res.json({
                success: true,
                message: 'Post removed from saved',
                data: { saved: false }
            });
        } else {
            // Save
            user.savedPosts.push(post._id);
            await user.save();
            
            res.json({
                success: true,
                message: 'Post saved successfully',
                data: { saved: true }
            });
        }
        
    } catch (error) {
        console.error('Save post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving post'
        });
    }
});

// @route   POST /api/posts/:id/report
// @desc    Report a post
// @access  Private
router.post('/:id/report', authenticateToken, userRateLimit(5, 24 * 60 * 60 * 1000), async (req, res) => {
    try {
        const { reason, description } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Report reason is required'
            });
        }
        
        const post = await Post.findById(req.params.id);
        
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        // Prevent reporting own posts
        if (post.author.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot report your own post'
            });
        }
        
        await post.addReport(req.user._id, reason, description);
        
        res.json({
            success: true,
            message: 'Post reported successfully. Our moderators will review it.'
        });
        
    } catch (error) {
        console.error('Report post error:', error);
        
        if (error.message.includes('already reported')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error reporting post'
        });
    }
});

// @route   POST /api/posts/:id/share
// @desc    Increment share count
// @access  Public
router.post('/:id/share', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        await post.incrementShares();
        
        res.json({
            success: true,
            message: 'Share count updated',
            data: { sharesCount: post.sharesCount }
        });
        
    } catch (error) {
        console.error('Share post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating share count'
        });
    }
});

// @route   PUT /api/posts/:id/lock
// @desc    Lock/unlock a post (Moderator only)
// @access  Private (Moderator)
router.put('/:id/lock', authenticateToken, requireModerator, async (req, res) => {
    try {
        const { locked, reason } = req.body;
        
        const post = await Post.findById(req.params.id);
        
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        post.isLocked = locked;
        
        // Add moderation note
        post.moderationNotes.push({
            moderator: req.user._id,
            action: locked ? 'locked' : 'unlocked',
            reason: reason || '',
            actionedAt: new Date()
        });
        
        await post.save();
        
        res.json({
            success: true,
            message: `Post ${locked ? 'locked' : 'unlocked'} successfully`,
            data: { isLocked: post.isLocked }
        });
        
    } catch (error) {
        console.error('Lock post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating post lock status'
        });
    }
});

// @route   PUT /api/posts/:id/sticky
// @desc    Pin/unpin a post (Moderator only)
// @access  Private (Moderator)
router.put('/:id/sticky', authenticateToken, requireModerator, async (req, res) => {
    try {
        const { sticky, reason } = req.body;
        
        const post = await Post.findById(req.params.id);
        
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        post.isSticky = sticky;
        
        // Add moderation note
        post.moderationNotes.push({
            moderator: req.user._id,
            action: sticky ? 'sticky' : 'unsticky',
            reason: reason || '',
            actionedAt: new Date()
        });
        
        await post.save();
        
        res.json({
            success: true,
            message: `Post ${sticky ? 'pinned' : 'unpinned'} successfully`,
            data: { isSticky: post.isSticky }
        });
        
    } catch (error) {
        console.error('Sticky post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating post sticky status'
        });
    }
});

module.exports = router;
