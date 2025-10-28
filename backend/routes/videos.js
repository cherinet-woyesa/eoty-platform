const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const upload = require('../middleware/upload');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Video upload routes (teacher/admin only)
router.post('/upload', requirePermission('video:upload'), upload.single('video'), videoController.uploadVideo);
router.post('/subtitles', requirePermission('video:upload'), upload.single('subtitle'), videoController.uploadSubtitle);

// Video streaming routes
router.get('/stream/:filename', videoController.streamVideo);
router.get('/subtitles/:filename', videoController.streamSubtitle);

// Video metadata and availability routes
router.get('/lessons/:lessonId/metadata', videoController.getVideoMetadata);
router.get('/lessons/:lessonId/availability', videoController.checkVideoAvailability); // New endpoint
router.post('/lessons/:lessonId/notify', videoController.notifyVideoAvailable); // New endpoint
router.get('/notifications', videoController.getUserVideoNotifications); // New endpoint

// Course lessons route
router.get('/courses/:courseId/lessons', videoController.getCourseLessons);

module.exports = router;