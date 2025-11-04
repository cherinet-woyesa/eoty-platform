const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const betterAuthRoutes = require('./routes/betterAuth'); // Better Auth routes
const migrationRoutes = require('./routes/migration'); // Legacy user migration routes
const courseRoutes = require('./routes/courses');
const videoRoutes = require('./routes/videos');
const studentRoutes = require('./routes/students');
const quizRoutes = require('./routes/quizzes');
const discussionRoutes = require('./routes/discussions');
const aiRoutes = require('./routes/ai');
const interactiveRoutes = require('./routes/interactive');
const resourceRoutes = require('./routes/resources');
const forumRoutes = require('./routes/forums');
const achievementRoutes = require('./routes/achievements');
const adminRoutes = require('./routes/admin');
const chapterRoutes = require('./routes/chapters');
const onboardingRoutes = require('./routes/onboarding');
const translationRoutes = require('./routes/translation');
const teacherRoutes = require('./routes/teacher');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Enhanced CORS configuration for video streaming and Better Auth
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5173', // Vite dev server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5173' // Vite dev server
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Important for Better Auth cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Range', 
    'Accept',
    'Origin',
    'X-Requested-With',
    'Cookie', // Better Auth uses cookies
    'Set-Cookie'
  ],
  exposedHeaders: [
    'Content-Range',
    'Content-Length',
    'Accept-Ranges',
    'Content-Type',
    'Authorization',
    'X-Video-Quality',
    'X-Estimated-Bitrate',
    'Set-Cookie' // Better Auth sets cookies
  ]
};

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Important for video streaming
}));
app.use(cors(corsOptions)); // Use enhanced CORS configuration
app.use(cookieParser()); // Required for Better Auth cookie-based sessions
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting - exclude video streaming, health checks, and all /api/admin/* routes from rate limits
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: (req) => {
    // Skip rate limiting for video streaming, health checks, and all /api/admin/* routes
    return (
      req.path.includes('/videos/stream/') ||
      req.path === '/api/health' ||
      req.path === '/api/videos/upload' ||
      req.path.startsWith('/api/admin')
    );
  }
});
app.use(limiter);

// Serve uploaded files statically (important for video streaming)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    // Set CORS headers for static files
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length');
    
    // Cache control for videos
    if (path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.ogg')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'EOTY Platform API',
    cors: 'Enabled',
    videoStreaming: 'Enabled'
  });
});

// Handle preflight requests globally
app.options('*', cors(corsOptions));

// Migration routes - must be mounted before Better Auth routes
// Handles transparent migration of legacy users to Better Auth
app.use('/api/auth', migrationRoutes);

// Better Auth routes - must be mounted before other routes
// Better Auth handles all authentication endpoints at /api/auth/*
app.use('/api/auth', betterAuthRoutes);

// Legacy auth routes (will be deprecated after migration)
// app.use('/api/auth', authRoutes); // Commented out - Better Auth takes precedence

// Public routes
app.use('/api/chapters', chapterRoutes);

// Video routes - some endpoints are public for streaming
app.use('/api/videos', videoRoutes); // Authentication handled inside route file

// Admin routes
app.use('/api/admin', adminRoutes);

// Protected routes
app.use('/api/courses', authenticateToken, courseRoutes);
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/quizzes', authenticateToken, quizRoutes);
app.use('/api/discussions', authenticateToken, discussionRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/interactive', authenticateToken, interactiveRoutes);
app.use('/api/resources', authenticateToken, resourceRoutes);
app.use('/api/forums', authenticateToken, forumRoutes);
app.use('/api/achievements', authenticateToken, achievementRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/teacher', authenticateToken, teacherRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.stack);
  
  // Handle CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app;