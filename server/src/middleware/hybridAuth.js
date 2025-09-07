const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient'); // Service role client
const supabaseAuth = require('../config/supabaseAuthClient'); // Auth client

// JWT secret key for custom auth
const JWT_SECRET = process.env.JWT_SECRET || 'mit_reddit_secret_key_2024';

// Verify custom JWT token
const verifyCustomToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

// Verify Supabase JWT token
const verifySupabaseToken = async (token) => {
    if (!supabaseAuth) return null;
    
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (error || !user) return null;
    
    return user;
};

// Hybrid authentication middleware
const hybridAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        let user = null;
        let authType = null;

        // Try Supabase auth first (for new users)
        try {
            const supabaseUser = await verifySupabaseToken(token);
            if (supabaseUser) {
                // Get user profile from our custom table
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('auth_user_id', supabaseUser.id)
                    .single();

                if (!error && profile) {
                    user = {
                        userId: profile.id,
                        name: profile.name,
                        email: profile.email,
                        username: profile.username,
                        isVerified: profile.is_verified,
                        authUserId: supabaseUser.id,
                        supabaseUser: supabaseUser
                    };
                    authType = 'supabase';
                }
            }
        } catch (error) {
            // Supabase auth failed, try custom auth
        }

        // Fallback to custom auth (for existing users)
        if (!user) {
            try {
                const decoded = verifyCustomToken(token);
                
                // Get user from database using custom auth
                const { data: customUser, error } = await supabase
                    .from('users')
                    .select('id, name, email, username, is_verified')
                    .eq('id', decoded.userId)
                    .single();
                
                if (!error && customUser) {
                    user = {
                        userId: customUser.id,
                        name: customUser.name,
                        email: customUser.email,
                        username: customUser.username,
                        isVerified: customUser.is_verified
                    };
                    authType = 'custom';
                }
            } catch (error) {
                // Custom auth also failed
            }
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }

        // Add user and auth type to request object
        req.user = user;
        req.authType = authType;
        
        next();
        
    } catch (error) {
        console.error('Hybrid authentication error:', error);
        
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

// Optional hybrid authentication (doesn't fail if no token)
const optionalHybridAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            req.user = null;
            req.authType = null;
            return next();
        }
        
        // Use the same logic as hybridAuth but don't fail
        await hybridAuth(req, res, (error) => {
            if (error) {
                req.user = null;
                req.authType = null;
            }
            next();
        });
        
    } catch (error) {
        // If there's any error with optional auth, just continue without user
        req.user = null;
        req.authType = null;
        next();
    }
};

module.exports = {
    hybridAuth,
    optionalHybridAuth,
    verifyCustomToken,
    verifySupabaseToken
};
