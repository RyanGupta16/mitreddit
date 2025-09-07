const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
const { 
    generateToken, 
    authenticateToken, 
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
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        
        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email.toLowerCase())
            .single();
        
        if (existingUser && !checkError) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        
        // Generate a unique username from the name
        let username = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Check if username exists and make it unique
        let usernameExists = true;
        let counter = 1;
        let finalUsername = username;
        
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
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                name: name.trim(),
                email: email.toLowerCase(),
                username: finalUsername,
                password_hash: hashedPassword,
                branch: branch,
                year: parseInt(year),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (insertError) {
            console.error('User creation error:', insertError);
            return res.status(500).json({
                success: false,
                message: 'Error creating user account'
            });
        }
        
        // Generate JWT token
        const token = generateToken(newUser.id);
        
        // Track analytics
        await trackAnalytics('user_signup', newUser.id, {
            branch: branch,
            year: year
        });
        
        // Return success response
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                username: newUser.username,
                branch: newUser.branch,
                year: newUser.year,
                reputation: newUser.reputation || 0
            }
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during signup'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateEmailFormat, userRateLimit(5, 15 * 60 * 1000), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        // Find user by email
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Generate JWT token
        const token = generateToken(user.id);
        
        // Track analytics
        await trackAnalytics('user_login', user.id);
        
        // Return success response
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                branch: user.branch,
                year: user.year,
                reputation: user.reputation || 0,
                avatar_url: user.avatar_url || ''
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, username, branch, year, reputation, avatar_url, bio, is_verified, created_at')
            .eq('id', req.user.userId)
            .single();
        
        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: user
        });
        
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile'
        });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, bio, branch, year } = req.body;
        const userId = req.user.userId;
        
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (bio !== undefined) updateData.bio = bio.trim();
        if (branch) updateData.branch = branch;
        if (year) updateData.year = parseInt(year);
        
        updateData.updated_at = new Date().toISOString();
        
        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select('id, name, email, username, branch, year, reputation, avatar_url, bio, is_verified')
            .single();
        
        if (error) {
            console.error('Profile update error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error updating profile'
            });
        }
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });
        
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile'
        });
    }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authenticateToken, userRateLimit(3, 60 * 60 * 1000), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;
        
        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }
        
        // Get current user
        const { data: user, error } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .single();
        
        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedNewPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (updateError) {
            console.error('Password update error:', updateError);
            return res.status(500).json({
                success: false,
                message: 'Error updating password'
            });
        }
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error changing password'
        });
    }
});

// @route   POST /api/auth/verify-token
// @desc    Verify JWT token
// @access  Private
router.post('/verify-token', authenticateToken, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, username, branch, year, reputation, avatar_url, is_verified')
            .eq('id', req.user.userId)
            .single();
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        res.json({
            success: true,
            message: 'Token is valid',
            user: user
        });
        
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error verifying token'
        });
    }
});

module.exports = router;
