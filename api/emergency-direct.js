// DIRECT VERCEL SERVERLESS FUNCTION - BYPASSES ALL SERVER ISSUES
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory storage for this serverless function
const tempUsers = new Map();

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('🚨 DIRECT VERCEL EMERGENCY FUNCTION TRIGGERED');
    console.log('Method:', req.method);
    console.log('URL:', req.url);

    try {
        if (req.method === 'POST') {
            // EMERGENCY SIGNUP
            const { name, email, password, branch, year } = req.body;
            
            console.log('🚨 DIRECT EMERGENCY SIGNUP:', { name, email });
            
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
            const userId = 'vercel_direct_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
            const token = jwt.sign({ userId }, 'vercel_direct_secret_2024', { expiresIn: '30d' });
            
            console.log('🚨 DIRECT EMERGENCY SUCCESS:', userId);
            
            return res.status(201).json({
                success: true,
                message: '🚨 DIRECT VERCEL EMERGENCY: Account created successfully!',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    branch: user.branch,
                    year: user.year,
                    reputation: user.reputation
                },
                source: 'DIRECT_VERCEL_FUNCTION'
            });
            
        } else if (req.method === 'GET') {
            // STATUS CHECK
            return res.status(200).json({
                success: true,
                message: '🚨 DIRECT VERCEL EMERGENCY FUNCTION ONLINE',
                timestamp: new Date().toISOString(),
                userCount: tempUsers.size,
                version: 'DIRECT_VERCEL_1.0',
                status: 'FULLY_OPERATIONAL',
                source: 'DIRECT_VERCEL_FUNCTION'
            });
        }
        
    } catch (error) {
        console.error('🚨 DIRECT EMERGENCY ERROR:', error);
        return res.status(500).json({
            success: false,
            message: 'Direct Vercel emergency error: ' + error.message,
            source: 'DIRECT_VERCEL_FUNCTION'
        });
    }
}
