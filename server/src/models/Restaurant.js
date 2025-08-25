const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Restaurant name is required'],
        trim: true,
        minlength: [2, 'Restaurant name must be at least 2 characters long'],
        maxlength: [100, 'Restaurant name cannot exceed 100 characters']
    },
    
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    contact: {
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            validate: {
                validator: function(v) {
                    return /^[6-9]\d{9}$/.test(v); // Indian mobile number format
                },
                message: 'Please enter a valid Indian mobile number'
            }
        },
        email: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: 'Invalid email format'
            }
        },
        whatsapp: String,
        website: String
    },
    
    location: {
        address: {
            type: String,
            required: [true, 'Address is required'],
            trim: true
        },
        area: {
            type: String,
            required: [true, 'Area is required'],
            enum: [
                'Manipal',
                'Udupi',
                'Kaup',
                'Karkala',
                'Kundapura',
                'Brahmavar',
                'Hebri',
                'other'
            ]
        },
        landmarks: [String],
        coordinates: {
            latitude: {
                type: Number,
                min: -90,
                max: 90
            },
            longitude: {
                type: Number,
                min: -180,
                max: 180
            }
        },
        deliveryRadius: {
            type: Number,
            default: 5, // in kilometers
            min: 0,
            max: 50
        }
    },
    
    cuisine: [{
        type: String,
        enum: [
            'South Indian',
            'North Indian',
            'Chinese',
            'Continental',
            'Italian',
            'Mexican',
            'Thai',
            'Japanese',
            'Korean',
            'Fast Food',
            'Street Food',
            'Beverages',
            'Desserts',
            'Bakery',
            'Snacks',
            'Seafood',
            'Vegetarian',
            'Vegan',
            'Jain',
            'Coastal',
            'other'
        ]
    }],
    
    category: {
        type: String,
        required: [true, 'Restaurant category is required'],
        enum: [
            'restaurant',
            'cafe',
            'food_truck',
            'cloud_kitchen',
            'bakery',
            'sweet_shop',
            'juice_center',
            'ice_cream_parlor',
            'dhaba',
            'mess',
            'catering',
            'tiffin_service'
        ]
    },
    
    priceRange: {
        type: String,
        enum: ['budget', 'moderate', 'expensive', 'luxury'],
        default: 'moderate'
    },
    
    averageCostForTwo: {
        type: Number,
        min: 0
    },
    
    images: [String],
    
    coverImage: String,
    
    logo: String,
    
    timings: {
        monday: {
            isOpen: { type: Boolean, default: true },
            openTime: String, // Format: "HH:MM"
            closeTime: String,
            isAllDay: { type: Boolean, default: false }
        },
        tuesday: {
            isOpen: { type: Boolean, default: true },
            openTime: String,
            closeTime: String,
            isAllDay: { type: Boolean, default: false }
        },
        wednesday: {
            isOpen: { type: Boolean, default: true },
            openTime: String,
            closeTime: String,
            isAllDay: { type: Boolean, default: false }
        },
        thursday: {
            isOpen: { type: Boolean, default: true },
            openTime: String,
            closeTime: String,
            isAllDay: { type: Boolean, default: false }
        },
        friday: {
            isOpen: { type: Boolean, default: true },
            openTime: String,
            closeTime: String,
            isAllDay: { type: Boolean, default: false }
        },
        saturday: {
            isOpen: { type: Boolean, default: true },
            openTime: String,
            closeTime: String,
            isAllDay: { type: Boolean, default: false }
        },
        sunday: {
            isOpen: { type: Boolean, default: true },
            openTime: String,
            closeTime: String,
            isAllDay: { type: Boolean, default: false }
        }
    },
    
    specialTimings: [{
        date: Date,
        isOpen: Boolean,
        openTime: String,
        closeTime: String,
        reason: String // Holiday, special event, etc.
    }],
    
    menu: [{
        category: {
            type: String,
            required: true
        },
        items: [{
            name: {
                type: String,
                required: true
            },
            description: String,
            price: {
                type: Number,
                required: true,
                min: 0
            },
            originalPrice: Number, // For discounted items
            image: String,
            isVegetarian: Boolean,
            isVegan: Boolean,
            isJain: Boolean,
            isSpicy: Boolean,
            allergens: [String],
            isAvailable: {
                type: Boolean,
                default: true
            },
            preparationTime: Number, // in minutes
            tags: [String]
        }]
    }],
    
    services: {
        dineIn: {
            type: Boolean,
            default: true
        },
        takeaway: {
            type: Boolean,
            default: true
        },
        delivery: {
            type: Boolean,
            default: false
        },
        catering: {
            type: Boolean,
            default: false
        },
        reservations: {
            type: Boolean,
            default: false
        },
        onlineOrdering: {
            type: Boolean,
            default: false
        }
    },
    
    facilities: {
        wifi: Boolean,
        parking: Boolean,
        airConditioned: Boolean,
        outdoorSeating: Boolean,
        liveMusic: Boolean,
        petFriendly: Boolean,
        wheelchairAccessible: Boolean,
        familyFriendly: Boolean,
        groupDining: Boolean,
        privateEvents: Boolean
    },
    
    paymentMethods: {
        cash: { type: Boolean, default: true },
        card: { type: Boolean, default: false },
        upi: { type: Boolean, default: true },
        netBanking: { type: Boolean, default: false },
        digitalWallets: [String] // PayTM, PhonePe, etc.
    },
    
    offers: [{
        title: {
            type: String,
            required: true
        },
        description: String,
        discountType: {
            type: String,
            enum: ['percentage', 'fixed_amount', 'buy_one_get_one', 'free_item'],
            required: true
        },
        discountValue: Number,
        minOrderAmount: Number,
        maxDiscountAmount: Number,
        validFrom: {
            type: Date,
            required: true
        },
        validUntil: {
            type: Date,
            required: true
        },
        applicableDays: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }],
        isActive: {
            type: Boolean,
            default: true
        },
        usageLimit: Number,
        usedCount: {
            type: Number,
            default: 0
        },
        terms: String
    }],
    
    reviews: [{
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
        comment: String,
        images: [String],
        foodRating: {
            type: Number,
            min: 1,
            max: 5
        },
        serviceRating: {
            type: Number,
            min: 1,
            max: 5
        },
        ambienceRating: {
            type: Number,
            min: 1,
            max: 5
        },
        valueForMoneyRating: {
            type: Number,
            min: 1,
            max: 5
        },
        orderType: {
            type: String,
            enum: ['dine_in', 'takeaway', 'delivery']
        },
        visitDate: Date,
        reviewedAt: {
            type: Date,
            default: Date.now
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        helpfulVotes: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            votedAt: {
                type: Date,
                default: Date.now
            }
        }]
    }],
    
    averageRating: {
        overall: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        food: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        service: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        ambience: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        valueForMoney: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        }
    },
    
    socialLinks: {
        instagram: String,
        facebook: String,
        twitter: String,
        youtube: String,
        zomato: String,
        swiggy: String,
        googleMaps: String
    },
    
    verification: {
        isVerified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verificationDate: Date,
        documents: [String] // URLs to verification documents
    },
    
    status: {
        type: String,
        enum: ['active', 'temporarily_closed', 'permanently_closed', 'under_renovation'],
        default: 'active'
    },
    
    isPromoted: {
        type: Boolean,
        default: false
    },
    
    promotionExpiry: Date,
    
    viewsCount: {
        type: Number,
        default: 0
    },
    
    contactsCount: {
        type: Number,
        default: 0
    },
    
    favorites: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        favoriteAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    reports: [{
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: {
            type: String,
            enum: [
                'incorrect_info',
                'fake_listing',
                'inappropriate_content',
                'spam',
                'permanently_closed',
                'duplicate_listing',
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
        }
    }],
    
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
restaurantSchema.index({ 'location.area': 1, category: 1 });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ 'averageRating.overall': -1 });
restaurantSchema.index({ name: 'text', description: 'text' });
restaurantSchema.index({ isPromoted: 1, createdAt: -1 });
restaurantSchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for total reviews count
restaurantSchema.virtual('totalReviews').get(function() {
    return this.reviews.length;
});

// Virtual for favorite count
restaurantSchema.virtual('favoriteCount').get(function() {
    return this.favorites.length;
});

// Virtual for checking if currently open
restaurantSchema.virtual('isCurrentlyOpen').get(function() {
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    // Check special timings first
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const specialTiming = this.specialTimings.find(st => {
        const specialDate = new Date(st.date);
        specialDate.setHours(0, 0, 0, 0);
        return specialDate.getTime() === today.getTime();
    });
    
    if (specialTiming) {
        if (!specialTiming.isOpen) return false;
        if (specialTiming.openTime <= currentTime && currentTime <= specialTiming.closeTime) {
            return true;
        }
        return false;
    }
    
    // Check regular timings
    const dayTiming = this.timings[currentDay];
    if (!dayTiming.isOpen) return false;
    if (dayTiming.isAllDay) return true;
    
    return dayTiming.openTime <= currentTime && currentTime <= dayTiming.closeTime;
});

// Method to add review
restaurantSchema.methods.addReview = function(userId, reviewData) {
    // Check if user already reviewed
    const existingReviewIndex = this.reviews.findIndex(
        r => r.user.toString() === userId.toString()
    );
    
    if (existingReviewIndex !== -1) {
        // Update existing review
        this.reviews[existingReviewIndex] = {
            ...this.reviews[existingReviewIndex].toObject(),
            ...reviewData,
            user: userId,
            reviewedAt: new Date()
        };
    } else {
        // Add new review
        this.reviews.push({
            ...reviewData,
            user: userId,
            reviewedAt: new Date()
        });
    }
    
    // Recalculate average ratings
    this.calculateAverageRatings();
    
    return this.save();
};

// Method to calculate average ratings
restaurantSchema.methods.calculateAverageRatings = function() {
    if (this.reviews.length === 0) {
        this.averageRating = {
            overall: 0,
            food: 0,
            service: 0,
            ambience: 0,
            valueForMoney: 0
        };
        return;
    }
    
    const totals = this.reviews.reduce((acc, review) => {
        acc.overall += review.rating;
        acc.food += review.foodRating || review.rating;
        acc.service += review.serviceRating || review.rating;
        acc.ambience += review.ambienceRating || review.rating;
        acc.valueForMoney += review.valueForMoneyRating || review.rating;
        return acc;
    }, { overall: 0, food: 0, service: 0, ambience: 0, valueForMoney: 0 });
    
    const count = this.reviews.length;
    
    this.averageRating = {
        overall: Math.round((totals.overall / count) * 10) / 10,
        food: Math.round((totals.food / count) * 10) / 10,
        service: Math.round((totals.service / count) * 10) / 10,
        ambience: Math.round((totals.ambience / count) * 10) / 10,
        valueForMoney: Math.round((totals.valueForMoney / count) * 10) / 10
    };
};

// Method to add to favorites
restaurantSchema.methods.addToFavorites = function(userId) {
    const existingFavorite = this.favorites.find(
        fav => fav.user.toString() === userId.toString()
    );
    
    if (!existingFavorite) {
        this.favorites.push({
            user: userId,
            favoriteAt: new Date()
        });
    }
    
    return this.save();
};

// Method to remove from favorites
restaurantSchema.methods.removeFromFavorites = function(userId) {
    this.favorites = this.favorites.filter(
        fav => fav.user.toString() !== userId.toString()
    );
    
    return this.save();
};

// Method to check if user has favorited
restaurantSchema.methods.isFavoritedBy = function(userId) {
    if (!userId) return false;
    
    return this.favorites.some(
        fav => fav.user.toString() === userId.toString()
    );
};

// Method to increment views
restaurantSchema.methods.incrementViews = function() {
    this.viewsCount += 1;
    return this.save();
};

// Method to increment contacts
restaurantSchema.methods.incrementContacts = function() {
    this.contactsCount += 1;
    return this.save();
};

// Method to add offer
restaurantSchema.methods.addOffer = function(offerData) {
    this.offers.push(offerData);
    return this.save();
};

// Method to get active offers
restaurantSchema.methods.getActiveOffers = function() {
    const now = new Date();
    return this.offers.filter(offer => 
        offer.isActive && 
        offer.validFrom <= now && 
        offer.validUntil >= now &&
        (!offer.usageLimit || offer.usedCount < offer.usageLimit)
    );
};

// Method to soft delete
restaurantSchema.methods.softDelete = function(deletedByUserId) {
    this.isDeleted = true;
    this.deletedBy = deletedByUserId;
    this.deletedAt = new Date();
    return this.save();
};

// Pre-save middleware to calculate average ratings
restaurantSchema.pre('save', function(next) {
    if (this.isModified('reviews')) {
        this.calculateAverageRatings();
    }
    next();
});

// Static method to search restaurants
restaurantSchema.statics.searchRestaurants = function(options = {}) {
    const { 
        query, 
        area, 
        cuisine, 
        category, 
        priceRange, 
        services, 
        minRating,
        isCurrentlyOpen,
        sortBy = 'rating',
        limit = 20,
        skip = 0
    } = options;
    
    let matchQuery = { isDeleted: false, status: 'active' };
    
    if (query) {
        matchQuery.$text = { $search: query };
    }
    
    if (area) {
        matchQuery['location.area'] = area;
    }
    
    if (cuisine) {
        matchQuery.cuisine = { $in: Array.isArray(cuisine) ? cuisine : [cuisine] };
    }
    
    if (category) {
        matchQuery.category = category;
    }
    
    if (priceRange) {
        matchQuery.priceRange = priceRange;
    }
    
    if (services) {
        Object.keys(services).forEach(service => {
            if (services[service]) {
                matchQuery[`services.${service}`] = true;
            }
        });
    }
    
    if (minRating) {
        matchQuery['averageRating.overall'] = { $gte: minRating };
    }
    
    let sortQuery = {};
    switch (sortBy) {
        case 'rating':
            sortQuery = { 'averageRating.overall': -1, totalReviews: -1 };
            break;
        case 'newest':
            sortQuery = { createdAt: -1 };
            break;
        case 'popular':
            sortQuery = { favoriteCount: -1, viewsCount: -1 };
            break;
        case 'promoted':
            sortQuery = { isPromoted: -1, 'averageRating.overall': -1 };
            break;
        default:
            sortQuery = { 'averageRating.overall': -1 };
    }
    
    return this.find(matchQuery)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name username');
};

// Static method to get nearby restaurants
restaurantSchema.statics.getNearby = function(coordinates, maxDistance = 10000) { // 10km default
    return this.find({
        isDeleted: false,
        status: 'active',
        'location.coordinates': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [coordinates.longitude, coordinates.latitude]
                },
                $maxDistance: maxDistance
            }
        }
    })
    .populate('owner', 'name username')
    .limit(50);
};

module.exports = mongoose.model('Restaurant', restaurantSchema);
