const db = require('../config/database');

const courseController = {
  // Get all courses for the logged-in teacher with statistics
  async getUserCourses(req, res) {
    try {
      const userId = req.user.id;
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

      if (userRole === 'student') {
        coursesQuery = coursesQuery
          .join('user_course_enrollments as uce', 'c.id', 'uce.course_id')
          .where('uce.user_id', userId);
      } else if (userRole === 'teacher') {
        coursesQuery = coursesQuery.where('c.created_by', userId);
      } else if (userRole === 'chapter_admin' || userRole === 'platform_admin') {
        // Admins can see all courses, no additional where clause needed
      }

      const courses = await coursesQuery;

      res.json({
        success: true,
        data: { courses }
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
      const teacherId = req.user.id;
      const { title, description, category } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Course title is required'
        });
      }

      const courseIdResult = await db('courses').insert({
        title,
        description,
        category,
        created_by: teacherId,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');
      const courseId = courseIdResult[0].id;

      const course = await db('courses').where({ id: courseId }).first();

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
      const teacherId = req.user.id;
      const { courseId } = req.params;
      const { title, description, order } = req.body;

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

      const lessonIdResult = await db('lessons').insert({
        title,
        description,
        order: order || 0,
        course_id: courseId,
        duration: 0, // Set default duration to 0
        created_by: teacherId,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');
      const lessonId = lessonIdResult[0].id;

      const lesson = await db('lessons').where({ id: lessonId }).first();

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
      const userId = req.user.id;
      const userRole = req.user.role;

      // Get lesson with course info
      const lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .leftJoin('videos as v', 'l.video_id', 'v.id')
        .where('l.id', lessonId)
        .select('l.*', 'c.created_by as course_teacher', 'v.s3_key', 'c.id as course_id')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
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
      } else if (userRole === 'chapter_admin' || userRole === 'platform_admin') {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this lesson'
        });
      }

      // Generate fresh signed URL
      const cloudStorageService = require('../services/cloudStorageService');
      
      if (!lesson.s3_key) {
        return res.status(404).json({
          success: false,
          message: 'Video not available for this lesson'
        });
      }

      const signedUrl = await cloudStorageService.getSignedStreamUrl(lesson.s3_key, 3600); // 1 hour expiry

      res.json({
        success: true,
        data: {
          videoUrl: signedUrl,
          expiresIn: 3600
        }
      });

    } catch (error) {
      console.error('Get signed video URL error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get video URL'
      });
    }
  }
};

module.exports = courseController;