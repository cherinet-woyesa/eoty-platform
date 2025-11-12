// backend/services/videoDownloadService.js
const db = require('../config/database');
const cloudStorageService = require('./cloudStorageService');
const muxService = require('./muxService');

class VideoDownloadService {
  /**
   * Generate download URL for a video (supports both Mux and S3)
   * @param {number} lessonId - Lesson ID
   * @param {number} userId - User ID requesting download
   * @returns {Promise<Object>} Download URL and metadata
   */
  async generateDownloadUrl(lessonId, userId) {
    try {
      // Get lesson with course info to verify access and download permission
      const lesson = await db('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .leftJoin('user_course_enrollments', function() {
          this.on('courses.id', '=', 'user_course_enrollments.course_id')
              .andOn('user_course_enrollments.user_id', '=', db.raw('?', [userId]));
        })
        .where('lessons.id', lessonId)
        .select(
          'lessons.*',
          'courses.created_by as course_owner',
          'courses.title as course_title',
          'user_course_enrollments.user_id as enrolled_user'
        )
        .first();

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // Check if user has access (course owner or enrolled student)
      const hasAccess = lesson.course_owner === userId || lesson.enrolled_user === userId;
      
      if (!hasAccess) {
        throw new Error('Access denied: You must be enrolled in this course to download videos');
      }

      // Check if download is allowed for this lesson
      if (!lesson.allow_download) {
        throw new Error('Video download is not permitted for this lesson');
      }

      // Determine video provider and generate appropriate download URL
      let downloadUrl;
      const videoProvider = lesson.video_provider || (lesson.mux_asset_id ? 'mux' : 's3');

      if (videoProvider === 'mux' && lesson.mux_asset_id) {
        // Mux video download
        if (lesson.mux_status !== 'ready') {
          throw new Error('Video is still processing. Please try again later.');
        }

        // Get Mux asset download URL
        downloadUrl = await muxService.getAssetDownloadUrl(lesson.mux_asset_id);
        
        if (!downloadUrl) {
          throw new Error('Unable to generate download URL from Mux');
        }
      } else {
        // Legacy S3 video download
        // Check if video exists
        if (!lesson.video_url && !lesson.s3_key) {
          throw new Error('Video file not found for this lesson');
        }

        // Extract S3 key from video URL or use s3_key directly
        const s3Key = lesson.s3_key || this.extractS3KeyFromUrl(lesson.video_url);

        if (!s3Key) {
          throw new Error('Unable to generate download URL: video key not found');
        }

        // Generate signed download URL (valid for 1 hour)
        downloadUrl = await cloudStorageService.getSignedStreamUrl(s3Key, 3600);
      }

      // Log download request for analytics
      await this.logDownloadRequest(lessonId, userId);

      console.log('Download URL generated for lesson:', lessonId, 'user:', userId, 'provider:', videoProvider);

      return {
        success: true,
        downloadUrl,
        lessonTitle: lesson.title,
        courseTitle: lesson.course_title,
        provider: videoProvider,
        expiresIn: videoProvider === 'mux' ? 3600 : 3600, // seconds (Mux URLs are typically long-lived)
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
      };

    } catch (error) {
      console.error('Generate download URL error:', error);
      throw error;
    }
  }

  /**
   * Log download request for analytics
   * @param {number} lessonId - Lesson ID
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async logDownloadRequest(lessonId, userId) {
    try {
      await db('video_download_logs').insert({
        lesson_id: lessonId,
        user_id: userId,
        downloaded_at: new Date()
      });
    } catch (error) {
      // Don't throw error if logging fails - it shouldn't block the download
      console.error('Failed to log download request:', error);
    }
  }

  /**
   * Extract S3 key from URL
   * @param {string} url - Full URL
   * @returns {string|null} S3 key or null
   */
  extractS3KeyFromUrl(url) {
    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.substring(1);
    } catch (error) {
      console.error('Failed to extract S3 key from URL:', url);
      return null;
    }
  }
}

module.exports = new VideoDownloadService();
