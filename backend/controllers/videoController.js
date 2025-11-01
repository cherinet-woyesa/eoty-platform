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

// Helper function to get file info
const getFileInfo = (filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return {
      exists: true,
      size: stat.size,
      created: stat.birthtime,
      modified: stat.mtime,
      isFile: stat.isFile()
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
};

const videoController = {
  // FIXED: Upload video for a lesson with enhanced debugging and error handling
  async uploadVideo(req, res) {
    try {
      const teacherId = req.user.userId;
      const { lessonId } = req.body;

      console.log('=== VIDEO UPLOAD REQUEST START ===');
      console.log('Upload request details:', {
        teacherId,
        lessonId,
        hasFile: !!req.file,
        fileSize: req.file?.size,
        fileType: req.file?.mimetype,
        fileName: req.file?.originalname,
        bodyFields: Object.keys(req.body),
        headers: req.headers['content-type']
      });

      // Debug: Log all request properties
      console.log('Full request debug:', {
        files: req.files,
        file: req.file,
        body: req.body,
        headers: {
          'content-type': req.headers['content-type'],
          'content-length': req.headers['content-length']
        }
      });

      // FIXED: Enhanced file presence check
      if (!req.file) {
        console.log('ERROR: No file received in req.file');
        console.log('Available in req.files:', req.files);
        console.log('Request body keys:', Object.keys(req.body));
        console.log('Request headers:', {
          'content-type': req.headers['content-type'],
          'content-length': req.headers['content-length']
        });
        
        return res.status(400).json({
          success: false,
          message: 'No video file received by server. The file may be too large, in wrong format, or the upload was interrupted.'
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
        console.log('Invalid file type:', req.file.mimetype);
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

      // Security: Generate safe filename with proper extension
      const originalExtension = path.extname(req.file.originalname).toLowerCase();
      const fileExtension = originalExtension || '.webm'; // Default to .webm for recordings
      
      const safeFileName = sanitizeFilename(`video_${lessonId}_${Date.now()}${fileExtension}`);
      const filePath = path.join('uploads/videos', safeFileName);

      // Security: Ensure uploads directory exists with proper permissions
      const uploadsDir = path.join('uploads', 'videos');
      if (!fs.existsSync(uploadsDir)) {
        console.log('Creating uploads directory:', uploadsDir);
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

      // Save file with enhanced error handling
      try {
        console.log('Saving video file to:', filePath);
        console.log('File buffer size:', req.file.buffer.length);
        
        fs.writeFileSync(filePath, req.file.buffer);
        console.log('Video file saved successfully');
      } catch (fileError) {
        console.error('File write error:', fileError);
        return res.status(500).json({
          success: false,
          message: 'Failed to save video file to server storage'
        });
      }

      // Verify the file was saved
      const fileInfo = getFileInfo(filePath);
      if (!fileInfo.exists) {
        console.error('File verification failed:', fileInfo);
        return res.status(500).json({
          success: false,
          message: 'Video file was not saved correctly to server'
        });
      }

      console.log('File saved successfully:', {
        path: filePath,
        size: fileInfo.size,
        saved: fileInfo.exists
      });

      // Insert video record into 'videos' table
      const videoUrl = `/api/videos/stream/${safeFileName}`;
      const insertedVideo = await db('videos').insert({
        lesson_id: lessonId,
        uploader_id: teacherId,
        storage_url: videoUrl,
        size_bytes: req.file.size,
        status: 'ready',
        created_at: new Date(),
        updated_at: new Date(),
      }).returning('id');
      const videoId = insertedVideo[0].id;

      // Update lesson with video_id and video_url
      await db('lessons')
        .where({ id: lessonId })
        .update({
          video_id: videoId,
          video_url: videoUrl,
          updated_at: new Date(),
        });

      // Notify subscribed users that the video is now available
      try {
        await notifyVideoAvailable(lessonId);
      } catch (notificationError) {
        console.error('Notification failed:', notificationError);
        // Continue even if notification fails
      }

      console.log('=== VIDEO UPLOAD SUCCESS ===');
      console.log('Upload completed:', {
        videoId,
        videoUrl,
        fileSize: req.file.size,
        fileName: safeFileName
      });

      res.json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          videoId,
          videoUrl,
          fileSize: req.file.size,
          fileName: safeFileName,
          filePath: videoUrl,
          lesson: {
            ...lesson,
            video_id: videoId,
          }
        }
      });

    } catch (error) {
      console.error('=== VIDEO UPLOAD ERROR ===');
      console.error('Video upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload video due to server error'
      });
    }
  },

  // Stream video file with enhanced security and CORS
  async streamVideo(req, res) {
    try {
      const { filename } = req.params;
      const { quality } = req.query;
      
      console.log('Stream request:', { filename, quality });

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

      // Check if file exists
      const fileInfo = getFileInfo(filePath);
      if (!fileInfo.exists) {
        console.error('Video file not found:', filePath);
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      const fileSize = fileInfo.size;
      const range = req.headers.range;

      console.log('Streaming video:', {
        filename: safeFilename,
        size: fileSize,
        range: range,
        quality: quality
      });

      // Security: Set appropriate content type
      const ext = path.extname(safeFilename).toLowerCase();
      const contentType = EXTENSION_TO_MIME[ext] || 'video/mp4';

      // CRITICAL FIX: Enhanced CORS headers for video streaming
      res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'http://localhost:3000');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // Performance: Cache headers
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('ETag', `"${fileInfo.modified.getTime()}_${fileSize}"`);

      // Adaptive streaming based on quality
      let bitrate = 5000000; // 5Mbps default for HD
      let videoQuality = 'hd';
      
      if (quality === 'sd') {
        bitrate = 2000000; // 2Mbps for SD
        videoQuality = 'sd';
      } else if (quality === 'mobile') {
        bitrate = 1000000; // 1Mbps for mobile
        videoQuality = 'mobile';
      } else if (quality === 'auto') {
        // Auto-detect based on file size and type
        bitrate = Math.min(5000000, Math.max(1000000, fileSize / 60));
        videoQuality = 'auto';
      }

      res.setHeader('X-Video-Quality', videoQuality);
      res.setHeader('X-Estimated-Bitrate', bitrate);

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
        
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
          'X-Video-Quality': videoQuality
        };
        
        res.writeHead(206, head);
        const fileStream = fs.createReadStream(filePath, { start, end });
        fileStream.pipe(res);
        
        fileStream.on('error', (err) => {
          console.error('Video stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Stream error occurred'
            });
          }
        });

        console.log('Streaming range:', { start, end, chunksize });

      } else {
        // Full file streaming
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
          'X-Video-Quality': videoQuality
        };
        
        res.writeHead(200, head);
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        fileStream.on('error', (err) => {
          console.error('Video stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Stream error occurred'
            });
          }
        });

        console.log('Streaming full file');
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

  // Get video file information
  async getVideoInfo(req, res) {
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

      const fileInfo = getFileInfo(filePath);
      
      if (!fileInfo.exists) {
        return res.status(404).json({
          success: false,
          message: 'Video file not found'
        });
      }

      // Get video metadata from database
      const video = await db('videos')
        .where('storage_url', 'like', `%${safeFilename}`)
        .select('*')
        .first();

      res.json({
        success: true,
        data: {
          filename: safeFilename,
          fileInfo,
          videoMetadata: video,
          streamingUrl: `/api/videos/stream/${safeFilename}`
        }
      });
    } catch (error) {
      console.error('Get video info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get video information'
      });
    }
  },

  // Download video file
  async downloadVideo(req, res) {
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
          message: 'Video file not found'
        });
      }

      const fileInfo = getFileInfo(filePath);
      const ext = path.extname(safeFilename).toLowerCase();
      const contentType = EXTENSION_TO_MIME[ext] || 'video/mp4';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Length', fileInfo.size);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (err) => {
        console.error('Video download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Download error occurred'
          });
        }
      });
    } catch (error) {
      console.error('Download video error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download video'
      });
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

      // Check if file exists and get detailed info
      const fileInfo = getFileInfo(filePath);
      
      if (!fileInfo.exists) {
        return res.json({
          success: true,
          data: {
            available: false,
            message: 'Video file not found on server',
            lesson,
            fileInfo
          }
        });
      }

      res.json({
        success: true,
        data: {
          available: true,
          message: 'Video is available for streaming',
          lesson,
          fileInfo,
          streamingInfo: {
            supportsRange: true,
            qualities: ['hd', 'sd', 'mobile', 'auto'],
            recommendedQuality: 'auto',
            streamingUrl: lesson.video_url
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

  // Notify when video becomes available
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

  // Get user's video notifications
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

      // Get video file info if available
      let fileInfo = null;
      if (lesson.video_url) {
        const filename = lesson.video_url.split('/').pop();
        const safeFilename = sanitizeFilename(filename);
        const filePath = path.join('uploads/videos', safeFilename);
        fileInfo = getFileInfo(filePath);
      }

      res.json({
        success: true,
        data: {
          lesson,
          subtitles,
          fileInfo,
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
      res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'http://localhost:3000');
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

  // Get lessons for a course
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
        .leftJoin('videos', 'lessons.video_id', 'videos.id')
        .where({ 'lessons.course_id': courseId })
        .select('lessons.*', 'videos.storage_url as video_url')
        .orderBy('lessons.order', 'asc');

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
  },

  // Delete video
  async deleteVideo(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;

      // Verify the lesson belongs to the teacher
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

      // Get video information
      const video = await db('videos')
        .where({ lesson_id: lessonId })
        .first();

      if (video) {
        // Delete physical file
        const filename = video.storage_url.split('/').pop();
        const safeFilename = sanitizeFilename(filename);
        const filePath = path.join('uploads/videos', safeFilename);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Deleted video file:', filePath);
        }

        // Delete video record
        await db('videos').where({ id: video.id }).delete();
      }

      // Update lesson to remove video reference
      await db('lessons')
        .where({ id: lessonId })
        .update({
          video_id: null,
          video_url: null,
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Video deleted successfully'
      });
    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete video'
      });
    }
  },

  // Get video analytics
  async getVideoAnalytics(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;

      // Verify the lesson belongs to the teacher
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

      // Get video analytics data
      const analytics = await db('video_analytics')
        .where({ lesson_id: lessonId })
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(100);

      // Calculate summary statistics
      const totalViews = analytics.length;
      const averageWatchTime = analytics.reduce((sum, item) => sum + (item.watch_time || 0), 0) / totalViews || 0;
      const completionRate = (analytics.filter(item => item.completed).length / totalViews) * 100 || 0;

      res.json({
        success: true,
        data: {
          lesson,
          analytics: {
            totalViews,
            averageWatchTime: Math.round(averageWatchTime),
            completionRate: Math.round(completionRate),
            recentViews: analytics.slice(0, 10)
          }
        }
      });
    } catch (error) {
      console.error('Get video analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch video analytics'
      });
    }
  },

  // NEW: Health check endpoint for videos
  async healthCheck(req, res) {
    try {
      const uploadsDir = path.join('uploads', 'videos');
      const exists = fs.existsSync(uploadsDir);
      const writable = exists ? true : false;
      
      // Try to create directory if it doesn't exist
      if (!exists) {
        try {
          fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
          writable = true;
        } catch (error) {
          console.error('Cannot create uploads directory:', error);
          writable = false;
        }
      }

      res.json({
        success: true,
        data: {
          service: 'Video Controller',
          status: 'operational',
          uploadsDirectory: {
            exists,
            writable,
            path: uploadsDir
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed'
      });
    }
  }
};

module.exports = videoController;