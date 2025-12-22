const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireRole, requireOwnership, requireEnrollment } = require('../middleware/rbac');
const { validateCourseData, validateBulkAction } = require('../middleware/courseValidation');
const { validateLessonData, validateReorderData, checkLessonOwnership } = require('../middleware/lessonValidation');
const { courseCreationLimiter, bulkOperationLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');
const { contentUpload } = require('../middleware/upload');

router.use(authenticateToken);

// Course catalog and enrollment (must be before /:courseId to avoid conflicts)
// Catalog is accessible to all authenticated users (students, teachers, admins)
router.get('/catalog', requirePermission('course:view'), courseController.getCourseCatalog);

// Bulk operations (must be before /:courseId to avoid conflicts)
// Only teachers (for their courses) and admins can perform bulk actions
router.post('/bulk-action', bulkOperationLimiter, requireRole(['teacher', 'admin']), validateBulkAction, courseController.bulkAction);

// Lesson operations (specific routes before parameterized ones)
// Get lesson details accessible to enrolled students, course owners, and admins
router.get('/lessons/:lessonId', requirePermission('lesson:view'), courseController.getLesson);
// Teachers can edit/delete their own lessons, admins can edit/delete any
router.put('/lessons/:lessonId', requireRole(['teacher', 'admin']), validateLessonData, checkLessonOwnership, courseController.updateLesson);
router.delete('/lessons/:lessonId', requireRole(['teacher', 'admin']), checkLessonOwnership, courseController.deleteLesson);
// Video status and URLs accessible to enrolled students, course owners, and admins
router.get('/lessons/:lessonId/video-status', requirePermission('lesson:view'), courseController.getVideoStatus);
router.get('/lessons/:lessonId/video-url', requirePermission('lesson:view'), courseController.getSignedVideoUrl);
router.get('/lessons/:lessonId/download-url', requirePermission('lesson:view'), courseController.getVideoDownloadUrl);

// Course CRUD operations
// All authenticated users can view courses (filtered by role in controller)
router.get('/', requirePermission('course:view'), courseController.getUserCourses);
// Only teachers and admins can create courses
router.post('/', courseCreationLimiter, requireRole(['teacher', 'admin']), validateCourseData, courseController.createCourse);

// Get courses for teacher (alias for / to support frontend calls)
router.get('/teacher', requirePermission('course:view'), courseController.getUserCourses);

// Course-specific routes (parameterized routes should come after specific routes)
// View: accessible to enrolled students, course owners, and admins (controller handles access)
router.get('/:courseId', requirePermission('course:view'), courseController.getCourse);
// Edit: only course owner (teacher) or admins, with ownership validation
router.put('/:courseId', requireRole(['teacher', 'admin']), requireOwnership('courses', { resourceParam: 'courseId' }), validateCourseData, courseController.updateCourse);
// Delete: only course owner (teacher) or admins, with ownership validation
router.delete('/:courseId', requireRole(['teacher', 'admin']), requireOwnership('courses', { resourceParam: 'courseId' }), courseController.deleteCourse);

// Course analytics
// Only course owner (teacher) or admins can view analytics (controller handles access)
router.get('/:courseId/analytics', requireRole(['teacher', 'admin']), courseController.getCourseAnalytics);

// Course image upload
// Only course owner (teacher) or admins can upload images
router.post('/:courseId/upload-image', requireRole(['teacher', 'admin']), requireOwnership('courses', { resourceParam: 'courseId' }), contentUpload.single('coverImage'), courseController.uploadCourseImage);

// Publishing workflow
// Only course owner (teacher) or admins can publish/unpublish
router.post('/:courseId/publish', requireRole(['teacher', 'admin']), requireOwnership('courses', { resourceParam: 'courseId' }), courseController.publishCourse);
router.post('/:courseId/unpublish', requireRole(['teacher', 'admin']), requireOwnership('courses', { resourceParam: 'courseId' }), courseController.unpublishCourse);
router.post('/:courseId/schedule-publish', requireRole(['teacher', 'admin']), requireOwnership('courses', { resourceParam: 'courseId' }), courseController.schedulePublishCourse);

// Lesson operations for specific course
// Only course owner (teacher) or admins can create/reorder lessons
router.post('/:courseId/lessons', requireRole(['teacher', 'admin']), requireOwnership('courses', { resourceParam: 'courseId' }), courseController.createLesson);
router.post('/:courseId/lessons/reorder', requireRole(['teacher', 'admin']), requireOwnership('courses', { resourceParam: 'courseId' }), validateReorderData, courseController.reorderLessons);

// Course enrollment
// Only base members can enroll in courses (teachers and admins don't need to enroll)
router.post('/:courseId/enroll', requireRole(['user', 'student']), courseController.enrollInCourse);
router.post('/:courseId/unenroll', requireRole(['user', 'student']), courseController.unenrollFromCourse);

// Course favorites
router.post('/:courseId/favorite', requirePermission('course:view'), courseController.addToFavorites);
router.post('/:courseId/unfavorite', requirePermission('course:view'), courseController.removeFromFavorites);

// Course rating
router.post('/:courseId/rate', requireRole(['user', 'student']), courseController.rateCourse);

module.exports = router;
