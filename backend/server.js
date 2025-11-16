const app = require('./app');
const http = require('http');
const websocketService = require('./services/websocketService');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    'uploads/videos',
    'uploads/subtitles',
    'uploads/thumbnails',
    'uploads/profiles'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Created directory: ${fullPath}`);
    }
  });
};

const PORT = process.env.PORT || 5000;

// Ensure upload directories exist before starting server
ensureUploadDirs();

const server = http.createServer(app);

// Initialize WebSocket service
websocketService.init(server);

// Initialize uptime monitoring service (REQUIREMENT: 99% uptime tracking)
const uptimeMonitoringService = require('./services/uptimeMonitoringService');

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
  
  // Start uptime monitoring (REQUIREMENT: 99% uptime tracking)
  try {
    await uptimeMonitoringService.startMonitoring();
    console.log(`Uptime Monitoring: Active (99% requirement)`);
  } catch (error) {
    console.error('Failed to start uptime monitoring:', error);
  }
  
  // Start privacy compliance service (REQUIREMENT: No sensitive data retention)
  try {
    const privacyComplianceService = require('./services/privacyComplianceService');
    privacyComplianceService.startScheduledDeletion();
    console.log(`Privacy Compliance: Active (data retention policies)`);
  } catch (error) {
    console.error('Failed to start privacy compliance service:', error);
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