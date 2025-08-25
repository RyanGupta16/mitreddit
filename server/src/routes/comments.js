const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const { authenticateToken, optionalAuth, requireOwnershipOrAdmin, userRateLimit } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/comments/:postId
// @desc    Get comments for a specific post
// @access  Public
router.get('/:postId', optionalAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const { sort = 'best', limit = 50 } = req.query;
        
        // Check if post exists
        const post = await Post.findById(postId);
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        let sortQuery = {};
        
        switch (sort) {
            case 'new':
                sortQuery = { createdAt: -1 };
                break;
            case 'old':
                sortQuery = { createdAt: 1 };
                break;
            case 'top':
                sortQuery = { 'votes.score': -1, createdAt: -1 };
                break;
            case 'controversial':
                // Will handle this with aggregation
                break;
            case 'best':
            default:
                // Best is a combination of score and time
                sortQuery = { 
                    $expr: {
                        $add: [
                            '$votes.score',
                            {
                                $multiply: [
                                    -0.0001,
                                    { $subtract: [new Date(), '$createdAt'] }
                                ]
                            }
                        ]
                    }
                };
        }
        
        let comments;
        
        if (sort === 'controversial') {
            comments = await Comment.aggregate([
                { 
                    $match: { 
                        post: post._id,
                        isDeleted: false,
                        parentComment: null // Only top-level comments
                    }
                },
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
                { $sort: { controversyScore: -1, createdAt: -1 } },
                { $limit: parseInt(limit) },
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
        } else {
            comments = await Comment.find({
                post: postId,
                isDeleted: false,
                parentComment: null // Only top-level comments for now
            })
            .populate('author', 'name username avatar branch year')
            .sort(sortQuery)
            .limit(parseInt(limit));
        }
        
        // Get replies for each comment
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment) => {
                const commentObj = comment.toObject ? comment.toObject() : comment;
                
                // Get replies
                const replies = await Comment.find({
                    parentComment: commentObj._id,
                    isDeleted: false
                })
                .populate('author', 'name username avatar branch year')
                .sort({ createdAt: 1 })
                .limit(10); // Limit initial replies, load more on demand
                
                commentObj.replies = replies;
                commentObj.hasMoreReplies = await Comment.countDocuments({
                    parentComment: commentObj._id,
                    isDeleted: false
                }) > 10;
                
                // Add user vote info if authenticated
                if (req.user) {
                    commentObj.userVote = comment.getUserVote ? comment.getUserVote(req.user._id) : null;
                    commentObj.replies = commentObj.replies.map(reply => {
                        const replyObj = reply.toObject();
                        replyObj.userVote = reply.getUserVote ? reply.getUserVote(req.user._id) : null;
                        return replyObj;
                    });
                }
                
                return commentObj;
            })
        );
        
        res.json({
            success: true,
            data: {
                comments: commentsWithReplies,
                hasMore: commentsWithReplies.length === parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching comments'
        });
    }
});

// @route   GET /api/comments/replies/:commentId
// @desc    Get replies for a specific comment
// @access  Public
router.get('/replies/:commentId', optionalAuth, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const replies = await Comment.find({
            parentComment: commentId,
            isDeleted: false
        })
        .populate('author', 'name username avatar branch year')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limitNum);
        
        // Add user vote info if authenticated
        const repliesWithVotes = replies.map(reply => {
            const replyObj = reply.toObject();
            if (req.user) {
                replyObj.userVote = reply.getUserVote(req.user._id);
            }
            return replyObj;
        });
        
        const total = await Comment.countDocuments({
            parentComment: commentId,
            isDeleted: false
        });
        
        res.json({
            success: true,
            data: {
                replies: repliesWithVotes,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    hasMore: pageNum * limitNum < total
                }
            }
        });
        
    } catch (error) {
        console.error('Get replies error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching replies'
        });
    }
});

// @route   POST /api/comments
// @desc    Create a new comment
// @access  Private
router.post('/', authenticateToken, userRateLimit(10, 60 * 1000), async (req, res) => {
    try {
        const { content, postId, parentCommentId } = req.body;
        
        // Validation
        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
        }
        
        if (content.trim().length < 1 || content.trim().length > 10000) {
            return res.status(400).json({
                success: false,
                message: 'Comment must be between 1 and 10,000 characters'
            });
        }
        
        if (!postId) {
            return res.status(400).json({
                success: false,
                message: 'Post ID is required'
            });
        }
        
        // Check if post exists and is not deleted
        const post = await Post.findById(postId);
        if (!post || post.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        // Check if post is locked
        if (post.isLocked) {
            return res.status(403).json({
                success: false,
                message: 'Cannot comment on a locked post'
            });
        }
        
        // If replying to a comment, check if parent comment exists
        let parentComment = null;
        if (parentCommentId) {
            parentComment = await Comment.findById(parentCommentId);
            if (!parentComment || parentComment.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Parent comment not found'
                });
            }
        }
        
        // Create comment
        const comment = new Comment({
            content: content.trim(),
            author: req.user._id,
            post: postId,
            parentComment: parentCommentId || null,
            depth: parentComment ? parentComment.depth + 1 : 0
        });
        
        await comment.save();
        
        // Populate author information
        await comment.populate('author', 'name username avatar branch year');
        
        // Update post comment count
        await Post.findByIdAndUpdate(postId, {
            $inc: { commentsCount: 1 }
        });
        
        // Update user stats
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 'stats.commentsCount': 1 }
        });
        
        // If this is a reply, update parent comment reply count
        if (parentComment) {
            await Comment.findByIdAndUpdate(parentCommentId, {
                $inc: { repliesCount: 1 }
            });
        }
        
        res.status(201).json({
            success: true,
            message: 'Comment created successfully',
            data: comment
        });
        
    } catch (error) {
        console.error('Create comment error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: errors[0]
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating comment'
        });
    }
});

// @route   PUT /api/comments/:id
// @desc    Update a comment
// @access  Private (Author only)
router.put('/:id', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
        }
        
        if (content.trim().length < 1 || content.trim().length > 10000) {
            return res.status(400).json({
                success: false,
                message: 'Comment must be between 1 and 10,000 characters'
            });
        }
        
        const comment = await Comment.findById(req.params.id);
        
        if (!comment || comment.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }
        
        // Store previous content for edit history
        const previousContent = comment.content;
        
        // Update comment
        comment.content = content.trim();
        comment.isEdited = true;
        comment.editedAt = new Date();
        
        // Add to edit history
        comment.editHistory.push({
            editedBy: req.user._id,
            previousContent,
            editedAt: new Date(),
            reason: req.body.editReason || 'Content updated'
        });
        
        await comment.save();
        await comment.populate('author', 'name username avatar branch year');
        
        res.json({
            success: true,
            message: 'Comment updated successfully',
            data: comment
        });
        
    } catch (error) {
        console.error('Update comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating comment'
        });
    }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment (soft delete)
// @access  Private (Author or Admin)
router.delete('/:id', authenticateToken, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        
        if (!comment || comment.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }
        
        // Soft delete
        await comment.softDelete(req.user._id);
        
        // Update post comment count
        await Post.findByIdAndUpdate(comment.post, {
            $inc: { commentsCount: -1 }
        });
        
        // Update user stats
        await User.findByIdAndUpdate(comment.author, {
            $inc: { 'stats.commentsCount': -1 }
        });
        
        // If this was a reply, update parent comment reply count
        if (comment.parentComment) {
            await Comment.findByIdAndUpdate(comment.parentComment, {
                $inc: { repliesCount: -1 }
            });
        }
        
        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting comment'
        });
    }
});

// @route   POST /api/comments/:id/vote
// @desc    Vote on a comment (upvote/downvote)
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
        
        const comment = await Comment.findById(req.params.id);
        
        if (!comment || comment.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }
        
        // Prevent voting on own comments
        if (comment.author.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot vote on your own comment'
            });
        }
        
        const previousVote = comment.getUserVote(req.user._id);
        
        // Apply vote
        if (type === 'upvote') {
            await comment.upvote(req.user._id);
        } else {
            await comment.downvote(req.user._id);
        }
        
        // Update author karma
        const author = await User.findById(comment.author);
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
        
        const currentVote = comment.getUserVote(req.user._id);
        
        res.json({
            success: true,
            message: `${currentVote === type ? 'Vote added' : currentVote === null ? 'Vote removed' : 'Vote changed'}`,
            data: {
                score: comment.votes.score,
                upvotesCount: comment.votes.upvotes.length,
                downvotesCount: comment.votes.downvotes.length,
                userVote: currentVote
            }
        });
        
    } catch (error) {
        console.error('Vote on comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing vote'
        });
    }
});

// @route   POST /api/comments/:id/report
// @desc    Report a comment
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
        
        const comment = await Comment.findById(req.params.id);
        
        if (!comment || comment.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }
        
        // Prevent reporting own comments
        if (comment.author.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot report your own comment'
            });
        }
        
        await comment.addReport(req.user._id, reason, description);
        
        res.json({
            success: true,
            message: 'Comment reported successfully. Our moderators will review it.'
        });
        
    } catch (error) {
        console.error('Report comment error:', error);
        
        if (error.message.includes('already reported')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error reporting comment'
        });
    }
});

module.exports = router;
