const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');

// Public: fetch posts
router.get('/posts', communityController.fetchPosts);

// Protected: upload media
router.post('/media', authenticateToken, upload.contentUpload.single('file'), communityController.uploadMedia);

// Protected: get presigned upload URL
router.post('/presign', authenticateToken, communityController.getPresign);

// Protected: create post
router.post('/posts', authenticateToken, communityController.createPost);

// Protected: delete post
router.delete('/posts/:id', authenticateToken, communityController.deletePost);

// Protected: update post
router.put('/posts/:id', authenticateToken, communityController.updatePost);

// Protected: toggle like
router.post('/posts/:postId/like', authenticateToken, communityController.toggleLike);

// Protected: add comment to post
router.post('/posts/:postId/comments', authenticateToken, communityController.addComment);

// Public: fetch comments for post
router.get('/posts/:postId/comments', communityController.fetchComments);

// Protected: delete comment
router.delete('/comments/:commentId', authenticateToken, communityController.deleteComment);

// Protected: share post
router.post('/posts/:postId/share', authenticateToken, communityController.sharePost);

// Protected: get posts shared with user
router.get('/posts/shared', authenticateToken, communityController.getSharedPosts);

// Public: get share details for a post
router.get('/posts/:postId/shares', communityController.getPostShares);

// Search and trending
router.get('/search', communityController.searchPosts);
router.get('/trending', communityController.getTrendingPosts);
router.get('/stats', communityController.getFeedStats);

module.exports = router;
