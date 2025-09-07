const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient');

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
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, username, is_verified')
            .eq('id', decoded.userId)
            .single();
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }
        
        // Add user to request object
        req.user = {
            userId: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            isVerified: user.is_verified
        };
        
        next();
        
    } catch (error) {
        console.error('Token authentication error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token format'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Token verification failed'
        });
    }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            req.user = null;
            return next();
        }
        
        const decoded = verifyToken(token);
        
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, username, is_verified')
            .eq('id', decoded.userId)
            .single();
        
        if (error || !user) {
            req.user = null;
            return next();
        }
        
        req.user = {
            userId: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            isVerified: user.is_verified
        };
        
        next();
        
    } catch (error) {
        // If there's any error with optional auth, just continue without user
        req.user = null;
        next();
    }
};

// Email validation middleware
const validateEmailFormat = (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required'
        });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address'
        });
    }
    
    // Check if email is from allowed domain (optional)
    const allowedDomains = ['learner.manipal.edu', 'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const emailDomain = email.split('@')[1];
    
    if (!allowedDomains.includes(emailDomain)) {
        console.warn(`Login attempt from non-allowed domain: ${emailDomain}`);
        // Note: We're not blocking it, just logging for now
    }
    
    next();
};

// Rate limiting middleware factory
const userRateLimit = (maxRequests, windowMs) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const clientIp = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        if (!requests.has(clientIp)) {
            requests.set(clientIp, []);
        }
        
        const userRequests = requests.get(clientIp);
        
        // Remove old requests outside the window
        const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
        
        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        validRequests.push(now);
        requests.set(clientIp, validRequests);
        
        next();
    };
};

// Ownership verification middleware
const requireOwnershipOrAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const resourceId = req.params.id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        // Check if user is admin (optional - you can implement admin roles later)
        const { data: user } = await supabase
            .from('users')
            .select('is_verified')
            .eq('id', userId)
            .single();
        
        // For now, we'll determine ownership based on the resource type
        // This will be customized per route
        req.isOwner = true; // This should be set by individual routes
        req.isAdmin = user?.is_verified || false; // Using is_verified as a simple admin flag
        
        next();
        
    } catch (error) {
        console.error('Ownership verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying ownership'
        });
    }
};

// Admin/Moderator requirement middleware
const requireModerator = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        const { data: user, error } = await supabase
            .from('users')
            .select('is_verified')
            .eq('id', userId)
            .single();
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // For now, using is_verified as moderator flag
        // You can add a separate moderator role later
        if (!user.is_verified) {
            return res.status(403).json({
                success: false,
                message: 'Moderator privileges required'
            });
        }
        
        next();
        
    } catch (error) {
        console.error('Moderator verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying moderator status'
        });
    }
};

module.exports = {
    generateToken,
    verifyToken,
    authenticateToken,
    optionalAuth,
    validateEmailFormat,
    userRateLimit,
    requireOwnershipOrAdmin,
    requireModerator
};
