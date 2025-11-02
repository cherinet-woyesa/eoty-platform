// backend/services/videoProcessingService.js
const db = require('../config/database');
const { transcodeToHLS } = require('../scripts/transcodeToHLS');
const { notifyVideoAvailable } = require('./notificationService');
const cloudStorageService = require('./cloudStorageService');

class VideoProcessingService {
  constructor() {
    this.supportedFormats = ['mp4', 'webm', 'mov', 'avi', 'mpeg', 'mkv', 'wmv'];
    this.maxFileSize = 2 * 1024 * 1024 * 1024; // 2GB
    this.processingQueue = new Map();
    this.maxRetries = 3;
  }

  // Enhanced upload with transaction support and proper error handling
  async uploadVideo(fileBuffer, originalFilename, lessonId, userId, options = {}) {
    let transaction;
    
    try {
      console.log('Starting enhanced video upload for lesson:', lessonId);
      
      // Validate file
      await this.validateVideoFile(fileBuffer, originalFilename);
      
      // Start database transaction
      transaction = await db.transaction();
      
      // Verify lesson belongs to user
      const lesson = await transaction('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .where('courses.created_by', userId)
        .select('lessons.*')
        .first();

      if (!lesson) {
        throw new Error('Lesson not found or access denied');
      }

      // Generate unique filename
      const safeFileName = this.sanitizeFilename(`video_${lessonId}_${Date.now()}_${originalFilename}`);
      
      // Upload to cloud storage
      const uploadResult = await cloudStorageService.uploadVideo(
        fileBuffer,
        safeFileName,
        this.getMimeType(originalFilename)
      );


      // Insert video record and get the inserted ID (PostgreSQL compatible)
      const [videoRow] = await transaction('videos').insert({
        lesson_id: lessonId,
        uploader_id: userId,
        storage_url: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        s3_key: uploadResult.s3Key,
        size_bytes: fileBuffer.length,
        status: 'processing',
        content_hash: this.generateContentHash(fileBuffer),
        created_at: new Date(),
        updated_at: new Date(),
      }).returning(['id']);

      const videoId = videoRow.id;

      // Update lesson with video reference
      await transaction('lessons')
        .where({ id: lessonId })
        .update({
          video_id: videoId,
          video_url: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl, // Temporary URL
          updated_at: new Date(),
        });

      // Commit transaction
      await transaction.commit();

      console.log('Original video uploaded successfully:', { 
        videoId, 
        s3Key: uploadResult.s3Key, 
        lessonId 
      });

      // Start background processing (HLS transcoding)
      if (options.enableTranscoding !== false) {
        this.processVideoUpload(videoId, uploadResult.s3Key, lessonId, userId)
          .catch(error => {
            console.error('Background processing failed:', error);
            this.handleProcessingFailure(videoId, error).catch(console.error);
          });
      }

      return {
        success: true,
        videoId,
        s3Key: uploadResult.s3Key,
        videoUrl: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        fileSize: fileBuffer.length,
        contentType: this.getMimeType(originalFilename),
        processingStatus: 'processing',
        transcodingQueued: options.enableTranscoding !== false
      };

    } catch (error) {
      // Rollback transaction if it exists
      if (transaction) {
        await transaction.rollback();
      }
      
      console.error('Video upload service error:', error);
      throw error;
    }
  }

  // Main video processing with HLS transcoding
  async processVideoUpload(videoId, s3Key, lessonId, userId) {
    try {
      console.log('Starting video processing for video:', videoId);
      
      // Update status to processing
      await this.updateVideoStatus(videoId, 'processing', 'Starting HLS transcoding');

      const outputPrefix = `hls/${s3Key.replace('videos/', '').split('.')[0]}`;
      
      // Start HLS transcoding
      const hlsUrl = await transcodeToHLS({
        s3Bucket: process.env.AWS_S3_BUCKET,
        s3Key: s3Key,
        outputPrefix: outputPrefix,
      });

      // Update video record with HLS URL and set to ready
      await db('videos')
        .where({ id: videoId })
        .update({
          hls_url: hlsUrl,
          status: 'ready',
          processing_completed_at: new Date(),
          updated_at: new Date(),
        });

      // Update lesson with HLS URL
      await db('lessons')
        .where({ id: lessonId })
        .update({
          video_url: hlsUrl,
          updated_at: new Date(),
        });

      // Notify users that video is available
      await notifyVideoAvailable(lessonId);

      console.log('Video processing completed successfully:', { videoId, hlsUrl });

      return {
        success: true,
        videoId,
        hlsUrl,
        status: 'ready'
      };

    } catch (error) {
      console.error('Video processing failed:', error);
      await this.handleProcessingFailure(videoId, error);
      throw error;
    }
  }

  // Handle processing failures with retry logic
  async handleProcessingFailure(videoId, error) {
    try {
      const video = await db('videos')
        .where({ id: videoId })
        .select('processing_attempts')
        .first();

      const attempts = (video?.processing_attempts || 0) + 1;
      
      if (attempts <= this.maxRetries) {
        // Update with retry information
        await db('videos')
          .where({ id: videoId })
          .update({
            status: 'retrying',
            processing_error: error.message,
            processing_attempts: attempts,
            updated_at: new Date(),
          });

        console.log(`Scheduled retry ${attempts}/${this.maxRetries} for video:`, videoId);
        
        // In production, you'd add to a job queue here
        // For now, we'll log the retry
        return { shouldRetry: true, attempts };
      } else {
        // Max retries exceeded, mark as failed
        await db('videos')
          .where({ id: videoId })
          .update({
            status: 'failed',
            processing_error: `Max retries exceeded: ${error.message}`,
            processing_attempts: attempts,
            processing_completed_at: new Date(),
            updated_at: new Date(),
          });

        console.error(`Video processing failed after ${attempts} attempts:`, videoId);
        return { shouldRetry: false, attempts };
      }
    } catch (dbError) {
      console.error('Error handling processing failure:', dbError);
      throw dbError;
    }
  }

  // Retry failed processing
  async retryFailedProcessing(videoId) {
    try {
      const video = await db('videos')
        .where({ id: videoId, status: 'failed' })
        .select('*')
        .first();

      if (!video) {
        throw new Error('Video not found or not in failed state');
      }

      const s3Key = video.s3_key;
      
      return this.processVideoUpload(videoId, s3Key, video.lesson_id, video.uploader_id);
    } catch (error) {
      console.error('Retry failed:', error);
      throw error;
    }
  }

  // Enhanced file validation
  async validateVideoFile(fileBuffer, filename) {
    // Size validation
    if (fileBuffer.length > this.maxFileSize) {
      throw new Error(`File size ${this.formatFileSize(fileBuffer.length)} exceeds maximum allowed size ${this.formatFileSize(this.maxFileSize)}`);
    }

    // Format validation
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    if (!fileExtension || !this.supportedFormats.includes(fileExtension)) {
      throw new Error(`Unsupported video format: ${fileExtension}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    // Magic number validation
    if (!this.validateMagicNumbers(fileBuffer, fileExtension)) {
      throw new Error('Invalid video file: file signature does not match expected format');
    }

    return true;
  }

  // Magic number validation for common video formats
  validateMagicNumbers(buffer, extension) {
    // Ensure buffer is long enough for basic validation
    if (buffer.length < 8) {
      return false;
    }

    // MP4 validation - supports both regular and fragmented MP4
    if (extension === 'mp4') {
      // MP4 files can start with various box types:
      // - 'ftyp' at offset 4: standard MP4 file
      // - 'moof' at offset 4 or 0: fragmented MP4 (fMP4) - movie fragment box
      // - 'mdat' at offset 4 or 0: media data box (can be first in fragmented MP4)
      
      // Check for 'ftyp' at offset 4 (standard MP4)
      if (buffer.length >= 8) {
        const ftyp = [0x66, 0x74, 0x79, 0x70]; // 'ftyp'
        let matches = true;
        for (let i = 0; i < 4; i++) {
          if (buffer[4 + i] !== ftyp[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          return true;
        }
      }
      
      // Check for 'moof' at offset 4 or 0 (fragmented MP4)
      const moof = [0x6D, 0x6F, 0x6F, 0x66]; // 'moof'
      for (let offset of [0, 4]) {
        if (buffer.length >= offset + 4) {
          let matches = true;
          for (let i = 0; i < 4; i++) {
            if (buffer[offset + i] !== moof[i]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            return true;
          }
        }
      }
      
      // Check for 'mdat' at offset 4 or 0 (media data box, can be first in fragmented MP4)
      const mdat = [0x6D, 0x64, 0x61, 0x74]; // 'mdat'
      for (let offset of [0, 4]) {
        if (buffer.length >= offset + 4) {
          let matches = true;
          for (let i = 0; i < 4; i++) {
            if (buffer[offset + i] !== mdat[i]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            return true;
          }
        }
      }
      
      return false;
    }

    // WebM validation
    if (extension === 'webm') {
      const webmSignature = [0x1A, 0x45, 0xDF, 0xA3]; // EBML header
      if (buffer.length < 4) {
        return false;
      }
      
      // The first 4 bytes of a standard WebM file are 1A 45 DF A3
      let isStandardWebM = true;
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== webmSignature[i]) {
          isStandardWebM = false;
          break;
        }
      }
      if (isStandardWebM) {
        return true;
      }

      // MediaRecorder implementations in browsers like Chrome may produce WebM files
      // that start with a SimpleBlock instead of the EBML header. These are valid
      // but non-standard. We'll accept them to support direct browser recordings.
      console.log('WebM file does not have a standard EBML header. Accepting based on file extension to support MediaRecorder streams.');
      return true;
    }

    // AVI validation
    if (extension === 'avi') {
      const aviSignature = [0x52, 0x49, 0x46, 0x46]; // 'RIFF'
      if (buffer.length < 4) {
        return false;
      }
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== aviSignature[i]) {
          return false;
        }
      }
      return true;
    }

    // MOV validation
    if (extension === 'mov') {
      const movSignature = [0x6d, 0x6f, 0x6f, 0x76]; // 'moov'
      if (buffer.length < 8) {
        return false;
      }
      // Check for 'moov' at offset 4
      for (let i = 0; i < 4; i++) {
        if (buffer[4 + i] !== movSignature[i]) {
          return false;
        }
      }
      return true;
    }

    // MKV validation
    if (extension === 'mkv') {
      const mkvSignature = [0x1A, 0x45, 0xDF, 0xA3]; // EBML header
      if (buffer.length < 4) {
        return false;
      }
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== mkvSignature[i]) {
          return false;
        }
      }
      return true;
    }

    // MPEG validation
    if (extension === 'mpeg') {
      const mpegSignature1 = [0x00, 0x00, 0x01, 0xBA];
      const mpegSignature2 = [0x00, 0x00, 0x01, 0xB3];
      if (buffer.length < 4) {
        return false;
      }
      let matches1 = true;
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== mpegSignature1[i]) {
          matches1 = false;
          break;
        }
      }
      if (matches1) {
        return true;
      }
      let matches2 = true;
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== mpegSignature2[i]) {
          matches2 = false;
          break;
        }
      }
      return matches2;
    }

    // For other formats, return true if extension is in supported list
    // More specific validation can be added later if needed
    return true;
  }

  // Upload subtitle with transaction support
  async uploadSubtitle(fileBuffer, originalFilename, lessonId, languageCode, languageName = null, userId) {
    let transaction;
    
    try {
      // Start transaction
      transaction = await db.transaction();

      // Verify lesson belongs to user
      const lesson = await transaction('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .where('courses.created_by', userId)
        .select('lessons.*')
        .first();

      if (!lesson) {
        throw new Error('Lesson not found or access denied');
      }

      // Validate subtitle
      if (!this.validateSubtitleFile(fileBuffer, originalFilename)) {
        throw new Error('Invalid subtitle file format');
      }

      // Generate safe filename
      const safeFileName = this.sanitizeFilename(`subtitle_${lessonId}_${languageCode}_${Date.now()}_${originalFilename}`);
      
      // Upload to cloud storage
      const uploadResult = await cloudStorageService.uploadVideo(
        fileBuffer,
        safeFileName,
        this.getSubtitleContentType(originalFilename)
      );

      // Store subtitle info in database - FIXED INSERT OPERATION
      const subtitleInsertResult = await transaction('video_subtitles').insert({
        lesson_id: lessonId,
        language_code: languageCode,
        language_name: languageName || languageCode,
        subtitle_url: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        file_size: fileBuffer.length,
        created_by: userId,
        created_at: new Date()
      });

      // Handle different database responses
      const subtitleId = Array.isArray(subtitleInsertResult) ? subtitleInsertResult[0] : subtitleInsertResult;

      await transaction.commit();

      console.log('Subtitle uploaded successfully:', { subtitleId, lessonId, languageCode });

      return {
        success: true,
        subtitleId,
        subtitleUrl: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        fileSize: fileBuffer.length,
        languageCode,
        languageName: languageName || languageCode
      };

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Subtitle upload service error:', error);
      throw error;
    }
  }

  // Validate subtitle file
  validateSubtitleFile(fileBuffer, filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['vtt', 'srt', 'txt'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      return false;
    }

    // Basic validation for VTT files
    if (extension === 'vtt') {
      const content = fileBuffer.toString('utf8');
      return content.includes('WEBVTT');
    }

    return true;
  }

  // Delete video with transaction and cleanup
  async deleteVideo(lessonId, userId) {
    let transaction;
    
    try {
      transaction = await db.transaction();

      // Verify lesson belongs to user and get video info
      const lesson = await transaction('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .where('courses.created_by', userId)
        .select('lessons.video_id', 'videos.s3_key', 'videos.hls_url')
        .leftJoin('videos', 'lessons.video_id', 'videos.id')
        .first();

      if (!lesson) {
        throw new Error('Lesson not found or access denied');
      }

      if (lesson.video_id) {
        // Delete from cloud storage
        if (lesson.s3_key) {
          await cloudStorageService.deleteVideo(lesson.s3_key);
        }

        // Delete HLS files if they exist
        if (lesson.hls_url) {
          await this.cleanupHLSFiles(lesson.hls_url);
        }

        // Delete video record
        await transaction('videos').where({ id: lesson.video_id }).delete();
      }

      // Update lesson to remove video reference
      await transaction('lessons')
        .where({ id: lessonId })
        .update({
          video_id: null,
          video_url: null,
          updated_at: new Date()
        });

      await transaction.commit();

      console.log('Video deleted successfully:', lessonId);

      return { success: true, lessonId };

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Video deletion service error:', error);
      throw error;
    }
  }

  // Cleanup HLS files
  async cleanupHLSFiles(hlsUrl) {
    try {
      // Extract the HLS prefix from the URL
      const url = new URL(hlsUrl);
      const pathParts = url.pathname.split('/');
      const hlsPrefix = pathParts.slice(0, -1).join('/') + '/';
      
      // Delete the entire HLS directory
      // Note: This would require S3 list and delete operations
      // For now, we'll log the cleanup
      console.log('HLS cleanup required for prefix:', hlsPrefix);
      
    } catch (error) {
      console.error('HLS cleanup error:', error);
      // Don't throw - cleanup failures shouldn't block main operation
    }
  }

  // Update video status
  async updateVideoStatus(videoId, status, message = '') {
    try {
      const updateData = {
        status: status,
        updated_at: new Date()
      };

      if (status === 'processing') {
        updateData.processing_started_at = new Date();
        updateData.processing_error = null;
      } else if (status === 'ready') {
        updateData.processing_completed_at = new Date();
        updateData.processing_error = null;
      } else if (status === 'failed' || status === 'retrying') {
        updateData.processing_error = message;
      }

      await db('videos')
        .where({ id: videoId })
        .update(updateData);

      console.log(`Video ${videoId} status updated to: ${status}`);
    } catch (error) {
      console.error('Status update error:', error);
      throw error;
    }
  }

  // Get video processing status
  async getProcessingStatus(videoId) {
    try {
      const video = await db('videos')
        .where({ id: videoId })
        .select(
          'status',
          'processing_error',
          'processing_started_at',
          'processing_completed_at',
          'processing_attempts'
        )
        .first();

      if (!video) {
        throw new Error('Video not found');
      }

      return {
        videoId,
        status: video.status,
        error: video.processing_error,
        startedAt: video.processing_started_at,
        completedAt: video.processing_completed_at,
        attempts: video.processing_attempts || 0
      };
    } catch (error) {
      console.error('Get processing status error:', error);
      throw error;
    }
  }

  // Utility methods
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  getMimeType(filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mpeg': 'video/mpeg',
      'mkv': 'video/x-matroska',
      'wmv': 'video/x-ms-wmv'
    };
    return mimeTypes[extension] || 'video/mp4';
  }

  getSubtitleContentType(filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const types = {
      'vtt': 'text/vtt',
      'srt': 'application/x-subrip',
      'txt': 'text/plain'
    };
    return types[extension] || 'text/plain';
  }

  generateContentHash(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Health check
  async healthCheck() {
    try {
      // Test database connection
      await db.raw('SELECT 1');
      
      // Test cloud storage (basic check)
      const storageHealth = await cloudStorageService.healthCheck();
      
      return {
        service: 'VideoProcessingService',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        cloudStorage: storageHealth,
        supportedFormats: this.supportedFormats,
        maxFileSize: this.formatFileSize(this.maxFileSize)
      };
    } catch (error) {
      return {
        service: 'VideoProcessingService',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Get service statistics
  async getStatistics() {
    try {
      const stats = await db('videos')
        .select('status')
        .count('* as count')
        .groupBy('status');

      const totalSize = await db('videos')
        .sum('size_bytes as total_bytes')
        .first();

      return {
        totalVideos: stats.reduce((sum, item) => sum + parseInt(item.count), 0),
        byStatus: stats.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        totalStorage: this.formatFileSize(parseInt(totalSize?.total_bytes || 0)),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get statistics error:', error);
      throw error;
    }
  }
}

module.exports = new VideoProcessingService();