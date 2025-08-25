const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { authenticateToken, requireOwnershipOrAdmin, userRateLimit } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
            .populate('savedPosts', 'title createdAt')
            .populate('following', 'name username avatar')
            .populate('followers', 'name username avatar');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: user
        });
        
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile'
        });
    }
});

// @route   GET /api/users/:username
// @desc    Get user profile by username
// @access  Public
router.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await User.findOne({ username })
            .select('-password -email -emailVerificationToken -passwordResetToken -passwordResetExpires -isEmailVerified')
            .populate('followers', 'name username avatar')
            .populate('following', 'name username avatar');
        
        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Get user's recent posts
        const recentPosts = await Post.find({
            author: user._id,
            isDeleted: false
        })
        .select('title category createdAt votes.score commentsCount')
        .sort({ createdAt: -1 })
        .limit(5);
        
        // Get user's recent comments
        const recentComments = await Comment.find({
            author: user._id,
            isDeleted: false
        })
        .populate('post', 'title')
        .select('content createdAt votes.score post')
        .sort({ createdAt: -1 })
        .limit(5);
        
        const userData = user.toObject();
        userData.recentPosts = recentPosts;
        userData.recentComments = recentComments;
        
        res.json({
            success: true,
            data: userData
        });
        
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile'
        });
    }
});

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put('/me', authenticateToken, userRateLimit(10, 60 * 60 * 1000), async (req, res) => {
    try {
        const {
            name,
            bio,
            avatar,
            branch,
            year,
            interests,
            socialLinks,
            preferences
        } = req.body;
        
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update allowed fields
        if (name && name.trim()) {
            user.name = name.trim();
        }
        
        if (bio !== undefined) {
            user.bio = bio ? bio.trim() : '';
        }
        
        if (avatar) {
            user.avatar = avatar;
        }
        
        if (branch) {
            user.branch = branch;
        }
        
        if (year && year >= 1 && year <= 4) {
            user.year = year;
        }
        
        if (interests && Array.isArray(interests)) {
            user.interests = interests.map(interest => interest.toString().trim()).filter(i => i.length > 0);
        }
        
        if (socialLinks && typeof socialLinks === 'object') {
            user.socialLinks = {
                ...user.socialLinks,
                ...socialLinks
            };
        }
        
        if (preferences && typeof preferences === 'object') {
            user.preferences = {
                ...user.preferences,
                ...preferences
            };
        }
        
        await user.save();
        
        // Return user without sensitive data
        const updatedUser = await User.findById(user._id)
            .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: errors[0]
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
});

// @route   POST /api/users/:userId/follow
// @desc    Follow/unfollow a user
// @access  Private
router.post('/:userId/follow', authenticateToken, userRateLimit(20, 60 * 60 * 1000), async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot follow yourself'
            });
        }
        
        const userToFollow = await User.findById(userId);
        const currentUser = await User.findById(req.user._id);
        
        if (!userToFollow || userToFollow.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const isFollowing = currentUser.following.includes(userId);
        
        if (isFollowing) {
            // Unfollow
            currentUser.following = currentUser.following.filter(
                id => id.toString() !== userId
            );
            userToFollow.followers = userToFollow.followers.filter(
                id => id.toString() !== req.user._id.toString()
            );
            
            // Update stats
            currentUser.stats.followingCount = Math.max(0, currentUser.stats.followingCount - 1);
            userToFollow.stats.followersCount = Math.max(0, userToFollow.stats.followersCount - 1);
            
            await Promise.all([currentUser.save(), userToFollow.save()]);
            
            res.json({
                success: true,
                message: 'User unfollowed successfully',
                data: { following: false, followersCount: userToFollow.stats.followersCount }
            });
        } else {
            // Follow
            currentUser.following.push(userId);
            userToFollow.followers.push(req.user._id);
            
            // Update stats
            currentUser.stats.followingCount += 1;
            userToFollow.stats.followersCount += 1;
            
            await Promise.all([currentUser.save(), userToFollow.save()]);
            
            res.json({
                success: true,
                message: 'User followed successfully',
                data: { following: true, followersCount: userToFollow.stats.followersCount }
            });
        }
        
    } catch (error) {
        console.error('Follow user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error following/unfollowing user'
        });
    }
});

// @route   GET /api/users/:username/posts
// @desc    Get user's posts
// @access  Public
router.get('/:username/posts', async (req, res) => {
    try {
        const { username } = req.params;
        const { page = 1, limit = 10, sort = 'new' } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const user = await User.findOne({ username });
        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        let sortQuery = {};
        switch (sort) {
            case 'new':
                sortQuery = { createdAt: -1 };
                break;
            case 'top':
                sortQuery = { 'votes.score': -1, createdAt: -1 };
                break;
            case 'old':
                sortQuery = { createdAt: 1 };
                break;
            default:
                sortQuery = { createdAt: -1 };
        }
        
        const posts = await Post.find({
            author: user._id,
            isDeleted: false
        })
        .populate('author', 'name username avatar branch year')
        .sort(sortQuery)
        .skip(skip)
        .limit(limitNum);
        
        const total = await Post.countDocuments({
            author: user._id,
            isDeleted: false
        });
        
        res.json({
            success: true,
            data: {
                posts,
                user: {
                    name: user.name,
                    username: user.username,
                    avatar: user.avatar
                },
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
        console.error('Get user posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user posts'
        });
    }
});

// @route   GET /api/users/:username/comments
// @desc    Get user's comments
// @access  Public
router.get('/:username/comments', async (req, res) => {
    try {
        const { username } = req.params;
        const { page = 1, limit = 20 } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const user = await User.findOne({ username });
        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const comments = await Comment.find({
            author: user._id,
            isDeleted: false
        })
        .populate('author', 'name username avatar branch year')
        .populate('post', 'title category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
        
        const total = await Comment.countDocuments({
            author: user._id,
            isDeleted: false
        });
        
        res.json({
            success: true,
            data: {
                comments,
                user: {
                    name: user.name,
                    username: user.username,
                    avatar: user.avatar
                },
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
        console.error('Get user comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user comments'
        });
    }
});

// @route   GET /api/users/me/saved
// @desc    Get user's saved posts
// @access  Private
router.get('/me/saved', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const user = await User.findById(req.user._id)
            .populate({
                path: 'savedPosts',
                match: { isDeleted: false },
                populate: { path: 'author', select: 'name username avatar branch year' },
                options: {
                    sort: { createdAt: -1 },
                    skip: skip,
                    limit: limitNum
                }
            });
        
        const totalSaved = await User.aggregate([
            { $match: { _id: req.user._id } },
            {
                $lookup: {
                    from: 'posts',
                    localField: 'savedPosts',
                    foreignField: '_id',
                    as: 'savedPostsData'
                }
            },
            {
                $project: {
                    savedCount: {
                        $size: {
                            $filter: {
                                input: '$savedPostsData',
                                cond: { $eq: ['$$this.isDeleted', false] }
                            }
                        }
                    }
                }
            }
        ]);
        
        const total = totalSaved[0]?.savedCount || 0;
        
        res.json({
            success: true,
            data: {
                posts: user.savedPosts,
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
        console.error('Get saved posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching saved posts'
        });
    }
});

// @route   GET /api/users/me/feed
// @desc    Get personalized feed for current user
// @access  Private
router.get('/me/feed', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const user = await User.findById(req.user._id);
        
        // Get posts from followed users and user's interests
        let query = {
            isDeleted: false,
            $or: []
        };
        
        // Posts from followed users
        if (user.following.length > 0) {
            query.$or.push({ author: { $in: user.following } });
        }
        
        // Posts from user's interest categories
        if (user.interests.length > 0) {
            query.$or.push({ category: { $in: user.interests } });
        }
        
        // If no following or interests, get general posts
        if (query.$or.length === 0) {
            delete query.$or;
        }
        
        const posts = await Post.find(query)
            .populate('author', 'name username avatar branch year')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);
        
        // Add user vote information
        const postsWithVotes = posts.map(post => {
            const postObj = post.toObject();
            postObj.userVote = post.getUserVote(req.user._id);
            return postObj;
        });
        
        const total = await Post.countDocuments(query);
        
        res.json({
            success: true,
            data: {
                posts: postsWithVotes,
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
        console.error('Get user feed error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user feed'
        });
    }
});

// @route   DELETE /api/users/me
// @desc    Delete user account (soft delete)
// @access  Private
router.delete('/me', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to delete account'
            });
        }
        
        const user = await User.findById(req.user._id).select('+password');
        
        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }
        
        // Soft delete user
        user.isDeleted = true;
        user.deletedAt = new Date();
        user.email = `deleted_${user._id}@deleted.com`; // Anonymize email
        user.username = `deleted_user_${user._id}`;
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete user account error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting account'
        });
    }
});

// @route   GET /api/users/search
// @desc    Search users by name or username
// @access  Public
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }
        
        const searchRegex = new RegExp(q.trim(), 'i');
        
        const users = await User.find({
            isDeleted: false,
            $or: [
                { name: { $regex: searchRegex } },
                { username: { $regex: searchRegex } }
            ]
        })
        .select('name username avatar branch year stats.karmaScore')
        .limit(parseInt(limit))
        .sort({ 'stats.karmaScore': -1 });
        
        res.json({
            success: true,
            data: {
                users,
                query: q.trim()
            }
        });
        
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching users'
        });
    }
});

// @route   GET /api/users/leaderboard
// @desc    Get user leaderboard by karma
// @access  Public
router.get('/leaderboard', async (req, res) => {
    try {
        const { limit = 20, timeframe = 'all' } = req.query;
        
        let dateFilter = {};
        if (timeframe !== 'all') {
            let days = 30; // Default to 30 days
            switch (timeframe) {
                case 'week': days = 7; break;
                case 'month': days = 30; break;
                case 'year': days = 365; break;
            }
            
            dateFilter.createdAt = {
                $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            };
        }
        
        const users = await User.find({
            isDeleted: false,
            ...dateFilter
        })
        .select('name username avatar branch year stats')
        .sort({ 'stats.karmaScore': -1 })
        .limit(parseInt(limit));
        
        res.json({
            success: true,
            data: {
                users,
                timeframe
            }
        });
        
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard'
        });
    }
});

module.exports = router;
