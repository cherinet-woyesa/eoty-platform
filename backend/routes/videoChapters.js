const express = require('express');
const router = express.Router();
const videoChaptersController = require('../controllers/videoChaptersController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticateToken);

// GET /api/lessons/:lessonId/chapters - Get all chapters for a lesson
router.get('/lessons/:lessonId/chapters', requirePermission('lesson:view'), videoChaptersController.getChapters);

// POST /api/lessons/:lessonId/chapters - Create a new chapter (teacher/admin only)
router.post('/lessons/:lessonId/chapters', requirePermission('lesson:create'), videoChaptersController.createChapter);

// PUT /api/chapters/:chapterId - Update a chapter (teacher/admin only)
router.put('/chapters/:chapterId', requirePermission('lesson:edit'), videoChaptersController.updateChapter);

// DELETE /api/chapters/:chapterId - Delete a chapter (teacher/admin only)
router.delete('/chapters/:chapterId', requirePermission('lesson:delete'), videoChaptersController.deleteChapter);

// POST /api/lessons/:lessonId/chapters/reorder - Reorder chapters (teacher/admin only)
router.post('/lessons/:lessonId/chapters/reorder', requirePermission('lesson:edit'), videoChaptersController.reorderChapters);

module.exports = router;


