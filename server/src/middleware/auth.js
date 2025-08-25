const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'mit_reddit_secret_key_2024';

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId }, 
        JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );
};

// Verify JWT token
const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }
        
        // Verify token
        const decoded = verifyToken(token);
        
        // Get user from database
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }
        
        // Check if user account is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }
        
        // Attach user to request
        req.user = user;
        next();
        
    } catch (error) {
        console.error('Authentication error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            const decoded = verifyToken(token);
            const user = await User.findById(decoded.userId).select('-password');
            
            if (user && user.isActive) {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin privileges required'
            });
        }
        
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Authorization error'
        });
    }
};

// Moderator middleware
const requireModerator = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        if (!['admin', 'moderator'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Moderator privileges required'
            });
        }
        
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Authorization error'
        });
    }
};

// Check if user owns resource or is admin
const requireOwnershipOrAdmin = (resourceUserField = 'author') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            // Admin can access anything
            if (req.user.role === 'admin') {
                return next();
            }
            
            // Check ownership based on the resource
            const resourceId = req.params.id;
            let resource;
            
            // Determine resource type based on route
            if (req.baseUrl.includes('posts')) {
                const Post = require('../models/Post');
                resource = await Post.findById(resourceId);
            } else if (req.baseUrl.includes('comments')) {
                const Comment = require('../models/Comment');
                resource = await Comment.findById(resourceId);
            } else if (req.baseUrl.includes('events')) {
                const Event = require('../models/Event');
                resource = await Event.findById(resourceId);
            }
            
            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'
                });
            }
            
            // Check if user owns the resource
            if (resource[resourceUserField].toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - you can only modify your own content'
                });
            }
            
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Authorization error'
            });
        }
    };
};

// Rate limiting for specific users
const userRateLimit = (maxRequests = 10, windowMs = 60000) => {
    const userRequestCounts = new Map();
    
    return (req, res, next) => {
        if (!req.user) {
            return next();
        }
        
        const userId = req.user._id.toString();
        const currentTime = Date.now();
        const windowStart = currentTime - windowMs;
        
        // Get user's request history
        let userRequests = userRequestCounts.get(userId) || [];
        
        // Remove old requests outside the time window
        userRequests = userRequests.filter(requestTime => requestTime > windowStart);
        
        // Check if user has exceeded the limit
        if (userRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: `Too many requests. Maximum ${maxRequests} requests per ${windowMs/1000} seconds.`,
                retryAfter: Math.ceil((userRequests[0] - windowStart) / 1000)
            });
        }
        
        // Add current request
        userRequests.push(currentTime);
        userRequestCounts.set(userId, userRequests);
        
        // Clean up old entries periodically
        if (Math.random() < 0.01) { // 1% chance
            for (const [userId, requests] of userRequestCounts.entries()) {
                const filteredRequests = requests.filter(requestTime => requestTime > windowStart);
                if (filteredRequests.length === 0) {
                    userRequestCounts.delete(userId);
                } else {
                    userRequestCounts.set(userId, filteredRequests);
                }
            }
        }
        
        next();
    };
};

// Validate Manipal email domain
const validateManipalEmail = (req, res, next) => {
    const { email } = req.body;
    
    if (email && !email.endsWith('@manipal.edu')) {
        return res.status(400).json({
            success: false,
            message: 'Please use your Manipal University email address (@manipal.edu)'
        });
    }
    
    next();
};

// Check account verification status
const requireVerifiedEmail = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    if (!req.user.emailVerified) {
        return res.status(403).json({
            success: false,
            message: 'Email verification required. Please check your email.',
            requiresVerification: true
        });
    }
    
    next();
};

module.exports = {
    generateToken,
    verifyToken,
    authenticateToken,
    optionalAuth,
    requireAdmin,
    requireModerator,
    requireOwnershipOrAdmin,
    userRateLimit,
    validateManipalEmail,
    requireVerifiedEmail
};
