const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/betterAuthMiddleware');
const teacherController = require('../controllers/teacherController');

router.use(requireAuth);

// GET /api/teacher/dashboard
router.get('/dashboard', teacherController.getDashboard);

module.exports = router;
