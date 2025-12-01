const express = require('express');
const router = express.Router();
const bookmarkController = require('../controllers/bookmarkController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Toggle bookmark (add/remove)
router.post('/toggle', bookmarkController.toggleBookmark);

// Get all bookmarks
router.get('/', bookmarkController.getBookmarks);

// Check if an entity is bookmarked
router.get('/check', bookmarkController.checkBookmark);

module.exports = router;
