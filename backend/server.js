// Load environment variables
require('dotenv').config();

const app = require('./app');
const http = require('http');
const websocketService = require('./services/websocketService');
const fs = require('fs');
const path = require('path');

// In Google Cloud, we use Cloud Storage instead of local directories
// Upload directories are no longer needed locally
const ensureUploadDirs = () => {
  console.log('Using Google Cloud Storage for file uploads - no local directories needed');
};

const PORT = process.env.PORT || 5000;

// Ensure upload directories exist before starting server
ensureUploadDirs();

const server = http.createServer(app);

// Initialize WebSocket service
websocketService.init(server);

// Initialize uptime monitoring service (REQUIREMENT: 99% uptime tracking)
const uptimeMonitoringService = require('./services/uptimeMonitoringService');

// Initialize scheduler service (boundary conditions and auto-archiving)
const schedulerService = require('./services/schedulerService');

// Initialize privacy service for user privacy settings
const privacyService = require('./services/privacyService');

// Check database connectivity
const checkDatabaseConnection = async () => {
  try {
    const db = require('./config/database');
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error.message);
    return false;
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  // process.exit(1); // Don't exit for now to debug
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  // process.exit(1); // Don't exit for now to debug
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n=== EOTY Server Running ===`);
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`CORS Enabled: Yes`);
  console.log(`Video Streaming: Enabled`);
  console.log(`WebSocket Server: Running`);
  console.log(`Upload Directories: Ready`);

  // Check database connectivity
  const dbAvailable = await checkDatabaseConnection();
  if (!dbAvailable) {
    console.log('⚠️  Database not available - some features will be limited');
  }
  
  // Start uptime monitoring (REQUIREMENT: 99% uptime tracking)
  try {
    await uptimeMonitoringService.startMonitoring();
    console.log(`Uptime Monitoring: Active (99% requirement)`);
  } catch (error) {
    console.error('Failed to start uptime monitoring:', error);
  }

  // Only start database-dependent services if database is available
  if (dbAvailable) {
    // Start privacy compliance service (REQUIREMENT: No sensitive data retention)
    try {
      const privacyComplianceService = require('./services/privacyComplianceService');
      privacyComplianceService.startScheduledDeletion();
      console.log(`Privacy Compliance: Active (data retention policies)`);
    } catch (error) {
      console.error('Failed to start privacy compliance service:', error);
    }

    // Start scheduler service (REQUIREMENT: Auto-archiving, real-time updates)
    try {
      schedulerService.start();
      console.log(`Scheduler Service: Active (auto-archiving, real-time updates)`);
    } catch (error) {
      console.error('Failed to start scheduler service:', error);
    }
  } else {
    console.log('⏭️  Skipping database-dependent services (database not available)');
  }

  // Initialize privacy settings for existing users (REQUIREMENT: Youth privacy enforcement)
  if (dbAvailable) {
    try {
      const db = require('./config/database');
      const users = await db('users').select('id');

      for (const user of users) {
        await privacyService.initializeUserPrivacy(user.id);
      }

      console.log(`Privacy Settings: Initialized (${users.length} users)`);
    } catch (error) {
      console.error('Failed to initialize privacy settings:', error);
      console.log('Continuing server startup without privacy settings initialization');
      // Don't fail server startup if privacy init fails
    }
  }
  
  // Start social features service (REQUIREMENT: FR4 - Real-time updates)
  try {
    const socialFeaturesService = require('./services/socialFeaturesService');
    socialFeaturesService.startRealTimeUpdates();
    console.log(`Social Features: Active (real-time badge/leaderboard updates)`);
  } catch (error) {
    console.error('Failed to start social features service:', error);
  }
  
  // Start onboarding reminder job (REQUIREMENT: FR6 - Follow-up reminders)
  try {
    const onboardingService = require('./services/onboardingService');
    onboardingService.startReminderJob();
    console.log(`Onboarding Reminders: Active (follow-up for skipped/aborted onboarding)`);
  } catch (error) {
    console.error('Failed to start onboarding reminder job:', error);
  }

  // Start auto-archive job (REQUIREMENT: Auto-archiving for inactive chapters)
  try {
    const autoArchiveJob = require('./jobs/autoArchiveJob');
    autoArchiveJob.start();
    console.log(`Auto-Archive Job: Active (inactive forums/chapters)`);
  } catch (error) {
    console.error('Failed to start auto-archive job:', error);
  }
  
  console.log(`===========================\n`);
});