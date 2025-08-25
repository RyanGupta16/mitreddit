const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { 
    generateToken, 
    authenticateToken, 
    validateEmailFormat,
    userRateLimit 
} = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', validateEmailFormat, userRateLimit(3, 15 * 60 * 1000), async (req, res) => {
    try {
        const { name, email, password, branch, year } = req.body;
        
        // Validation
        if (!name || !email || !password || !branch || !year) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email: email.toLowerCase() }]
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        
        // Generate a unique username from the name
        const generateUsername = (name) => {
            const baseUsername = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
            const randomSuffix = Math.floor(Math.random() * 10000);
            return `${baseUsername}${randomSuffix}`;
        };
        
        const username = generateUsername(name);
        
        // Create new user
        const user = new User({
            name: name.trim(),
            username,
            email: email.toLowerCase().trim(),
            password,
            branch,
            year,
            emailVerificationToken: crypto.randomBytes(32).toString('hex')
        });
        
        await user.save();
        
        // Track analytics
        try {
            const analytics = new Analytics({
                type: 'user_signup',
                userId: user._id,
                metadata: {
                    userAgent: req.get('User-Agent'),
                    ip: req.ip || req.connection.remoteAddress,
                    branch: user.branch,
                    year: user.year
                }
            });
            await analytics.save();
        } catch (analyticsError) {
            console.error('Analytics tracking error:', analyticsError);
        }
        
        // Generate JWT token
        const token = generateToken(user._id);
        
        // Update user stats
        user.loginCount += 1;
        user.lastLogin = new Date();
        await user.save();
        
        // Return user data without password
        const userData = user.toJSON();
        userData.token = token;
        
        res.status(201).json({
            success: true,
            message: 'Account created successfully! Welcome to MIT Reddit.',
            data: userData
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({
                success: false,
                message: `${field === 'email' ? 'Email' : 'Username'} already exists`
            });
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: errors[0]
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', userRateLimit(5, 15 * 60 * 1000), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        // Find user by email (include password for comparison)
        const user = await User.findOne({ 
            email: email.toLowerCase().trim() 
        }).select('+password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }
        
        // Check if user is suspended
        if (user.isSuspended()) {
            const activeSuspension = user.suspensions.find(s => 
                s.isActive && s.endDate && new Date() < s.endDate
            );
            
            return res.status(403).json({
                success: false,
                message: `Your account is suspended until ${activeSuspension.endDate.toDateString()}. Reason: ${activeSuspension.reason}`
            });
        }
        
        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Generate JWT token
        const token = generateToken(user._id);
        
        // Update login stats
        user.loginCount += 1;
        user.lastLogin = new Date();
        await user.save();
        
        // Track analytics
        try {
            const analytics = new Analytics({
                type: 'user_login',
                userId: user._id,
                metadata: {
                    userAgent: req.get('User-Agent'),
                    ip: req.ip || req.connection.remoteAddress,
                    loginCount: user.loginCount
                }
            });
            await analytics.save();
        } catch (analyticsError) {
            console.error('Analytics tracking error:', analyticsError);
        }
        
        // Return user data
        const userData = user.toJSON();
        userData.token = token;
        
        res.json({
            success: true,
            message: 'Login successful',
            data: userData
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // In a more complex setup, you might want to blacklist the token
        // For now, we'll just return success and let client handle token removal
        
        res.json({
            success: true,
            message: 'Logout successful'
        });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout'
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('savedPosts', 'title category createdAt')
            .select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: user
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        // Generate new token
        const newToken = generateToken(req.user._id);
        
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken
            }
        });
        
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during token refresh'
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', userRateLimit(3, 60 * 60 * 1000), async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        if (!user) {
            // Don't reveal if email exists or not
            return res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        
        await user.save();
        
        // In a real app, you would send an email here
        console.log(`Password reset token for ${email}: ${resetToken}`);
        
        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', userRateLimit(5, 60 * 60 * 1000), async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }
        
        // Find user by reset token
        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }
        
        // Update password
        user.password = newPassword;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Password reset successful. You can now log in with your new password.'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change password (when logged in)
// @access  Private
router.put('/change-password', authenticateToken, userRateLimit(5, 60 * 60 * 1000), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }
        
        // Get user with password
        const user = await User.findById(req.user._id).select('+password');
        
        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/verify-email/:token
// @desc    Verify email address
// @access  Public
router.post('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const user = await User.findOne({ 
            emailVerificationToken: token 
        });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification token'
            });
        }
        
        user.emailVerified = true;
        user.emailVerificationToken = null;
        await user.save();
        
        res.json({
            success: true,
            message: 'Email verified successfully'
        });
        
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Private
router.post('/resend-verification', authenticateToken, userRateLimit(3, 60 * 60 * 1000), async (req, res) => {
    try {
        const user = req.user;
        
        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified'
            });
        }
        
        // Generate new verification token
        user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
        await user.save();
        
        // In a real app, send verification email here
        console.log(`Verification token for ${user.email}: ${user.emailVerificationToken}`);
        
        res.json({
            success: true,
            message: 'Verification email sent'
        });
        
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
