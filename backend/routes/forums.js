const express = require('express');
const router = express.Router();

const forumController = require('../controllers/forumController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// ✅ All routes require authentication
router.use(authenticateToken);

// ✅ Forum browsing
router.get('/', forumController.getForums);
router.get('/:forumId/topics', forumController.getTopics);
router.get('/topics/:topicId', forumController.getTopic);
router.get('/search', forumController.searchForumPosts); // REQUIREMENT: Forum posts indexed for search

// ✅ Forum creation (teachers and admins)
router.post('/', forumController.createForum);

// ✅ Topic and post creation
router.post('/topics', forumController.createTopic);
router.post('/posts', forumController.createPost);

// ✅ Like a post
router.post('/posts/:postId/like', forumController.likePost);

// ✅ Moderation routes (restricted to users with permission)
router.post(
  '/topics/:topicId/lock',
  requirePermission('discussion:moderate'),
  forumController.lockTopic
);

router.post(
  '/posts/:postId/moderate',
  requirePermission('discussion:moderate'),
  forumController.moderatePost
);

module.exports = router;
