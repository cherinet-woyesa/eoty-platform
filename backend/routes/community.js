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

module.exports = router;
