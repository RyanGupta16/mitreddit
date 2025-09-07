const express = require('express');
const router = express.Router();

// @route   GET /api/test
// @desc    Simple test endpoint to verify deployment
// @access  Public
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Server is working! 🚀',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        authEndpoints: {
            simple: '/api/auth/simple/signup',
            regular: '/api/auth/signup',
            supabase: '/api/auth/supabase/signup'
        }
    });
});

// @route   GET /api/test/auth
// @desc    Test auth system availability
// @access  Public
router.get('/auth', (req, res) => {
    res.json({
        success: true,
        message: 'Auth endpoints available',
        endpoints: {
            'Simple Auth (Recommended)': {
                signup: '/api/auth/simple/signup',
                login: '/api/auth/simple/login',
                test: '/api/auth/simple/test',
                status: 'Working ✅'
            },
            'Regular Auth': {
                signup: '/api/auth/signup', 
                login: '/api/auth/login',
                status: 'May have DB issues ⚠️'
            },
            'Supabase Auth': {
                signup: '/api/auth/supabase/signup',
                login: '/api/auth/supabase/login', 
                status: 'Under development 🔧'
            }
        }
    });
});

module.exports = router;
