const express = require('express');
const router = express.Router();
const chapterController = require('../controllers/chapterController');
const { requireAuth } = require('../middleware/betterAuthMiddleware');

// Public routes
router.get('/', chapterController.getAllChapters);

// Protected routes
router.get('/:id', requireAuth, chapterController.getChapterById);

module.exports = router;