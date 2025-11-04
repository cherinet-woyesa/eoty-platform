const express = require('express');
const router = express.Router();
const discussionController = require('../controllers/discussionController');
const { requireAuth } = require('../middleware/betterAuthMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');

router.use(requireAuth);

// Get discussions for a lesson
router.get('/lessons/:lessonId', discussionController.getLessonDiscussions);

// Create a new discussion
router.post('/lessons/:lessonId', discussionController.createDiscussion);

// Update a discussion
router.put('/:discussionId', discussionController.updateDiscussion);

// Delete a discussion
router.delete('/:discussionId', discussionController.deleteDiscussion);

// Toggle like on a discussion
router.post('/:discussionId/like', discussionController.toggleLike);

// Flag a discussion
router.post('/:discussionId/flag', discussionController.flagDiscussion);

// Get discussion statistics
router.get('/lessons/:lessonId/stats', discussionController.getDiscussionStats);

module.exports = router;












