const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true,
        minlength: [5, 'Title must be at least 5 characters long'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    
    description: {
        type: String,
        required: [true, 'Event description is required'],
        trim: true,
        maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Event organizer is required']
    },
    
    startDate: {
        type: Date,
        required: [true, 'Event start date is required'],
        validate: {
            validator: function(v) {
                return v > new Date();
            },
            message: 'Event start date must be in the future'
        }
    },
    
    endDate: {
        type: Date,
        validate: {
            validator: function(v) {
                return !v || v > this.startDate;
            },
            message: 'Event end date must be after start date'
        }
    },
    
    location: {
        venue: {
            type: String,
            required: [true, 'Event venue is required'],
            trim: true
        },
        address: {
            type: String,
            trim: true
        },
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        isOnline: {
            type: Boolean,
            default: false
        },
        onlineLink: {
            type: String,
            validate: {
                validator: function(v) {
                    return !this.location.isOnline || (v && v.trim().length > 0);
                },
                message: 'Online link is required for online events'
            }
        }
    },
    
    category: {
        type: String,
        required: [true, 'Event category is required'],
        enum: [
            'academic',
            'cultural',
            'sports',
            'technical',
            'workshop',
            'seminar',
            'competition',
            'social',
            'club_activity',
            'fest',
            'placement',
            'other'
        ]
    },
    
    tags: [String],
    
    images: [String],
    
    attendeeLimit: {
        type: Number,
        min: [1, 'Attendee limit must be at least 1']
    },
    
    attendees: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        registeredAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['going', 'interested', 'not_going'],
            default: 'going'
        }
    }],
    
    registrationRequired: {
        type: Boolean,
        default: true
    },
    
    registrationDeadline: {
        type: Date,
        validate: {
            validator: function(v) {
                return !this.registrationRequired || !v || v <= this.startDate;
            },
            message: 'Registration deadline must be before event start date'
        }
    },
    
    fee: {
        amount: {
            type: Number,
            min: 0,
            default: 0
        },
        currency: {
            type: String,
            default: 'INR'
        },
        description: String
    },
    
    contact: {
        email: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: 'Invalid email format'
            }
        },
        phone: String,
        socialLinks: {
            instagram: String,
            facebook: String,
            twitter: String,
            linkedin: String,
            website: String
        }
    },
    
    requirements: {
        eligibility: String,
        prerequisites: [String],
        whatToBring: [String],
        dresscode: String
    },
    
    status: {
        type: String,
        enum: ['draft', 'published', 'cancelled', 'completed'],
        default: 'draft'
    },
    
    visibility: {
        type: String,
        enum: ['public', 'students_only', 'specific_branches', 'private'],
        default: 'public'
    },
    
    allowedBranches: [{
        type: String,
        enum: [
            'Computer Science Engineering',
            'Information Technology',
            'Electronics and Communication Engineering',
            'Electrical Engineering',
            'Mechanical Engineering',
            'Civil Engineering',
            'Chemical Engineering',
            'Biotechnology',
            'Aerospace Engineering',
            'Automobile Engineering',
            'Architecture',
            'MBA',
            'MCA',
            'other'
        ]
    }],
    
    isRecurring: {
        type: Boolean,
        default: false
    },
    
    recurrencePattern: {
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'yearly']
        },
        interval: {
            type: Number,
            min: 1
        },
        endDate: Date,
        occurrences: Number
    },
    
    ratings: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        review: String,
        ratedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    
    viewsCount: {
        type: Number,
        default: 0
    },
    
    sharesCount: {
        type: Number,
        default: 0
    },
    
    isPromoted: {
        type: Boolean,
        default: false
    },
    
    promotionExpiry: Date,
    
    qrCode: String, // For event check-in
    
    updates: [{
        title: String,
        content: String,
        postedAt: {
            type: Date,
            default: Date.now
        },
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    cancellationReason: String,
    
    isDeleted: {
        type: Boolean,
        default: false
    },
    
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    deletedAt: Date,
    
    metadata: {
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
eventSchema.index({ startDate: 1 });
eventSchema.index({ category: 1, startDate: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ 'location.venue': 'text', title: 'text', description: 'text' });
eventSchema.index({ status: 1, visibility: 1 });
eventSchema.index({ isDeleted: 1, startDate: 1 });
eventSchema.index({ tags: 1 });

// Virtual for attendee count
eventSchema.virtual('attendeeCount').get(function() {
    return this.attendees ? this.attendees.filter(a => a.status === 'going').length : 0;
});

// Virtual for interested count
eventSchema.virtual('interestedCount').get(function() {
    return this.attendees ? this.attendees.filter(a => a.status === 'interested').length : 0;
});

// Virtual for checking if event is past
eventSchema.virtual('isPast').get(function() {
    return this.endDate ? new Date() > this.endDate : new Date() > this.startDate;
});

// Virtual for checking if registration is open
eventSchema.virtual('isRegistrationOpen').get(function() {
    if (!this.registrationRequired) return false;
    if (this.status !== 'published') return false;
    if (this.registrationDeadline && new Date() > this.registrationDeadline) return false;
    if (this.attendeeLimit && this.attendeeCount >= this.attendeeLimit) return false;
    return new Date() < this.startDate;
});

// Method to register user for event
eventSchema.methods.registerUser = function(userId, status = 'going') {
    // Check if user is already registered
    const existingAttendee = this.attendees.find(
        attendee => attendee.user.toString() === userId.toString()
    );
    
    if (existingAttendee) {
        existingAttendee.status = status;
    } else {
        this.attendees.push({
            user: userId,
            status: status,
            registeredAt: new Date()
        });
    }
    
    return this.save();
};

// Method to unregister user from event
eventSchema.methods.unregisterUser = function(userId) {
    this.attendees = this.attendees.filter(
        attendee => attendee.user.toString() !== userId.toString()
    );
    
    return this.save();
};

// Method to get user's registration status
eventSchema.methods.getUserStatus = function(userId) {
    if (!userId) return null;
    
    const attendee = this.attendees.find(
        attendee => attendee.user.toString() === userId.toString()
    );
    
    return attendee ? attendee.status : null;
};

// Method to add rating
eventSchema.methods.addRating = function(userId, rating, review = '') {
    // Check if user already rated
    const existingRatingIndex = this.ratings.findIndex(
        r => r.user.toString() === userId.toString()
    );
    
    if (existingRatingIndex !== -1) {
        this.ratings[existingRatingIndex].rating = rating;
        this.ratings[existingRatingIndex].review = review;
        this.ratings[existingRatingIndex].ratedAt = new Date();
    } else {
        this.ratings.push({
            user: userId,
            rating,
            review,
            ratedAt: new Date()
        });
    }
    
    // Update average rating
    this.calculateAverageRating();
    
    return this.save();
};

// Method to calculate average rating
eventSchema.methods.calculateAverageRating = function() {
    if (this.ratings.length === 0) {
        this.averageRating = 0;
    } else {
        const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
        this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
    }
};

// Method to increment views
eventSchema.methods.incrementViews = function() {
    this.viewsCount += 1;
    return this.save();
};

// Method to increment shares
eventSchema.methods.incrementShares = function() {
    this.sharesCount += 1;
    return this.save();
};

// Method to soft delete
eventSchema.methods.softDelete = function(deletedByUserId) {
    this.isDeleted = true;
    this.deletedBy = deletedByUserId;
    this.deletedAt = new Date();
    return this.save();
};

// Method to add update
eventSchema.methods.addUpdate = function(title, content, postedBy) {
    this.updates.push({
        title,
        content,
        postedBy,
        postedAt: new Date()
    });
    return this.save();
};

// Pre-save middleware to calculate average rating
eventSchema.pre('save', function(next) {
    if (this.isModified('ratings')) {
        this.calculateAverageRating();
    }
    next();
});

// Static method to get upcoming events
eventSchema.statics.getUpcoming = function(options = {}) {
    const { limit = 20, category, location } = options;
    
    let query = {
        isDeleted: false,
        status: 'published',
        startDate: { $gte: new Date() }
    };
    
    if (category) query.category = category;
    if (location) query['location.venue'] = new RegExp(location, 'i');
    
    return this.find(query)
        .populate('organizer', 'name username avatar')
        .sort({ startDate: 1 })
        .limit(limit);
};

// Static method to get trending events
eventSchema.statics.getTrending = function(options = {}) {
    const { limit = 20, days = 7 } = options;
    
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return this.aggregate([
        {
            $match: {
                isDeleted: false,
                status: 'published',
                startDate: { $gte: new Date() },
                createdAt: { $gte: daysAgo }
            }
        },
        {
            $addFields: {
                trendingScore: {
                    $add: [
                        { $size: '$attendees' },
                        { $multiply: ['$viewsCount', 0.1] },
                        { $multiply: ['$sharesCount', 2] },
                        { $multiply: ['$averageRating', 5] }
                    ]
                }
            }
        },
        { $sort: { trendingScore: -1, startDate: 1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: 'organizer',
                foreignField: '_id',
                as: 'organizer',
                pipeline: [
                    { $project: { name: 1, username: 1, avatar: 1 } }
                ]
            }
        },
        { $unwind: '$organizer' }
    ]);
};

module.exports = mongoose.model('Event', eventSchema);
