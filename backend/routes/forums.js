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

// ✅ Topic interactions
router.post('/topics/:topicId/like', forumController.likeTopic);
router.post('/topics/:topicId/replies', forumController.createReply);
router.post('/topics/:topicId/share', forumController.shareTopic);
router.post('/topics/:topicId/report', forumController.reportTopic);

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

// Advanced forum features
// Polls
router.post('/:forumId/topics/:topicId/polls', forumController.createPoll);
router.post('/polls/:pollId/vote', forumController.votePoll);

// Pinned topics (moderator/admin only)
router.post(
  '/:forumId/topics/:topicId/pin',
  requirePermission('discussion:moderate'),
  forumController.pinTopic
);
router.post(
  '/:forumId/topics/:topicId/unpin',
  requirePermission('discussion:moderate'),
  forumController.unpinTopic
);

// File attachments
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
router.post('/attachments', upload.single('file'), forumController.uploadAttachment);
router.delete('/attachments/:attachmentId', forumController.deleteAttachment);

// Leaderboards with privacy controls
router.get('/leaderboards', forumController.getLeaderboards);

// Privacy settings
router.put('/privacy-settings', forumController.updatePrivacySettings);

module.exports = router;
