const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../middleware/rbac');
const { validateCourseData, validateBulkAction } = require('../middleware/courseValidation');
const { validateLessonData, validateReorderData, checkLessonOwnership } = require('../middleware/lessonValidation');
const { courseCreationLimiter, bulkOperationLimiter } = require('../middleware/rateLimiter');

router.use(authenticateToken);

// Course catalog and enrollment (must be before /:courseId to avoid conflicts)
router.get('/catalog', requirePermission('course:view'), courseController.getCourseCatalog);

// Bulk operations (must be before /:courseId to avoid conflicts)
router.post('/bulk-action', bulkOperationLimiter, requirePermission('course:edit'), validateBulkAction, courseController.bulkAction);

// Lesson operations (specific routes before parameterized ones)
router.put('/lessons/:lessonId', requirePermission('lesson:edit'), validateLessonData, checkLessonOwnership, courseController.updateLesson);
router.delete('/lessons/:lessonId', requirePermission('lesson:delete'), checkLessonOwnership, courseController.deleteLesson);
router.get('/lessons/:lessonId/video-status', requirePermission('lesson:view'), courseController.getVideoStatus);
router.get('/lessons/:lessonId/video-url', requirePermission('lesson:view'), courseController.getSignedVideoUrl);

// Course CRUD operations
router.get('/', requirePermission('course:view'), courseController.getUserCourses);
router.post('/', courseCreationLimiter, requirePermission('course:create'), validateCourseData, courseController.createCourse);

// Course-specific routes (parameterized routes should come after specific routes)
router.get('/:courseId', requirePermission('course:view'), courseController.getCourse);
router.put('/:courseId', requirePermission('course:edit'), validateCourseData, courseController.updateCourse);
router.delete('/:courseId', requirePermission('course:delete'), courseController.deleteCourse);

// Course analytics
router.get('/:courseId/analytics', requirePermission('course:view'), courseController.getCourseAnalytics);

// Publishing workflow
router.post('/:courseId/publish', requirePermission('course:edit'), courseController.publishCourse);
router.post('/:courseId/unpublish', requirePermission('course:edit'), courseController.unpublishCourse);
router.post('/:courseId/schedule-publish', requirePermission('course:edit'), courseController.schedulePublishCourse);

// Lesson operations for specific course
router.post('/:courseId/lessons', requirePermission('lesson:create'), courseController.createLesson);
router.post('/:courseId/lessons/reorder', requirePermission('lesson:edit'), validateReorderData, checkLessonOwnership, courseController.reorderLessons);

// Course enrollment
router.post('/:courseId/enroll', requirePermission('course:view'), courseController.enrollInCourse);

module.exports = router;