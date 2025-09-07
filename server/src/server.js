const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import Supabase client
const supabase = require('./config/supabaseClient');

// Import routes
const authRoutes = require('./routes/auth');
const authSupabaseRoutes = require('./routes/authSupabase');
const postsRoutes = require('./routes/posts');
// const usersRoutes = require('./routes/users');
// const commentsRoutes = require('./routes/comments');
// const eventsRoutes = require('./routes/events');
// const newsRoutes = require('./routes/news');
// const restaurantsRoutes = require('./routes/restaurants');
// const searchRoutes = require('./routes/search');
// const { router: analyticsRoutes } = require('./routes/analytics');

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
    max: 50, // limit each IP to 50 requests per windowMs (increased for testing)
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

// Root health endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'MIT Manipal Reddit API is running',
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Simple health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Health check endpoint for deployment platforms
app.get('/api/health', async (req, res) => {
    try {
        // Test Supabase connection by making a simple query
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        const dbStatus = error ? 'error' : 'connected';
        
        res.status(200).json({ 
            status: 'OK',
            database: dbStatus,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0'
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Static files - serve client files
app.use(express.static(path.join(__dirname, '../../client')));

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/supabase', authLimiter, authSupabaseRoutes);
app.use('/api/posts', postsRoutes);
// app.use('/api/users', usersRoutes);
// app.use('/api/comments', commentsRoutes);
// app.use('/api/events', eventsRoutes);
// app.use('/api/news', newsRoutes);
// app.use('/api/restaurants', restaurantsRoutes);
// app.use('/api/study-buddy', require('./routes/studyBuddy'));
// app.use('/api/search', searchRoutes);
// app.use('/api/analytics', analyticsRoutes);

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

// Start server
const startServer = async () => {
    try {
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 MIT Manipal Reddit Server running on port ${PORT}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV || 'production'}`);
            console.log(`🌐 Server URL: http://0.0.0.0:${PORT}`);
            console.log(`🔍 Health Check: http://0.0.0.0:${PORT}/health`);
            console.log(`🩺 API Health: http://0.0.0.0:${PORT}/api/health`);
            console.log(`✅ Supabase client initialized`);
        });

        // Handle server shutdown gracefully
        const gracefulShutdown = async (signal) => {
            console.log(`🔄 ${signal} received. Shutting down gracefully...`);
            
            server.close(() => {
                console.log('✅ Server closed.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Initialize server
startServer();

module.exports = app;
