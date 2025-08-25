const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'News title is required'],
        trim: true,
        minlength: [10, 'Title must be at least 10 characters long'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    
    summary: {
        type: String,
        required: [true, 'News summary is required'],
        trim: true,
        maxlength: [500, 'Summary cannot exceed 500 characters']
    },
    
    content: {
        type: String,
        required: [true, 'News content is required'],
        trim: true
    },
    
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'News author is required']
    },
    
    category: {
        type: String,
        required: [true, 'News category is required'],
        enum: [
            'academic',
            'campus',
            'placements',
            'events',
            'sports',
            'cultural',
            'achievements',
            'announcements',
            'admissions',
            'research',
            'faculty',
            'international',
            'technology',
            'general'
        ]
    },
    
    tags: [String],
    
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    
    featuredImage: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
            },
            message: 'Featured image must be a valid image URL'
        }
    },
    
    images: [String],
    
    source: {
        name: String,
        url: String,
        credibility: {
            type: String,
            enum: ['official', 'verified', 'community', 'external'],
            default: 'community'
        }
    },
    
    externalLink: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'External link must be a valid URL'
        }
    },
    
    publishedAt: {
        type: Date,
        default: Date.now
    },
    
    scheduledFor: Date, // For scheduled publishing
    
    status: {
        type: String,
        enum: ['draft', 'published', 'archived', 'deleted'],
        default: 'draft'
    },
    
    visibility: {
        type: String,
        enum: ['public', 'students_only', 'faculty_only', 'admin_only'],
        default: 'public'
    },
    
    isBreaking: {
        type: Boolean,
        default: false
    },
    
    isPinned: {
        type: Boolean,
        default: false
    },
    
    isFeatured: {
        type: Boolean,
        default: false
    },
    
    expiresAt: Date, // For time-sensitive news
    
    reactions: {
        like: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            reactedAt: {
                type: Date,
                default: Date.now
            }
        }],
        helpful: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            reactedAt: {
                type: Date,
                default: Date.now
            }
        }],
        sad: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            reactedAt: {
                type: Date,
                default: Date.now
            }
        }],
        angry: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            reactedAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: [1000, 'Comment cannot exceed 1000 characters']
        },
        postedAt: {
            type: Date,
            default: Date.now
        },
        isModerated: {
            type: Boolean,
            default: false
        }
    }],
    
    commentsEnabled: {
        type: Boolean,
        default: true
    },
    
    viewsCount: {
        type: Number,
        default: 0
    },
    
    sharesCount: {
        type: Number,
        default: 0
    },
    
    readTime: {
        type: Number, // in minutes
        default: 1
    },
    
    relatedNews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'News'
    }],
    
    editHistory: [{
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        editedAt: {
            type: Date,
            default: Date.now
        },
        changes: String,
        reason: String
    }],
    
    moderationNotes: [{
        moderator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        action: {
            type: String,
            enum: ['approved', 'flagged', 'archived', 'featured', 'unpinned']
        },
        reason: String,
        actionedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    seo: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String]
    },
    
    analytics: {
        dailyViews: [{
            date: Date,
            views: Number
        }],
        referrers: [{
            source: String,
            count: Number
        }],
        deviceTypes: [{
            type: String,
            count: Number
        }]
    },
    
    isDeleted: {
        type: Boolean,
        default: false
    },
    
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    deletedAt: Date
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
newsSchema.index({ publishedAt: -1 });
newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ author: 1 });
newsSchema.index({ status: 1, visibility: 1 });
newsSchema.index({ isBreaking: 1, publishedAt: -1 });
newsSchema.index({ isPinned: 1, publishedAt: -1 });
newsSchema.index({ tags: 1 });
newsSchema.index({ slug: 1 });
newsSchema.index({ title: 'text', content: 'text', summary: 'text' });

// Virtual for total reactions count
newsSchema.virtual('totalReactions').get(function() {
    return Object.values(this.reactions).reduce((total, reactionArray) => {
        return total + reactionArray.length;
    }, 0);
});

// Virtual for reading time calculation
newsSchema.virtual('estimatedReadTime').get(function() {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
});

// Generate slug from title before saving
newsSchema.pre('save', function(next) {
    if (this.isModified('title') || this.isNew) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }
    
    // Calculate read time
    if (this.isModified('content') || this.isNew) {
        this.readTime = this.estimatedReadTime;
    }
    
    next();
});

// Method to add reaction
newsSchema.methods.addReaction = function(userId, reactionType) {
    if (!['like', 'helpful', 'sad', 'angry'].includes(reactionType)) {
        throw new Error('Invalid reaction type');
    }
    
    // Remove any existing reactions from this user
    Object.keys(this.reactions).forEach(type => {
        this.reactions[type] = this.reactions[type].filter(
            reaction => reaction.user.toString() !== userId.toString()
        );
    });
    
    // Add the new reaction
    this.reactions[reactionType].push({
        user: userId,
        reactedAt: new Date()
    });
    
    return this.save();
};

// Method to remove reaction
newsSchema.methods.removeReaction = function(userId) {
    Object.keys(this.reactions).forEach(type => {
        this.reactions[type] = this.reactions[type].filter(
            reaction => reaction.user.toString() !== userId.toString()
        );
    });
    
    return this.save();
};

// Method to get user's reaction
newsSchema.methods.getUserReaction = function(userId) {
    if (!userId) return null;
    
    for (const [type, reactions] of Object.entries(this.reactions)) {
        if (reactions.some(reaction => reaction.user.toString() === userId.toString())) {
            return type;
        }
    }
    
    return null;
};

// Method to add comment
newsSchema.methods.addComment = function(userId, content) {
    if (!this.commentsEnabled) {
        throw new Error('Comments are disabled for this news article');
    }
    
    this.comments.push({
        user: userId,
        content: content.trim(),
        postedAt: new Date()
    });
    
    return this.save();
};

// Method to increment views
newsSchema.methods.incrementViews = function(deviceType = 'unknown', referrer = 'direct') {
    this.viewsCount += 1;
    
    // Update daily views
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEntry = this.analytics.dailyViews.find(
        entry => entry.date.getTime() === today.getTime()
    );
    
    if (todayEntry) {
        todayEntry.views += 1;
    } else {
        this.analytics.dailyViews.push({
            date: today,
            views: 1
        });
    }
    
    // Update referrers
    const referrerEntry = this.analytics.referrers.find(
        entry => entry.source === referrer
    );
    
    if (referrerEntry) {
        referrerEntry.count += 1;
    } else {
        this.analytics.referrers.push({
            source: referrer,
            count: 1
        });
    }
    
    // Update device types
    const deviceEntry = this.analytics.deviceTypes.find(
        entry => entry.type === deviceType
    );
    
    if (deviceEntry) {
        deviceEntry.count += 1;
    } else {
        this.analytics.deviceTypes.push({
            type: deviceType,
            count: 1
        });
    }
    
    return this.save();
};

// Method to increment shares
newsSchema.methods.incrementShares = function() {
    this.sharesCount += 1;
    return this.save();
};

// Method to soft delete
newsSchema.methods.softDelete = function(deletedByUserId) {
    this.isDeleted = true;
    this.deletedBy = deletedByUserId;
    this.deletedAt = new Date();
    this.status = 'deleted';
    return this.save();
};

// Static method to get trending news
newsSchema.statics.getTrending = function(options = {}) {
    const { limit = 20, category, timeframe = 24 } = options;
    
    const hoursAgo = new Date(Date.now() - timeframe * 60 * 60 * 1000);
    
    let match = {
        isDeleted: false,
        status: 'published',
        publishedAt: { $gte: hoursAgo }
    };
    
    if (category) match.category = category;
    
    return this.aggregate([
        { $match: match },
        {
            $addFields: {
                trendingScore: {
                    $add: [
                        { $multiply: ['$viewsCount', 1] },
                        { $multiply: ['$sharesCount', 3] },
                        { $multiply: ['$totalReactions', 2] },
                        { $multiply: [{ $size: '$comments' }, 2] }
                    ]
                }
            }
        },
        { $sort: { trendingScore: -1, publishedAt: -1 } },
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

// Static method to get breaking news
newsSchema.statics.getBreaking = function() {
    return this.find({
        isDeleted: false,
        status: 'published',
        isBreaking: true
    })
    .populate('author', 'name username avatar')
    .sort({ publishedAt: -1 })
    .limit(5);
};

// Static method to get featured news
newsSchema.statics.getFeatured = function() {
    return this.find({
        isDeleted: false,
        status: 'published',
        isFeatured: true
    })
    .populate('author', 'name username avatar')
    .sort({ publishedAt: -1 })
    .limit(10);
};

// Static method to get news by category
newsSchema.statics.getByCategory = function(category, options = {}) {
    const { limit = 20, skip = 0 } = options;
    
    return this.find({
        isDeleted: false,
        status: 'published',
        category: category
    })
    .populate('author', 'name username avatar')
    .sort({ isPinned: -1, publishedAt: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('News', newsSchema);
