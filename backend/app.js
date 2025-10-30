const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
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


// Import middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'EOTY Platform API'
  });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/chapters', chapterRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Protected routes
app.use('/api/courses', authenticateToken, courseRoutes);
app.use('/api/videos', authenticateToken, videoRoutes);
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/quizzes', authenticateToken, quizRoutes);
app.use('/api/discussions', authenticateToken, discussionRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/interactive', authenticateToken, interactiveRoutes);
app.use('/api/resources', authenticateToken, resourceRoutes);
app.use('/api/forums', authenticateToken, forumRoutes);
app.use('/api/achievements', authenticateToken, achievementRoutes);
app.use('/api/onboarding', onboardingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
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