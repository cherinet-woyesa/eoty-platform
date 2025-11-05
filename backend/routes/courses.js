const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../middleware/rbac');
const { validateCourseData, validateBulkAction } = require('../middleware/courseValidation');
const { validateLessonData, validateReorderData, checkLessonOwnership } = require('../middleware/lessonValidation');
const { courseCreationLimiter, bulkOperationLimiter } = require('../middleware/rateLimiter');

router.use(authenticateToken);

// Course CRUD operations
router.get('/', requirePermission('course:view'), courseController.getUserCourses);
router.get('/:courseId', requirePermission('course:view'), courseController.getCourse);
router.post('/', courseCreationLimiter, requirePermission('course:create'), validateCourseData, courseController.createCourse);
router.put('/:courseId', requirePermission('course:edit'), validateCourseData, courseController.updateCourse);
router.delete('/:courseId', requirePermission('course:delete'), courseController.deleteCourse);

// Bulk operations
router.post('/bulk-action', bulkOperationLimiter, requirePermission('course:edit'), validateBulkAction, courseController.bulkAction);

// Course analytics
router.get('/:courseId/analytics', requirePermission('course:view'), courseController.getCourseAnalytics);

// Publishing workflow
router.post('/:courseId/publish', requirePermission('course:edit'), courseController.publishCourse);
router.post('/:courseId/unpublish', requirePermission('course:edit'), courseController.unpublishCourse);
router.post('/:courseId/schedule-publish', requirePermission('course:edit'), courseController.schedulePublishCourse);

// Lesson operations
router.post('/:courseId/lessons', requirePermission('lesson:create'), courseController.createLesson);
router.put('/lessons/:lessonId', requirePermission('lesson:edit'), validateLessonData, checkLessonOwnership, courseController.updateLesson);
router.delete('/lessons/:lessonId', requirePermission('lesson:delete'), checkLessonOwnership, courseController.deleteLesson);
router.post('/:courseId/lessons/reorder', requirePermission('lesson:edit'), validateReorderData, checkLessonOwnership, courseController.reorderLessons);
router.get('/lessons/:lessonId/video-status', requirePermission('lesson:view'), courseController.getVideoStatus);

// Get signed video URL for a lesson (with access control)
router.get('/lessons/:lessonId/video-url', requirePermission('lesson:view'), courseController.getSignedVideoUrl);

module.exports = router;