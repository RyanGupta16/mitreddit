const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: [
            {
                validator: validator.isEmail,
                message: 'Please provide a valid email address'
            }
        ]
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Don't include password in query results by default
    },
    avatar: {
        type: String,
        default: null
    },
    branch: {
        type: String,
        required: [true, 'Branch is required'],
        enum: {
            values: ['cse', 'ece', 'me', 'ce', 'ee', 'it', 'chem', 'aero', 'other'],
            message: 'Invalid branch selection'
        }
    },
    year: {
        type: String,
        required: [true, 'Year is required'],
        enum: {
            values: ['1', '2', '3', '4', 'pg'],
            message: 'Invalid year selection'
        }
    },
    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginCount: {
        type: Number,
        default: 0
    },
    profile: {
        bio: {
            type: String,
            maxlength: [500, 'Bio cannot exceed 500 characters'],
            default: ''
        },
        interests: [{
            type: String,
            maxlength: [50, 'Interest cannot exceed 50 characters']
        }],
        socialLinks: {
            github: {
                type: String,
                validate: {
                    validator: function(v) {
                        return !v || validator.isURL(v);
                    },
                    message: 'Please provide a valid GitHub URL'
                }
            },
            linkedin: {
                type: String,
                validate: {
                    validator: function(v) {
                        return !v || validator.isURL(v);
                    },
                    message: 'Please provide a valid LinkedIn URL'
                }
            },
            portfolio: {
                type: String,
                validate: {
                    validator: function(v) {
                        return !v || validator.isURL(v);
                    },
                    message: 'Please provide a valid portfolio URL'
                }
            }
        }
    },
    stats: {
        postsCount: {
            type: Number,
            default: 0
        },
        commentsCount: {
            type: Number,
            default: 0
        },
        upvotesReceived: {
            type: Number,
            default: 0
        },
        downvotesReceived: {
            type: Number,
            default: 0
        },
        karmaScore: {
            type: Number,
            default: 0
        }
    },
    preferences: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        pushNotifications: {
            type: Boolean,
            default: true
        },
        showOnlineStatus: {
            type: Boolean,
            default: true
        },
        privateProfile: {
            type: Boolean,
            default: false
        }
    },
    savedPosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }],
    followedTopics: [{
        type: String,
        enum: ['academics', 'events', 'parties', 'restaurants', 'news', 'placements', 'hostels', 'clubs', 'sports', 'tech', 'general']
    }],
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    reportedBy: [{
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        reportedAt: {
            type: Date,
            default: Date.now
        }
    }],
    warnings: [{
        reason: String,
        issuedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        issuedAt: {
            type: Date,
            default: Date.now
        }
    }],
    suspensions: [{
        reason: String,
        issuedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: Date,
        isActive: {
            type: Boolean,
            default: true
        }
    }]
}, {
    timestamps: true,
    toJSON: { 
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.emailVerificationToken;
            delete ret.passwordResetToken;
            return ret;
        }
    }
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.karmaScore': -1 });
userSchema.index({ branch: 1, year: 1 });
userSchema.index({ lastLogin: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to generate username if not provided
userSchema.pre('save', async function(next) {
    if (!this.username && this.name) {
        // Generate username from name
        let baseUsername = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .substring(0, 20);
        
        // Ensure uniqueness
        let username = baseUsername;
        let counter = 1;
        
        while (await this.constructor.findOne({ username: username })) {
            username = `${baseUsername}_${counter}`;
            counter++;
        }
        
        this.username = username;
    }
    next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update karma score
userSchema.methods.updateKarmaScore = function() {
    this.stats.karmaScore = this.stats.upvotesReceived - this.stats.downvotesReceived;
    return this.save();
};

// Instance method to check if user is suspended
userSchema.methods.isSuspended = function() {
    const activeSuspension = this.suspensions.find(suspension => 
        suspension.isActive && 
        suspension.endDate && 
        new Date() < suspension.endDate
    );
    return !!activeSuspension;
};

// Instance method to get user's public profile
userSchema.methods.getPublicProfile = function() {
    return {
        _id: this._id,
        name: this.name,
        username: this.username,
        avatar: this.avatar,
        branch: this.branch,
        year: this.year,
        profile: {
            bio: this.profile.bio,
            interests: this.profile.interests,
            socialLinks: this.profile.socialLinks
        },
        stats: this.stats,
        createdAt: this.createdAt,
        lastLogin: this.preferences.showOnlineStatus ? this.lastLogin : undefined
    };
};

// Static method to find users by branch and year
userSchema.statics.findByBranchAndYear = function(branch, year) {
    return this.find({ branch, year, isActive: true });
};

// Static method to get top users by karma
userSchema.statics.getTopUsersByKarma = function(limit = 10) {
    return this.find({ isActive: true })
        .sort({ 'stats.karmaScore': -1 })
        .limit(limit)
        .select('name username avatar stats.karmaScore');
};

// Static method to search users
userSchema.statics.searchUsers = function(query, options = {}) {
    const { limit = 20, skip = 0 } = options;
    
    const searchRegex = new RegExp(query, 'i');
    
    return this.find({
        $or: [
            { name: searchRegex },
            { username: searchRegex }
        ],
        isActive: true,
        'preferences.privateProfile': false
    })
    .select('name username avatar branch year stats.karmaScore')
    .limit(limit)
    .skip(skip)
    .sort({ 'stats.karmaScore': -1 });
};

// Virtual for full name with branch and year
userSchema.virtual('displayName').get(function() {
    return `${this.name} (${this.branch.toUpperCase()}, Year ${this.year})`;
});

// Virtual for user level based on karma
userSchema.virtual('level').get(function() {
    const karma = this.stats.karmaScore;
    if (karma < 50) return 'Freshman';
    if (karma < 200) return 'Sophomore';
    if (karma < 500) return 'Junior';
    if (karma < 1000) return 'Senior';
    if (karma < 2000) return 'Graduate';
    return 'Alumni';
});

// Pre-remove middleware to clean up related data
userSchema.pre('remove', async function(next) {
    try {
        // Remove user's posts
        await this.model('Post').deleteMany({ author: this._id });
        
        // Remove user's comments
        await this.model('Comment').deleteMany({ author: this._id });
        
        // Remove user from saved posts of other users
        await this.model('User').updateMany(
            { savedPosts: this._id },
            { $pull: { savedPosts: this._id } }
        );
        
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('User', userSchema);
