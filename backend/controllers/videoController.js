const db = require('../config/database');
const { upload } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { notifyVideoAvailable } = require('../services/notificationService');

const videoController = {
  // Upload video for a lesson
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

      // Generate unique filename
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `video_${lessonId}_${Date.now()}${fileExtension}`;
      const filePath = path.join('uploads/videos', fileName);

      // Ensure uploads directory exists
      const uploadsDir = path.join('uploads', 'videos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save file (in production, this would upload to S3)
      fs.writeFileSync(filePath, req.file.buffer);

      // Update lesson with video URL
      const videoUrl = `/api/videos/stream/${fileName}`;
      await db('lessons')
        .where({ id: lessonId })
        .update({
          video_url: videoUrl,
          updated_at: new Date()
        });

      // Notify subscribed users that the video is now available
      await notifyVideoAvailable(lessonId);

      res.json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          videoUrl,
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

  // Stream video file with enhanced streaming support and resume capabilities
  async streamVideo(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join('uploads/videos', filename);

      if (!fs.existsSync(filePath)) {
        // Log video not found for notifications
        console.log(`Video not found: ${filename}`);
        
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // Determine content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'video/mp4';
      if (ext === '.webm') {
        contentType = 'video/webm';
      } else if (ext === '.ogg' || ext === '.ogv') {
        contentType = 'video/ogg';
      }

      // Check for quality parameter for adaptive streaming
      const quality = req.query.quality || 'hd'; // hd, sd, mobile
      
      // For adaptive streaming, we would normally have different quality versions
      // In this implementation, we'll simulate adaptive streaming by adjusting bitrate
      let bitrate = 5000000; // 5Mbps default for HD
      if (quality === 'sd') {
        bitrate = 2000000; // 2Mbps for SD
      } else if (quality === 'mobile') {
        bitrate = 1000000; // 1Mbps for mobile
      }

      // Add cache control headers for better streaming performance
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('ETag', `"${stat.mtime.getTime()}_${stat.size}"`);
      
      if (range) {
        // Handle range requests for video streaming with resume support
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        // Log range request for debugging
        console.log(`Streaming range: ${start}-${end}/${fileSize} (${Math.round((chunksize/fileSize)*100)}%)`);
        
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'X-Video-Quality': quality,
          'X-Estimated-Bitrate': bitrate,
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60'
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
        // Full file streaming with connection keep-alive
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'X-Video-Quality': quality,
          'X-Estimated-Bitrate': bitrate,
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60'
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
      
      // Only send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to stream video'
        });
      }
    }
  },

  // Check video availability
  async checkVideoAvailability(req, res) {
    try {
      const { lessonId } = req.params;
      
      // Get lesson with video URL
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .select('id', 'title', 'video_url', 'course_id')
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
      const filePath = path.join('uploads/videos', filename);

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
          fileSize: stat.size,
          lastModified: stat.mtime
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

  // Get video metadata including subtitle information
  async getVideoMetadata(req, res) {
    try {
      const { lessonId } = req.params;
      
      // Get lesson with video URL
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
            availableQualities: ['hd', 'sd', 'mobile'],
            defaultQuality: 'hd'
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

  // Upload subtitle file for a lesson
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

      if (!lessonId || !languageCode || !languageName) {
        return res.status(400).json({
          success: false,
          message: 'Lesson ID, language code, and language name are required'
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

      // Generate unique filename for subtitle
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `subtitle_${lessonId}_${languageCode}_${Date.now()}${fileExtension}`;
      const filePath = path.join('uploads/subtitles', fileName);

      // Ensure uploads directory exists
      const uploadsDir = path.join('uploads', 'subtitles');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save subtitle file
      fs.writeFileSync(filePath, req.file.buffer);

      // Store subtitle info in database
      const [subtitleId] = await db('video_subtitles').insert({
        lesson_id: lessonId,
        language_code: languageCode,
        language_name: languageName,
        subtitle_url: `/api/videos/subtitles/${fileName}`,
        created_by: userId,
        created_at: new Date()
      });

      const subtitle = await db('video_subtitles')
        .where({ id: subtitleId })
        .first();

      res.json({
        success: true,
        message: 'Subtitle uploaded successfully',
        data: { subtitle }
      });
    } catch (error) {
      console.error('Subtitle upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload subtitle'
      });
    }
  },

  // Stream subtitle file
  async streamSubtitle(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join('uploads/subtitles', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Subtitle file not found'
        });
      }

      // Set appropriate content type for subtitle files
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'text/plain';
      if (ext === '.vtt') {
        contentType = 'text/vtt';
      } else if (ext === '.srt') {
        contentType = 'text/srt';
      }

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
        .where({ course_id: courseId })
        .select('*')
        .orderBy('order_number', 'asc');

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