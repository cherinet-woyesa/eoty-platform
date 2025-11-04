const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { requireAuth } = require('../middleware/betterAuthMiddleware');
const { requirePermission, requireRole } = require('../middleware/rbacMiddleware');

router.use(requireAuth);

// Changed from 'course:view' to 'course:create' since teacher has that permission
router.get('/', requirePermission('course:view'), courseController.getUserCourses);
router.post('/', requirePermission('course:create'), courseController.createCourse);
router.post('/:courseId/lessons', requirePermission('lesson:create'), courseController.createLesson);

// NEW: Get signed video URL for a lesson (with access control)
router.get('/lessons/:lessonId/video-url', requirePermission('lesson:view'), courseController.getSignedVideoUrl);

module.exports = router;