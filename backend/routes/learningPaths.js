const express = require('express');
const router = express.Router();
const learningPathsController = require('../controllers/learningPathsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/learning-paths
router.get('/', learningPathsController.list);

module.exports = router;

