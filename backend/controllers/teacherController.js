const db = require('../config/database');

const teacherController = {
  async getDashboard(req, res) {
    try {
      const teacherId = req.user.userId;
      console.log(`Fetching dashboard data for teacher ID: ${teacherId}`);

      // Start timing for performance monitoring
      const startTime = Date.now();

      // Total courses created by the teacher
      const totalCoursesResult = await db('courses').where('created_by', teacherId).count('id as count').first();
      const totalCourses = parseInt(totalCoursesResult.count, 10);

      // Total unique students enrolled in the teacher's courses
      const totalStudentsResult = await db('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .countDistinct('uce.user_id as count').first();
      const totalStudentsEnrolled = parseInt(totalStudentsResult.count, 10);

      // Total lessons across all courses created by the teacher
      const totalLessonsResult = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .count('l.id as count').first();
      const totalLessons = parseInt(totalLessonsResult.count, 10);

      // Average completion rate of lessons across all students in the teacher's courses
      const averageCompletionRateResult = await db('user_lesson_progress as ulp')
        .join('lessons as l', 'ulp.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .avg('ulp.progress as average').first();
      const averageCompletionRate = averageCompletionRateResult.average ? Math.round(parseFloat(averageCompletionRateResult.average)) : 0;

      // Calculate execution time
      const executionTime = Date.now() - startTime;
      console.log(`Dashboard data fetched in ${executionTime}ms for teacher ID: ${teacherId}`);

      res.json({
        success: true,
        data: {
          totalCourses,
          totalStudentsEnrolled,
          totalLessons,
          averageCompletionRate,
          teacherId,
        },
      });
    } catch (error) {
      console.error('Get teacher dashboard error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch teacher dashboard data' });
    }
  },
};

module.exports = teacherController;