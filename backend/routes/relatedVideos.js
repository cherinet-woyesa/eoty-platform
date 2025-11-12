const express = require('express');
const router = express.Router();
const relatedVideosController = require('../controllers/relatedVideosController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticateToken);

// GET /api/lessons/:lessonId/related - Get related videos for a lesson
router.get('/lessons/:lessonId/related', requirePermission('lesson:view'), relatedVideosController.getRelatedVideos);

module.exports = router;

