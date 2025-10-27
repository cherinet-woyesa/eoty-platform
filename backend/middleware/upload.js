const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// For now, we'll store videos locally. Later we'll integrate AWS S3
const upload = multer({
  dest: 'uploads/videos/temp/',
  fileFilter: (req, file, cb) => {
    // Check if file is video
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos
  },
});

module.exports = upload; // Using local upload for development