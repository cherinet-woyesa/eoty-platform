const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const upload = require('../middleware/upload');

const { videoUploadLimiter } = require('../middleware/rateLimiter');

// Public Video streaming routes (no authentication required for streaming)
router.get('/stream/:filename', videoController.streamVideo);
router.get('/subtitles/:filename', videoController.streamSubtitle);

// Public Video metadata and availability routes (no authentication required for metadata)
router.get('/lessons/:lessonId/metadata', videoController.getVideoMetadata);
router.get('/lessons/:lessonId/availability', videoController.checkVideoAvailability);

// Apply authentication middleware to remaining routes
router.use(authenticateToken);

// Video upload routes (teacher/admin only)
router.post('/upload', videoUploadLimiter, requirePermission('video:upload'), upload.single('video'), videoController.uploadVideo);
router.post('/subtitles', requirePermission('video:upload'), upload.single('subtitle'), videoController.uploadSubtitle);

// Notification routes
router.post('/lessons/:lessonId/notify', videoController.notifyVideoAvailable);
router.get('/notifications', videoController.getUserVideoNotifications);

// Course lessons route
router.get('/courses/:courseId/lessons', videoController.getCourseLessons);

// Mux integration routes
router.post('/mux/upload-url', requirePermission('video:upload'), videoController.createMuxUploadUrl);
router.post('/mux/webhook', videoController.handleMuxWebhook); // No auth - verified by signature
router.get('/:lessonId/playback', videoController.getPlaybackInfo);

// Video analytics routes
router.get('/:lessonId/analytics', videoController.getVideoAnalytics);
router.post('/:lessonId/track-view', videoController.trackVideoView);
router.get('/bulk/analytics', videoController.getBulkAnalytics);

module.exports = router;