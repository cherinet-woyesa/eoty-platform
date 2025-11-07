// backend/services/subtitleService.js
const db = require('../config/database');
const cloudStorageService = require('./cloudStorageService');

class SubtitleService {
  constructor() {
    this.supportedFormats = ['vtt', 'srt'];
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
  }

  /**
   * Upload subtitle file for a lesson
   * @param {Buffer} fileBuffer - The subtitle file buffer
   * @param {string} originalFilename - Original filename
   * @param {number} lessonId - Lesson ID
   * @param {string} languageCode - ISO 639-1 language code (e.g., 'en', 'es')
   * @param {string} language - Full language name (e.g., 'English', 'Spanish')
   * @param {number} userId - User ID who is uploading
   * @returns {Promise<Object>} Upload result
   */
  async uploadSubtitle(fileBuffer, originalFilename, lessonId, languageCode, language, userId) {
    let transaction;
    
    try {
      // Validate file
      this.validateSubtitleFile(fileBuffer, originalFilename);

      // Start database transaction
      transaction = await db.transaction();

      // Verify lesson exists and user has permission
      const lesson = await transaction('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .where('courses.created_by', userId)
        .select('lessons.*')
        .first();

      if (!lesson) {
        throw new Error('Lesson not found or access denied');
      }

      // Check if subtitle for this language already exists
      const existingSubtitle = await transaction('subtitles')
        .where({ lesson_id: lessonId, language_code: languageCode })
        .first();

      if (existingSubtitle) {
        throw new Error(`Subtitle for language '${languageCode}' already exists for this lesson`);
      }

      // Generate safe filename
      const safeFileName = this.sanitizeFilename(
        `subtitle_${lessonId}_${languageCode}_${Date.now()}_${originalFilename}`
      );
      
      // Upload to cloud storage
      const uploadResult = await cloudStorageService.uploadVideo(
        fileBuffer,
        safeFileName,
        this.getSubtitleContentType(originalFilename)
      );

      // Store subtitle info in database
      const [subtitleRow] = await transaction('subtitles').insert({
        lesson_id: lessonId,
        language: language,
        language_code: languageCode,
        file_url: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        file_size: fileBuffer.length,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      }).returning(['id']);

      const subtitleId = subtitleRow.id;

      await transaction.commit();

      console.log('Subtitle uploaded successfully:', { 
        subtitleId, 
        lessonId, 
        languageCode 
      });

      return {
        success: true,
        subtitleId,
        subtitleUrl: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        fileSize: fileBuffer.length,
        languageCode,
        language
      };

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Subtitle upload service error:', error);
      throw error;
    }
  }

  /**
   * Get all subtitles for a lesson
   * @param {number} lessonId - Lesson ID
   * @returns {Promise<Array>} Array of subtitle objects
   */
  async getSubtitles(lessonId) {
    try {
      const subtitles = await db('subtitles')
        .where({ lesson_id: lessonId })
        .select(
          'id',
          'lesson_id',
          'language',
          'language_code',
          'file_url',
          'file_size',
          'created_at'
        )
        .orderBy('language', 'asc');

      console.log(`Retrieved ${subtitles.length} subtitles for lesson ${lessonId}`);

      return subtitles;
    } catch (error) {
      console.error('Get subtitles error:', error);
      throw new Error('Failed to retrieve subtitles');
    }
  }

  /**
   * Delete a subtitle
   * @param {number} subtitleId - Subtitle ID
   * @param {number} userId - User ID requesting deletion
   * @returns {Promise<Object>} Deletion result
   */
  async deleteSubtitle(subtitleId, userId) {
    let transaction;
    
    try {
      transaction = await db.transaction();

      // Get subtitle with lesson and course info to verify ownership
      const subtitle = await transaction('subtitles')
        .join('lessons', 'subtitles.lesson_id', 'lessons.id')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('subtitles.id', subtitleId)
        .where('courses.created_by', userId)
        .select('subtitles.*', 'subtitles.file_url')
        .first();

      if (!subtitle) {
        throw new Error('Subtitle not found or access denied');
      }

      // Extract S3 key from file URL
      const s3Key = this.extractS3KeyFromUrl(subtitle.file_url);

      // Delete from cloud storage
      if (s3Key) {
        await cloudStorageService.deleteVideo(s3Key);
      }

      // Delete from database
      await transaction('subtitles')
        .where({ id: subtitleId })
        .delete();

      await transaction.commit();

      console.log('Subtitle deleted successfully:', subtitleId);

      return {
        success: true,
        subtitleId,
        message: 'Subtitle deleted successfully'
      };

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Subtitle deletion service error:', error);
      throw error;
    }
  }

  /**
   * Validate subtitle file format and size
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filename - Filename
   * @throws {Error} If validation fails
   */
  validateSubtitleFile(fileBuffer, filename) {
    // Size validation
    if (fileBuffer.length > this.maxFileSize) {
      throw new Error(
        `File size ${this.formatFileSize(fileBuffer.length)} exceeds maximum allowed size ${this.formatFileSize(this.maxFileSize)}`
      );
    }

    // Format validation
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !this.supportedFormats.includes(fileExtension)) {
      throw new Error(
        `Unsupported subtitle format: ${fileExtension}. Supported formats: ${this.supportedFormats.join(', ')}`
      );
    }

    // Content validation for VTT files
    if (fileExtension === 'vtt') {
      const content = fileBuffer.toString('utf8');
      if (!content.trim().startsWith('WEBVTT')) {
        throw new Error('Invalid VTT file: must start with WEBVTT header');
      }
    }

    // Content validation for SRT files
    if (fileExtension === 'srt') {
      const content = fileBuffer.toString('utf8');
      // Basic SRT validation - check for timestamp pattern
      const srtPattern = /\d+\s+\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/;
      if (!srtPattern.test(content)) {
        throw new Error('Invalid SRT file: missing proper timestamp format');
      }
    }

    return true;
  }

  /**
   * Validate ISO 639-1 language code
   * @param {string} languageCode - Language code to validate
   * @returns {boolean} True if valid
   */
  validateLanguageCode(languageCode) {
    // ISO 639-1 codes are 2 lowercase letters
    const iso639Pattern = /^[a-z]{2}$/;
    return iso639Pattern.test(languageCode);
  }

  /**
   * Get content type for subtitle file
   * @param {string} filename - Filename
   * @returns {string} Content type
   */
  getSubtitleContentType(filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const types = {
      'vtt': 'text/vtt',
      'srt': 'application/x-subrip'
    };
    return types[extension] || 'text/plain';
  }

  /**
   * Sanitize filename for safe storage
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

module.exports = new SubtitleService();
