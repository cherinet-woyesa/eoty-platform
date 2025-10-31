const db = require('../config/database');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { notifyVideoAvailable } = require('../services/notificationService');

// Security: Allowed video MIME types
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg'
];

// Security: Allowed subtitle MIME types
const ALLOWED_SUBTITLE_TYPES = [
  'text/plain',
  'text/vtt',
  'application/x-subrip'
];

// Security: File extension to MIME type mapping
const EXTENSION_TO_MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg',
  '.vtt': 'text/vtt',
  '.srt': 'application/x-subrip',
  '.txt': 'text/plain'
};

// Security: Validate filename to prevent path traversal
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
};

// Security: Validate file type by magic numbers
const validateFileType = (buffer, expectedMime) => {
  // More robust magic number validation with offsets
  const signatures = {
    'video/mp4': { signature: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp at offset 4
    'video/webm': { signature: [0x1A, 0x45, 0xDF, 0xA3], offset: 0 }, // EBML at offset 0
    'video/ogg': { signature: [0x4F, 0x67, 0x67, 0x53], offset: 0 },   // OggS at offset 0
  };

  if (signatures[expectedMime]) {
    const { signature, offset } = signatures[expectedMime];
    
    // Ensure buffer is long enough for validation
    if (buffer.length < offset + signature.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i + offset] !== signature[i]) {
        return false;
      }
    }
  }

  return true;
};

const videoController = {
  // Upload video for a lesson with enhanced security
  async uploadVideo(req, res) {
    try {
      const teacherId = req.user.userId;
      const { lessonId } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No video file provided'
        });
      }

      if (!lessonId) {
        return res.status(400).json({
          success: false,
          message: 'Lesson ID is required'
        });
      }

      // Security: Validate file type
      if (!ALLOWED_VIDEO_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid video format. Supported formats: MP4, WebM, OGG, MOV, AVI, MPEG'
        });
      }

      // Security: Validate file size (2GB max)
      const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: 'Video file too large. Maximum size is 2GB.'
        });
      }

      // Security: Additional file type validation
      if (!validateFileType(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid video file. File may be corrupted or in wrong format.'
        });
      }

      // Verify the lesson belongs to the teacher
      const lesson = await db('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .where('courses.created_by', teacherId)
        .select('lessons.*')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found or access denied'
        });
      }

      // Security: Generate safe filename
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const safeFileName = sanitizeFilename(`video_${lessonId}_${Date.now()}${fileExtension}`);
      const filePath = path.join('uploads/videos', safeFileName);

      // Security: Ensure uploads directory exists with proper permissions
      const uploadsDir = path.join('uploads', 'videos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
      }

      // Security: Check if file path is within intended directory
      const resolvedPath = path.resolve(filePath);
      const uploadsBasePath = path.resolve(uploadsDir);
      if (!resolvedPath.startsWith(uploadsBasePath)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file path'
        });
      }

      // Save file with error handling
      try {
        fs.writeFileSync(filePath, req.file.buffer);
      } catch (fileError) {
        console.error('File write error:', fileError);
        return res.status(500).json({
          success: false,
          message: 'Failed to save video file'
        });
      }

      // Update lesson with video URL
      const videoUrl = `/api/videos/stream/${safeFileName}`;
      await db('lessons')
        .where({ id: lessonId })
        .update({
          video_url: videoUrl,
          updated_at: new Date(),
          video_size: req.file.size,
          video_duration: null // Can be extracted later with FFmpeg
        });

      // Notify subscribed users that the video is now available
      try {
        await notifyVideoAvailable(lessonId);
      } catch (notificationError) {
        console.error('Notification failed:', notificationError);
        // Continue even if notification fails
      }

      res.json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          videoUrl,
          fileSize: req.file.size,
          lesson: {
            ...lesson,
            video_url: videoUrl
          }
        }
      });
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload video'
      });
    }
  },

  // Stream video file with enhanced security and performance
  async streamVideo(req, res) {
    try {
      const { filename } = req.params;
      
      // Security: Validate and sanitize filename
      const safeFilename = sanitizeFilename(filename);
      const filePath = path.join('uploads/videos', safeFilename);

      // Security: Check if file path is within intended directory
      const resolvedPath = path.resolve(filePath);
      const uploadsBasePath = path.resolve('uploads/videos');
      if (!resolvedPath.startsWith(uploadsBasePath)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file path'
        });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // Security: Set appropriate content type
      const ext = path.extname(safeFilename).toLowerCase();
      const contentType = EXTENSION_TO_MIME[ext] || 'video/mp4';

      // Performance: Adaptive streaming based on quality parameter
      const quality = req.query.quality || 'hd';
      let bitrate = 5000000; // 5Mbps default for HD
      
      if (quality === 'sd') {
        bitrate = 2000000; // 2Mbps for SD
      } else if (quality === 'mobile') {
        bitrate = 1000000; // 1Mbps for mobile
      } else if (quality === 'auto') {
        // Auto-detect based on file size and type
        bitrate = Math.min(5000000, Math.max(1000000, fileSize / 60)); // Estimate based on duration
      }

      // Performance: Cache headers for better CDN performance
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('ETag', `"${stat.mtime.getTime()}_${stat.size}"`);
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Security: CORS headers for video streaming
      res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Range');

      if (range) {
        // Handle range requests for video streaming
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        // Security: Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).json({
            success: false,
            message: 'Requested range not satisfiable'
          });
        }

        const chunksize = (end - start) + 1;
        
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'X-Video-Quality': quality,
          'X-Estimated-Bitrate': bitrate,
        };
        
        res.writeHead(206, head);
        file.pipe(res);
        
        // Handle stream errors
        file.on('error', (err) => {
          console.error('Video stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Stream error occurred'
            });
          }
        });
      } else {
        // Full file streaming
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'X-Video-Quality': quality,
          'X-Estimated-Bitrate': bitrate,
        };
        
        res.writeHead(200, head);
        const file = fs.createReadStream(filePath);
        file.pipe(res);
        
        // Handle stream errors
        file.on('error', (err) => {
          console.error('Video stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Stream error occurred'
            });
          }
        });
      }
    } catch (error) {
      console.error('Video stream error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to stream video'
        });
      }
    }
  },

  // Check video availability with enhanced info
  async checkVideoAvailability(req, res) {
    try {
      const { lessonId } = req.params;
      
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .select('id', 'title', 'video_url', 'course_id', 'video_size', 'updated_at')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      if (!lesson.video_url) {
        return res.json({
          success: true,
          data: {
            available: false,
            message: 'No video uploaded for this lesson',
            lesson
          }
        });
      }

      // Extract filename from video URL
      const filename = lesson.video_url.split('/').pop();
      const safeFilename = sanitizeFilename(filename);
      const filePath = path.join('uploads/videos', safeFilename);

      // Check if file exists
      const fileExists = fs.existsSync(filePath);
      
      if (!fileExists) {
        return res.json({
          success: true,
          data: {
            available: false,
            message: 'Video file not found on server',
            lesson
          }
        });
      }

      // Get file stats
      const stat = fs.statSync(filePath);
      
      res.json({
        success: true,
        data: {
          available: true,
          message: 'Video is available for streaming',
          lesson,
          fileInfo: {
            size: stat.size,
            lastModified: stat.mtime,
            created: stat.birthtime || stat.ctime
          },
          streamingInfo: {
            supportsRange: true,
            qualities: ['hd', 'sd', 'mobile', 'auto'],
            recommendedQuality: 'auto'
          }
        }
      });
    } catch (error) {
      console.error('Check video availability error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check video availability'
      });
    }
  },

  // Notify when video becomes available (IMPORTANT FUNCTION RESTORED)
  async notifyVideoAvailable(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;
      
      // Check if lesson exists
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .select('id', 'title', 'video_url')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Check if user is already notified
      const existingNotification = await db('video_availability_notifications')
        .where({ user_id: userId, lesson_id: lessonId })
        .first();

      if (existingNotification) {
        return res.status(400).json({
          success: false,
          message: 'You are already subscribed to notifications for this video'
        });
      }

      // Create notification subscription
      await db('video_availability_notifications').insert({
        user_id: userId,
        lesson_id: lessonId,
        created_at: new Date()
      });

      res.json({
        success: true,
        message: 'You will be notified when the video becomes available'
      });
    } catch (error) {
      console.error('Notify video available error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to subscribe to notifications'
      });
    }
  },

  // Get user's video notifications (IMPORTANT FUNCTION RESTORED)
  async getUserVideoNotifications(req, res) {
    try {
      const userId = req.user.userId;
      
      const notifications = await db('video_availability_notifications as van')
        .join('lessons as l', 'van.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('van.user_id', userId)
        .select(
          'van.*',
          'l.title as lesson_title',
          'c.title as course_title'
        )
        .orderBy('van.created_at', 'desc');

      res.json({
        success: true,
        data: { notifications }
      });
    } catch (error) {
      console.error('Get user video notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  },

  // Enhanced video metadata with security
  async getVideoMetadata(req, res) {
    try {
      const { lessonId } = req.params;
      
      // Security: Validate lessonId format
      if (!lessonId || typeof lessonId !== 'string' || lessonId.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid lesson ID'
        });
      }

      const lesson = await db('lessons')
        .where({ id: lessonId })
        .select('id', 'title', 'video_url', 'video_size', 'updated_at')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Get available subtitles for this lesson
      const subtitles = await db('video_subtitles')
        .where({ lesson_id: lessonId })
        .select('id', 'language_code', 'language_name', 'subtitle_url')
        .orderBy('language_code', 'asc');

      res.json({
        success: true,
        data: {
          lesson,
          subtitles,
          streamingInfo: {
            supportsAdaptive: true,
            availableQualities: ['hd', 'sd', 'mobile', 'auto'],
            defaultQuality: 'auto',
            maxBitrate: 5000000,
            supportedFormats: ['mp4', 'webm', 'ogg']
          },
          security: {
            rangeRequests: true,
            corsEnabled: true,
            cacheControl: true
          }
        }
      });
    } catch (error) {
      console.error('Get video metadata error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch video metadata'
      });
    }
  },

  // Upload subtitle with enhanced security
  async uploadSubtitle(req, res) {
    try {
      const { lessonId, languageCode, languageName } = req.body;
      const userId = req.user.userId;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No subtitle file provided'
        });
      }

      // Security: Validate subtitle file type
      if (!ALLOWED_SUBTITLE_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subtitle format. Supported formats: VTT, SRT, TXT'
        });
      }

      if (!lessonId || !languageCode || !languageName) {
        return res.status(400).json({
          success: false,
          message: 'Lesson ID, language code, and language name are required'
        });
      }

      // Security: Validate language code format
      if (!/^[a-z]{2,3}(-[A-Z]{2,3})?$/.test(languageCode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid language code format. Use format like: en, en-US, es, etc.'
        });
      }

      // Verify the lesson belongs to a course created by this user
      const lesson = await db('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .where('courses.created_by', userId)
        .select('lessons.*')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found or access denied'
        });
      }

      // Security: Generate safe filename for subtitle
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const safeFileName = sanitizeFilename(`subtitle_${lessonId}_${languageCode}_${Date.now()}${fileExtension}`);
      const filePath = path.join('uploads/subtitles', safeFileName);

      // Ensure uploads directory exists with proper permissions
      const uploadsDir = path.join('uploads', 'subtitles');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
      }

      // Security: Check file path
      const resolvedPath = path.resolve(filePath);
      const uploadsBasePath = path.resolve(uploadsDir);
      if (!resolvedPath.startsWith(uploadsBasePath)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file path'
        });
      }

      // Save subtitle file
      fs.writeFileSync(filePath, req.file.buffer);

      // Store subtitle info in database
      const [subtitleId] = await db('video_subtitles').insert({
        lesson_id: lessonId,
        language_code: languageCode,
        language_name: languageName,
        subtitle_url: `/api/videos/subtitles/${safeFileName}`,
        file_size: req.file.size,
        created_by: userId,
        created_at: new Date()
      });

      const subtitle = await db('video_subtitles')
        .where({ id: subtitleId })
        .first();

      res.json({
        success: true,
        message: 'Subtitle uploaded successfully',
        data: { 
          subtitle,
          fileInfo: {
            size: req.file.size,
            format: fileExtension.substring(1)
          }
        }
      });
    } catch (error) {
      console.error('Subtitle upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload subtitle'
      });
    }
  },

  // Stream subtitle file with security
  async streamSubtitle(req, res) {
    try {
      const { filename } = req.params;
      
      // Security: Validate filename
      const safeFilename = sanitizeFilename(filename);
      const filePath = path.join('uploads/subtitles', safeFilename);

      // Security: Check file path
      const resolvedPath = path.resolve(filePath);
      const uploadsBasePath = path.resolve('uploads/subtitles');
      if (!resolvedPath.startsWith(uploadsBasePath)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file path'
        });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Subtitle file not found'
        });
      }

      // Set appropriate content type for subtitle files
      const ext = path.extname(safeFilename).toLowerCase();
      let contentType = 'text/plain';
      if (ext === '.vtt') {
        contentType = 'text/vtt';
      } else if (ext === '.srt') {
        contentType = 'application/x-subrip';
      }

      // Security: CORS headers
      res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      res.setHeader('Content-Type', contentType);
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('Subtitle stream error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stream subtitle'
      });
    }
  },

  // Get lessons for a course (IMPORTANT FUNCTION RESTORED)
  async getCourseLessons(req, res) {
    try {
      const teacherId = req.user.userId;
      const { courseId } = req.params;

      // Verify course belongs to teacher
      const course = await db('courses')
        .where({ id: courseId, created_by: teacherId })
        .first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      const lessons = await db('lessons')
        .where({ course_id: courseId })
        .select('*')
        .orderBy('order', 'asc');

      res.json({
        success: true,
        data: { lessons }
      });
    } catch (error) {
      console.error('Get lessons error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch lessons'
      });
    }
  }
};

module.exports = videoController;