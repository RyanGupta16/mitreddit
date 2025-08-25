const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'Comment content is required'],
        trim: true,
        minlength: [1, 'Comment must be at least 1 character long'],
        maxlength: [10000, 'Comment cannot exceed 10,000 characters']
    },
    
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Comment author is required']
    },
    
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: [true, 'Post reference is required']
    },
    
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    
    depth: {
        type: Number,
        default: 0,
        min: 0,
        max: 10 // Limit nesting depth to prevent infinite threads
    },
    
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
    
    repliesCount: {
        type: Number,
        default: 0
    },
    
    isEdited: {
        type: Boolean,
        default: false
    },
    
    editedAt: {
        type: Date
    },
    
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
    
    isDeleted: {
        type: Boolean,
        default: false
    },
    
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    deletedAt: {
        type: Date
    },
    
    reports: [{
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: {
            type: String,
            required: true,
            enum: [
                'spam',
                'harassment',
                'hate_speech',
                'misinformation',
                'inappropriate_content',
                'doxxing',
                'self_harm',
                'violence',
                'copyright',
                'other'
            ]
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
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: Date,
        moderatorNote: String
    }],
    
    moderationNotes: [{
        moderator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        action: {
            type: String,
            enum: ['approved', 'removed', 'flagged', 'warned']
        },
        reason: String,
        actionedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    metadata: {
        ipAddress: String,
        userAgent: String,
        editCount: {
            type: Number,
            default: 0
        }
    }
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ post: 1, parentComment: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ 'votes.score': -1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });
commentSchema.index({ isDeleted: 1, createdAt: -1 });

// Text search index
commentSchema.index({ content: 'text' });

// Virtual for getting replies (populated separately for performance)
commentSchema.virtual('replies', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parentComment'
});

// Method to upvote a comment
commentSchema.methods.upvote = function(userId) {
    // Remove any existing votes from this user
    this.votes.upvotes = this.votes.upvotes.filter(
        vote => vote.user.toString() !== userId.toString()
    );
    this.votes.downvotes = this.votes.downvotes.filter(
        vote => vote.user.toString() !== userId.toString()
    );
    
    // Add upvote
    this.votes.upvotes.push({ user: userId });
    this.votes.score = this.votes.upvotes.length - this.votes.downvotes.length;
    
    return this.save();
};

// Method to downvote a comment
commentSchema.methods.downvote = function(userId) {
    // Remove any existing votes from this user
    this.votes.upvotes = this.votes.upvotes.filter(
        vote => vote.user.toString() !== userId.toString()
    );
    this.votes.downvotes = this.votes.downvotes.filter(
        vote => vote.user.toString() !== userId.toString()
    );
    
    // Add downvote
    this.votes.downvotes.push({ user: userId });
    this.votes.score = this.votes.upvotes.length - this.votes.downvotes.length;
    
    return this.save();
};

// Method to remove vote from a comment
commentSchema.methods.removeVote = function(userId) {
    this.votes.upvotes = this.votes.upvotes.filter(
        vote => vote.user.toString() !== userId.toString()
    );
    this.votes.downvotes = this.votes.downvotes.filter(
        vote => vote.user.toString() !== userId.toString()
    );
    
    this.votes.score = this.votes.upvotes.length - this.votes.downvotes.length;
    
    return this.save();
};

// Method to get user's vote on this comment
commentSchema.methods.getUserVote = function(userId) {
    if (!userId) return null;
    
    const userIdStr = userId.toString();
    
    const hasUpvoted = this.votes.upvotes.some(
        vote => vote.user.toString() === userIdStr
    );
    
    const hasDownvoted = this.votes.downvotes.some(
        vote => vote.user.toString() === userIdStr
    );
    
    if (hasUpvoted) return 'upvote';
    if (hasDownvoted) return 'downvote';
    return null;
};

// Method to soft delete a comment
commentSchema.methods.softDelete = function(deletedByUserId) {
    this.isDeleted = true;
    this.deletedBy = deletedByUserId;
    this.deletedAt = new Date();
    this.content = '[deleted]'; // Replace content with placeholder
    
    return this.save();
};

// Method to add a report
commentSchema.methods.addReport = function(reportedBy, reason, description) {
    // Check if user has already reported this comment
    const existingReport = this.reports.find(
        report => report.reportedBy.toString() === reportedBy.toString()
    );
    
    if (existingReport) {
        throw new Error('You have already reported this comment');
    }
    
    this.reports.push({
        reportedBy,
        reason,
        description: description || '',
        reportedAt: new Date()
    });
    
    return this.save();
};

// Method to calculate controversy score
commentSchema.methods.getControversyScore = function() {
    const upvotes = this.votes.upvotes.length;
    const downvotes = this.votes.downvotes.length;
    
    if (upvotes === 0 || downvotes === 0) {
        return 0;
    }
    
    const ratio = Math.min(downvotes / upvotes, upvotes / downvotes);
    return ratio * (upvotes + downvotes);
};

// Method to calculate "best" score (Reddit-style)
commentSchema.methods.getBestScore = function() {
    const upvotes = this.votes.upvotes.length;
    const downvotes = this.votes.downvotes.length;
    const total = upvotes + downvotes;
    
    if (total === 0) return 0;
    
    const ratio = upvotes / total;
    const z = 1.96; // 95% confidence interval
    
    const score = (ratio + z * z / (2 * total) - z * Math.sqrt((ratio * (1 - ratio) + z * z / (4 * total)) / total)) / (1 + z * z / total);
    
    return score;
};

// Pre-save middleware to update edit count
commentSchema.pre('save', function(next) {
    if (this.isModified('content') && !this.isNew) {
        this.metadata.editCount += 1;
    }
    next();
});

// Pre-save middleware to update votes score
commentSchema.pre('save', function(next) {
    if (this.isModified('votes.upvotes') || this.isModified('votes.downvotes')) {
        this.votes.score = this.votes.upvotes.length - this.votes.downvotes.length;
    }
    next();
});

// Static method to get comments with hot algorithm
commentSchema.statics.getHotComments = async function(options = {}) {
    const { limit = 50, postId, category } = options;
    
    let match = { isDeleted: false };
    if (postId) match.post = postId;
    if (category) {
        // Need to lookup post category
        const posts = await this.model('Post').find({ category }, '_id');
        match.post = { $in: posts.map(p => p._id) };
    }
    
    return this.aggregate([
        { $match: match },
        {
            $addFields: {
                hotScore: {
                    $add: [
                        { $multiply: ['$votes.score', 10] },
                        {
                            $divide: [
                                { $subtract: [new Date(), '$createdAt'] },
                                1000 * 60 * 60 * 2 // 2 hours in milliseconds
                            ]
                        }
                    ]
                }
            }
        },
        { $sort: { hotScore: -1 } },
        { $limit: limit },
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
};

// Static method to get trending comments
commentSchema.statics.getTrendingComments = async function(options = {}) {
    const { limit = 50, postId, timeframe = 24 } = options;
    
    const hoursAgo = new Date(Date.now() - timeframe * 60 * 60 * 1000);
    
    let match = { 
        isDeleted: false,
        createdAt: { $gte: hoursAgo }
    };
    
    if (postId) match.post = postId;
    
    return this.aggregate([
        { $match: match },
        {
            $addFields: {
                trendingScore: {
                    $multiply: [
                        '$votes.score',
                        {
                            $divide: [
                                3600000, // 1 hour in milliseconds
                                { $subtract: [new Date(), '$createdAt'] }
                            ]
                        }
                    ]
                }
            }
        },
        { $sort: { trendingScore: -1 } },
        { $limit: limit },
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
};

module.exports = mongoose.model('Comment', commentSchema);
