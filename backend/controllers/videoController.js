// backend/controllers/videoController.js
const db = require('../config/database');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { notifyVideoAvailable } = require('../services/notificationService');
const cloudStorageService = require('../services/cloudStorageService');
const videoProcessingService = require('../services/videoProcessingService');
const muxService = require('../services/muxService');
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

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

async function handleAssetReady(assetData) {
  const websocketService = require('../services/websocketService');
  try {
    const assetId = assetData.id;
    const playbackIds = assetData.playback_ids || [];

    console.log(`✅ Asset ready: ${assetId}`);
    console.log(`📹 Playback IDs:`, JSON.stringify(playbackIds, null, 2));

    // Get asset details from Mux
    console.log(`🔍 Fetching asset details from Mux...`);
    const asset = await muxService.getAsset(assetId);
    console.log(`📊 Asset details:`, JSON.stringify(asset, null, 2));

    // Find lesson by asset ID
    console.log(`🔍 Looking for lesson with mux_asset_id: ${assetId}`);
    const lesson = await db('lessons')
      .where({ mux_asset_id: assetId })
      .first();

    if (!lesson) {
      console.warn(`⚠️  No lesson found for asset ${assetId}`);
      console.warn(`🔍 Checking all lessons with mux data...`);
      const allMuxLessons = await db('lessons')
        .whereNotNull('mux_asset_id')
        .select('id', 'title', 'mux_asset_id', 'mux_upload_id');
      console.log(`📋 All lessons with Mux data:`, JSON.stringify(allMuxLessons, null, 2));
      return;
    }

    console.log(`✅ Found lesson ${lesson.id}: ${lesson.title}`);

    // Update lesson with playback info
    const updateData = {
      mux_status: 'ready',
      mux_playback_id: playbackIds[0]?.id || null,
      mux_ready_at: db.fn.now(),
      mux_metadata: JSON.stringify({
        duration: asset.duration,
        aspectRatio: asset.aspectRatio,
        maxResolution: asset.maxStoredResolution
      }),
      duration: Math.ceil(asset.duration || 0),
      updated_at: db.fn.now()
    };

    console.log(`💾 Updating lesson with data:`, JSON.stringify(updateData, null, 2));
    
    await db('lessons')
      .where({ id: lesson.id })
      .update(updateData);

    // Verify the update
    const updatedLesson = await db('lessons')
      .where({ id: lesson.id })
      .first();
    console.log(`✅ Lesson ${lesson.id} updated successfully`);
    console.log(`📊 Updated lesson data:`, JSON.stringify({
      id: updatedLesson.id,
      title: updatedLesson.title,
      mux_status: updatedLesson.mux_status,
      mux_playback_id: updatedLesson.mux_playback_id,
      mux_asset_id: updatedLesson.mux_asset_id
    }, null, 2));

    // Send WebSocket update for processing completion
    websocketService.sendProgress(lesson.id.toString(), {
      type: 'complete',
      progress: 100,
      currentStep: 'Video processing complete',
      provider: 'mux',
      playbackId: playbackIds[0]?.id || null
    });

    // Notify users that video is ready
    await notifyVideoAvailable(lesson.id);
  } catch (error) {
    console.error('❌ Error handling asset ready:', error);
  }
}

async function handleAssetError(assetData) {
  try {
    const assetId = assetData.id;
    const errors = assetData.errors || {};

    console.error(`❌ Asset error: ${assetId}`, errors);

    // Find lesson by asset ID
    const lesson = await db('lessons')
      .where({ mux_asset_id: assetId })
      .first();

    if (!lesson) {
      console.warn(`⚠️  No lesson found for asset ${assetId}`);
      return;
    }

    // Update lesson with error info
    await db('lessons')
      .where({ id: lesson.id })
      .update({
        mux_status: 'errored',
        mux_error_message: JSON.stringify(errors),
        updated_at: db.fn.now()
      });

    console.log(`✅ Lesson ${lesson.id} marked as errored`);

    // Send WebSocket update for processing error
    const websocketService = require('../services/websocketService');
    websocketService.sendProgress(lesson.id.toString(), {
      type: 'failed',
      progress: 0,
      currentStep: 'Video processing failed',
      provider: 'mux',
      error: typeof errors === 'string' ? errors : JSON.stringify(errors)
    });
  } catch (error) {
    console.error('❌ Error handling asset error:', error);
  }
}

async function handleUploadAssetCreated(uploadData) {
  try {
    const uploadId = uploadData.id;
    const assetId = uploadData.asset_id;

    console.log(`✅ Upload created asset: ${uploadId} -> ${assetId}`);

    // Check if Mux columns exist
    const hasMuxUploadId = await db.schema.hasColumn('lessons', 'mux_upload_id');
    if (!hasMuxUploadId) {
      console.warn(`⚠️  Mux columns not available, skipping asset update for upload ${uploadId}`);
      return;
    }

    // Find lesson by upload ID
    const lesson = await db('lessons')
      .where({ mux_upload_id: uploadId })
      .first();

    if (!lesson) {
      console.warn(`⚠️  No lesson found for upload ${uploadId}`);
      return;
    }

    // Check which columns exist before updating
    const hasMuxAssetId = await db.schema.hasColumn('lessons', 'mux_asset_id');
    const hasMuxStatus = await db.schema.hasColumn('lessons', 'mux_status');
    const hasMuxCreatedAt = await db.schema.hasColumn('lessons', 'mux_created_at');

    const updateData = {
      updated_at: db.fn.now()
    };

    if (hasMuxAssetId) {
      updateData.mux_asset_id = assetId;
    }
    if (hasMuxStatus) {
      updateData.mux_status = 'processing';
    }
    if (hasMuxCreatedAt) {
      updateData.mux_created_at = db.fn.now();
    }

    // Update lesson with asset ID and status
    await db('lessons')
      .where({ id: lesson.id })
      .update(updateData);

    console.log(`✅ Lesson ${lesson.id} linked to asset ${assetId}`);

    // Send WebSocket update for processing start
    const websocketService = require('../services/websocketService');
    websocketService.sendProgress(lesson.id.toString(), {
      type: 'progress',
      progress: 50,
      currentStep: 'Processing video...',
      provider: 'mux',
      assetId: assetId
    });
  } catch (error) {
    console.error('❌ Error handling upload asset created:', error);
  }
}

async function handleUploadError(uploadData) {
  try {
    const uploadId = uploadData.id;
    const error = uploadData.error || 'Upload failed';

    console.error(`❌ Upload error: ${uploadId}`, error);

    // Check if Mux columns exist
    const hasMuxUploadId = await db.schema.hasColumn('lessons', 'mux_upload_id');
    if (!hasMuxUploadId) {
      console.warn(`⚠️  Mux columns not available, skipping error update for upload ${uploadId}`);
      return;
    }

    // Find lesson by upload ID
    const lesson = await db('lessons')
      .where({ mux_upload_id: uploadId })
      .first();

    if (!lesson) {
      console.warn(`⚠️  No lesson found for upload ${uploadId}`);
      return;
    }

    // Check which columns exist before updating
    const hasMuxStatus = await db.schema.hasColumn('lessons', 'mux_status');
    const hasMuxErrorMessage = await db.schema.hasColumn('lessons', 'mux_error_message');

    const updateData = {
      updated_at: db.fn.now()
    };

    if (hasMuxStatus) {
      updateData.mux_status = 'errored';
    }
    if (hasMuxErrorMessage) {
      updateData.mux_error_message = typeof error === 'string' ? error : JSON.stringify(error);
    }

    // Update lesson with error info
    await db('lessons')
      .where({ id: lesson.id })
      .update(updateData);

    console.log(`✅ Lesson ${lesson.id} marked as upload failed`);

    // Send WebSocket update for upload error
    const websocketService = require('../services/websocketService');
    websocketService.sendProgress(lesson.id.toString(), {
      type: 'failed',
      progress: 0,
      currentStep: 'Upload failed',
      provider: 'mux',
      error: typeof error === 'string' ? error : JSON.stringify(error)
    });
  } catch (error) {
    console.error('❌ Error handling upload error:', error);
  }
}

const videoController = {
  /**
   * @deprecated S3 video upload is deprecated. All new uploads use Mux direct upload.
   * This endpoint is kept for backward compatibility with legacy code only.
   * Route has been removed - use POST /api/videos/mux/upload-url instead.
   */
  async uploadVideo(req, res) {
    console.warn('⚠️  S3 video upload endpoint called - this is deprecated. Use Mux direct upload instead.');
    return res.status(410).json({
      success: false,
      message: 'S3 video upload is deprecated. Please use Mux direct upload (POST /api/videos/mux/upload-url) instead.',
      migrationGuide: 'See MUX_IMPLEMENTATION_PLAN.md for migration instructions'
    });
  },

  /**
   * @deprecated S3 video streaming is deprecated. All videos use Mux.
   * This endpoint is kept for backward compatibility only.
   */
  async streamVideo(req, res) {
    console.warn('⚠️  S3 video streaming endpoint called - this is deprecated. All videos use Mux.');
    return res.status(410).json({
      success: false,
      message: 'S3 video streaming is deprecated. All videos use Mux for playback.',
      migrationGuide: 'Use GET /api/videos/:lessonId/playback for Mux video playback'
    });
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
        const hasAccess = await this.checkVideoAccess(req.user.userId, video.lesson_id);
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
        const hasAccess = await this.checkVideoAccess(req.user.userId, video.lesson_id);
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
        message: 'Failed to subscribe to notifications: ' + error.message
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
        const hasAccess = await this.checkVideoAccess(req.user.userId, subtitle.lesson_id);
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
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;

      // Verify course exists
      const course = await db('courses')
        .where({ id: courseId })
        .first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check permissions: teacher owns course OR admin OR base user enrolled
      const isOwner = course.created_by === userId;
      const isAdmin = userRole === 'admin';
      
      if (!isOwner && !isAdmin) {
        // Check if base user is enrolled
        if (userRole === 'user' || userRole === 'student') {
          const enrollment = await db('user_course_enrollments')
            .where({ user_id: userId, course_id: courseId })
            .first();
          
          if (!enrollment) {
            return res.status(403).json({
              success: false,
              message: 'You must be enrolled in this course to view lessons'
            });
          }
        } else {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view these lessons'
          });
        }
      }

      // Check if videos table exists
      const hasVideosTable = await db.schema.hasTable('videos');
      
      let lessons;
      if (hasVideosTable) {
        // Legacy S3 videos - join with videos table if it exists
        lessons = await db('lessons')
          .leftJoin('videos', 'lessons.video_id', 'videos.id')
          .where({ 'lessons.course_id': courseId })
          .select(
            'lessons.*', 
            'videos.storage_url as video_url',
            'videos.status as video_status',
            'videos.hls_url',
            'videos.processing_error',
            // Ensure Mux columns are included (they're already in lessons.*)
            // but explicitly list them for clarity
            'lessons.mux_playback_id',
            'lessons.mux_asset_id',
            'lessons.video_provider',
            'lessons.mux_status',
            'lessons.mux_error_message'
          )
          .orderBy('lessons.order', 'asc');
      } else {
        // Mux-only - no videos table needed
        lessons = await db('lessons')
          .where({ 'lessons.course_id': courseId })
          .select(
            'lessons.*',
            // Mux columns
            'lessons.mux_playback_id',
            'lessons.mux_asset_id',
            'lessons.video_provider',
            'lessons.mux_status',
            'lessons.mux_error_message'
          )
          .orderBy('lessons.order', 'asc');
      }

      // Parse resources JSON for each lesson
      const lessonsWithParsedResources = lessons.map(lesson => {
        if (lesson.resources) {
          try {
            lesson.resources = JSON.parse(lesson.resources);
          } catch (e) {
            lesson.resources = [];
          }
        }
        return lesson;
      });

      res.json({
        success: true,
        data: { lessons: lessonsWithParsedResources }
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
      const userId = req.user.userId;

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
        message: 'Failed to fetch video analytics: ' + error.message
      });
    }
  },

  // Get video processing status
  async getVideoProcessingStatus(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.userId;

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
      const userId = req.user.userId;

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
      const userId = req.user.userId;

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
  },

  /**
   * Get video analytics for a lesson
   * GET /api/videos/:lessonId/analytics
   */
  async getVideoAnalytics(req, res) {
    try {
      const { lessonId } = req.params;
      const { timeframe = '7:days', startDate, endDate } = req.query;
      const muxService = require('../services/muxService');

      // Get lesson
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Check if user has permission to view analytics
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Teachers can view analytics for their own courses
      if (userRole === 'teacher') {
        const course = await db('courses')
          .where({ id: lesson.course_id })
          .first();

        if (!course || course.teacher_id !== userId) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view analytics for this lesson'
          });
        }
      } else if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Get analytics based on video provider
      let analytics;

      if (lesson.video_provider === 'mux' && lesson.mux_asset_id) {
        // Get Mux analytics with caching
        analytics = await muxService.getCachedAnalytics(
          lesson.mux_asset_id,
          db,
          {
            timeframe,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            ttl: 300 // 5 minutes cache
          }
        );
      } else {
        // For S3 videos, get analytics from video_analytics table
        const dateFilter = db('video_analytics').where({ lesson_id: lessonId });

        if (startDate && endDate) {
          dateFilter.whereBetween('session_started_at', [new Date(startDate), new Date(endDate)]);
        } else if (timeframe) {
          const [amount, unit] = timeframe.split(':');
          const daysAgo = unit === 'days' ? parseInt(amount) : 7;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
          dateFilter.where('session_started_at', '>=', cutoffDate);
        }

        const summary = await dateFilter
          .select(
            db.raw('COUNT(DISTINCT id) as total_views'),
            db.raw('COUNT(DISTINCT user_id) as unique_viewers'),
            db.raw('SUM(watch_time_seconds) as total_watch_time'),
            db.raw('AVG(watch_time_seconds) as avg_watch_time'),
            db.raw('AVG(completion_percentage) as avg_completion_rate')
          )
          .first();

        analytics = {
          lessonId: parseInt(lessonId),
          timeframe,
          summary: {
            totalViews: parseInt(summary.total_views) || 0,
            uniqueViewers: parseInt(summary.unique_viewers) || 0,
            totalWatchTime: parseInt(summary.total_watch_time) || 0,
            averageWatchTime: parseFloat(summary.avg_watch_time) || 0,
            averageCompletionRate: parseFloat(summary.avg_completion_rate) || 0
          }
        };
      }

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('Get video analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch video analytics: ' + error.message
      });
    }
  },

  /**
   * Track a video view
   * POST /api/videos/:lessonId/track-view
   */
  async trackVideoView(req, res) {
    try {
      const { lessonId } = req.params;
      const {
        watchTime,
        videoDuration,
        completionPercentage,
        muxViewId,
        deviceInfo = {}
      } = req.body;

      const userId = req.user?.userId || null;
      const muxService = require('../services/muxService');

      // Validate lesson exists
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Record the view
      const viewRecord = await muxService.recordVideoView(
        {
          lessonId: parseInt(lessonId),
          userId,
          muxViewId,
          watchTime: parseInt(watchTime) || 0,
          videoDuration: videoDuration ? parseInt(videoDuration) : null,
          completionPercentage: parseFloat(completionPercentage) || 0,
          deviceInfo
        },
        db
      );

      // Clear analytics cache for this lesson
      if (lesson.mux_asset_id) {
        muxService.clearAnalyticsCache(lesson.mux_asset_id);
      }

      res.json({
        success: true,
        message: 'View tracked successfully',
        viewId: viewRecord.id
      });
    } catch (error) {
      console.error('Track video view error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track video view: ' + error.message
      });
    }
  },

  /**
   * Get bulk analytics for multiple lessons
   * GET /api/videos/bulk/analytics?lessonIds=1,2,3
   */
  async getBulkAnalytics(req, res) {
    try {
      const { lessonIds, timeframe = '7:days' } = req.query;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const muxService = require('../services/muxService');

      if (!lessonIds) {
        return res.status(400).json({
          success: false,
          message: 'lessonIds query parameter is required'
        });
      }

      const lessonIdArray = lessonIds.split(',').map(id => parseInt(id));

      // Verify user has permission to view analytics for these lessons
      if (userRole === 'teacher') {
        const lessons = await db('lessons')
          .whereIn('id', lessonIdArray)
          .join('courses', 'lessons.course_id', 'courses.id')
          .select('lessons.id', 'courses.teacher_id');

        const unauthorized = lessons.some(l => l.teacher_id !== userId);
        if (unauthorized) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view analytics for some of these lessons'
          });
        }
      } else if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Get bulk analytics
      const analytics = await muxService.getBulkAnalytics(
        lessonIdArray,
        db,
        { timeframe }
      );

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('Get bulk analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bulk analytics: ' + error.message
      });
    }
  },

  // ============================================================================
  // MUX INTEGRATION ENDPOINTS
  // ============================================================================

  /**
   * Create Mux direct upload URL
   * POST /api/videos/mux/upload-url
   */
  async createMuxUploadUrl(req, res) {
  try {
    const { lessonId, metadata = {} } = req.body;
    const userId = req.user.id;

    // Validate lesson exists and user has permission
    const lesson = await db('lessons')
      .where({ id: lessonId })
      .first();

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if user owns the lesson's course
    const course = await db('courses')
      .where({ id: lesson.course_id })
      .first();

    // Allow if user is admin, teacher role, or owns the course
    const isAuthorized = 
      req.user.role === 'admin' || 
      req.user.role === 'teacher' ||
      course.created_by === userId;

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload video for this lesson'
      });
    }

    // Create Mux direct upload
    const upload = await muxService.createDirectUpload({
      corsOrigin: req.headers.origin || process.env.FRONTEND_URL,
      metadata: {
        lessonId,
        userId,
        ...metadata
      }
    });

    // Check if Mux columns exist
    const hasMuxUploadId = await db.schema.hasColumn('lessons', 'mux_upload_id');
    const hasVideoProvider = await db.schema.hasColumn('lessons', 'video_provider');
    const hasMuxStatus = await db.schema.hasColumn('lessons', 'mux_status');

    // Update lesson with upload info (only if columns exist)
    const updateData = {
      updated_at: db.fn.now()
    };
    
    if (hasMuxUploadId) {
      updateData.mux_upload_id = upload.uploadId;
    }
    if (hasVideoProvider) {
      updateData.video_provider = 'mux';
    }
    if (hasMuxStatus) {
      updateData.mux_status = 'preparing';
    }
    
    console.log(`💾 Updating lesson ${lessonId} with upload data:`, {
      mux_upload_id: upload.uploadId,
      video_provider: 'mux',
      mux_status: 'preparing',
      columnsExist: { hasMuxUploadId, hasVideoProvider, hasMuxStatus }
    });
    
    await db('lessons')
      .where({ id: lessonId })
      .update(updateData);

    // Verify the update
    const selectFields = ['id', 'title'];
    if (hasMuxUploadId) selectFields.push('mux_upload_id');
    if (hasVideoProvider) selectFields.push('video_provider');
    if (hasMuxStatus) selectFields.push('mux_status');
    
    const updatedLesson = await db('lessons')
      .where({ id: lessonId })
      .select(...selectFields)
      .first();
    
    console.log(`✅ Mux upload URL created for lesson ${lessonId}`);
    console.log(`📊 Updated lesson:`, JSON.stringify(updatedLesson, null, 2));

    // Send initial WebSocket update
    const websocketService = require('../services/websocketService');
    websocketService.sendProgress(lessonId.toString(), {
      type: 'progress',
      progress: 5,
      currentStep: 'Upload URL created - ready for upload',
      provider: 'mux'
    });

    res.json({
      success: true,
      data: {
        uploadUrl: upload.uploadUrl,
        uploadId: upload.uploadId,
        lessonId
      }
    });
  } catch (error) {
    console.error('❌ Failed to create Mux upload URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create upload URL',
      error: error.message
    });
  }
},

  /**
   * Test webhook endpoint (development only)
   * POST /api/videos/mux/webhook/test
   */
  async testWebhook(req, res) {
    try {
      const { lessonId } = req.body;
      
      if (!lessonId) {
        return res.status(400).json({
          success: false,
          message: 'lessonId is required'
        });
      }

      // Get lesson
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      console.log(`🧪 Testing webhook for lesson ${lessonId}`);
      console.log(`📊 Lesson data:`, JSON.stringify({
        id: lesson.id,
        title: lesson.title,
        mux_upload_id: lesson.mux_upload_id,
        mux_asset_id: lesson.mux_asset_id,
        mux_status: lesson.mux_status,
        mux_playback_id: lesson.mux_playback_id
      }, null, 2));

      // If lesson has asset ID, fetch from Mux
      if (lesson.mux_asset_id) {
        console.log(`🔍 Fetching asset from Mux...`);
        const asset = await muxService.getAsset(lesson.mux_asset_id);
        console.log(`📊 Mux asset:`, JSON.stringify(asset, null, 2));

        // Manually trigger asset ready handler
        await handleAssetReady({
          id: lesson.mux_asset_id,
          playback_ids: asset.playback_ids || []
        });

        return res.json({
          success: true,
          message: 'Webhook test completed',
          lesson: {
            id: lesson.id,
            mux_asset_id: lesson.mux_asset_id,
            mux_status: lesson.mux_status
          },
          asset
        });
      }

      res.json({
        success: true,
        message: 'Lesson found but no Mux asset yet',
        lesson: {
          id: lesson.id,
          mux_upload_id: lesson.mux_upload_id,
          mux_status: lesson.mux_status
        }
      });
    } catch (error) {
      console.error('❌ Test webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Test webhook failed',
        error: error.message
      });
    }
  },

  /**
   * Handle Mux webhook events
   * POST /api/videos/mux/webhook
   */
  async handleMuxWebhook(req, res) {
  try {
    console.log('📥 Mux webhook received - Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📥 Mux webhook received - Body:', JSON.stringify(req.body, null, 2));
    
    // Get raw body for signature verification
    const signature = req.headers['mux-signature'];
    const rawBody = JSON.stringify(req.body);

    // Log signature details for debugging
    console.log('🔐 Webhook signature:', signature);
    console.log('📄 Raw body length:', rawBody.length);

    // Verify webhook signature (skip in development if no signature)
    if (signature) {
      const isValid = muxService.verifyWebhookSignature(rawBody, signature);

      if (!isValid) {
        console.warn('⚠️  Invalid Mux webhook signature');
        return res.status(401).json({
          success: false,
          message: 'Invalid webhook signature'
        });
      }
    } else {
      console.warn('⚠️  No webhook signature provided - accepting in development mode');
    }

    const event = req.body;
    console.log('📥 Mux webhook event type:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'video.asset.ready':
        await handleAssetReady(event.data);
        break;

      case 'video.asset.errored':
        await handleAssetError(event.data);
        break;

      case 'video.upload.asset_created':
        await handleUploadAssetCreated(event.data);
        break;

      case 'video.upload.cancelled':
      case 'video.upload.errored':
        await handleUploadError(event.data);
        break;

      default:
        console.log(`ℹ️  Unhandled webhook event: ${event.type}`);
    }

    res.json({ success: true, received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
},

  /**
   * Get playback information for a lesson
   * GET /api/videos/:lessonId/playback
   */
  async getPlaybackInfo(req, res) {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;
    const { generateSignedUrls = 'true' } = req.query;

    const videoProviderDetection = require('../utils/videoProviderDetection');

    // Get lesson with video info
    const lesson = await db('lessons')
      .where({ id: lessonId })
      .first();

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check enrollment if user is authenticated
    if (userId) {
      const enrollment = await db('user_course_enrollments')
        .where({
          user_id: userId,
          course_id: lesson.course_id
        })
        .first();

      const course = await db('courses')
        .where({ id: lesson.course_id })
        .first();

      const isOwner = course && course.created_by === userId;
      const isAdmin = req.user.role === 'admin' || req.user.role === 'admin';

      if (!enrollment && !isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not enrolled in this course'
        });
      }
    }

    // Get playback info using provider detection utility
    const playbackInfo = await videoProviderDetection.getPlaybackInfo(lesson, {
      generateSignedUrls: generateSignedUrls === 'true',
      urlExpiration: 3600, // 1 hour
      playbackPolicy: 'public' // Can be made dynamic based on course settings
    });

    res.json({
      success: true,
      data: playbackInfo
    });
    } catch (error) {
      console.error('❌ Failed to get playback info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get playback information',
        error: error.message
      });
    }
  },

  // Get featured videos for landing page (public)
  async getFeaturedVideos(req, res) {
    try {
      console.log('🎬 Getting featured videos for landing page...');

      // Get videos from published lessons (simplified version without analytics)
      const featuredVideos = await db('lessons as l')
        .leftJoin('courses as c', 'l.course_id', 'c.id')
        .leftJoin('users as u', 'c.created_by', 'u.id')
        .where('c.is_published', true)
        .whereNotNull('l.mux_playback_id') // Only videos that are processed
        .where('l.mux_status', 'ready') // Only ready videos
        .select(
          'l.id as lesson_id',
          'l.title as lesson_title',
          'l.description as lesson_description',
          'l.mux_playback_id',
          'l.mux_asset_id',
          'l.duration',
          'c.id as course_id',
          'c.title as course_title',
          'u.first_name',
          'u.last_name'
        )
        .orderBy('l.created_at', 'desc') // Order by creation date as fallback
        .limit(6);

      console.log('✅ Found', featuredVideos.length, 'featured videos');

      // Format the response
      const videos = featuredVideos.map(video => ({
        id: video.lesson_id,
        lesson_title: video.lesson_title,
        lesson_description: video.lesson_description,
        course_title: video.course_title,
        instructor: `${video.first_name} ${video.last_name}`,
        duration: video.duration,
        viewCount: 0, // Default since analytics table doesn't exist yet
        uniqueViewers: 0, // Default since analytics table doesn't exist yet
        courseId: video.course_id,
        muxPlaybackId: video.mux_playback_id
      }));

      res.json({
        success: true,
        data: { videos }
      });

    } catch (error) {
      console.error('❌ Failed to get featured videos:', error);
      // Return empty array instead of failing
      res.json({
        success: true,
        data: { videos: [] }
      });
    }
  }
};

module.exports = videoController;
