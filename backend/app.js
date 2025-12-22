const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const passport = require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const lessonsRoutes = require('./routes/lessons');
const videoRoutes = require('./routes/videos');
const studentRoutes = require('./routes/students');
const quizRoutes = require('./routes/quizzes');
const discussionRoutes = require('./routes/discussions');
const aiRoutes = require('./routes/ai');
const speechToTextRoutes = require('./routes/speechToText');
const interactiveRoutes = require('./routes/interactive');
const resourceRoutes = require('./routes/resources');
const forumRoutes = require('./routes/forums');
const achievementRoutes = require('./routes/achievements');
const adminRoutes = require('./routes/admin');
const chapterRoutes = require('./routes/chapters');
const chapterRoleRoutes = require('./routes/chapterRoleRoutes');
const onboardingRoutes = require('./routes/onboarding');
const translationRoutes = require('./routes/translation');
const teacherRoutes = require('./routes/teacher');
const analyticsRoutes = require('./routes/analytics');
const systemConfigRoutes = require('./routes/systemConfig');
const studyGroupsRoutes = require('./routes/studyGroups');
const assignmentsRoutes = require('./routes/assignments');
const subtitleRoutes = require('./routes/subtitles');
const linkedAccountRoutes = require('./routes/linkedAccounts');
const accessLogRoutes = require('./routes/accessLogs');
const muxMigrationRoutes = require('./routes/muxMigration');
const videoNotesRoutes = require('./routes/videoNotes');
const videoChaptersRoutes = require('./routes/videoChapters');
const thumbnailRoutes = require('./routes/thumbnails');
const relatedVideosRoutes = require('./routes/relatedVideos');
const recordingPresetsRoutes = require('./routes/recordingPresets');
const knowledgeBaseRoutes = require('./routes/knowledgeBase');
const learningPathsRoutes = require('./routes/learningPaths');
const videoProgressRoutes = require('./routes/videoProgress');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Trust proxy (required for Cloud Run / Vercel)
app.set('trust proxy', 1);

// Enhanced CORS configuration with proper headers
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is from Vercel (allows all *.vercel.app subdomains)
    const isVercelOrigin = /^https:\/\/.*\.vercel\.app$/.test(origin);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://localhost:5173', // Vite dev server
      'http://127.0.0.1:5173',
      // Production frontend URLs
      'https://eoty-platform.vercel.app',
      'https://eoty-platform-git-main-cherinet-woyesas-projects.vercel.app',
      'https://eoty-platform-cherinet-woyesas-projects.vercel.app',
      // Production frontend domain (main site)
      'https://www.eotcommunity.org',
      'https://eotcommunity.org',
      // Render deployment
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
      // Vercel deployments
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
      // Mux direct upload domains
      'https://storage.googleapis.com',
      'https://mux.com'
    ];
    
    // Allow all Vercel preview URLs
    if (isVercelOrigin) {
      console.log('CORS check - Vercel origin allowed:', origin);
      return callback(null, true);
    }
    
    console.log('CORS check - Origin:', origin, 'Allowed:', allowedOrigins.includes(origin));
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Range', 
    'Accept',
    'Origin',
    'X-Requested-With',
    'Cache-Control', // Added this line to fix the CORS error
    'X-Requested-With',
    // Mux-specific headers
    'X-Mux-Signature',
    'Mux-Signature',
    'Accept-Encoding'
  ],
  exposedHeaders: [
    'Content-Range',
    'Content-Length',
    'Accept-Ranges',
    'Content-Type',
    'Authorization',
    'X-Video-Quality',
    'X-Estimated-Bitrate',
    'X-Total-Count'
  ],
  maxAge: 86400 // 24 hours for preflight cache
};

// Security middleware
app.use((req, res, next) => {
  // Allow popups to communicate with the opener (required for Google Auth popup)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Important for video streaming
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  }
}));

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Compression middleware - compress all responses
app.use(compression({
  level: 6, // Compression level (1-9, 6 is a good balance)
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all text-based responses
    return compression.filter(req, res);
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Passport
app.use(passport.initialize());

// Lightweight performance logger for slow requests
app.use((req, res, next) => {
  const start = process.hrtime.bigint ? process.hrtime.bigint() : BigInt(Date.now());

  res.on('finish', () => {
    try {
      const end = process.hrtime.bigint ? process.hrtime.bigint() : BigInt(Date.now());
      const diffMs = Number(end - start) / 1_000_000; // convert ns to ms

      if (diffMs > 500) {
        console.warn(
          `[SLOW] ${req.method} ${req.originalUrl || req.url} ` +
          `status=${res.statusCode} time=${diffMs.toFixed(1)}ms`
        );
      }
    } catch (err) {
      // Fail silently – perf logging should never break the app
      console.error('Error in slow-request logger:', err);
    }
  });

  next();
});

// Rate limiting - exclude video streaming, health checks, and all /api/admin/* routes from rate limits
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  skip: (req) => {
    // Skip rate limiting for video streaming, health checks, and all /api/admin/* routes
    return (
      req.path.includes('/videos/stream/') ||
      req.path === '/api/health' ||
      req.path === '/api/videos/upload' ||
      req.path.startsWith('/api/admin') ||
      req.path.includes('/dashboard') // Skip for dashboard real-time updates
    );
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Serve uploaded files statically (important for video streaming)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    // Set CORS headers for static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Cache-Control');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    
    // Video streaming headers
    if (path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.ogg')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Accept-Ranges', 'bytes');

      // Set appropriate content type based on file extension
      if (path.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      } else if (path.endsWith('.webm')) {
        res.setHeader('Content-Type', 'video/webm');
      } else if (path.endsWith('.ogg')) {
        res.setHeader('Content-Type', 'video/ogg');
      }
    }
  }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'EOTY Platform API',
    cors: 'Enabled',
    videoStreaming: 'Enabled',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Enhanced preflight handler
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Range, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.status(204).send();
});

// Health check endpoint (for load balancers, Docker, etc.)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true,
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Root endpoint - Welcome message
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EOTY Platform API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs' // If you have docs
  });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/chapter-roles', chapterRoleRoutes);
app.use('/api/landing', require('./routes/landing'));

// Video routes - some endpoints are public for streaming
app.use('/api/videos', videoRoutes); // Authentication handled inside route file

// Mux migration routes (admin only)
app.use('/api/mux-migration', muxMigrationRoutes);
app.use('/api/mux-costs', require('./routes/muxCostMonitoring'));

// Uptime monitoring routes (REQUIREMENT: 99% uptime tracking)
app.use('/api/uptime', require('./routes/uptime'));

// Privacy compliance routes (REQUIREMENT: No sensitive data retention)
app.use('/api/privacy', require('./routes/privacy'));

// Social features routes (REQUIREMENT: FR4)
app.use('/api/social', require('./routes/socialFeatures'));

// Community posts and media
app.use('/api/community', require('./routes/community'));

// Donations
app.use('/api/donations', require('./routes/donations'));

// Study groups
app.use('/api/study-groups', studyGroupsRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/admin/access-logs', accessLogRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);

// Protected routes
app.use('/api/courses', authenticateToken, courseRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/courses', subtitleRoutes); // Subtitle routes (authentication handled in route file)
app.use('/api/courses', resourceRoutes); // Resource routes (authentication handled in route file)
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/quizzes', authenticateToken, quizRoutes);
app.use('/api/discussions', authenticateToken, discussionRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/speech-to-text', speechToTextRoutes);
app.use('/api/interactive', authenticateToken, interactiveRoutes);
app.use('/api/resources', authenticateToken, resourceRoutes);
app.use('/api/forums', authenticateToken, forumRoutes);
app.use('/api/achievements', authenticateToken, achievementRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/teacher', authenticateToken, teacherRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/linked-accounts', linkedAccountRoutes);
app.use('/api/learning-paths', authenticateToken, learningPathsRoutes);
app.use('/api/bookmarks', require('./routes/bookmarks'));
app.use('/api/localization', require('./routes/localization')); // FR7: Localization routes
app.use('/api/journeys', require('./routes/journeys')); // Spiritual Journeys
app.use('/api', analyticsRoutes); // Analytics routes (includes /api/courses/:courseId/...)
app.use('/api/video-analytics', require('./routes/videoAnalytics')); // Video analytics routes (Mux + Platform)
app.use('/api', videoNotesRoutes); // Video notes routes (authentication handled in route file)
app.use('/api', videoChaptersRoutes); // Video chapters routes (authentication handled in route file)
app.use('/api', thumbnailRoutes); // Thumbnail routes (authentication handled in route file)
app.use('/api/support', require('./routes/support')); // Support routes
app.use('/api', relatedVideosRoutes); // Related videos routes (authentication handled in route file)
app.use('/api/recording-presets', recordingPresetsRoutes); // Recording presets routes (authentication handled in route file)
app.use('/api/video-progress', videoProgressRoutes); // Video progress tracking routes (authentication handled in route file)

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.stack);
  
  // Handle CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      details: 'Please check your CORS configuration'
    });
  }
  
  // Handle rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Initialize scheduled jobs
const { initializeScheduledPublishing } = require('./jobs/scheduledPublishing');
const { initializeMuxAnalyticsSync } = require('./jobs/muxAnalyticsSync');
const { initializeMuxStatusSync } = require('./jobs/muxStatusSync');
const realtimeUpdateService = require('./services/realtimeUpdateService');

initializeScheduledPublishing();
initializeMuxAnalyticsSync();
initializeMuxStatusSync();

// Start realtime update queue processor
realtimeUpdateService.startQueueProcessor();

module.exports = app;