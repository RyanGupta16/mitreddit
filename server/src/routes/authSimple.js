const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
    validateEmailFormat,
    userRateLimit 
} = require('../middleware/auth');

const router = express.Router();

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'mit_reddit_secret_key_2024';

// Simple in-memory user storage for testing (temporary)
const tempUsers = new Map();

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId }, 
        JWT_SECRET, 
        { expiresIn: '30d' }
    );
};

// @route   POST /api/auth/simple/signup
// @desc    Simple signup without database dependency
// @access  Public
router.post('/signup', validateEmailFormat, userRateLimit(3, 15 * 60 * 1000), async (req, res) => {
    try {
        const { name, email, password, branch, year } = req.body;
        
        console.log('🧪 Simple signup attempt:', { name, email, branch, year });
        
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
        
        // Check if user already exists (in memory)
        if (tempUsers.has(email.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Generate unique user ID
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const username = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.floor(Math.random() * 1000);
        
        // Store user in memory (temporary)
        const newUser = {
            id: userId,
            name: name.trim(),
            email: email.toLowerCase(),
            username: username,
            password_hash: hashedPassword,
            branch: branch,
            year: parseInt(year),
            reputation: 0,
            created_at: new Date().toISOString()
        };
        
        tempUsers.set(email.toLowerCase(), newUser);
        
        // Generate JWT token
        const token = generateToken(userId);
        
        console.log('✅ Simple signup successful:', { userId, email });
        
        // Return success response
        res.status(201).json({
            success: true,
            message: 'Account created successfully (temporary storage)',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                username: newUser.username,
                branch: newUser.branch,
                year: newUser.year,
                reputation: newUser.reputation
            }
        });
        
    } catch (error) {
        console.error('Simple signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during signup'
        });
    }
});

// @route   POST /api/auth/simple/login
// @desc    Simple login without database dependency
// @access  Public
router.post('/login', validateEmailFormat, userRateLimit(5, 15 * 60 * 1000), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🧪 Simple login attempt:', { email });
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        // Find user in memory
        const user = tempUsers.get(email.toLowerCase());
        
        if (!user) {
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
        
        console.log('✅ Simple login successful:', { userId: user.id, email });
        
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
                reputation: user.reputation,
                avatar_url: ''
            }
        });
        
    } catch (error) {
        console.error('Simple login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// @route   GET /api/auth/simple/test
// @desc    Test endpoint to verify simple auth is working
// @access  Public
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Simple auth routes are working!',
        timestamp: new Date().toISOString(),
        userCount: tempUsers.size
    });
});

module.exports = router;
