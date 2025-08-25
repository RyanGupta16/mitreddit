const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [5, 'Title must be at least 5 characters long'],
        maxlength: [300, 'Title cannot exceed 300 characters']
    },
    content: {
        type: String,
        trim: true,
        maxlength: [10000, 'Content cannot exceed 10,000 characters'],
        default: ''
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Author is required']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: {
            values: ['academics', 'events', 'parties', 'restaurants', 'news', 'placements', 'hostels', 'clubs', 'sports', 'tech', 'general'],
            message: 'Invalid category'
        }
    },
    type: {
        type: String,
        enum: ['text', 'image', 'link'],
        default: 'text'
    },
    imageUrl: {
        type: String,
        default: null,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
            },
            message: 'Please provide a valid image URL'
        }
    },
    linkUrl: {
        type: String,
        default: null,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Please provide a valid URL'
        }
    },
    linkMetadata: {
        title: String,
        description: String,
        image: String,
        domain: String
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'Tag cannot exceed 30 characters']
    }],
    votes: {
        upvotes: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            votedAt: {
                type: Date,
                default: Date.now
            }
        }],
        downvotes: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            votedAt: {
                type: Date,
                default: Date.now
            }
        }],
        score: {
            type: Number,
            default: 0
        }
    },
    commentsCount: {
        type: Number,
        default: 0
    },
    viewsCount: {
        type: Number,
        default: 0
    },
    sharesCount: {
        type: Number,
        default: 0
    },
    isSticky: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reports: [{
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: {
            type: String,
            enum: ['spam', 'harassment', 'inappropriate', 'misinformation', 'other']
        },
        description: String,
        reportedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'resolved'],
            default: 'pending'
        }
    }],
    moderationNotes: [{
        moderator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        action: {
            type: String,
            enum: ['approved', 'removed', 'locked', 'sticky', 'edited']
        },
        reason: String,
        actionedAt: {
            type: Date,
            default: Date.now
        }
    }],
    editHistory: [{
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        previousContent: String,
        editedAt: {
            type: Date,
            default: Date.now
        },
        reason: String
    }],
    lastActivityAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
postSchema.index({ createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ 'votes.score': -1 });
postSchema.index({ lastActivityAt: -1 });
postSchema.index({ isSticky: -1, createdAt: -1 });
postSchema.index({ title: 'text', content: 'text', tags: 'text' });
postSchema.index({ isDeleted: 1, createdAt: -1 });

// Compound indexes for sorting
postSchema.index({ category: 1, 'votes.score': -1, createdAt: -1 });
postSchema.index({ category: 1, lastActivityAt: -1 });
postSchema.index({ isSticky: -1, 'votes.score': -1, createdAt: -1 });

// Virtual for upvote count
postSchema.virtual('upvotesCount').get(function() {
    return this.votes.upvotes.length;
});

// Virtual for downvote count
postSchema.virtual('downvotesCount').get(function() {
    return this.votes.downvotes.length;
});

// Virtual for hot score calculation
postSchema.virtual('hotScore').get(function() {
    const ageHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
    const score = this.votes.score;
    const comments = this.commentsCount;
    
    // Reddit-like hot score algorithm
    const order = Math.log(Math.max(Math.abs(score), 1)) * Math.sign(score);
    const seconds = (this.createdAt - new Date('2024-01-01')) / 1000;
    
    return Math.round((order + seconds / 45000) * 100) / 100;
});

// Virtual for controversy score
postSchema.virtual('controversyScore').get(function() {
    const ups = this.upvotesCount;
    const downs = this.downvotesCount;
    
    if (ups === 0 || downs === 0) return 0;
    
    const balance = ups > downs ? downs / ups : ups / downs;
    const magnitude = ups + downs;
    
    return balance * magnitude;
});

// Virtual for time since last activity
postSchema.virtual('timeSinceActivity').get(function() {
    return Date.now() - this.lastActivityAt;
});

// Method to check if user has voted
postSchema.methods.getUserVote = function(userId) {
    const upvote = this.votes.upvotes.find(vote => vote.user.toString() === userId.toString());
    const downvote = this.votes.downvotes.find(vote => vote.user.toString() === userId.toString());
    
    if (upvote) return 'upvote';
    if (downvote) return 'downvote';
    return null;
};

// Method to add upvote
postSchema.methods.upvote = function(userId) {
    const existingUpvote = this.votes.upvotes.find(vote => vote.user.toString() === userId.toString());
    const existingDownvote = this.votes.downvotes.find(vote => vote.user.toString() === userId.toString());
    
    // Remove existing downvote if present
    if (existingDownvote) {
        this.votes.downvotes = this.votes.downvotes.filter(vote => vote.user.toString() !== userId.toString());
    }
    
    // Toggle upvote
    if (existingUpvote) {
        this.votes.upvotes = this.votes.upvotes.filter(vote => vote.user.toString() !== userId.toString());
    } else {
        this.votes.upvotes.push({ user: userId });
    }
    
    this.updateVoteScore();
    return this.save();
};

// Method to add downvote
postSchema.methods.downvote = function(userId) {
    const existingUpvote = this.votes.upvotes.find(vote => vote.user.toString() === userId.toString());
    const existingDownvote = this.votes.downvotes.find(vote => vote.user.toString() === userId.toString());
    
    // Remove existing upvote if present
    if (existingUpvote) {
        this.votes.upvotes = this.votes.upvotes.filter(vote => vote.user.toString() !== userId.toString());
    }
    
    // Toggle downvote
    if (existingDownvote) {
        this.votes.downvotes = this.votes.downvotes.filter(vote => vote.user.toString() !== userId.toString());
    } else {
        this.votes.downvotes.push({ user: userId });
    }
    
    this.updateVoteScore();
    return this.save();
};

// Method to update vote score
postSchema.methods.updateVoteScore = function() {
    this.votes.score = this.votes.upvotes.length - this.votes.downvotes.length;
    this.lastActivityAt = new Date();
};

// Method to increment view count
postSchema.methods.incrementViews = function() {
    this.viewsCount += 1;
    return this.save();
};

// Method to increment share count
postSchema.methods.incrementShares = function() {
    this.sharesCount += 1;
    return this.save();
};

// Method to soft delete
postSchema.methods.softDelete = function(deletedBy) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    return this.save();
};

// Method to restore
postSchema.methods.restore = function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
};

// Method to add report
postSchema.methods.addReport = function(reporter, reason, description = '') {
    // Check if user has already reported this post
    const existingReport = this.reports.find(report => report.reporter.toString() === reporter.toString());
    
    if (existingReport) {
        throw new Error('You have already reported this post');
    }
    
    this.reports.push({
        reporter,
        reason,
        description
    });
    
    return this.save();
};

// Static method to get trending posts
postSchema.statics.getTrendingPosts = function(options = {}) {
    const { limit = 20, category = null, timeframe = 24 } = options;
    
    const cutoffDate = new Date(Date.now() - timeframe * 60 * 60 * 1000);
    const query = {
        isDeleted: false,
        createdAt: { $gte: cutoffDate }
    };
    
    if (category) {
        query.category = category;
    }
    
    return this.find(query)
        .populate('author', 'name username avatar')
        .sort({ 'votes.score': -1, createdAt: -1 })
        .limit(limit);
};

// Static method to get hot posts
postSchema.statics.getHotPosts = function(options = {}) {
    const { limit = 20, category = null, skip = 0 } = options;
    
    const query = { isDeleted: false };
    if (category) {
        query.category = category;
    }
    
    return this.aggregate([
        { $match: query },
        {
            $addFields: {
                hotScore: {
                    $add: [
                        {
                            $multiply: [
                                { $ln: { $max: [{ $abs: '$votes.score' }, 1] } },
                                { $cond: [{ $gt: ['$votes.score', 0] }, 1, -1] }
                            ]
                        },
                        {
                            $divide: [
                                { $subtract: ['$createdAt', new Date('2024-01-01')] },
                                45000000
                            ]
                        }
                    ]
                }
            }
        },
        { $sort: { isSticky: -1, hotScore: -1 } },
        { $skip: skip },
        { $limit: limit },
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
};

// Static method to search posts
postSchema.statics.searchPosts = function(query, options = {}) {
    const { limit = 20, skip = 0, category = null, sortBy = 'relevance' } = options;
    
    const searchQuery = {
        $text: { $search: query },
        isDeleted: false
    };
    
    if (category) {
        searchQuery.category = category;
    }
    
    let sort = {};
    switch (sortBy) {
        case 'newest':
            sort = { createdAt: -1 };
            break;
        case 'oldest':
            sort = { createdAt: 1 };
            break;
        case 'top':
            sort = { 'votes.score': -1 };
            break;
        case 'relevance':
        default:
            sort = { score: { $meta: 'textScore' }, 'votes.score': -1 };
            break;
    }
    
    return this.find(searchQuery, { score: { $meta: 'textScore' } })
        .populate('author', 'name username avatar')
        .sort(sort)
        .limit(limit)
        .skip(skip);
};

// Pre-save middleware to update lastActivityAt
postSchema.pre('save', function(next) {
    if (this.isModified('votes') || this.isModified('commentsCount')) {
        this.lastActivityAt = new Date();
    }
    next();
});

// Pre-remove middleware to clean up related data
postSchema.pre('remove', async function(next) {
    try {
        // Remove all comments for this post
        await this.model('Comment').deleteMany({ postId: this._id });
        
        // Remove from saved posts
        await this.model('User').updateMany(
            { savedPosts: this._id },
            { $pull: { savedPosts: this._id } }
        );
        
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Post', postSchema);
