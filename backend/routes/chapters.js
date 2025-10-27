const express = require('express');
const router = express.Router();
const chapterController = require('../controllers/chapterController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/', chapterController.getAllChapters);

// Protected routes
router.get('/:id', authenticateToken, chapterController.getChapterById);

module.exports = router;