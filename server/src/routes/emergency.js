const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// EMERGENCY AUTH SYSTEM - BYPASSES EVERYTHING
const JWT_SECRET = 'emergency_secret_2024';
const tempUsers = new Map();

// @route   POST /api/emergency/signup
// @desc    EMERGENCY signup that works no matter what
// @access  Public
router.post('/signup', async (req, res) => {
    try {
        console.log('🚨 EMERGENCY SIGNUP TRIGGERED');
        const { name, email, password, branch, year } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }
        
        // Check if user exists
        if (tempUsers.has(email.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const userId = 'emergency_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const user = {
            id: userId,
            name: name.trim(),
            email: email.toLowerCase(),
            username: name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.floor(Math.random() * 1000),
            password_hash: hashedPassword,
            branch: branch || 'Unknown',
            year: parseInt(year) || 1,
            reputation: 0,
            created_at: new Date().toISOString()
        };
        
        tempUsers.set(email.toLowerCase(), user);
        
        // Generate token
        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
        
        console.log('🚨 EMERGENCY SIGNUP SUCCESS:', userId);
        
        res.status(201).json({
            success: true,
            message: 'EMERGENCY AUTH: Account created successfully!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                branch: user.branch,
                year: user.year,
                reputation: user.reputation
            }
        });
        
    } catch (error) {
        console.error('🚨 EMERGENCY SIGNUP ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Emergency auth system error: ' + error.message
        });
    }
});

// @route   POST /api/emergency/login
// @desc    EMERGENCY login that works no matter what
// @access  Public
router.post('/login', async (req, res) => {
    try {
        console.log('🚨 EMERGENCY LOGIN TRIGGERED');
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        // Find user
        const user = tempUsers.get(email.toLowerCase());
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Check password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Generate token
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
        
        console.log('🚨 EMERGENCY LOGIN SUCCESS:', user.id);
        
        res.json({
            success: true,
            message: 'EMERGENCY AUTH: Login successful!',
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
        console.error('🚨 EMERGENCY LOGIN ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Emergency auth system error: ' + error.message
        });
    }
});

// @route   GET /api/emergency/status
// @desc    Emergency system status
// @access  Public
router.get('/status', (req, res) => {
    res.json({
        success: true,
        message: '🚨 EMERGENCY AUTH SYSTEM ONLINE',
        timestamp: new Date().toISOString(),
        userCount: tempUsers.size,
        version: 'EMERGENCY_1.0',
        status: 'FULLY_OPERATIONAL'
    });
});

module.exports = router;
