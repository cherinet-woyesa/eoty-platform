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
      const [resourceRow] = await transaction('resources').insert({
        lesson_id: lessonId,
        title: originalFilename,
          file_name: safeFileName,
        original_filename: originalFilename,
        file_type: fileExtension,
        file_size: fileBuffer.length,
        file_url: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        description: description || null,
        author: userId,
        created_at: new Date(),
        updated_at: new Date(),
        published_at: new Date()
      }).returning('*');

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
      const resources = await db('resources')
        .where({ lesson_id: lessonId })
        .select(
          'id',
          'lesson_id',
            'file_name as filename',
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
      const user = await db('users')
        .where({ id: userId })
        .select('chapter_id')
        .first();

      // Base select (include scope + author so UI can render context)
      let query = db('resources')
        .select(
          'resources.id',
          'resources.title',
          'resources.description',
            'resources.file_name as filename',
          'resources.file_type',
          'resources.file_size',
          'resources.file_url',
          'resources.category',
          'resources.language',
          'resources.tags',
          'resources.is_public',
          'resources.resource_scope',
          'resources.chapter_id',
          'resources.course_id',
          'resources.author',
          'resources.created_at',
          'resources.updated_at',
          'resources.published_at'
        );

      // Admins see everything
      if (userRole === 'admin' || userRole === 'chapter_admin') {
        const all = await query.orderBy('resources.created_at', 'desc');
        console.log(`Retrieved ${all.length} resources for admin ${userId}`);
        return all;
      }

      // Teacher: show platform public, chapter resources for their chapter, anything they authored, and their course-specific uploads
      if (userRole === 'teacher') {
        const teacherCourseIds = db('courses')
          .where({ created_by: userId })
          .select('id');

        query = query.where(function(builder) {
          // Public platform-wide
          builder.where(function(b) {
            b.where('resources.resource_scope', 'platform_wide')
              .andWhere('resources.is_public', true);
          });

          // Chapter resources for same chapter
          if (user?.chapter_id) {
            builder.orWhere(function(b) {
              b.where('resources.resource_scope', 'chapter_wide')
                .andWhere('resources.chapter_id', user.chapter_id);
            });
          }

          // Authored by this teacher
          builder.orWhere('resources.author', userId);

          // Course-specific resources for teacher-owned courses
          builder.orWhere(function(b) {
            b.where('resources.resource_scope', 'course_specific')
              .andWhereIn('resources.course_id', teacherCourseIds);
          });
        });

        const teacherResources = await query.orderBy('resources.created_at', 'desc');
        console.log(`Retrieved ${teacherResources.length} resources for teacher ${userId}`);
        return teacherResources;
      }

      // Students/other roles: platform public + chapter resources for their chapter
      query = query.where(function(builder) {
        builder.where(function(b) {
          b.where('resources.resource_scope', 'platform_wide')
            .andWhere('resources.is_public', true);
        });

        if (user?.chapter_id) {
          builder.orWhere(function(b) {
            b.where('resources.resource_scope', 'chapter_wide')
              .andWhere('resources.chapter_id', user.chapter_id);
          });
        }
      });

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
      const resource = await transaction('resources')
        .join('lessons', 'resources.lesson_id', 'lessons.id')
        .join('courses', 'lessons.course_id', 'courses.id')
        .leftJoin('user_course_enrollments', function() {
          this.on('courses.id', '=', 'user_course_enrollments.course_id')
              .andOn('user_course_enrollments.user_id', '=', transaction.raw('?', [userId]));
        })
        .where('resources.id', resourceId)
        .select(
          'resources.*',
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
      await transaction('resources')
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
      const resource = await transaction('resources')
        .join('lessons', 'resources.lesson_id', 'lessons.id')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('resources.id', resourceId)
        .where('courses.created_by', userId)
        .select('resources.*', 'resources.file_url')
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
      await transaction('resources')
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

        case 'chapter_wide': {
          if (!chapterId) throw new Error('chapterId required for chapter_wide scope');

          // Allow if user has any non-rejected membership in the chapter, or legacy chapter_id match, or admin
          const membership = await db('user_chapters')
            .where({
              user_id: userId,
              chapter_id: chapterId
            })
            .whereNot('status', 'rejected')
            .first();

          const legacyChapterMatch =
            user.chapter_id && parseInt(user.chapter_id, 10) === parseInt(chapterId, 10);

          if (!membership && !legacyChapterMatch && user.role !== 'admin') {
            const err = new Error('Access denied to chapter resources');
            err.statusCode = 403;
            throw err;
          }

          query = query.where({ resource_scope: 'chapter_wide', chapter_id: chapterId });
          break;
        }

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

      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 50;
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const countResult = await query.clone().count('* as total').first();
      const total = parseInt(countResult.total) || 0;

      const resources = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

      return { resources, total, page, limit };

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
    let { title, description, category, language, tags, resourceScope = 'chapter_wide', courseId, chapter_id } = metadata;

    try {
      // Validate file
      this.validateResourceFile(fileBuffer, originalFilename, userId);

      // Get user info
      const user = await db('users').where({ id: userId }).select('chapter_id', 'role').first();
      if (!user) throw new Error('User not found');
      
      console.log(`[UploadToLibrary] User ${userId} found. Role: ${user.role}, ChapterID: ${user.chapter_id}`);

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

      // Validate chapter_id if scope is chapter_wide
      let finalChapterId = null;
      if (resourceScope === 'chapter_wide') {
        // Priority 1: Check if chapter_id was passed in metadata (from frontend)
        if (chapter_id) {
           const explicitChapter = await db('chapters').where({ id: chapter_id }).first();
           if (explicitChapter) {
             finalChapterId = chapter_id;
           }
        }

        // Priority 2: Check user's main chapter_id
        if (!finalChapterId && user.chapter_id) {
            // Check if chapter exists
            const chapterExists = await db('chapters').where({ id: user.chapter_id }).first();
            if (chapterExists) {
                finalChapterId = user.chapter_id;
            }
        }
        
        // Priority 3: Check user_chapters
        if (!finalChapterId) {
             const memberChapter = await db('user_chapters')
                .where({ user_id: userId })
                .whereNot('status', 'rejected')
                .first();
            
            if (memberChapter) {
                // Verify this chapter actually exists
                const chapterExists = await db('chapters').where({ id: memberChapter.chapter_id }).first();
                if (chapterExists) {
                    finalChapterId = memberChapter.chapter_id;
                }
            }
        }

        // If still no chapter ID and scope is chapter_wide, we have a problem.
        if (!finalChapterId) {
             // If user is admin, maybe they meant platform_wide?
             if (user.role === 'admin') {
                 resourceScope = 'platform_wide'; // Auto-correct scope
                 console.log('Auto-corrected resource scope to platform_wide for admin with no chapter.');
             } else {
                 throw new Error('Unable to determine valid chapter for resource upload. Please ensure you are a member of a chapter.');
             }
        }
      }
      
      // FINAL SAFETY CHECK: If we have a chapter_id, verify it exists one last time to prevent FK errors
      if (finalChapterId) {
          const exists = await db('chapters').where({ id: finalChapterId }).first();
          if (!exists) {
              console.error(`[Critical] Attempted to use non-existent chapter_id ${finalChapterId} for upload.`);
              if (user.role === 'admin') {
                  resourceScope = 'platform_wide';
                  finalChapterId = null;
              } else {
                  throw new Error('Selected chapter does not exist.');
              }
          }
      }

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
        original_filename: originalFilename,
        file_size: fileBuffer.length,
        file_url: fileUrl,
        resource_scope: resourceScope,
        chapter_id: finalChapterId,
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

  /**
   * Update a library resource
   * @param {number} resourceId - Resource ID
   * @param {Object} data - Data to update
   * @param {number} userId - User ID requesting update
   * @returns {Promise<Object>} Updated resource
   */
  async updateLibraryResource(resourceId, data, userId) {
    try {
      // Verify ownership
      const resource = await db('resources').where({ id: resourceId }).first();
      if (!resource) {
        throw new Error('Resource not found');
      }

      // Check if user is author, admin, or teacher with appropriate permissions
      const user = await db('users').where({ id: userId }).first();
      
      // Allow if user is author or admin
      if (resource.author === userId || user.role === 'admin') {
        // Continue with update/delete
      } else if (user.role === 'teacher') {
        // Teachers can manage resources if they are course owners or lesson owners
        if (resource.lesson_id) {
          // Check if teacher owns the lesson through course ownership
          const lesson = await db('lessons')
            .join('courses', 'lessons.course_id', 'courses.id')
            .where('lessons.id', resource.lesson_id)
            .where('courses.created_by', userId)
            .first();
          if (!lesson) {
            throw new Error('Access denied: You can only manage resources for your own lessons');
          }
        } else if (resource.course_id) {
          // Check if teacher owns the course
          const course = await db('courses').where({ id: resource.course_id, created_by: userId }).first();
          if (!course) {
            throw new Error('Access denied: You can only manage resources for your own courses');
          }
        } else if (resource.chapter_id) {
          // Check if teacher belongs to the chapter
          const userChapter = await db('user_chapters')
            .where({ user_id: userId, chapter_id: resource.chapter_id, status: 'approved' })
            .first();
          if (!userChapter && user.chapter_id !== resource.chapter_id) {
            throw new Error('Access denied: You can only manage resources in your chapter');
          }
        } else {
          // Platform-wide resources require admin access
          throw new Error('Access denied: Only admins can manage platform-wide resources');
        }
      } else {
        throw new Error('Access denied');
      }

      const updateData = {
        updated_at: new Date()
      };

      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.category) updateData.category = data.category;
      if (data.is_public !== undefined) {
        updateData.is_public = data.is_public;
        // If making public, ensure scope is platform_wide? 
        // Or just trust the flag. Let's trust the flag but maybe update scope if needed.
        // For now, just update the flag as requested.
        if (data.is_public) {
           updateData.resource_scope = 'platform_wide';
        } else if (resource.resource_scope === 'platform_wide') {
           // If un-publishing, revert to chapter_wide or course_specific?
           // Default to chapter_wide if not specified
           updateData.resource_scope = 'chapter_wide';
        }
      }

      await db('resources').where({ id: resourceId }).update(updateData);

      return await db('resources').where({ id: resourceId }).first();
    } catch (error) {
      console.error('Error updating library resource:', error);
      throw error;
    }
  }

  /**
   * Delete a library resource
   * @param {number} resourceId - Resource ID
   * @param {number} userId - User ID requesting deletion
   * @returns {Promise<Object>} Deletion result
   */
  async deleteLibraryResource(resourceId, userId) {
    try {
      // Verify ownership
      const resource = await db('resources').where({ id: resourceId }).first();
      if (!resource) {
        throw new Error('Resource not found');
      }

      // Check if user is author, admin, or teacher with appropriate permissions
      const user = await db('users').where({ id: userId }).first();
      
      // Allow if user is author or admin
      if (resource.author === userId || user.role === 'admin') {
        // Continue with update/delete
      } else if (user.role === 'teacher') {
        // Teachers can manage resources if they are course owners or lesson owners
        if (resource.lesson_id) {
          // Check if teacher owns the lesson through course ownership
          const lesson = await db('lessons')
            .join('courses', 'lessons.course_id', 'courses.id')
            .where('lessons.id', resource.lesson_id)
            .where('courses.created_by', userId)
            .first();
          if (!lesson) {
            throw new Error('Access denied: You can only manage resources for your own lessons');
          }
        } else if (resource.course_id) {
          // Check if teacher owns the course
          const course = await db('courses').where({ id: resource.course_id, created_by: userId }).first();
          if (!course) {
            throw new Error('Access denied: You can only manage resources for your own courses');
          }
        } else if (resource.chapter_id) {
          // Check if teacher belongs to the chapter
          const userChapter = await db('user_chapters')
            .where({ user_id: userId, chapter_id: resource.chapter_id, status: 'approved' })
            .first();
          if (!userChapter && user.chapter_id !== resource.chapter_id) {
            throw new Error('Access denied: You can only manage resources in your chapter');
          }
        } else {
          // Platform-wide resources require admin access
          throw new Error('Access denied: Only admins can manage platform-wide resources');
        }
      } else {
        throw new Error('Access denied');
      }

      // Delete from cloud storage if needed (optional, depending on retention policy)
      // For now, just delete from DB
      if (resource.file_url) {
         const s3Key = this.extractS3KeyFromUrl(resource.file_url);
         if (s3Key) {
            await cloudStorageService.deleteVideo(s3Key).catch(err => console.warn('Failed to delete file from storage:', err));
         }
      }

      await db('resources').where({ id: resourceId }).delete();

      return { success: true, id: resourceId };
    } catch (error) {
      console.error('Error deleting library resource:', error);
      throw error;
    }
  }
}

module.exports = new ResourceService();
