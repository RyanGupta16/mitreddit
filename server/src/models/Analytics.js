const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now,
        index: true
    },
    type: {
        type: String,
        enum: [
            'page_view',
            'user_signup',
            'user_login',
            'post_created',
            'comment_created',
            'study_request_created',
            'event_viewed',
            'news_viewed',
            'restaurant_viewed',
            'search_performed'
        ],
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    metadata: {
        page: String,
        userAgent: String,
        ip: String,
        category: String,
        searchTerm: String,
        postId: String,
        duration: Number, // time spent on page in seconds
        referrer: String,
        deviceType: String, // mobile, desktop, tablet
        browser: String,
        os: String
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
analyticsSchema.index({ date: 1, type: 1 });
analyticsSchema.index({ userId: 1, date: -1 });
analyticsSchema.index({ 'metadata.page': 1, date: 1 });

// TTL index to automatically delete old analytics data after 1 year
analyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('Analytics', analyticsSchema);
