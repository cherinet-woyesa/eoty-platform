const db = require('../config/database');

const teacherController = {
  async getDashboard(req, res) {
    try {
      const teacherId = String(req.user.userId);
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

  // Get all students enrolled in teacher's courses
  async getStudents(req, res) {
    try {
      const teacherId = String(req.user.userId); // Ensure it's a string since user_id is text
      const { search, status, courseId, page = 1, limit = 50 } = req.query;

      console.log(`[Teacher Students] Fetching students for teacher ID: ${teacherId}`);

      // First, verify teacher has courses
      const teacherCourses = await db('courses')
        .where('created_by', teacherId)
        .select('id', 'title');
      
      console.log(`[Teacher Students] Teacher has ${teacherCourses.length} courses`);

      if (teacherCourses.length === 0) {
        return res.json({
          success: true,
          data: {
            students: [],
            pagination: {
              page: parseInt(page, 10),
              limit: parseInt(limit, 10),
              total: 0,
              totalPages: 0
            }
          }
        });
      }

      // Base query: Get all students enrolled in teacher's courses
      // Join through lessons to get progress (user_lesson_progress has lesson_id, not course_id)
      let query = db('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .join('users as u', 'uce.user_id', 'u.id')
        .leftJoin('lessons as l', 'l.course_id', 'c.id')
        .leftJoin('user_lesson_progress as ulp', function() {
          this.on('ulp.user_id', '=', 'u.id')
            .andOn('ulp.lesson_id', '=', 'l.id');
        })
        .where('c.created_by', teacherId)
        .whereIn('u.role', ['user', 'student'])
        .groupBy('u.id', 'u.first_name', 'u.last_name', 'u.email', 'u.is_active', 'u.last_login_at', 'u.profile_picture')
        .select(
          'u.id',
          'u.first_name',
          'u.last_name',
          'u.email',
          'u.is_active',
          'u.last_login_at',
          'u.profile_picture',
          db.raw('COUNT(DISTINCT uce.course_id) as enrolled_courses'),
          db.raw('COALESCE(AVG(ulp.progress), 0) as avg_progress'),
          db.raw('MAX(ulp.updated_at) as last_progress_at')
        );

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('u.first_name', 'ilike', `%${search}%`)
            .orWhere('u.last_name', 'ilike', `%${search}%`)
            .orWhere('u.email', 'ilike', `%${search}%`);
        });
      }

      if (status === 'active') {
        query = query.where('u.is_active', true);
      } else if (status === 'inactive') {
        query = query.where('u.is_active', false);
      }

      if (courseId) {
        query = query.where('uce.course_id', courseId);
      }

      // Get total count for pagination - need to count distinct users
      let countQuery = db('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .join('users as u', 'uce.user_id', 'u.id')
        .where('c.created_by', teacherId)
        .whereIn('u.role', ['user', 'student']);

      // Apply same filters to count query
      if (search) {
        countQuery = countQuery.where(function() {
          this.where('u.first_name', 'ilike', `%${search}%`)
            .orWhere('u.last_name', 'ilike', `%${search}%`)
            .orWhere('u.email', 'ilike', `%${search}%`);
        });
      }

      if (status === 'active') {
        countQuery = countQuery.where('u.is_active', true);
      } else if (status === 'inactive') {
        countQuery = countQuery.where('u.is_active', false);
      }

      if (courseId) {
        countQuery = countQuery.where('uce.course_id', courseId);
      }

      const totalResult = await countQuery.countDistinct('u.id as total').first();
      const total = parseInt(totalResult.total, 10);

      // Apply pagination
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      query = query.limit(parseInt(limit, 10)).offset(offset);

      // Order by last active
      query = query.orderBy('u.last_login_at', 'desc');

      const students = await query;

      console.log(`[Teacher Students] Found ${students.length} students`);

      // Format response
      const formattedStudents = students.map(student => ({
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email,
        isActive: student.is_active,
        lastActiveAt: student.last_login_at,
        profilePicture: student.profile_picture,
        enrolledCourses: parseInt(student.enrolled_courses, 10),
        avgProgress: Math.round(parseFloat(student.avg_progress) || 0),
        lastProgressAt: student.last_progress_at
      }));

      res.json({
        success: true,
        data: {
          students: formattedStudents,
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            totalPages: Math.ceil(total / parseInt(limit, 10))
          }
        }
      });
    } catch (error) {
      console.error('Get teacher students error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch students',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get student details with progress
  async getStudentDetails(req, res) {
    try {
      const teacherId = String(req.user.userId);
      const { studentId } = req.params;

      // Verify student is enrolled in teacher's courses
      const enrollmentCheck = await db('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .where('uce.user_id', studentId)
        .first();

      if (!enrollmentCheck) {
        return res.status(404).json({
          success: false,
          message: 'Student not found or not enrolled in your courses'
        });
      }

      // Get student info
      const student = await db('users')
        .where('id', studentId)
        .whereIn('role', ['user', 'student'])
        .select('id', 'first_name', 'last_name', 'email', 'is_active', 'last_login_at', 'profile_picture', 'bio', 'created_at')
        .first();

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Get enrolled courses with progress
      // Join through lessons to get progress (user_lesson_progress has lesson_id, not course_id)
      const courses = await db('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .leftJoin('lessons as l', 'l.course_id', 'c.id')
        .leftJoin('user_lesson_progress as ulp', function() {
          this.on('ulp.user_id', '=', 'uce.user_id')
            .andOn('ulp.lesson_id', '=', 'l.id');
        })
        .where('c.created_by', teacherId)
        .where('uce.user_id', studentId)
        .groupBy('c.id', 'c.title', 'c.description', 'c.cover_image', 'uce.enrolled_at', 'uce.enrollment_status')
        .select(
          'c.id',
          'c.title',
          'c.description',
          'c.cover_image',
          'uce.enrolled_at',
          'uce.enrollment_status',
          db.raw('COALESCE(AVG(ulp.progress), 0) as progress'),
          db.raw('COUNT(DISTINCT CASE WHEN ulp.is_completed = true THEN ulp.lesson_id END) as completed_lessons')
        )
        .orderBy('uce.enrolled_at', 'desc');

      // Get overall statistics
      // Join through lessons to get progress
      const stats = await db('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .leftJoin('lessons as l', 'l.course_id', 'c.id')
        .leftJoin('user_lesson_progress as ulp', function() {
          this.on('ulp.user_id', '=', 'uce.user_id')
            .andOn('ulp.lesson_id', '=', 'l.id');
        })
        .where('c.created_by', teacherId)
        .where('uce.user_id', studentId)
        .select(
          db.raw('COUNT(DISTINCT uce.course_id) as total_courses'),
          db.raw('COALESCE(AVG(ulp.progress), 0) as avg_progress'),
          db.raw('COUNT(DISTINCT CASE WHEN ulp.is_completed = true THEN ulp.lesson_id END) as completed_lessons')
        )
        .first();

      res.json({
        success: true,
        data: {
          student: {
            id: student.id,
            firstName: student.first_name,
            lastName: student.last_name,
            email: student.email,
            isActive: student.is_active,
            lastActiveAt: student.last_login_at,
            profilePicture: student.profile_picture,
            bio: student.bio,
            joinedAt: student.created_at
          },
          courses: courses.map(course => ({
            id: course.id,
            title: course.title,
            description: course.description,
            coverImage: course.cover_image,
            enrolledAt: course.enrolled_at,
            enrollmentStatus: course.enrollment_status,
            progress: Math.round(parseFloat(course.progress) || 0),
            completedLessons: parseInt(course.completed_lessons, 10)
          })),
          stats: {
            totalCourses: parseInt(stats.total_courses, 10),
            avgProgress: Math.round(parseFloat(stats.avg_progress) || 0),
            completedLessons: parseInt(stats.completed_lessons, 10)
          }
        }
      });
    } catch (error) {
      console.error('Get student details error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch student details' });
    }
  },
};

module.exports = teacherController;