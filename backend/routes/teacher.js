const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const teacherController = require('../controllers/teacherController');

router.use(authenticateToken);

// GET /api/teacher/dashboard
router.get('/dashboard', teacherController.getDashboard);

module.exports = router;
