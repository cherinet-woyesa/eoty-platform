const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const teacherController = require('../controllers/teacherController');

// All teacher routes require authentication and teacher role or higher
router.use(authenticateToken, requireRole(['teacher', 'admin']));

// GET /api/teacher/dashboard
router.get('/dashboard', teacherController.getDashboard);
router.get('/profile', teacherController.getProfile);
router.post('/profile', teacherController.updateProfile);

// Student Management
// GET /api/teacher/students - Get all students enrolled in teacher's courses
router.get('/students', teacherController.getStudents);

// GET /api/teacher/students/:studentId - Get student details with progress
router.get('/students/:studentId', teacherController.getStudentDetails);

module.exports = router;
