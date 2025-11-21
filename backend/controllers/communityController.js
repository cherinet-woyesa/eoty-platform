const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const cloudStorage = require('../services/cloudStorageService');

// Save uploaded file to /uploads/community and return public URL
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const uploadsDir = path.join(__dirname, '../uploads/community');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // If multer already saved file buffer in req.file.path (diskStorage), use that; otherwise write buffer
    let destPath;
    if (req.file.path) {
      destPath = req.file.path;
    } else if (req.file.buffer) {
      const uniqueName = `${Date.now()}-${req.file.originalname}`;
      destPath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(destPath, req.file.buffer);
    } else {
      return res.status(500).json({ success: false, message: 'Uploaded file not available' });
    }

    // Ensure public URL path
    const publicUrl = `/uploads/community/${path.basename(destPath)}`;

    return res.json({ success: true, data: { url: publicUrl } });
  } catch (error) {
    console.error('uploadMedia error:', error);
    return res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

// Generate a presigned PUT URL for direct browser -> S3 uploads
exports.getPresign = async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename) return res.status(400).json({ success: false, message: 'filename is required' });

    // Build a safe key under a community prefix
    const sanitized = cloudStorage.sanitizeKey(filename);
    const key = `community/${Date.now()}-${sanitized}`;

    const command = new PutObjectCommand({
      Bucket: cloudStorage.bucket,
      Key: key,
      ContentType: contentType || 'application/octet-stream'
    });

    const presignedUrl = await getSignedUrl(cloudStorage.s3Client, command, { expiresIn: 60 * 60 }); // 1 hour

    // Provide both presigned URL and the eventual public/cdn URL
    const publicUrl = cloudStorage.getCloudFrontUrl(key);

    return res.json({ success: true, data: { presignedUrl, key, url: publicUrl } });
  } catch (error) {
    console.error('getPresign error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate presigned url' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { content, mediaType, mediaUrl } = req.body;
    const user = req.user || null;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const authorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : req.body.author_name || 'Anonymous';
    const authorAvatar = user ? user.profilePicture || null : null;

    const [inserted] = await db('community_posts').insert({
      user_id: user ? user.id : null,
      author_name: authorName,
      author_avatar: authorAvatar,
      content,
      media_type: mediaType || null,
      media_url: mediaUrl || null,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    return res.json({ success: true, data: { post: inserted } });
  } catch (error) {
    console.error('createPost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create post' });
  }
};

exports.fetchPosts = async (req, res) => {
  try {
    const posts = await db('community_posts').select('*').orderBy('created_at', 'desc').limit(200);
    return res.json({ success: true, data: { posts } });
  } catch (error) {
    console.error('fetchPosts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
};
