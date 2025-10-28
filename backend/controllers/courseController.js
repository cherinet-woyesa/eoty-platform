const db = require('../config/database');

const courseController = {
  // Get all courses for the logged-in teacher with statistics
  async getTeacherCourses(req, res) {
    try {
      const teacherId = req.user.userId;
      
      // Get courses with lesson counts and student counts
      const courses = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_lesson_progress as ulp', 'l.id', 'ulp.lesson_id')
        .where({ 'c.created_by': teacherId })
        .groupBy('c.id')
        .select(
          'c.*',
          db.raw('COUNT(DISTINCT l.id) as lesson_count'),
          db.raw('COUNT(DISTINCT ulp.user_id) as student_count'),
          db.raw('SUM(l.duration) as total_duration')
        )
        .orderBy('c.created_at', 'desc');

      res.json({
        success: true,
        data: { courses }
      });
    } catch (error) {
      console.error('Get courses error:', error);
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
      const teacherId = req.user.userId;
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
        order_number: order || 0,
        course_id: courseId,
        duration: 0, // Set default duration to 0
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
  }
};

module.exports = courseController;