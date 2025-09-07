const express = require('express');
const supabase = require('../config/supabaseClient'); // Service role client
const supabaseAuth = require('../config/supabaseAuthClient'); // Auth client
const { 
    validateEmailFormat,
    userRateLimit 
} = require('../middleware/auth');

const router = express.Router();

// Helper function to track analytics
const trackAnalytics = async (eventType, userId = null, metadata = {}) => {
    try {
        const { error } = await supabase
            .from('analytics')
            .insert({
                event_type: eventType,
                user_id: userId,
                metadata: metadata,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Analytics tracking error:', error);
        }
    } catch (err) {
        console.error('Analytics tracking failed:', err);
    }
};

// Helper function to create or update user profile
const createUserProfile = async (authUser, additionalData = {}) => {
    try {
        // Check if profile already exists
        const { data: existingProfile } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', authUser.id)
            .single();

        if (existingProfile) {
            return existingProfile;
        }

        // Generate username from email or name
        let username = authUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Ensure username is unique
        let finalUsername = username;
        let counter = 1;
        let usernameExists = true;
        
        while (usernameExists) {
            const { data: userCheck } = await supabase
                .from('users')
                .select('id')
                .eq('username', finalUsername)
                .single();
            
            if (!userCheck) {
                usernameExists = false;
            } else {
                finalUsername = `${username}${counter}`;
                counter++;
            }
        }

        // Create user profile
        const { data: newProfile, error } = await supabase
            .from('users')
            .insert({
                name: additionalData.name || authUser.user_metadata?.name || authUser.email.split('@')[0],
                email: authUser.email,
                username: finalUsername,
                branch: additionalData.branch || '',
                year: additionalData.year || 1,
                auth_user_id: authUser.id,
                migrated_to_auth: true,
                password_hash: '', // Not needed for Supabase auth
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }

        return newProfile;
    } catch (error) {
        console.error('Error in createUserProfile:', error);
        throw error;
    }
};

// @route   POST /api/auth/supabase/signup
// @desc    Register a new user using Supabase Auth
// @access  Public
router.post('/signup', validateEmailFormat, userRateLimit(3, 15 * 60 * 1000), async (req, res) => {
    try {
        if (!supabaseAuth) {
            return res.status(503).json({
                success: false,
                message: 'Supabase Auth is not configured'
            });
        }

        const { name, email, password, branch, year } = req.body;
        
        // Validation
        if (!name || !email || !password || !branch || !year) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
            email: email.toLowerCase(),
            password: password,
            options: {
                data: {
                    name: name,
                    branch: branch,
                    year: year
                }
            }
        });

        if (authError) {
            console.error('Supabase signup error:', authError);
            return res.status(400).json({
                success: false,
                message: authError.message
            });
        }

        if (!authData.user) {
            return res.status(400).json({
                success: false,
                message: 'Failed to create user account'
            });
        }

        // Create user profile in our custom table
        const profile = await createUserProfile(authData.user, {
            name,
            branch,
            year: parseInt(year)
        });

        // Track analytics
        await trackAnalytics('supabase_user_signup', profile.id, {
            branch: branch,
            year: year,
            auth_provider: 'supabase'
        });

        // Return success response
        res.status(201).json({
            success: true,
            message: authData.user.email_confirmed_at 
                ? 'Account created successfully' 
                : 'Account created successfully. Please check your email for verification.',
            user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                username: profile.username,
                branch: profile.branch,
                year: profile.year,
                reputation: profile.reputation || 0,
                emailConfirmed: !!authData.user.email_confirmed_at
            },
            session: authData.session,
            needsEmailVerification: !authData.user.email_confirmed_at
        });
        
    } catch (error) {
        console.error('Supabase signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during signup'
        });
    }
});

// @route   POST /api/auth/supabase/login
// @desc    Login user using Supabase Auth
// @access  Public
router.post('/login', validateEmailFormat, userRateLimit(5, 15 * 60 * 1000), async (req, res) => {
    try {
        if (!supabaseAuth) {
            return res.status(503).json({
                success: false,
                message: 'Supabase Auth is not configured'
            });
        }

        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
            email: email.toLowerCase(),
            password: password
        });

        if (authError) {
            console.error('Supabase login error:', authError);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!authData.user) {
            return res.status(401).json({
                success: false,
                message: 'Login failed'
            });
        }

        // Get or create user profile
        let profile = await createUserProfile(authData.user);

        // Track analytics
        await trackAnalytics('supabase_user_login', profile.id, {
            auth_provider: 'supabase'
        });

        // Return success response
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                username: profile.username,
                branch: profile.branch,
                year: profile.year,
                reputation: profile.reputation || 0,
                avatar_url: profile.avatar_url || '',
                emailConfirmed: !!authData.user.email_confirmed_at
            },
            session: authData.session
        });
        
    } catch (error) {
        console.error('Supabase login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// @route   POST /api/auth/supabase/logout
// @desc    Logout user using Supabase Auth
// @access  Private
router.post('/logout', async (req, res) => {
    try {
        if (!supabaseAuth) {
            return res.status(503).json({
                success: false,
                message: 'Supabase Auth is not configured'
            });
        }

        const { error } = await supabaseAuth.auth.signOut();
        
        if (error) {
            console.error('Supabase logout error:', error);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
        
    } catch (error) {
        console.error('Supabase logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout'
        });
    }
});

// @route   POST /api/auth/supabase/refresh
// @desc    Refresh auth session
// @access  Public
router.post('/refresh', async (req, res) => {
    try {
        if (!supabaseAuth) {
            return res.status(503).json({
                success: false,
                message: 'Supabase Auth is not configured'
            });
        }

        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        const { data, error } = await supabaseAuth.auth.refreshSession({
            refresh_token: refresh_token
        });

        if (error) {
            console.error('Token refresh error:', error);
            return res.status(401).json({
                success: false,
                message: 'Failed to refresh token'
            });
        }

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            session: data.session
        });
        
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during token refresh'
        });
    }
});

// @route   POST /api/auth/supabase/reset-password
// @desc    Send password reset email
// @access  Public
router.post('/reset-password', validateEmailFormat, userRateLimit(3, 60 * 60 * 1000), async (req, res) => {
    try {
        if (!supabaseAuth) {
            return res.status(503).json({
                success: false,
                message: 'Supabase Auth is not configured'
            });
        }

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.SITE_URL || 'http://localhost:5000'}/reset-password`
        });

        if (error) {
            console.error('Password reset error:', error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true,
            message: 'Password reset email sent successfully'
        });
        
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during password reset'
        });
    }
});

module.exports = router;
