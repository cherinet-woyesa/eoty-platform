const db = require('../config/database');

const courseController = {
  // Get single course by ID with statistics
  async getCourse(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;

      // Check if courseId is a valid integer
      if (isNaN(parseInt(courseId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid course ID'
        });
      }

      // Fetch course with statistics
      const course = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_course_enrollments as uce', 'c.id', 'uce.course_id')
        .where('c.id', courseId)
        .groupBy('c.id')
        .select(
          'c.*',
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('COUNT(DISTINCT uce.user_id) as student_count'),
          db.raw('SUM(l.duration) as total_duration')
        )
        .first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Hydrate metadata fields into top-level properties for the API response
      // so the frontend can work with a flatter course object.
      let metadata = {};
      try {
        if (course.metadata) {
          metadata =
            typeof course.metadata === 'string'
              ? JSON.parse(course.metadata)
              : course.metadata;
        }
      } catch (e) {
        console.warn('Failed to parse course metadata, using empty object:', e.message);
        metadata = {};
      }

      // Basic extended fields - check direct columns first, then metadata
      course.level = course.level || metadata.level || metadata.levelSlug || null;
      course.cover_image = course.cover_image || metadata.coverImage || metadata.cover_image || null;
      course.learning_objectives = course.learning_objectives || metadata.learningObjectives || metadata.learning_objectives || null;
      course.prerequisites = course.prerequisites || metadata.prerequisites || null;
      course.estimated_duration = course.estimated_duration || metadata.estimatedDuration || metadata.estimated_duration || null;
      course.tags = course.tags || metadata.tags || [];
      course.language = course.language || metadata.language || 'en';
      course.is_public = course.is_public !== undefined ? course.is_public : (metadata.isPublic !== undefined ? metadata.isPublic : true);
      course.certification_available = course.certification_available !== undefined ? course.certification_available : (metadata.certificationAvailable !== undefined ? metadata.certificationAvailable : false);
      course.welcome_message = course.welcome_message || metadata.welcomeMessage || '';
      course.price = course.price !== undefined ? course.price : (metadata.price !== undefined ? metadata.price : 0);

      // Status: derive from is_published, but allow metadata override if present
      course.status =
        metadata.status ||
        (course.is_published ? 'published' : 'draft');

      // Check permissions: teacher owns course OR admin OR base user enrolled
      const hasPermission = 
        (userRole === 'teacher' && course.created_by === userId) ||
        userRole === 'admin';

      // Base members (user/student) must be enrolled
      if (!hasPermission && (userRole === 'user' || userRole === 'student')) {
        // Check if user is enrolled
        const enrollment = await db('user_course_enrollments')
          .where({ user_id: userId, course_id: courseId })
          .first();
        
        if (!enrollment) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view this course'
          });
        }
      } else if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this course'
        });
      }

      console.log('Returning course data:', {
        id: course.id,
        title: course.title,
        cover_image: course.cover_image,
        hasCoverImage: !!course.cover_image,
        metadataKeys: course.metadata ? Object.keys(course.metadata) : []
      });

      res.json({
        success: true,
        data: { course }
      });
    } catch (error) {
      console.error('Get course error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch course'
      });
    }
  },

  // Get all courses for the logged-in teacher with statistics
  async getUserCourses(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      let coursesQuery = db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_lesson_progress as ulp', 'l.id', 'ulp.lesson_id')
        .groupBy('c.id')
        .select(
          'c.*',
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('COUNT(DISTINCT ulp.user_id) as student_count'),
          db.raw('SUM(l.duration) as total_duration')
        )
        .orderBy('c.created_at', 'desc');

      if (userRole === 'user' || userRole === 'student') {
        coursesQuery = coursesQuery
          .join('user_course_enrollments as uce', 'c.id', 'uce.course_id')
          .where('uce.user_id', userId);
      } else if (userRole === 'teacher') {
        coursesQuery = coursesQuery.where('c.created_by', userId);
      } else if (userRole === 'admin') {
        // Admins can see all courses, no additional where clause needed
      }

      const courses = await coursesQuery;

      // Process metadata for each course (similar to getCourse)
      const processedCourses = courses.map(course => {
        let metadata = {};
        try {
          if (course.metadata) {
            metadata = typeof course.metadata === 'string'
              ? JSON.parse(course.metadata)
              : course.metadata;
          }
        } catch (e) {
          console.warn('Failed to parse course metadata for course', course.id, ':', e.message);
          metadata = {};
        }

        // Extract fields from direct columns first, then metadata
        course.level = course.level || metadata.level || metadata.levelSlug || null;
        course.cover_image = course.cover_image || metadata.coverImage || metadata.cover_image || null;
        course.learning_objectives = course.learning_objectives || metadata.learningObjectives || metadata.learning_objectives || null;
        course.prerequisites = course.prerequisites || metadata.prerequisites || null;
        course.estimated_duration = course.estimated_duration || metadata.estimatedDuration || metadata.estimated_duration || null;
        course.tags = course.tags || metadata.tags || [];
        course.language = course.language || metadata.language || 'en';
        course.is_public = course.is_public !== undefined ? course.is_public : (metadata.isPublic !== undefined ? metadata.isPublic : true);
        course.certification_available = course.certification_available !== undefined ? course.certification_available : (metadata.certificationAvailable !== undefined ? metadata.certificationAvailable : false);
        course.welcome_message = course.welcome_message || metadata.welcomeMessage || '';
        course.price = course.price !== undefined ? course.price : (metadata.price !== undefined ? metadata.price : 0);

        return course;
      });

      console.log('Returning courses list:', processedCourses.map(course => ({
        id: course.id,
        title: course.title,
        cover_image: course.cover_image,
        hasCoverImage: !!course.cover_image
      })));

      res.json({
        success: true,
        data: { courses: processedCourses }
      });
    } catch (error) {
      console.error('Get user courses error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch courses'
      });
    }
  },

  // Create a new course
  async createCourse(req, res) {
    try {
      const teacherId = req.user.userId;
      const { title, description, category, level, cover_image } = req.body;

      // Title validation is handled by middleware, but double-check
      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Course title is required'
        });
      }

      // Prepare metadata for optional fields that don't have dedicated columns
      const metadata = {};
      if (level) {
        metadata.level = level;
      }
      if (cover_image) {
        metadata.coverImage = cover_image;
      }

      // Insert course using only columns that actually exist on the courses table
      const courseIdResult = await db('courses')
        .insert({
          title,
          description,
          category,
          cover_image: cover_image || null,
          created_by: teacherId,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');
      const courseId = courseIdResult[0].id;

      // Fetch course with statistics
      const course = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_course_enrollments as uce', 'c.id', 'uce.course_id')
        .where('c.id', courseId)
        .groupBy('c.id')
        .select(
          'c.*',
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('COUNT(DISTINCT uce.user_id) as student_count'),
          db.raw('SUM(l.duration) as total_duration')
        )
        .first();

      // Emit WebSocket event for real-time dashboard update
      const websocketService = require('../services/websocketService');
      websocketService.sendDashboardUpdate(teacherId, 'course_created', {
        courseId: courseId,
        message: 'New course created'
      });

      res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: { course }
      });
    } catch (error) {
      console.error('Create course error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create course'
      });
    }
  },

  // Create a new lesson in a course
  async createLesson(req, res) {
    try {
      const teacherId = req.user.userId;
      const { courseId } = req.params;
      const { title, description, order, allow_download } = req.body;

      // Verify the course belongs to the teacher
      const course = await db('courses')
        .where({ id: courseId, created_by: teacherId })
        .first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if allow_download column exists
      const hasAllowDownload = await db.schema.hasColumn('lessons', 'allow_download');
      
      const lessonData = {
        title,
        description,
        order: order || 0,
        course_id: courseId,
        duration: 0, // Set default duration to 0
        created_by: teacherId,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Only include allow_download if column exists
      if (hasAllowDownload) {
        lessonData.allow_download = allow_download !== undefined ? allow_download : false;
      }
      
      const lessonIdResult = await db('lessons').insert(lessonData).returning('id');
      const lessonId = lessonIdResult[0].id;

      const lesson = await db('lessons').where({ id: lessonId }).first();

      // Emit WebSocket event for real-time dashboard update
      const websocketService = require('../services/websocketService');
      websocketService.sendDashboardUpdate(teacherId, 'lesson_created', {
        lessonId: lessonId,
        courseId: courseId,
        message: 'New lesson created'
      });

      res.status(201).json({
        success: true,
        message: 'Lesson created successfully',
        data: { lesson }
      });
    } catch (error) {
      console.error('Create lesson error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create lesson'
      });
    }
  },

  // NEW: Get signed video URL for a lesson with access control
  async getSignedVideoUrl(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const videoProviderDetection = require('../utils/videoProviderDetection');

      // Check if videos table exists
      const hasVideosTable = await db.schema.hasTable('videos');
      
      // Get lesson with course info - explicitly select video_url to ensure we get the updated transcoded URL
      let lesson;
      if (hasVideosTable) {
        // Legacy S3 videos - join with videos table if it exists
        lesson = await db('lessons as l')
          .join('courses as c', 'l.course_id', 'c.id')
          .leftJoin('videos as v', 'l.video_id', 'v.id')
          .where('l.id', lessonId)
          .select(
            'l.*', 
            'c.created_by as course_teacher', 
            'v.s3_key', 
            'v.video_url as video_video_url', // Also get video_url from videos table
            'v.hls_url as video_hls_url',
            'v.status as video_status', // Get processing status from videos table
            'c.id as course_id'
          )
          .first();
      } else {
        // Mux-only - no videos table needed
        lesson = await db('lessons as l')
          .join('courses as c', 'l.course_id', 'c.id')
          .where('l.id', lessonId)
          .select(
            'l.*', 
            'c.created_by as course_teacher', 
            'c.id as course_id'
          )
          .first();
      }
      
      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Prefer HLS URL from videos table if available, otherwise use lesson's video_url
      // The videos table is updated by the transcoding service
      if (hasVideosTable && lesson.video_video_url && (lesson.video_video_url.includes('.m3u8') || lesson.video_video_url.includes('/hls/'))) {
        lesson.video_url = lesson.video_video_url;
        console.log(`[getSignedVideoUrl] Using HLS URL from videos table:`, lesson.video_url);
      } else if (hasVideosTable && lesson.video_hls_url) {
        lesson.video_url = lesson.video_hls_url;
        lesson.hls_url = lesson.video_hls_url;
        console.log(`[getSignedVideoUrl] Using hls_url from videos table:`, lesson.video_url);
      } else if (lesson.video_url && (lesson.video_url.includes('.m3u8') || lesson.video_url.includes('/hls/'))) {
        console.log(`[getSignedVideoUrl] Using HLS URL from lesson.video_url:`, lesson.video_url);
      } else {
        console.log(`[getSignedVideoUrl] Using original video_url (may be WebM):`, lesson.video_url);
      }

      // Check access: teacher owns course OR student is enrolled OR admin
      let hasAccess = false;
      
      if (userRole === 'teacher' && lesson.course_teacher === userId) {
        hasAccess = true;
      } else if (userRole === 'student') {
        const enrollment = await db('user_course_enrollments')
          .where({ user_id: userId, course_id: lesson.course_id })
          .first();
        hasAccess = !!enrollment;
      } else if (userRole === 'admin') {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this lesson'
        });
      }

      // Use provider detection to get playback info
      const playbackInfo = await videoProviderDetection.getPlaybackInfo(lesson, {
        generateSignedUrls: true,
        urlExpiration: 3600
      });

      if (!playbackInfo.hasVideo) {
        return res.status(404).json({
          success: false,
          message: 'Video not available for this lesson'
        });
      }

      // If video is still processing, return status but still provide a temporary URL if available
      if (playbackInfo.status === 'processing' && !playbackInfo.playbackUrl) {
        // Video is processing - return status but provide original file URL as fallback
        if (lesson.s3_key) {
          const cloudStorageService = require('../services/cloudStorageService');
          const tempUrl = await cloudStorageService.getSignedStreamUrl(lesson.s3_key, 3600);
          return res.json({
            success: true,
            data: {
              videoUrl: tempUrl, // Temporary URL while processing
              provider: playbackInfo.provider,
              status: 'processing',
              thumbnailUrl: playbackInfo.thumbnailUrl,
              expiresIn: 3600,
              metadata: {
                ...playbackInfo.metadata,
                message: 'Video is being transcoded. This is a temporary URL - the transcoded version will be available shortly.'
              }
            }
          });
        }
      }

      res.json({
        success: true,
        data: {
          videoUrl: playbackInfo.playbackUrl || null,
          provider: playbackInfo.provider,
          status: playbackInfo.status,
          thumbnailUrl: playbackInfo.thumbnailUrl,
          expiresIn: 3600,
          metadata: playbackInfo.metadata || {}
        }
      });

    } catch (error) {
      console.error('Get signed video URL error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get video URL'
      });
    }
  },

  // Update course details
  async updateCourse(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;
      const {
        title,
        description,
        category,
        level,
        is_published,
        cover_image,
        // Extended metadata-backed fields from the editor UI
        learning_objectives,
        prerequisites,
        estimated_duration,
        tags,
        language,
        is_public,
        certification_available,
        welcome_message,
        price,
        status
      } = req.body;

      // Check if course exists and user has permission
      const course = await db('courses').where({ id: courseId }).first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check permissions: teacher owns course OR admin
      const hasPermission = 
        (userRole === 'teacher' && course.created_by === userId) ||
        userRole === 'admin' ||
        userRole === 'admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to modify this course'
        });
      }

      // Build update object with only provided fields that map to REAL columns
      const updateData = {
        updated_at: new Date()
      };

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;

      // Handle metadata-based fields (level, cover_image, and other editor settings)
      let metadata = {};
      try {
        if (course.metadata) {
          metadata =
            typeof course.metadata === 'string'
              ? JSON.parse(course.metadata)
              : course.metadata;
        }
      } catch (e) {
        metadata = {};
      }

      if (level !== undefined) {
        metadata.level = level;
      }
      if (cover_image !== undefined) {
        metadata.coverImage = cover_image;
      }

      // Extended editor fields go into metadata only (no dedicated columns)
      if (learning_objectives !== undefined) {
        metadata.learningObjectives = learning_objectives;
      }
      if (prerequisites !== undefined) {
        metadata.prerequisites = prerequisites;
      }
      if (estimated_duration !== undefined) {
        metadata.estimatedDuration = estimated_duration;
      }
      if (tags !== undefined) {
        metadata.tags = tags;
      }
      if (language !== undefined) {
        metadata.language = language;
      }
      if (is_public !== undefined) {
        metadata.isPublic = is_public;
      }
      if (certification_available !== undefined) {
        metadata.certificationAvailable = certification_available;
      }
      if (welcome_message !== undefined) {
        metadata.welcomeMessage = welcome_message;
      }
      if (price !== undefined) {
        metadata.price = price;
      }
      if (status !== undefined) {
        metadata.status = status;
      }

      // Update direct columns for fields that have dedicated database columns
      if (price !== undefined) {
        updateData.price = price;
      }
      if (is_public !== undefined) {
        updateData.is_public = is_public;
      }
      if (certification_available !== undefined) {
        updateData.certification_available = certification_available;
      }
      if (welcome_message !== undefined) {
        updateData.welcome_message = welcome_message;
      }
      if (status !== undefined) {
        updateData.status = status;
      }
      if (cover_image !== undefined) {
        updateData.cover_image = cover_image;
      }

      // Update metadata for fields stored there
      if (Object.keys(metadata).length > 0) {
        updateData.metadata = metadata;
      }
      if (is_published !== undefined) {
        updateData.is_published = is_published;
        if (is_published && !course.is_published) {
          updateData.published_at = new Date();
        }
      }

      // Update the course
      await db('courses').where({ id: courseId }).update(updateData);

      // Fetch updated course with statistics
      const updatedCourse = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_course_enrollments as uce', 'c.id', 'uce.course_id')
        .where('c.id', courseId)
        .groupBy('c.id')
        .select(
          'c.*',
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('COUNT(DISTINCT uce.user_id) as student_count'),
          db.raw('SUM(l.duration) as total_duration')
        )
        .first();

      res.json({
        success: true,
        message: 'Course updated successfully',
        data: { course: updatedCourse }
      });
    } catch (error) {
      console.error('Update course error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update course'
      });
    }
  },

  // Delete course with cascade deletion of lessons
  async deleteCourse(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;

      // Check if course exists and user has permission
      const course = await db('courses').where({ id: courseId }).first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check permissions: teacher owns course OR admin
      const hasPermission = 
        (userRole === 'teacher' && course.created_by === userId) ||
        userRole === 'admin' ||
        userRole === 'admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this course'
        });
      }

      // Get lesson count and student count for impact information
      const stats = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_course_enrollments as uce', 'c.id', 'uce.course_id')
        .where('c.id', courseId)
        .groupBy('c.id')
        .select(
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('COUNT(DISTINCT uce.user_id) as student_count')
        )
        .first();

      // Delete the course (cascade will handle lessons due to foreign key constraints)
      await db('courses').where({ id: courseId }).delete();

      res.json({
        success: true,
        message: 'Course deleted successfully',
        data: {
          deletedCourseId: parseInt(courseId),
          impact: {
            lessonsDeleted: parseInt(stats.lesson_count) || 0,
            studentsAffected: parseInt(stats.student_count) || 0
          }
        }
      });
    } catch (error) {
      console.error('Delete course error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete course'
      });
    }
  },

  // Bulk operations on courses
  async bulkAction(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { action, courseIds, data } = req.body;

      // Get all courses and check permissions
      const courses = await db('courses').whereIn('id', courseIds);

      if (courses.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No courses found with the provided IDs'
        });
      }

      // Check permissions for each course
      const unauthorizedCourses = courses.filter(course => {
        const hasPermission = 
          (userRole === 'teacher' && course.created_by === userId) ||
          userRole === 'admin' ||
          userRole === 'admin';
        return !hasPermission;
      });

      if (unauthorizedCourses.length > 0) {
        return res.status(403).json({
          success: false,
          message: `You do not have permission to modify ${unauthorizedCourses.length} of the selected courses`,
          data: {
            unauthorizedCourseIds: unauthorizedCourses.map(c => c.id)
          }
        });
      }

      const results = {
        success: [],
        failed: []
      };

      // Perform the bulk action
      try {
        switch (action) {
          case 'publish':
            // Validate each course has at least one lesson before publishing
            for (const courseId of courseIds) {
              const lessonCount = await db('lessons')
                .where({ course_id: courseId })
                .count('id as count')
                .first();

              if (parseInt(lessonCount.count) === 0) {
                results.failed.push({
                  courseId,
                  reason: 'Course must have at least one lesson to be published'
                });
              } else {
                await db('courses')
                  .where({ id: courseId })
                  .update({
                    is_published: true,
                    published_at: new Date(),
                    updated_at: new Date()
                  });
                results.success.push(courseId);
              }
            }
            break;

          case 'unpublish':
            await db('courses')
              .whereIn('id', courseIds)
              .update({
                is_published: false,
                updated_at: new Date()
              });
            results.success = courseIds;
            break;

          case 'delete':
            // Delete all courses (cascade will handle lessons)
            await db('courses').whereIn('id', courseIds).delete();
            results.success = courseIds;
            break;

          case 'archive':
            // Update metadata to mark as archived
            await db('courses')
              .whereIn('id', courseIds)
              .update({
                metadata: db.raw("jsonb_set(COALESCE(metadata, '{}'), '{archived}', 'true')"),
                updated_at: new Date()
              });
            results.success = courseIds;
            break;

          case 'unarchive':
            // Update metadata to remove archived flag
            await db('courses')
              .whereIn('id', courseIds)
              .update({
                metadata: db.raw("jsonb_set(COALESCE(metadata, '{}'), '{archived}', 'false')"),
                updated_at: new Date()
              });
            results.success = courseIds;
            break;

          default:
            return res.status(400).json({
              success: false,
              message: 'Invalid action'
            });
        }

        res.json({
          success: true,
          message: `Bulk ${action} completed`,
          data: {
            action,
            totalRequested: courseIds.length,
            successCount: results.success.length,
            failedCount: results.failed.length,
            successfulCourseIds: results.success,
            failed: results.failed
          }
        });
      } catch (actionError) {
        console.error('Bulk action execution error:', actionError);
        throw actionError;
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk action'
      });
    }
  },

  // Publish a course
  async publishCourse(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;

      // Check if course exists and user has permission
      const course = await db('courses').where({ id: courseId }).first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check permissions: teacher owns course OR admin
      const hasPermission = 
        (userRole === 'teacher' && course.created_by === userId) ||
        userRole === 'admin' ||
        userRole === 'admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to publish this course'
        });
      }

      // Validate course has at least one lesson
      const lessonCount = await db('lessons')
        .where({ course_id: courseId })
        .count('id as count')
        .first();

      if (parseInt(lessonCount.count) === 0) {
        return res.status(400).json({
          success: false,
          message: 'Course must have at least one lesson to be published',
          validationErrors: {
            lessons: 'Add at least one lesson before publishing'
          }
        });
      }

      // Validate required fields
      const validationErrors = {};
      if (!course.title || course.title.trim() === '') {
        validationErrors.title = 'Course title is required';
      }
      if (!course.category) {
        validationErrors.category = 'Course category is required';
      }

      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Course validation failed',
          validationErrors
        });
      }

      // Publish the course
      await db('courses')
        .where({ id: courseId })
        .update({
          is_published: true,
          published_at: new Date(),
          scheduled_publish_at: null, // Clear any scheduled publish
          updated_at: new Date()
        });

      // Fetch updated course with statistics
      const updatedCourse = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_course_enrollments as uce', 'c.id', 'uce.course_id')
        .where('c.id', courseId)
        .groupBy('c.id')
        .select(
          'c.*',
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('COUNT(DISTINCT uce.user_id) as student_count'),
          db.raw('SUM(l.duration) as total_duration')
        )
        .first();

      res.json({
        success: true,
        message: 'Course published successfully',
        data: { course: updatedCourse }
      });
    } catch (error) {
      console.error('Publish course error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to publish course'
      });
    }
  },

  // Unpublish a course
  async unpublishCourse(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;

      // Check if course exists and user has permission
      const course = await db('courses').where({ id: courseId }).first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check permissions: teacher owns course OR admin
      const hasPermission = 
        (userRole === 'teacher' && course.created_by === userId) ||
        userRole === 'admin' ||
        userRole === 'admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to unpublish this course'
        });
      }

      // Unpublish the course
      await db('courses')
        .where({ id: courseId })
        .update({
          is_published: false,
          scheduled_publish_at: null, // Clear any scheduled publish
          updated_at: new Date()
        });

      // Fetch updated course with statistics
      const updatedCourse = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_course_enrollments as uce', 'c.id', 'uce.course_id')
        .where('c.id', courseId)
        .groupBy('c.id')
        .select(
          'c.*',
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('COUNT(DISTINCT uce.user_id) as student_count'),
          db.raw('SUM(l.duration) as total_duration')
        )
        .first();

      res.json({
        success: true,
        message: 'Course unpublished successfully',
        data: { course: updatedCourse }
      });
    } catch (error) {
      console.error('Unpublish course error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unpublish course'
      });
    }
  },

  // Schedule course publishing
  async schedulePublishCourse(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;
      const { scheduledDate } = req.body;

      if (!scheduledDate) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date is required'
        });
      }

      const scheduledDateTime = new Date(scheduledDate);
      
      // Validate scheduled date is in the future
      if (scheduledDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date must be in the future'
        });
      }

      // Check if course exists and user has permission
      const course = await db('courses').where({ id: courseId }).first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check permissions: teacher owns course OR admin
      const hasPermission = 
        (userRole === 'teacher' && course.created_by === userId) ||
        userRole === 'admin' ||
        userRole === 'admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to schedule publishing for this course'
        });
      }

      // Validate course has at least one lesson
      const lessonCount = await db('lessons')
        .where({ course_id: courseId })
        .count('id as count')
        .first();

      if (parseInt(lessonCount.count) === 0) {
        return res.status(400).json({
          success: false,
          message: 'Course must have at least one lesson to be scheduled for publishing',
          validationErrors: {
            lessons: 'Add at least one lesson before scheduling'
          }
        });
      }

      // Validate required fields
      const validationErrors = {};
      if (!course.title || course.title.trim() === '') {
        validationErrors.title = 'Course title is required';
      }
      if (!course.category) {
        validationErrors.category = 'Course category is required';
      }

      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Course validation failed',
          validationErrors
        });
      }

      // Schedule the course
      await db('courses')
        .where({ id: courseId })
        .update({
          scheduled_publish_at: scheduledDateTime,
          is_published: false, // Keep unpublished until scheduled time
          updated_at: new Date()
        });

      // Fetch updated course with statistics
      const updatedCourse = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_course_enrollments as uce', 'c.id', 'uce.course_id')
        .where('c.id', courseId)
        .groupBy('c.id')
        .select(
          'c.*',
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('COUNT(DISTINCT uce.user_id) as student_count'),
          db.raw('SUM(l.duration) as total_duration')
        )
        .first();

      res.json({
        success: true,
        message: `Course scheduled to publish on ${scheduledDateTime.toLocaleString()}`,
        data: { course: updatedCourse }
      });
    } catch (error) {
      console.error('Schedule publish course error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule course publishing'
      });
    }
  },

  // Get course analytics
  async getCourseAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;

      // Check if course exists and user has permission
      const course = await db('courses').where({ id: courseId }).first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check permissions: teacher owns course OR admin
      const hasPermission = 
        (userRole === 'teacher' && course.created_by === userId) ||
        userRole === 'admin' ||
        userRole === 'admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view analytics for this course'
        });
      }

      // Get comprehensive analytics
      const analytics = {};

      // Basic course statistics
      const basicStats = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .where('c.id', courseId)
        .groupBy('c.id')
        .select(
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('SUM(l.duration) as total_duration')
        )
        .first();

      analytics.lessonCount = parseInt(basicStats.lesson_count) || 0;
      analytics.totalDuration = parseInt(basicStats.total_duration) || 0;

      // Enrollment statistics
      const enrollmentStats = await db('user_course_enrollments as uce')
        .where('uce.course_id', courseId)
        .select(
          db.raw('COUNT(*) as total_enrollments'),
          db.raw("COUNT(CASE WHEN enrollment_status = 'active' THEN 1 END) as active_students"),
          db.raw("COUNT(CASE WHEN enrollment_status = 'completed' THEN 1 END) as completed_students")
        )
        .first();

      analytics.totalEnrollments = parseInt(enrollmentStats.total_enrollments) || 0;
      analytics.activeStudents = parseInt(enrollmentStats.active_students) || 0;
      analytics.completedStudents = parseInt(enrollmentStats.completed_students) || 0;

      // Calculate completion rate
      analytics.completionRate = analytics.totalEnrollments > 0
        ? ((analytics.completedStudents / analytics.totalEnrollments) * 100).toFixed(2)
        : 0;

      // Get lesson completion statistics
      const lessonProgress = await db('lessons as l')
        .leftJoin('user_lesson_progress as ulp', 'l.id', 'ulp.lesson_id')
        .where('l.course_id', courseId)
        .groupBy('l.id', 'l.title', 'l.order')
        .select(
          'l.id',
          'l.title',
          'l.order',
          db.raw('COUNT(DISTINCT ulp.user_id) as views'),
          db.raw("COUNT(DISTINCT CASE WHEN ulp.is_completed = true THEN ulp.user_id END) as completions")
        )
        .orderBy('l.order');

      analytics.lessonStats = lessonProgress.map(lesson => ({
        lessonId: lesson.id,
        title: lesson.title,
        order: lesson.order,
        views: parseInt(lesson.views) || 0,
        completions: parseInt(lesson.completions) || 0,
        completionRate: lesson.views > 0 
          ? ((lesson.completions / lesson.views) * 100).toFixed(2)
          : 0
      }));

      // Calculate average progress across all enrolled students
      const avgProgress = await db('user_lesson_progress as ulp')
        .join('lessons as l', 'ulp.lesson_id', 'l.id')
        .where('l.course_id', courseId)
        .select(
          db.raw('AVG(ulp.progress) as average_progress')
        )
        .first();

      analytics.averageProgress = parseFloat(avgProgress.average_progress) || 0;

      // Get recent activity (last 30 days)
      const recentActivity = await db('user_lesson_progress as ulp')
        .join('lessons as l', 'ulp.lesson_id', 'l.id')
        .where('l.course_id', courseId)
        .where('ulp.last_accessed_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
        .count('* as activity_count')
        .first();

      analytics.recentActivityCount = parseInt(recentActivity.activity_count) || 0;

      res.json({
        success: true,
        data: {
          courseId: parseInt(courseId),
          courseTitle: course.title,
          analytics
        }
      });
    } catch (error) {
      console.error('Get course analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch course analytics'
      });
    }
  },

  // Update lesson details
  async updateLesson(req, res) {
    try {
      const userId = req.user.userId;
      const { lessonId } = req.params;
      const { title, description, order, duration, video_url, is_published, resources, thumbnail_url, allow_download, metadata } = req.body;

      // Get lesson with course info (ownership already verified by middleware)
      const lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('l.id', lessonId)
        .select('l.*', 'c.id as course_id')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Build update object with only provided fields
      const updateData = {
        updated_at: new Date()
      };

      // Check if allow_download column exists
      const hasAllowDownload = await db.schema.hasColumn('lessons', 'allow_download');
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (order !== undefined) updateData.order = parseInt(order);
      if (duration !== undefined) updateData.duration = parseInt(duration);
      if (video_url !== undefined) updateData.video_url = video_url;
      if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
      // Only include allow_download if column exists
      if (hasAllowDownload && allow_download !== undefined) {
        updateData.allow_download = allow_download;
      }
      if (resources !== undefined) {
        // Validate and store resources as JSON
        updateData.resources = JSON.stringify(Array.isArray(resources) ? resources : []);
      }
      if (is_published !== undefined) {
        updateData.is_published = is_published;
        if (is_published && !lesson.is_published) {
          updateData.published_at = new Date();
        }
      }
      if (metadata !== undefined) {
        // Store metadata as JSON string if it's an object
        updateData.metadata = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
      }

      // Update the lesson
      await db('lessons').where({ id: lessonId }).update(updateData);

      // Fetch updated lesson
      const updatedLesson = await db('lessons').where({ id: lessonId }).first();

      // Parse resources back to array if it exists
      if (updatedLesson.resources) {
        try {
          updatedLesson.resources = JSON.parse(updatedLesson.resources);
        } catch (e) {
          updatedLesson.resources = [];
        }
      }

      // Parse metadata back to object if it exists
      if (updatedLesson.metadata) {
        try {
          updatedLesson.metadata = typeof updatedLesson.metadata === 'string' 
            ? JSON.parse(updatedLesson.metadata) 
            : updatedLesson.metadata;
        } catch (e) {
          updatedLesson.metadata = {};
        }
      }

      // Update course statistics (lesson_count and total_duration)
      await updateCourseStatistics(lesson.course_id);

      res.json({
        success: true,
        message: 'Lesson updated successfully',
        data: { lesson: updatedLesson }
      });
    } catch (error) {
      console.error('Update lesson error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update lesson'
      });
    }
  },

  // Delete lesson with video cleanup
  async deleteLesson(req, res) {
    try {
      const userId = req.user.userId;
      const { lessonId } = req.params;

      // Check if videos table exists
      const hasVideosTable = await db.schema.hasTable('videos');
      
      let lesson;
      if (hasVideosTable) {
        // Get lesson with video info (ownership already verified by middleware)
        lesson = await db('lessons as l')
          .leftJoin('videos as v', 'l.video_id', 'v.id')
          .where('l.id', lessonId)
          .select('l.*', 'v.s3_key', 'v.id as video_id', 'l.course_id')
          .first();
      } else {
        // Videos table doesn't exist - just get lesson info
        lesson = await db('lessons')
          .where('id', lessonId)
          .select('*', 'course_id')
          .first();
      }

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      const courseId = lesson.course_id;

      // Delete video from cloud storage if exists and videos table exists
      if (hasVideosTable && lesson.s3_key) {
        try {
          const cloudStorageService = require('../services/cloudStorageService');
          await cloudStorageService.deleteVideo(lesson.s3_key);
          console.log('Deleted video from cloud storage:', lesson.s3_key);
        } catch (storageError) {
          console.error('Failed to delete video from storage:', storageError);
          // Continue with lesson deletion even if storage cleanup fails
        }
      }

      // Delete the lesson (cascade will handle related records)
      await db('lessons').where({ id: lessonId }).delete();

      // Update course statistics
      await updateCourseStatistics(courseId);

      res.json({
        success: true,
        message: 'Lesson deleted successfully',
        data: {
          deletedLessonId: parseInt(lessonId),
          courseId: parseInt(courseId)
        }
      });
    } catch (error) {
      console.error('Delete lesson error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete lesson'
      });
    }
  },

  // Reorder lessons with automatic numbering
  async reorderLessons(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.params;
      const { lessons } = req.body;

      // Ownership already verified by middleware
      const course = await db('courses').where({ id: courseId }).first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Verify all lessons belong to this course
      const lessonIds = lessons.map(l => l.id);
      const courseLessons = await db('lessons')
        .where({ course_id: courseId })
        .whereIn('id', lessonIds);

      if (courseLessons.length !== lessons.length) {
        return res.status(400).json({
          success: false,
          message: 'Some lessons do not belong to this course'
        });
      }

      // Update lesson order in a transaction
      await db.transaction(async (trx) => {
        for (const lesson of lessons) {
          await trx('lessons')
            .where({ id: lesson.id })
            .update({
              order: lesson.order,
              updated_at: new Date()
            });
        }
      });

      // Fetch updated lessons
      const updatedLessons = await db('lessons')
        .where({ course_id: courseId })
        .orderBy('order', 'asc');

      res.json({
        success: true,
        message: 'Lessons reordered successfully',
        data: {
          courseId: parseInt(courseId),
          lessons: updatedLessons
        }
      });
    } catch (error) {
      console.error('Reorder lessons error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder lessons'
      });
    }
  },

  // Get video processing status for a lesson
  async getVideoStatus(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { lessonId } = req.params;
      const videoProviderDetection = require('../utils/videoProviderDetection');

      // Check if Mux columns exist
      const hasMuxUploadId = await db.schema.hasColumn('lessons', 'mux_upload_id');
      const hasMuxAssetId = await db.schema.hasColumn('lessons', 'mux_asset_id');
      const hasMuxPlaybackId = await db.schema.hasColumn('lessons', 'mux_playback_id');
      const hasVideoProvider = await db.schema.hasColumn('lessons', 'video_provider');
      const hasMuxStatus = await db.schema.hasColumn('lessons', 'mux_status');

      // Get lesson with video info
      // For Mux videos, we don't need the videos table join
      // For legacy S3 videos, we'll handle them separately if needed
      const lesson = await db('lessons as l')
        .leftJoin('courses as c', 'l.course_id', 'c.id')
        .where('l.id', lessonId)
        .select(
          'l.*',
          'c.created_by as course_owner'
        )
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Check permissions: teacher owns course OR admin
      const hasPermission = 
        (userRole === 'teacher' && lesson.course_owner === userId) ||
        userRole === 'admin' ||
        userRole === 'admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this lesson'
        });
      }

      // If Mux columns don't exist, set them to null/undefined for detection
      if (!hasMuxUploadId) lesson.mux_upload_id = null;
      if (!hasMuxAssetId) lesson.mux_asset_id = null;
      if (!hasMuxPlaybackId) lesson.mux_playback_id = null;
      if (!hasVideoProvider) lesson.video_provider = null;
      if (!hasMuxStatus) lesson.mux_status = null;

      // Detect provider and get status
      const provider = videoProviderDetection.detectVideoProvider(lesson);

      // Build status response based on provider
      const statusData = {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        provider,
        hasVideo: provider !== 'none',
        videoStatus: null,
        processingProgress: 0,
        errorMessage: null,
        fileSize: 0,
        duration: lesson.duration || 0,
        uploadStartedAt: null,
        lastUpdatedAt: lesson.updated_at
      };

      if (provider === 'mux') {
        // Sync with Mux if status is stuck (has upload_id but no asset_id, or has asset_id but no playback_id)
        const muxService = require('../services/muxService');
        
        // If we have upload_id but no asset_id, check upload status
        // Only check if mux_upload_id column exists and has a value
        if (hasMuxUploadId && lesson.mux_upload_id && (!hasMuxAssetId || !lesson.mux_asset_id)) {
          try {
            console.log(`🔄 Syncing Mux upload status for lesson ${lessonId}, upload_id: ${lesson.mux_upload_id}`);
            const upload = await muxService.getUpload(lesson.mux_upload_id);
            
            // Mux upload object has asset_id property
            const assetId = upload.asset_id || upload.assetId;
            if (assetId) {
              // Upload created an asset, update lesson
              console.log(`✅ Found asset_id from upload: ${assetId}`);
              
              const updateData = {
                updated_at: db.fn.now()
              };
              
              if (hasMuxAssetId) updateData.mux_asset_id = assetId;
              if (hasMuxStatus) updateData.mux_status = 'processing';
              if (await db.schema.hasColumn('lessons', 'mux_created_at')) {
                updateData.mux_created_at = db.fn.now();
              }
              
              await db('lessons')
                .where({ id: lessonId })
                .update(updateData);
              
              // Refresh lesson data
              const updatedLesson = await db('lessons').where({ id: lessonId }).first();
              if (hasMuxAssetId) lesson.mux_asset_id = updatedLesson.mux_asset_id;
              if (hasMuxStatus) lesson.mux_status = updatedLesson.mux_status;
            } else if (upload.status === 'asset_created') {
                // Sometimes asset_id is not at top level but status says created
                // We might need to fetch the asset separately or wait
                console.log('Upload status is asset_created but no asset_id found yet');
            }
          } catch (error) {
            console.warn(`⚠️  Failed to sync upload status: ${error.message}`);
          }
        }
        
        // If we have asset_id but no playback_id, check asset status
        // Only check if mux_asset_id column exists and has a value
        if (hasMuxAssetId && lesson.mux_asset_id && (!hasMuxPlaybackId || !lesson.mux_playback_id)) {
          try {
            console.log(`🔄 Syncing Mux asset status for lesson ${lessonId}, asset_id: ${lesson.mux_asset_id}`);
            const asset = await muxService.getAsset(lesson.mux_asset_id);
            
            if (asset.status === 'ready') {
              // Asset is ready, update lesson with playback_id
              // Use the first playback ID available
              const playbackId = (asset.playback_ids && asset.playback_ids.length > 0) 
                ? asset.playback_ids[0].id 
                : null;
                
              if (playbackId) {
                  console.log(`✅ Found playback_id from asset: ${playbackId}`);
                  
                  const updateData = {
                    updated_at: db.fn.now()
                  };
                  
                  if (hasMuxPlaybackId) updateData.mux_playback_id = playbackId;
                  if (hasMuxStatus) updateData.mux_status = 'ready';
                  if (hasVideoProvider) updateData.video_provider = 'mux';
                  
                  await db('lessons')
                    .where({ id: lessonId })
                    .update(updateData);
                  
                  // Refresh lesson data
                  const updatedLesson = await db('lessons').where({ id: lessonId }).first();
                  if (hasMuxPlaybackId) lesson.mux_playback_id = updatedLesson.mux_playback_id;
                  if (hasMuxStatus) lesson.mux_status = updatedLesson.mux_status;
                  
                  // Send WebSocket update
                  const websocketService = require('../services/websocketService');
                  websocketService.sendProgress(lessonId.toString(), {
                    type: 'complete',
                    progress: 100,
                    currentStep: 'Video ready',
                    provider: 'mux',
                    playbackId: playbackId
                  });
              } else {
                  console.warn('Asset is ready but has no playback IDs');
              }
            } else if (asset.status === 'errored') {
              // Asset errored, update lesson
              console.log(`❌ Asset errored: ${asset.errors || 'Unknown error'}`);
              
              const updateData = {
                updated_at: db.fn.now()
              };
              
              if (hasMuxStatus) updateData.mux_status = 'errored';
              if (await db.schema.hasColumn('lessons', 'mux_error_message')) {
                updateData.mux_error_message = JSON.stringify(asset.errors || {});
              }
              
              await db('lessons')
                .where({ id: lessonId })
                .update(updateData);
              
              const updatedLesson = await db('lessons').where({ id: lessonId }).first();
              if (hasMuxStatus) lesson.mux_status = updatedLesson.mux_status;
              if (await db.schema.hasColumn('lessons', 'mux_error_message')) {
                lesson.mux_error_message = updatedLesson.mux_error_message;
              }
            }
          } catch (error) {
            console.warn(`⚠️  Failed to sync asset status: ${error.message}`);
          }
        }
        
        // Get status - if columns don't exist, use 'preparing' as default
        const currentStatus = (hasMuxStatus && lesson.mux_status) ? lesson.mux_status : 'preparing';
        statusData.videoStatus = currentStatus;
        statusData.muxStatus = currentStatus; // Add for frontend compatibility
        statusData.muxPlaybackId = (hasMuxPlaybackId && lesson.mux_playback_id) ? lesson.mux_playback_id : null;
        statusData.errorMessage = (await db.schema.hasColumn('lessons', 'mux_error_message') && lesson.mux_error_message) ? lesson.mux_error_message : null;
        statusData.uploadStartedAt = (await db.schema.hasColumn('lessons', 'mux_created_at') && lesson.mux_created_at) ? lesson.mux_created_at : null;
        statusData.metadata = {
          assetId: (hasMuxAssetId && lesson.mux_asset_id) ? lesson.mux_asset_id : null,
          playbackId: (hasMuxPlaybackId && lesson.mux_playback_id) ? lesson.mux_playback_id : null,
          uploadId: (hasMuxUploadId && lesson.mux_upload_id) ? lesson.mux_upload_id : null
        };
      } else if (provider === 's3') {
        // For legacy S3 videos, try to get video info if video_id exists
        if (lesson.video_id) {
          try {
            const video = await db('videos')
              .where('id', lesson.video_id)
              .first();
            
            if (video) {
              statusData.videoStatus = video.status || 'ready';
              statusData.processingProgress = video.processing_progress || 100;
              statusData.errorMessage = video.error_message || null;
              statusData.fileSize = video.size_bytes || 0;
              statusData.uploadStartedAt = video.created_at;
              statusData.metadata = {
                s3Key: video.s3_key,
                videoUrl: video.video_url,
                hlsUrl: video.hls_url
              };
            } else {
              statusData.videoStatus = 'no_video';
            }
          } catch (err) {
            console.warn('Could not fetch legacy video info:', err.message);
            statusData.videoStatus = 'no_video';
          }
        } else {
          statusData.videoStatus = 'no_video';
        }
      } else {
        statusData.videoStatus = 'no_video';
      }

      res.json({
        success: true,
        data: statusData
      });
    } catch (error) {
      console.error('Get video status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch video status'
      });
    }
  },

  // Get course catalog with enrollment status
  async getCourseCatalog(req, res) {
    try {
      const userId = req.user.userId;
      
      const courses = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_course_enrollments as uce', function() {
          this.on('c.id', '=', 'uce.course_id')
            .andOn('uce.user_id', '=', db.raw('?', [userId]));
        })
        .leftJoin('users as u', 'c.created_by', 'u.id')
        .where('c.is_published', true)
        .groupBy('c.id', 'u.first_name', 'u.last_name', 'uce.user_id')
        .select(
          'c.*',
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('COUNT(DISTINCT CASE WHEN uce.user_id != ? THEN uce.user_id END) as student_count', [userId]),
          db.raw('CASE WHEN uce.user_id = ? THEN true ELSE false END as is_enrolled', [userId]),
          db.raw("CONCAT(u.first_name, ' ', u.last_name) as created_by_name")
        );

      res.json({
        success: true,
        data: { courses }
      });
    } catch (error) {
      console.error('Get catalog error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch course catalog'
      });
    }
  },

  // Enroll in a course
  async enrollInCourse(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.params;

      // Check if course exists and is published
      const course = await db('courses').where({ id: courseId, is_published: true }).first();
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found or not published'
        });
      }

      // Check if already enrolled
      const existing = await db('user_course_enrollments')
        .where({ user_id: userId, course_id: courseId })
        .first();

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Already enrolled in this course'
        });
      }

      // Enroll student
      await db('user_course_enrollments').insert({
        user_id: userId,
        course_id: courseId,
        enrollment_status: 'active',
        enrolled_at: new Date()
      });

      // Emit WebSocket event to notify the course creator (teacher)
      const websocketService = require('../services/websocketService');
      websocketService.sendDashboardUpdate(course.created_by, 'student_enrolled', {
        courseId: courseId,
        studentId: userId,
        message: 'New student enrolled in your course'
      });

      res.json({
        success: true,
        message: 'Successfully enrolled in course'
      });
    } catch (error) {
      console.error('Enroll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enroll in course'
      });
    }
  },

  // Unenroll from a course
  async unenrollFromCourse(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.params;

      // Check if enrolled
      const enrollment = await db('user_course_enrollments')
        .where({ user_id: userId, course_id: courseId })
        .first();

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'You are not enrolled in this course'
        });
      }

      // Update enrollment status to 'dropped' instead of deleting (preserve progress)
      await db('user_course_enrollments')
        .where({ user_id: userId, course_id: courseId })
        .update({
          enrollment_status: 'dropped',
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Successfully unenrolled from course. Your progress has been saved.'
      });
    } catch (error) {
      console.error('Unenroll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unenroll from course'
      });
    }
  },

  // Add course to favorites
  async addToFavorites(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.params;

      // Check if course exists
      const course = await db('courses').where({ id: courseId }).first();
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if already favorited
      const existing = await db('course_favorites')
        .where({ user_id: userId, course_id: courseId })
        .first();

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Course already in favorites'
        });
      }

      // Add to favorites
      await db('course_favorites').insert({
        user_id: userId,
        course_id: courseId,
        favorited_at: new Date()
      });

      res.json({
        success: true,
        message: 'Course added to favorites'
      });
    } catch (error) {
      console.error('Add to favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add course to favorites'
      });
    }
  },

  // Remove course from favorites
  async removeFromFavorites(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.params;

      const deleted = await db('course_favorites')
        .where({ user_id: userId, course_id: courseId })
        .delete();

      if (deleted === 0) {
        return res.status(404).json({
          success: false,
          message: 'Course not in favorites'
        });
      }

      res.json({
        success: true,
        message: 'Course removed from favorites'
      });
    } catch (error) {
      console.error('Remove from favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove course from favorites'
      });
    }
  },

  // Rate a course
  async rateCourse(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.params;
      const { rating, review } = req.body;

      console.log('Rating request:', { userId, courseId, rating, review });

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      // Check if enrolled
      const enrollment = await db('user_course_enrollments')
        .where({ user_id: userId, course_id: courseId })
        .first();

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in the course to rate it'
        });
      }

      // Check if already rated
      const existing = await db('course_ratings')
        .where({ user_id: userId, course_id: courseId })
        .first();

      if (existing) {
        // Update existing rating
        await db('course_ratings')
          .where({ user_id: userId, course_id: courseId })
          .update({
            rating,
            review: review || null,
            updated_at: new Date()
          });
      } else {
        // Insert new rating
        await db('course_ratings').insert({
          user_id: userId,
          course_id: courseId,
          rating,
          review: review || null,
          is_verified: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      // Update course stats
      const avgRating = await db('course_ratings')
        .where({ course_id: courseId })
        .avg('rating as avg_rating')
        .count('id as rating_count')
        .first();

      // Upsert to course_stats
      const statsExists = await db('course_stats')
        .where({ course_id: courseId })
        .first();

      if (statsExists) {
        await db('course_stats')
          .where({ course_id: courseId })
          .update({
            average_rating: avgRating.avg_rating || 0,
            rating_count: avgRating.rating_count || 0,
            updated_at: new Date()
          });
      } else {
        await db('course_stats').insert({
          course_id: courseId,
          average_rating: avgRating.avg_rating || 0,
          rating_count: avgRating.rating_count || 0,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      res.json({
        success: true,
        message: existing ? 'Rating updated successfully' : 'Rating submitted successfully',
        data: {
          rating,
          averageRating: rating,
          ratingCount: 1
        }
      });
    } catch (error) {
      console.error('Rate course error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to submit rating'
      });
    }
  }
};

/**
 * Helper function to update course statistics
 * Updates lesson_count and total_duration for a course
 */
async function updateCourseStatistics(courseId) {
  try {
    const stats = await db('lessons')
      .where({ course_id: courseId })
      .select(
        db.raw('COUNT(*) as lesson_count'),
        db.raw('SUM(duration) as total_duration')
      )
      .first();

    // Note: We're not updating the courses table directly as these are computed values
    // They should be calculated on-the-fly in queries
    // This function is here for future use if we decide to cache these values
    
    console.log(`Course ${courseId} statistics updated:`, {
      lessonCount: parseInt(stats.lesson_count) || 0,
      totalDuration: parseInt(stats.total_duration) || 0
    });
  } catch (error) {
    console.error('Update course statistics error:', error);
    // Don't throw error, just log it
  }
};

courseController.getVideoDownloadUrl = async function(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;

      const videoDownloadService = require('../services/videoDownloadService');
      const result = await videoDownloadService.generateDownloadUrl(
        parseInt(lessonId),
        userId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get video download URL error:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('Access denied') || error.message.includes('not permitted')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate download URL'
      });
    }
};

// Upload course cover image
courseController.uploadCourseImage = async function(req, res) {
  try {
    console.log('Upload course image request:', {
      courseId: req.params.courseId,
      hasFile: !!req.file,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    const { courseId } = req.params;

    if (!req.file) {
      console.log('No file provided in request');
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      console.log('Invalid file type:', req.file.mimetype);
      return res.status(400).json({
        success: false,
        message: 'File must be an image'
      });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      console.log('File too large:', req.file.size);
      return res.status(400).json({
        success: false,
        message: 'Image file size must be less than 5MB'
      });
    }

    let imageUrl;

    console.log('Attempting to upload image...');

    try {
      // Try to upload to cloud storage first
      console.log('Trying cloud storage upload...');
      const cloudStorageService = require('../services/cloudStorageService');
      imageUrl = await cloudStorageService.uploadCourseImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        courseId
      );
      console.log('Cloud storage upload successful:', imageUrl);
    } catch (cloudError) {
      console.warn('Cloud storage upload failed, falling back to local storage:', cloudError.message);
      console.log('Attempting local storage fallback...');

      // Fallback to local storage (similar to profile images)
      const fs = require('fs').promises;
      const path = require('path');
      const crypto = require('crypto');

      try {
        // Generate unique filename
        const fileExtension = path.extname(req.file.originalname) || '.jpg';
        const uniqueFilename = `course_${courseId}_${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
        const uploadDir = path.join(__dirname, '../uploads/courses');
        const filePath = path.join(uploadDir, uniqueFilename);

        console.log('Local upload path:', { uploadDir, filePath });

        // Ensure upload directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        // Write file
        await fs.writeFile(filePath, req.file.buffer);

        // Generate URL (similar to profile images)
        const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        imageUrl = `${baseUrl}/uploads/courses/${uniqueFilename}`;

        console.log('Local storage upload successful:', imageUrl);
      } catch (localError) {
        console.error('Local storage upload also failed:', localError);
        throw localError;
      }
    }

    console.log('Updating course in database:', { courseId, imageUrl });

    // Update course with new image URL
    const updateResult = await db('courses')
      .where({ id: courseId })
      .update({
        cover_image: imageUrl,
        updated_at: new Date()
      });

    console.log('Database update result:', updateResult);

    console.log('Upload process completed successfully');

    res.json({
      success: true,
      message: 'Course cover image uploaded successfully',
      data: {
        imageUrl
      }
    });

  } catch (error) {
    console.error('Course image upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload course image'
    });
  }
};

module.exports = courseController;
