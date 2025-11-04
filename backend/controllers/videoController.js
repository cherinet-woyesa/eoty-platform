// backend/controllers/videoController.js
const db = require('../config/database');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { notifyVideoAvailable } = require('../services/notificationService');
const cloudStorageService = require('../services/cloudStorageService');
const videoProcessingService = require('../services/videoProcessingService');
const { withTransaction } = require('../utils/databaseTransactions');

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



// Helper function to get file info (kept for compatibility, but now uses cloud storage)
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
  // Upload video for a lesson to AWS S3 with transaction support
  async uploadVideo(req, res) {
    try {
      const teacherId = req.user.id;
      const { lessonId } = req.body;

      if (!req.file) {
        console.log('Video upload error: No file received');
        return res.status(400).json({
          success: false,
          message: 'No video file received by server. The file may be too large, in wrong format, or the upload was interrupted.'
        });
      }
      
      if (!lessonId) {
        console.log('Video upload error: Lesson ID is required');
        return res.status(400).json({
          success: false,
          message: 'Lesson ID is required'
        });
      }
      
      const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
      if (req.file.size > MAX_FILE_SIZE) {
        console.log('Video upload error: File too large', { fileSize: req.file.size });
        return res.status(400).json({
          success: false,
          message: 'Video file too large. Maximum size is 2GB.'
        });
      }
      
      

      // Use video processing service with transaction support
      const uploadResult = await videoProcessingService.uploadVideo(
        req.file.buffer,
        req.file.originalname,
        lessonId,
        teacherId,
        { enableTranscoding: true }
      );

      res.json({
        success: true,
        message: 'Video uploaded and processing started',
        data: {
          videoId: uploadResult.videoId,
          processingStatus: uploadResult.processingStatus,
          videoUrl: uploadResult.videoUrl,
          fileSize: uploadResult.fileSize,
          transcodingQueued: uploadResult.transcodingQueued
        }
      });

    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to upload video: ' + error.message 
      });
    }
  },

  // Stream video file with enhanced security and signed URLs
  async streamVideo(req, res) {
    try {
      const { filename } = req.params;
      const { quality } = req.query;
      
      console.log('Stream request:', { filename, quality });

      // Security: Validate and sanitize filename
      const safeFilename = sanitizeFilename(filename);

      // Get video from database to verify existence
      const video = await db('videos')
        .where('storage_url', 'like', `%${safeFilename}`)
        .select('*')
        .first();

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Check video access permissions
      if (req.user) {
        const hasAccess = await this.checkVideoAccess(req.user.id, video.lesson_id);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this video'
          });
        }
      }

      // Use HLS URL if available and ready, otherwise use original with signed URL
      let streamUrl;
      if (video.hls_url && video.status === 'ready') {
        streamUrl = video.hls_url;
      } else if (video.s3_key) {
        // Generate signed URL for original video
        streamUrl = await cloudStorageService.getSignedStreamUrl(video.s3_key);
      } else {
        // Fallback to storage_url (for backward compatibility)
        streamUrl = video.storage_url;
      }

      console.log('Streaming video:', {
        videoId: video.id,
        status: video.status,
        streamUrl: streamUrl,
        quality: quality
      });

      // Redirect to the secure streaming URL
      res.redirect(streamUrl);

    } catch (error) {
      console.error('Video stream error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stream video: ' + error.message
      });
    }
  },

  // Check video access permissions
  async checkVideoAccess(userId, lessonId) {
    try {
      // Check if user is enrolled in the course or is the teacher
      const access = await db('lessons as l')
        .leftJoin('courses as c', 'l.course_id', 'c.id')
        .leftJoin('enrollments as e', function() {
          this.on('c.id', '=', 'e.course_id')
              .andOn('e.user_id', '=', db.raw('?', [userId]));
        })
        .where('l.id', lessonId)
        .where(function() {
          this.where('c.created_by', userId) // Teacher owns the course
             .orWhere('e.user_id', userId);  // User is enrolled
        })
        .select('l.id')
        .first();

      return !!access;
    } catch (error) {
      console.error('Video access check error:', error);
      return false;
    }
  },

  // Get video file information
  async getVideoInfo(req, res) {
    try {
      const { filename } = req.params;
      
      // Security: Validate and sanitize filename
      const safeFilename = sanitizeFilename(filename);

      // Get video metadata from database
      const video = await db('videos')
        .where('storage_url', 'like', `%${safeFilename}`)
        .select('*')
        .first();

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video file not found'
        });
      }

      // Check access permissions
      if (req.user) {
        const hasAccess = await this.checkVideoAccess(req.user.id, video.lesson_id);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }

      // Get streaming URL
      let streamingUrl;
      if (video.hls_url && video.status === 'ready') {
        streamingUrl = video.hls_url;
      } else if (video.s3_key) {
        streamingUrl = await cloudStorageService.getSignedStreamUrl(video.s3_key);
      } else {
        streamingUrl = video.storage_url;
      }

      res.json({
        success: true,
        data: {
          filename: safeFilename,
          videoMetadata: video,
          streamingUrl: streamingUrl,
          processingStatus: video.status,
          processingError: video.processing_error
        }
      });
    } catch (error) {
      console.error('Get video info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get video information: ' + error.message
      });
    }
  },

  // Download video file with access control
  async downloadVideo(req, res) {
    try {
      const { filename } = req.params;
      
      // Security: Validate and sanitize filename
      const safeFilename = sanitizeFilename(filename);

      // Get video from database
      const video = await db('videos')
        .where('storage_url', 'like', `%${safeFilename}`)
        .select('*')
        .first();

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video file not found'
        });
      }

      // Check access permissions
      if (req.user) {
        const hasAccess = await this.checkVideoAccess(req.user.id, video.lesson_id);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }

      // Generate signed download URL
      let downloadUrl;
      if (video.s3_key) {
        downloadUrl = await cloudStorageService.getSignedStreamUrl(video.s3_key, 3600); // 1 hour
      } else {
        downloadUrl = video.storage_url;
      }

      // Redirect to signed download URL
      res.redirect(downloadUrl);

    } catch (error) {
      console.error('Download video error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download video: ' + error.message
      });
    }
  },

  // Check video availability with enhanced info
  async checkVideoAvailability(req, res) {
    try {
      const { lessonId } = req.params;
      
      const lesson = await db('lessons')
        .leftJoin('videos', 'lessons.video_id', 'videos.id')
        .where('lessons.id', lessonId)
        .select(
          'lessons.id',
          'lessons.title',
          'lessons.video_url',
          'lessons.course_id',
          'videos.status as video_status',
          'videos.size_bytes as video_size',
          'videos.processing_error',
          'videos.hls_url',
          'lessons.updated_at'
        )
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
            lesson: {
              id: lesson.id,
              title: lesson.title,
              course_id: lesson.course_id
            }
          }
        });
      }

      const isAvailable = lesson.video_status === 'ready';
      const message = isAvailable 
        ? 'Video is available for streaming' 
        : `Video processing status: ${lesson.video_status}`;

      res.json({
        success: true,
        data: {
          available: isAvailable,
          message: message,
          lesson: {
            id: lesson.id,
            title: lesson.title,
            course_id: lesson.course_id,
            video_url: lesson.video_url,
            video_status: lesson.video_status,
            processing_error: lesson.processing_error,
            updated_at: lesson.updated_at
          },
          streamingInfo: {
            supportsRange: true,
            supportsAdaptive: !!lesson.hls_url,
            qualities: lesson.hls_url ? ['auto', 'hd', 'sd', 'mobile'] : ['original'],
            processingStatus: lesson.video_status,
            recommendedQuality: 'auto'
          }
        }
      });
    } catch (error) {
      console.error('Check video availability error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check video availability: ' + error.message
      });
    }
  },

  // Notify when video becomes available
  async notifyVideoAvailable(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.id;
      
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
        message: 'Failed to subscribe to notifications: ' + error.message
      });
    }
  },

  // Get user's video notifications
  async getUserVideoNotifications(req, res) {
    try {
      const userId = req.user.id;
      
      const notifications = await db('video_availability_notifications as van')
        .join('lessons as l', 'van.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .leftJoin('videos as v', 'l.video_id', 'v.id')
        .where('van.user_id', userId)
        .select(
          'van.*',
          'l.title as lesson_title',
          'c.title as course_title',
          'v.status as video_status',
          'v.processing_error'
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
        message: 'Failed to fetch notifications: ' + error.message
      });
    }
  },

  // Enhanced video metadata with security
  async getVideoMetadata(req, res) {
    try {
      const { getSignedCloudFrontUrl } = require('../config/cloudfrontSigner');
      const { lessonId } = req.params;
      
      // Security: Validate lessonId format
      if (!lessonId || typeof lessonId !== 'string' || lessonId.length > 100) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid lesson ID' 
        });
      }
      
      // Join lessons and videos to get processing status and error
      const lesson = await db('lessons')
        .leftJoin('videos', 'lessons.video_id', 'videos.id')
        .where('lessons.id', lessonId)
        .select(
          'lessons.id',
          'lessons.title',
          'lessons.video_url',
          'lessons.video_size',
          'lessons.updated_at',
          'videos.status as video_status',
          'videos.processing_error as video_processing_error',
          'videos.hls_url',
          'videos.s3_key',
          'videos.size_bytes',
          'videos.processing_started_at',
          'videos.processing_completed_at'
        )
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

      // Generate secure streaming URL
      let signedStreamUrl = null;
      if (lesson.video_status === 'ready' && lesson.hls_url) {
        // For HLS videos, use the HLS URL
        signedStreamUrl = lesson.hls_url;
      } else if (lesson.s3_key) {
        // For original videos, generate signed URL
        signedStreamUrl = await cloudStorageService.getSignedStreamUrl(lesson.s3_key);
      } else if (lesson.video_url) {
        // Fallback to existing video_url
        signedStreamUrl = lesson.video_url;
      }

      res.json({
        success: true,
        data: {
          lesson: {
            ...lesson,
            signedStreamUrl: signedStreamUrl,
            processingStatus: lesson.video_status || 'not_uploaded',
            processingError: lesson.video_processing_error || null,
            processingStartedAt: lesson.processing_started_at,
            processingCompletedAt: lesson.processing_completed_at
          },
          subtitles,
          streamingInfo: {
            supportsAdaptive: !!lesson.hls_url,
            availableQualities: lesson.hls_url ? ['auto', 'hd', 'sd', 'mobile'] : ['original'],
            defaultQuality: 'auto',
            maxBitrate: 5000000,
            supportedFormats: ['mp4', 'webm', 'ogg', 'hls']
          },
          security: {
            signedUrls: true,
            accessControl: true,
            corsEnabled: true
          }
        }
      });
    } catch (error) {
      console.error('Get video metadata error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch video metadata: ' + error.message 
      });
    }
  },

  // Upload subtitle with enhanced security and transaction
  async uploadSubtitle(req, res) {
    try {
      const { lessonId, languageCode, languageName } = req.body;
      const userId = req.user.id;

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

      // Use video processing service for subtitle upload
      const uploadResult = await videoProcessingService.uploadSubtitle(
        req.file.buffer,
        req.file.originalname,
        lessonId,
        languageCode,
        languageName,
        userId
      );

      res.json({
        success: true,
        message: 'Subtitle uploaded successfully',
        data: { 
          subtitle: {
            id: uploadResult.subtitleId,
            lesson_id: lessonId,
            language_code: languageCode,
            language_name: languageName,
            subtitle_url: uploadResult.subtitleUrl
          },
          fileInfo: {
            size: uploadResult.fileSize,
            format: path.extname(req.file.originalname).substring(1)
          }
        }
      });
    } catch (error) {
      console.error('Subtitle upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload subtitle: ' + error.message
      });
    }
  },

  // Stream subtitle file with security
  async streamSubtitle(req, res) {
    try {
      const { filename } = req.params;
      
      // Security: Validate filename
      const safeFilename = sanitizeFilename(filename);

      // Get subtitle from database
      const subtitle = await db('video_subtitles')
        .where('subtitle_url', 'like', `%${safeFilename}`)
        .first();

      if (!subtitle) {
        return res.status(404).json({
          success: false,
          message: 'Subtitle file not found'
        });
      }

      // Check access to the associated lesson
      if (req.user) {
        const hasAccess = await this.checkVideoAccess(req.user.id, subtitle.lesson_id);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }

      // Extract S3 key and generate signed URL
      const s3Key = subtitle.subtitle_url.replace(`https://${process.env.CLOUDFRONT_DOMAIN}/`, '');
      const signedUrl = await cloudStorageService.getSignedStreamUrl(s3Key);

      // Redirect to signed URL
      res.redirect(signedUrl);

    } catch (error) {
      console.error('Subtitle stream error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stream subtitle: ' + error.message
      });
    }
  },

  // Get lessons for a course
  async getCourseLessons(req, res) {
    try {
      const teacherId = req.user.id;
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
        .select(
          'lessons.*', 
          'videos.storage_url as video_url',
          'videos.status as video_status',
          'videos.hls_url',
          'videos.processing_error'
        )
        .orderBy('lessons.order', 'asc');

      res.json({
        success: true,
        data: { lessons }
      });
    } catch (error) {
      console.error('Get lessons error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch lessons: ' + error.message
      });
    }
  },

  // Delete video with transaction and cloud cleanup
  async deleteVideo(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.id;

      // Use video processing service for deletion
      const deleteResult = await videoProcessingService.deleteVideo(lessonId, userId);

      res.json({
        success: true,
        message: 'Video deleted successfully',
        data: deleteResult
      });
    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete video: ' + error.message
      });
    }
  },

  // Get video analytics
  async getVideoAnalytics(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.id;

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
        message: 'Failed to fetch video analytics: ' + error.message
      });
    }
  },

  // Get video processing status
  async getVideoProcessingStatus(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;

      // Verify user has access to this video
      const video = await db('videos as v')
        .join('lessons as l', 'v.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('v.id', videoId)
        .where('c.created_by', userId)
        .select('v.id')
        .first();

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found or access denied'
        });
      }

      const status = await videoProcessingService.getProcessingStatus(videoId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Get video processing status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get processing status: ' + error.message
      });
    }
  },

  // Retry failed video processing
  async retryVideoProcessing(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;

      // Verify user has access to this video
      const video = await db('videos as v')
        .join('lessons as l', 'v.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('v.id', videoId)
        .where('c.created_by', userId)
        .select('v.id', 'v.status')
        .first();

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found or access denied'
        });
      }

      if (video.status !== 'failed') {
        return res.status(400).json({
          success: false,
          message: 'Video is not in failed state'
        });
      }

      const result = await videoProcessingService.retryFailedProcessing(videoId);

      res.json({
        success: true,
        message: 'Video processing retry started',
        data: result
      });
    } catch (error) {
      console.error('Retry video processing error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry video processing: ' + error.message
      });
    }
  },

  // NEW: Health check endpoint for videos
  async healthCheck(req, res) {
    try {
      const videoServiceHealth = await videoProcessingService.healthCheck();
      const cloudStorageHealth = await cloudStorageService.healthCheck();

      res.json({
        success: true,
        data: {
          service: 'Video Controller',
          status: 'operational',
          timestamp: new Date().toISOString(),
          services: {
            videoProcessing: videoServiceHealth,
            cloudStorage: cloudStorageHealth
          }
        }
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed: ' + error.message
      });
    }
  },

  // NEW: Get video service statistics
  async getVideoStatistics(req, res) {
    try {
      const userId = req.user.id;

      // Verify user is admin or teacher
      const user = await db('users')
        .where({ id: userId })
        .select('role')
        .first();

      if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const statistics = await videoProcessingService.getStatistics();

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Get video statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch video statistics: ' + error.message
      });
    }
  }
};

module.exports = videoController;