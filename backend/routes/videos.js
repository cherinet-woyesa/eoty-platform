const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const upload = require('../middleware/upload');

// Public Video streaming routes (no authentication required for streaming)
router.get('/stream/:filename', videoController.streamVideo);
router.get('/subtitles/:filename', videoController.streamSubtitle);

// Public Video metadata and availability routes (no authentication required for metadata)
router.get('/lessons/:lessonId/metadata', videoController.getVideoMetadata);
router.get('/lessons/:lessonId/availability', videoController.checkVideoAvailability);

// Apply authentication middleware to remaining routes
router.use(authenticateToken);

// Video upload routes (teacher/admin only)
router.post('/upload', requirePermission('video:upload'), upload.single('video'), videoController.uploadVideo);
router.post('/subtitles', requirePermission('video:upload'), upload.single('subtitle'), videoController.uploadSubtitle);

// Notification routes
router.post('/lessons/:lessonId/notify', videoController.notifyVideoAvailable);
router.get('/notifications', videoController.getUserVideoNotifications);

// Course lessons route
router.get('/courses/:courseId/lessons', videoController.getCourseLessons);

module.exports = router;