// Simple analytics monitor script
const mongoose = require('mongoose');
const Analytics = require('./src/models/Analytics');
const User = require('./src/models/User');
const Post = require('./src/models/Post');
require('dotenv').config();

async function showAnalytics() {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manipal_reddit';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('\n🔍 MIT REDDIT ANALYTICS MONITOR\n');
        console.log('═'.repeat(50));

        // Basic counts
        const totalUsers = await User.countDocuments();
        const totalPosts = await Post.countDocuments();
        const totalPageViews = await Analytics.countDocuments({ type: 'page_view' });
        
        // Today's activity
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySignups = await Analytics.countDocuments({
            type: 'user_signup',
            date: { $gte: today }
        });
        
        const todayLogins = await Analytics.countDocuments({
            type: 'user_login',
            date: { $gte: today }
        });
        
        const todayPageViews = await Analytics.countDocuments({
            type: 'page_view',
            date: { $gte: today }
        });

        // Last hour activity
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentPageViews = await Analytics.countDocuments({
            type: 'page_view',
            date: { $gte: oneHourAgo }
        });

        // Active users (last 15 minutes)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const activeUsersData = await Analytics.aggregate([
            {
                $match: {
                    date: { $gte: fifteenMinutesAgo },
                    userId: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$userId'
                }
            },
            {
                $count: 'activeUsers'
            }
        ]);

        const activeUsers = activeUsersData[0]?.activeUsers || 0;

        // Popular pages today
        const popularPagesToday = await Analytics.aggregate([
            {
                $match: {
                    type: 'page_view',
                    date: { $gte: today }
                }
            },
            {
                $group: {
                    _id: '$metadata.page',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Recent activity
        const recentActivity = await Analytics.find({
            date: { $gte: fifteenMinutesAgo }
        })
        .populate('userId', 'name')
        .sort({ date: -1 })
        .limit(5);

        // Display results
        console.log('📊 OVERVIEW:');
        console.log(`   Total Users: ${totalUsers}`);
        console.log(`   Total Posts: ${totalPosts}`);
        console.log(`   Total Page Views: ${totalPageViews}`);
        console.log();

        console.log('📅 TODAY\'S ACTIVITY:');
        console.log(`   New Signups: ${todaySignups}`);
        console.log(`   Logins: ${todayLogins}`);
        console.log(`   Page Views: ${todayPageViews}`);
        console.log();

        console.log('⚡ LIVE STATS:');
        console.log(`   Active Users (15 min): ${activeUsers}`);
        console.log(`   Page Views (1 hour): ${recentPageViews}`);
        console.log();

        if (popularPagesToday.length > 0) {
            console.log('🔥 POPULAR PAGES TODAY:');
            popularPagesToday.forEach((page, index) => {
                console.log(`   ${index + 1}. ${page._id || 'Home'}: ${page.count} views`);
            });
            console.log();
        }

        if (recentActivity.length > 0) {
            console.log('🕐 RECENT ACTIVITY:');
            recentActivity.forEach(activity => {
                const time = new Date(activity.date).toLocaleTimeString();
                const user = activity.userId?.name || 'Anonymous';
                const action = activity.type.replace('_', ' ').toUpperCase();
                console.log(`   ${time} - ${user}: ${action}`);
            });
        }

        console.log('\n═'.repeat(50));
        console.log('💡 Tip: Login as admin@learner.manipal.edu to access full analytics dashboard');
        
        process.exit(0);

    } catch (error) {
        console.error('❌ Error fetching analytics:', error);
        process.exit(1);
    }
}

// Run analytics monitor if this file is executed directly
if (require.main === module) {
    showAnalytics();
}

module.exports = showAnalytics;
