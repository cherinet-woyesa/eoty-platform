const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const upload = require('../middleware/upload');

const { videoUploadLimiter } = require('../middleware/rateLimiter');

// Public Video streaming routes (no authentication required for streaming)
// NOTE: S3 video streaming route deprecated - all videos use Mux
// router.get('/stream/:filename', videoController.streamVideo); // Deprecated
router.get('/subtitles/:filename', videoController.streamSubtitle);

// Public Video metadata and availability routes (no authentication required for metadata)
router.get('/lessons/:lessonId/metadata', videoController.getVideoMetadata);
router.get('/lessons/:lessonId/availability', videoController.checkVideoAvailability);
router.get('/featured', videoController.getFeaturedVideos);

// Apply authentication middleware to remaining routes
router.use(authenticateToken);

// Video upload routes (teacher/admin only)
// NOTE: S3 video upload route removed - all new uploads use Mux direct upload
// POST /api/videos/mux/upload-url is the new upload method
router.post('/subtitles', requirePermission('video:upload'), upload.single('subtitle'), videoController.uploadSubtitle);

// Notification routes
router.post('/lessons/:lessonId/notify', videoController.notifyVideoAvailable);
router.get('/notifications', videoController.getUserVideoNotifications);

// Course lessons route
router.get('/courses/:courseId/lessons', videoController.getCourseLessons);

// Mux integration routes
router.post('/mux/upload-url', requirePermission('video:upload'), videoController.createMuxUploadUrl);
router.post('/mux/webhook', videoController.handleMuxWebhook); // No auth - verified by signature
router.post('/mux/webhook/test', authenticateToken, videoController.testWebhook); // Test endpoint for debugging
router.get('/:lessonId/playback', videoController.getPlaybackInfo);
router.get('/:lessonId/mux-status', videoController.getMuxStatus);

// Video analytics routes
router.get('/:lessonId/analytics', videoController.getVideoAnalytics);
router.post('/:lessonId/track-view', videoController.trackVideoView);
router.get('/bulk/analytics', videoController.getBulkAnalytics);

module.exports = router;