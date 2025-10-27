const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { requirePermission } = require('../middleware/roles');

router.use(authenticateToken);

router.get('/stream/:filename', videoController.streamVideo);
router.get('/courses/:courseId/lessons', videoController.getCourseLessons);
router.post('/upload', requirePermission('video:upload'), upload.single('video'), videoController.uploadVideo);

module.exports = router;