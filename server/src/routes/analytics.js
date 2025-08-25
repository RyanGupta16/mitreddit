const express = require('express');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const StudyBuddy = require('../models/StudyBuddy');
const Event = require('../models/Event');
const News = require('../models/News');
const Restaurant = require('../models/Restaurant');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Middleware to track analytics
const trackAnalytics = async (type, userId, metadata = {}) => {
    try {
        const analytics = new Analytics({
            type,
            userId,
            metadata: {
                ...metadata,
                timestamp: new Date()
            }
        });
        await analytics.save();
    } catch (error) {
        console.error('Analytics tracking error:', error);
    }
};

// Track page view
router.post('/track', async (req, res) => {
    try {
        const { type, page, userAgent, referrer, duration } = req.body;
        const userId = req.user?.userId || null;
        const ip = req.ip || req.connection.remoteAddress;

        // Parse user agent for device info
        const deviceType = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 
                          /Tablet|iPad/.test(userAgent) ? 'tablet' : 'desktop';
        
        const browser = userAgent.includes('Chrome') ? 'Chrome' :
                       userAgent.includes('Firefox') ? 'Firefox' :
                       userAgent.includes('Safari') ? 'Safari' :
                       userAgent.includes('Edge') ? 'Edge' : 'Other';

        const os = userAgent.includes('Windows') ? 'Windows' :
                  userAgent.includes('Mac') ? 'MacOS' :
                  userAgent.includes('Linux') ? 'Linux' :
                  userAgent.includes('Android') ? 'Android' :
                  userAgent.includes('iOS') ? 'iOS' : 'Other';

        await trackAnalytics(type, userId, {
            page,
            userAgent,
            ip,
            referrer,
            duration,
            deviceType,
            browser,
            os
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking analytics:', error);
        res.status(500).json({ message: 'Error tracking analytics' });
    }
});

// Get dashboard statistics (admin only)
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.setDate(now.getDate() - 7));
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Basic counts
        const totalUsers = await User.countDocuments();
        const totalPosts = await Post.countDocuments();
        const totalComments = await Comment.countDocuments();
        const totalStudyRequests = await StudyBuddy.countDocuments();

        // Today's activity
        const todayUsers = await User.countDocuments({ createdAt: { $gte: today } });
        const todayPosts = await Post.countDocuments({ createdAt: { $gte: today } });
        const todayComments = await Comment.countDocuments({ createdAt: { $gte: today } });
        
        // Page views
        const todayPageViews = await Analytics.countDocuments({
            type: 'page_view',
            date: { $gte: today }
        });

        const weeklyPageViews = await Analytics.countDocuments({
            type: 'page_view',
            date: { $gte: thisWeek }
        });

        // Most popular pages
        const popularPages = await Analytics.aggregate([
            {
                $match: {
                    type: 'page_view',
                    date: { $gte: thisWeek }
                }
            },
            {
                $group: {
                    _id: '$metadata.page',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Device breakdown
        const deviceStats = await Analytics.aggregate([
            {
                $match: {
                    type: 'page_view',
                    date: { $gte: thisWeek }
                }
            },
            {
                $group: {
                    _id: '$metadata.deviceType',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Browser breakdown
        const browserStats = await Analytics.aggregate([
            {
                $match: {
                    type: 'page_view',
                    date: { $gte: thisWeek }
                }
            },
            {
                $group: {
                    _id: '$metadata.browser',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Daily activity for the past week
        const dailyActivity = await Analytics.aggregate([
            {
                $match: {
                    date: { $gte: thisWeek }
                }
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$date'
                            }
                        },
                        type: '$type'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        // Most active users
        const activeUsers = await Analytics.aggregate([
            {
                $match: {
                    userId: { $exists: true, $ne: null },
                    date: { $gte: thisWeek }
                }
            },
            {
                $group: {
                    _id: '$userId',
                    activityCount: { $sum: 1 }
                }
            },
            { $sort: { activityCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    activityCount: 1,
                    user: { $arrayElemAt: ['$user', 0] }
                }
            }
        ]);

        // User growth over time
        const userGrowth = await User.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } },
            { $limit: 30 } // Last 30 days
        ]);

        res.json({
            overview: {
                totalUsers,
                totalPosts,
                totalComments,
                totalStudyRequests,
                todayUsers,
                todayPosts,
                todayComments,
                todayPageViews,
                weeklyPageViews
            },
            popularPages,
            deviceStats,
            browserStats,
            dailyActivity,
            activeUsers,
            userGrowth
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// Get real-time statistics
router.get('/realtime', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        
        // Active users in last 15 minutes
        const activeUsers = await Analytics.aggregate([
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

        // Page views in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentPageViews = await Analytics.countDocuments({
            type: 'page_view',
            date: { $gte: oneHourAgo }
        });

        // Recent activity
        const recentActivity = await Analytics.find({
            date: { $gte: fifteenMinutesAgo }
        })
        .populate('userId', 'name branch')
        .sort({ date: -1 })
        .limit(20);

        res.json({
            activeUsers: activeUsers[0]?.activeUsers || 0,
            recentPageViews,
            recentActivity
        });

    } catch (error) {
        console.error('Error fetching realtime data:', error);
        res.status(500).json({ message: 'Error fetching realtime data' });
    }
});

// Export analytics data
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;
        
        const filter = {};
        
        if (startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        if (type) {
            filter.type = type;
        }

        const data = await Analytics.find(filter)
            .populate('userId', 'name email branch')
            .sort({ date: -1 })
            .limit(10000); // Limit for performance

        // Convert to CSV format
        const csvHeader = 'Date,Type,User,Email,Branch,Page,Device,Browser,OS,IP\n';
        const csvData = data.map(record => [
            record.date.toISOString(),
            record.type,
            record.userId?.name || 'Anonymous',
            record.userId?.email || '',
            record.userId?.branch || '',
            record.metadata?.page || '',
            record.metadata?.deviceType || '',
            record.metadata?.browser || '',
            record.metadata?.os || '',
            record.metadata?.ip || ''
        ].join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics_export.csv');
        res.send(csvHeader + csvData);

    } catch (error) {
        console.error('Error exporting analytics data:', error);
        res.status(500).json({ message: 'Error exporting analytics data' });
    }
});

module.exports = { router, trackAnalytics };
