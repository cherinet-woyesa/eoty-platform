// backend/routes/health.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { s3Client } = require('../config/cloudStorage');

router.get('/video-service', async (req, res) => {
  try {
    // Database check
    await db.raw('SELECT 1');
    
    // S3 check
    await s3Client.listBuckets({});
    
    // FFmpeg check
    const { execSync } = require('child_process');
    execSync('ffmpeg -version');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        aws_s3: 'connected', 
        ffmpeg: 'available',
        video_processing: 'operational'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});