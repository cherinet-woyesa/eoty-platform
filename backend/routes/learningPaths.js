const express = require('express');
const router = express.Router();
const learningPathsController = require('../controllers/learningPathsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/learning-paths
router.get('/', learningPathsController.list);
router.get('/:pathId', learningPathsController.getOne);
router.post('/:pathId/enroll', learningPathsController.enroll);

module.exports = router;

