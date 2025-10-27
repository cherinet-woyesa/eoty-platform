const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', requirePermission('course:view'), courseController.getTeacherCourses);
router.post('/', requirePermission('course:create'), courseController.createCourse);
router.post('/:courseId/lessons', requirePermission('lesson:create'), courseController.createLesson);

module.exports = router;