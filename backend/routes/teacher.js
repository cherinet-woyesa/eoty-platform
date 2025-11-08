const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const teacherController = require('../controllers/teacherController');

// All teacher routes require authentication and teacher role or higher
router.use(authenticateToken, requireRole(['teacher', 'admin']));

// GET /api/teacher/dashboard
router.get('/dashboard', teacherController.getDashboard);

module.exports = router;
