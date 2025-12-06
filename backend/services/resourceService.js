// backend/services/resourceService.js
const db = require('../config/database');
const cloudStorageService = require('./cloudStorageService');

class ResourceService {
  constructor() {
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.allowedFileTypes = [
      // Documents
      'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
      // Spreadsheets
      'xls', 'xlsx', 'csv', 'ods',
      // Presentations
      'ppt', 'pptx', 'odp',
      // Images
      'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',
      // Archives
      'zip', 'rar', '7z', 'tar', 'gz',
      // Code
      'js', 'py', 'java', 'cpp', 'html', 'css', 'json', 'xml'
    ];
  }

  /**
   * Upload resource file for a lesson (REQUIREMENT: Error notification for unsupported types)
   * @param {Buffer} fileBuffer - The resource file buffer
   * @param {string} originalFilename - Original filename
   * @param {number} lessonId - Lesson ID
   * @param {string} description - Optional description
   * @param {number} userId - User ID who is uploading
   * @returns {Promise<Object>} Upload result
   */
  async uploadResource(fileBuffer, originalFilename, lessonId, description, userId) {
    let transaction;
    
    try {
      // Validate file (REQUIREMENT: Manages unsupported file types with error notification)
      this.validateResourceFile(fileBuffer, originalFilename, userId);

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

      // Generate safe filename
      const fileExtension = originalFilename.split('.').pop()?.toLowerCase();
      const safeFileName = this.sanitizeFilename(
        `resource_${lessonId}_${Date.now()}_${originalFilename}`
      );
      
      // Upload to cloud storage
      const uploadResult = await cloudStorageService.uploadVideo(
        fileBuffer,
        safeFileName,
        this.getResourceContentType(originalFilename)
      );

      // Store resource info in database
      const [resourceRow] = await transaction('lesson_resources').insert({
        lesson_id: lessonId,
        filename: safeFileName,
        original_filename: originalFilename,
        file_type: fileExtension,
        file_size: fileBuffer.length,
        file_url: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        description: description || null,
        download_count: 0,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      }).returning(['id']);

      const resourceId = resourceRow.id;

      await transaction.commit();

      console.log('Resource uploaded successfully:', { 
        resourceId, 
        lessonId, 
        filename: originalFilename 
      });

      return {
        success: true,
        resourceId,
        resourceUrl: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        fileSize: fileBuffer.length,
        filename: originalFilename
      };

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Resource upload service error:', error);
      throw error;
    }
  }

  /**
   * Get all resources for a lesson
   * @param {number} lessonId - Lesson ID
   * @returns {Promise<Array>} Array of resource objects
   */
  async getResources(lessonId) {
    try {
      const resources = await db('lesson_resources')
        .where({ lesson_id: lessonId })
        .select(
          'id',
          'lesson_id',
          'filename',
          'original_filename',
          'file_type',
          'file_size',
          'file_url',
          'description',
          'download_count',
          'created_at'
        )
        .orderBy('created_at', 'desc');

      console.log(`Retrieved ${resources.length} resources for lesson ${lessonId}`);

      return resources;
    } catch (error) {
      console.error('Get resources error:', error);
      throw new Error('Failed to retrieve resources');
    }
  }

  /**
   * Get all resources accessible to a user
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<Array>} Array of resource objects
   */
  async getAllUserResources(userId, userRole) {
    try {
      // Query the general resources table (not lesson_resources)
      let query = db('resources')
        .leftJoin('users', 'resources.uploaded_by', 'users.id')
        .select(
          'resources.id',
          'resources.title',
          'resources.description',
          'resources.file_name',
          'resources.file_type',
          'resources.file_size',
          'resources.file_url',
          'resources.category',
          'resources.language',
          'resources.tags',
          'resources.is_public',
          'resources.created_at',
          'resources.updated_at',
          'resources.published_at',
          'users.first_name',
          'users.last_name'
        );

      // If user is admin, return all resources
      if (userRole === 'admin' || userRole === 'chapter_admin') {
        return await query.orderBy('resources.created_at', 'desc');
      }

      // Filter resources based on user role and permissions
      if (userRole === 'teacher') {
        // Teachers see resources they uploaded
        query = query.where('resources.uploaded_by', userId);
      } else {
        // Students and other users see public resources
        query = query.where('resources.is_public', true);
      }

      const resources = await query.orderBy('resources.created_at', 'desc');

      console.log(`Retrieved ${resources.length} resources for user ${userId}`);

      return resources;
    } catch (error) {
      console.error('Get all user resources error:', error);
      throw new Error('Failed to retrieve resources');
    }
  }

  /**
   * Get filter options for resources
   * @returns {Promise<Object>} Filter options
   */
  async getFilterOptions() {
    try {
      const categories = await db('resources')
        .distinct('category')
        .whereNotNull('category')
        .pluck('category');

      const languages = await db('resources')
        .distinct('language')
        .whereNotNull('language')
        .pluck('language');

      const fileTypes = await db('resources')
        .distinct('file_type')
        .whereNotNull('file_type')
        .pluck('file_type');

      return {
        categories: categories.sort(),
        languages: languages.sort(),
        fileTypes: fileTypes.sort(),
        types: fileTypes.sort() // For backward compatibility
      };
    } catch (error) {
      console.error('Get filter options error:', error);
      return {
        categories: [],
        languages: [],
        fileTypes: [],
        types: []
      };
    }
  }

  /**
   * Generate download URL for a resource
   * @param {number} resourceId - Resource ID
   * @param {number} userId - User ID requesting download
   * @returns {Promise<Object>} Download URL and metadata
   */
  async generateDownloadUrl(resourceId, userId) {
    let transaction;
    
    try {
      transaction = await db.transaction();

      // Get resource with lesson and course info to verify access
      const resource = await transaction('lesson_resources')
        .join('lessons', 'lesson_resources.lesson_id', 'lessons.id')
        .join('courses', 'lessons.course_id', 'courses.id')
        .leftJoin('user_course_enrollments', function() {
          this.on('courses.id', '=', 'user_course_enrollments.course_id')
              .andOn('user_course_enrollments.user_id', '=', transaction.raw('?', [userId]));
        })
        .where('lesson_resources.id', resourceId)
        .select(
          'lesson_resources.*',
          'courses.created_by as course_owner',
          'user_course_enrollments.user_id as enrolled_user'
        )
        .first();

      if (!resource) {
        throw new Error('Resource not found');
      }

      // Check if user has access (course owner or enrolled student)
      const hasAccess = resource.course_owner === userId || resource.enrolled_user === userId;
      
      if (!hasAccess) {
        throw new Error('Access denied: You must be enrolled in this course to download resources');
      }

      // Extract S3 key from file URL
      const s3Key = this.extractS3KeyFromUrl(resource.file_url);

      // Generate signed download URL (valid for 1 hour)
      const downloadUrl = await cloudStorageService.getSignedStreamUrl(s3Key, 3600);

      // Increment download count
      await transaction('lesson_resources')
        .where({ id: resourceId })
        .increment('download_count', 1);

      await transaction.commit();

      console.log('Download URL generated for resource:', resourceId);

      return {
        success: true,
        downloadUrl,
        filename: resource.original_filename,
        fileSize: resource.file_size,
        expiresIn: 3600 // seconds
      };

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Generate download URL error:', error);
      throw error;
    }
  }

  /**
   * Delete a resource
   * @param {number} resourceId - Resource ID
   * @param {number} userId - User ID requesting deletion
   * @returns {Promise<Object>} Deletion result
   */
  async deleteResource(resourceId, userId) {
    let transaction;
    
    try {
      transaction = await db.transaction();

      // Get resource with lesson and course info to verify ownership
      const resource = await transaction('lesson_resources')
        .join('lessons', 'lesson_resources.lesson_id', 'lessons.id')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lesson_resources.id', resourceId)
        .where('courses.created_by', userId)
        .select('lesson_resources.*', 'lesson_resources.file_url')
        .first();

      if (!resource) {
        throw new Error('Resource not found or access denied');
      }

      // Extract S3 key from file URL
      const s3Key = this.extractS3KeyFromUrl(resource.file_url);

      // Delete from cloud storage
      if (s3Key) {
        await cloudStorageService.deleteVideo(s3Key);
      }

      // Delete from database
      await transaction('lesson_resources')
        .where({ id: resourceId })
        .delete();

      await transaction.commit();

      console.log('Resource deleted successfully:', resourceId);

      return {
        success: true,
        resourceId,
        message: 'Resource deleted successfully'
      };

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Resource deletion service error:', error);
      throw error;
    }
  }

  /**
   * Validate resource file type and size (REQUIREMENT: Error notification for unsupported types)
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filename - Filename
   * @param {number} userId - Optional user ID for logging
   * @throws {Error} If validation fails
   */
  validateResourceFile(fileBuffer, filename, userId = null) {
    // Size validation
    if (fileBuffer.length > this.maxFileSize) {
      throw new Error(
        `File size ${this.formatFileSize(fileBuffer.length)} exceeds maximum allowed size ${this.formatFileSize(this.maxFileSize)}`
      );
    }

    // Format validation (REQUIREMENT: Manages unsupported file types with error notification)
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !this.allowedFileTypes.includes(fileExtension)) {
      // Log unsupported file attempt (REQUIREMENT: Error notification)
      if (userId) {
        const resourceLibraryService = require('./resourceLibraryService');
        resourceLibraryService.logUnsupportedFileAttempt(
          userId,
          filename,
          fileExtension,
          null,
          fileBuffer.length,
          `Unsupported file type: ${fileExtension}`
        ).catch(console.error); // Don't block on logging
      }
      
      throw new Error(
        `Unsupported file type: ${fileExtension}. Allowed types: ${this.allowedFileTypes.join(', ')}`
      );
    }

    return true;
  }

  /**
   * Get content type for resource file
   * @param {string} filename - Filename
   * @returns {string} Content type
   */
  getResourceContentType(filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const types = {
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'rtf': 'application/rtf',
      'odt': 'application/vnd.oasis.opendocument.text',
      // Spreadsheets
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'ods': 'application/vnd.oasis.opendocument.spreadsheet',
      // Presentations
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'odp': 'application/vnd.oasis.opendocument.presentation',
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      // Archives
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      // Code
      'js': 'text/javascript',
      'py': 'text/x-python',
      'java': 'text/x-java-source',
      'cpp': 'text/x-c++src',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
      'xml': 'application/xml'
    };
    return types[extension] || 'application/octet-stream';
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

  /**
   * Get resources by scope (course_specific, chapter_wide, platform_wide)
   * @param {number} userId - User ID
   * @param {string} scope - Resource scope
   * @param {Object} options - Options object
   * @returns {Promise<Array>} Resources array
   */
  async getResourcesByScope(userId, scope, options = {}) {
    const { chapterId, courseId, filters = {} } = options;

    try {
      // Get user info for access control
      const user = await db('users').where({ id: userId }).select('chapter_id', 'role').first();
      if (!user) throw new Error('User not found');

      let query = db('resources')
        .where('published_at', '<=', new Date());

      // Apply scope filtering
      switch (scope) {
        case 'course_specific':
          if (!courseId) throw new Error('courseId required for course_specific scope');

          // Check if user has access to this course
          // 1. Check if user is the creator of the course
          const isCreator = await db('courses')
            .where({ id: courseId, created_by: userId })
            .first();

          // 2. Check if user is enrolled in the course
          const isEnrolled = await db('user_course_enrollments')
            .where({ course_id: courseId, user_id: userId })
            .first();

          if (!isCreator && !isEnrolled) {
             // 3. Allow admins
             if (user.role !== 'admin') {
                throw new Error('Access denied to course resources');
             }
          }

          query = query.where({ resource_scope: 'course_specific', course_id: courseId });
          break;

        case 'chapter_wide':
          if (!chapterId) throw new Error('chapterId required for chapter_wide scope');

          // Check if user is in the chapter
          if (user.chapter_id !== parseInt(chapterId) && user.role !== 'admin') {
            throw new Error('Access denied to chapter resources');
          }

          query = query.where({ resource_scope: 'chapter_wide', chapter_id: chapterId });
          break;

        case 'platform_wide':
          // Platform-wide resources are accessible to all authenticated users
          query = query.where({ resource_scope: 'platform_wide' });
          break;

        default:
          throw new Error('Invalid resource scope');
      }

      // Apply additional filters
      if (filters.category) {
        query = query.where({ category: filters.category });
      }
      if (filters.language) {
        query = query.where({ language: filters.language });
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.whereRaw('tags @> ?', [JSON.stringify(filters.tags)]);
      }
      if (filters.search) {
        query = query.where(function() {
          this.where('title', 'ilike', `%${filters.search}%`)
            .orWhere('description', 'ilike', `%${filters.search}%`)
            .orWhere('author', 'ilike', `%${filters.search}%`);
        });
      }

      return await query.orderBy('created_at', 'desc');

    } catch (error) {
      console.error('Error getting resources by scope:', error);
      throw error;
    }
  }

  /**
   * Upload resource to library with scope
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalFilename - Original filename
   * @param {Object} metadata - Resource metadata
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Upload result
   */
  async uploadToLibrary(fileBuffer, originalFilename, metadata, userId) {
    const { title, description, category, language, tags, resourceScope = 'chapter_wide', courseId } = metadata;

    try {
      // Validate file
      this.validateResourceFile(fileBuffer, originalFilename, userId);

      // Get user info
      const user = await db('users').where({ id: userId }).select('chapter_id', 'role').first();
      if (!user) throw new Error('User not found');

      // Validate scope permissions
      if (resourceScope === 'platform_wide' && user.role !== 'admin') {
        throw new Error('Only admins can upload platform-wide resources');
      }

      // For course-specific uploads, validate course ownership/access and courseId presence
      if (resourceScope === 'course_specific') {
        if (!courseId) {
          throw new Error('courseId is required for course-specific resources');
        }
        // Teacher must own the course or be admin
        const course = await db('courses')
          .where({ id: courseId })
          .select('id', 'created_by')
          .first();
        if (!course) {
          throw new Error('Course not found');
        }
        if (user.role !== 'admin' && course.created_by !== userId) {
          throw new Error('Only the course owner can upload course-specific resources');
        }
      }

      // Upload file to cloud storage
      const fileUrl = await cloudStorageService.uploadResource(fileBuffer, originalFilename, userId);

      // Create resource record
      const resourceData = {
        title,
        description,
        author: userId,
        category,
        language,
        tags: tags ? JSON.stringify(tags) : null,
        file_type: this.getResourceContentType(originalFilename),
        file_name: originalFilename,
        file_size: fileBuffer.length,
        file_url: fileUrl,
        resource_scope: resourceScope,
        chapter_id: resourceScope === 'chapter_wide' ? user.chapter_id : null,
        course_id: resourceScope === 'course_specific' ? courseId : null,
        is_public: resourceScope === 'platform_wide',
        published_at: new Date(),
        published_date: new Date()
      };

      const [result] = await db('resources').insert(resourceData).returning('id');
      const resourceId = result?.id || result;

      return await db('resources').where({ id: resourceId }).first();

    } catch (error) {
      console.error('Error uploading to library:', error);
      throw error;
    }
  }
}

module.exports = new ResourceService();
