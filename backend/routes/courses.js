const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

// Changed from 'course:view' to 'course:create' since teacher has that permission
router.get('/', requirePermission('course:view'), courseController.getUserCourses);
router.post('/', requirePermission('course:create'), courseController.createCourse);
router.post('/:courseId/lessons', requirePermission('lesson:create'), courseController.createLesson);

module.exports = router;