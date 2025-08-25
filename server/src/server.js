const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const usersRoutes = require('./routes/users');
const commentsRoutes = require('./routes/comments');
const eventsRoutes = require('./routes/events');
const newsRoutes = require('./routes/news');
const restaurantsRoutes = require('./routes/restaurants');
const searchRoutes = require('./routes/search');
const { router: analyticsRoutes } = require('./routes/analytics');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "http://localhost:5000"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later.'
    }
});

// CORS configuration - Allow all origins globally
app.use(cors({
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Additional CORS middleware to ensure headers are always set
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files - serve client files
app.use(express.static(path.join(__dirname, '../../client')));

// Health check endpoint for deployment platforms
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/study-buddy', require('./routes/studyBuddy'));
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'MIT Manipal Reddit API',
        version: '1.0.0',
        description: 'Backend API for MIT Manipal Reddit-like platform',
        endpoints: {
            auth: '/api/auth',
            posts: '/api/posts',
            users: '/api/users',
            comments: '/api/comments',
            events: '/api/events',
            news: '/api/news',
            restaurants: '/api/restaurants',
            search: '/api/search'
        }
    });
});

// Serve client application for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/index.html'));
});

// Error handling middleware
app.use(errorHandler);

// MongoDB Connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mit_reddit';
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ MongoDB Connected Successfully');
        
        // Create indexes for better performance
        await createIndexes();
        
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        
        // In development, continue without MongoDB for demo purposes
        if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Running in demo mode without MongoDB');
        } else {
            process.exit(1);
        }
    }
};

// Create database indexes
const createIndexes = async () => {
    try {
        const db = mongoose.connection.db;
        
        // Posts indexes
        await db.collection('posts').createIndex({ createdAt: -1 });
        await db.collection('posts').createIndex({ category: 1, createdAt: -1 });
        await db.collection('posts').createIndex({ author: 1, createdAt: -1 });
        await db.collection('posts').createIndex({ 'votes.score': -1 });
        await db.collection('posts').createIndex({ title: 'text', content: 'text' });
        
        // Users indexes
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ username: 1 }, { unique: true });
        
        // Comments indexes
        await db.collection('comments').createIndex({ postId: 1, createdAt: -1 });
        await db.collection('comments').createIndex({ author: 1, createdAt: -1 });
        
        // Events indexes
        await db.collection('events').createIndex({ date: 1 });
        await db.collection('events').createIndex({ category: 1, date: 1 });
        
        console.log('📊 Database indexes created successfully');
    } catch (error) {
        console.error('Index creation error:', error.message);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received. Shutting down gracefully...');
    
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('🔄 SIGINT received. Shutting down gracefully...');
    
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Start server
const startServer = async () => {
    try {
        await connectDB();
        
        app.listen(PORT, () => {
            console.log(`🚀 MIT Manipal Reddit Server running on port ${PORT}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
            console.log(`💻 Client URL: http://localhost:${PORT}`);
            console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Initialize server
startServer();

module.exports = app;
