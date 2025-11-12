const express = require('express');
const router = express.Router();
const thumbnailController = require('../controllers/thumbnailController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticateToken);

// GET /api/lessons/:lessonId/thumbnails - Generate thumbnail options
router.get('/lessons/:lessonId/thumbnails', requirePermission('lesson:view'), thumbnailController.generateThumbnails);

// PUT /api/lessons/:lessonId/thumbnail - Update lesson thumbnail (teacher/admin only)
router.put('/lessons/:lessonId/thumbnail', requirePermission('lesson:edit'), thumbnailController.updateThumbnail);

module.exports = router;

