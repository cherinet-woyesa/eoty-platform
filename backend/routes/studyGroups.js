const express = require('express');
const router = express.Router();
const studyGroupController = require('../controllers/studyGroupController');
const { authenticateToken } = require('../middleware/auth');

// Public: list public groups (auth optional)
router.get('/', studyGroupController.listGroups);

// Protected routes
router.post('/', authenticateToken, studyGroupController.createGroup);
router.post('/join', authenticateToken, studyGroupController.joinGroup);
router.post('/leave', authenticateToken, studyGroupController.leaveGroup);
router.get('/:id', authenticateToken, studyGroupController.getGroup);

module.exports = router;
