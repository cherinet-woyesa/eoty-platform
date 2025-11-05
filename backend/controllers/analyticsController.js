const db = require('../config/database');
const analyticsCache = require('../utils/analyticsCache');

/**
 * Analytics Controller
 * Handles student analytics and engagement metrics for courses
 */
const analyticsController = {
  /**
   * GET /api/courses/:courseId/students
   * Get list of enrolled students with basic progress info
   */
  async getEnrolledStudents(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;
      const { page = 1, pageSize = 20, search = '', sortBy = 'enrolled_at', sortOrder = 'desc' } = req.query;

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
        userRole === 'chapter_admin' ||
        userRole === 'platform_admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view students for this course'
        });
      }

      // Build query for enrolled students
      let studentsQuery = db('user_course_enrollments as uce')
        .join('users as u', 'uce.user_id', 'u.id')
        .where('uce.course_id', courseId)
        .select(
          'u.id as user_id',
          'u.first_name',
          'u.last_name',
          'u.email',
          'u.profile_picture',
          'uce.enrollment_status',
          'uce.enrolled_at',
          'uce.completed_at',
          'uce.progress_percentage',
          'uce.last_accessed_at'
        );

      // Apply search filter
      if (search) {
        studentsQuery = studentsQuery.where(function() {
          this.where('u.first_name', 'ilike', `%${search}%`)
            .orWhere('u.last_name', 'ilike', `%${search}%`)
            .orWhere('u.email', 'ilike', `%${search}%`);
        });
      }

      // Get total count for pagination
      const countQuery = studentsQuery.clone().clearSelect().count('* as count');
      const totalResult = await countQuery.first();
      const totalStudents = parseInt(totalResult.count) || 0;

      // Apply sorting
      const validSortColumns = ['enrolled_at', 'progress_percentage', 'last_accessed_at', 'first_name'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'enrolled_at';
      const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
      
      if (sortColumn === 'first_name') {
        studentsQuery = studentsQuery.orderBy('u.first_name', order).orderBy('u.last_name', order);
      } else if (sortColumn === 'enrolled_at' || sortColumn === 'last_accessed_at') {
        studentsQuery = studentsQuery.orderBy(`uce.${sortColumn}`, order);
      } else {
        studentsQuery = studentsQuery.orderBy(`uce.${sortColumn}`, order);
      }

      // Apply pagination
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      studentsQuery = studentsQuery.limit(parseInt(pageSize)).offset(offset);

      const students = await studentsQuery;

      // Get lesson completion details for each student
      const studentIds = students.map(s => s.user_id);
      
      if (studentIds.length > 0) {
        const lessonProgress = await db('user_lesson_progress as ulp')
          .join('lessons as l', 'ulp.lesson_id', 'l.id')
          .where('l.course_id', courseId)
          .whereIn('ulp.user_id', studentIds)
          .select(
            'ulp.user_id',
            db.raw('COUNT(*) as lessons_accessed'),
            db.raw('COUNT(CASE WHEN ulp.is_completed = TRUE THEN 1 END) as lessons_completed'),
            db.raw('SUM(ulp.time_spent) as total_time_spent')
          )
          .groupBy('ulp.user_id');

        // Map progress data to students
        const progressMap = {};
        lessonProgress.forEach(p => {
          progressMap[p.user_id] = {
            lessonsAccessed: parseInt(p.lessons_accessed) || 0,
            lessonsCompleted: parseInt(p.lessons_completed) || 0,
            totalTimeSpent: parseInt(p.total_time_spent) || 0
          };
        });

        students.forEach(student => {
          const progress = progressMap[student.user_id] || {
            lessonsAccessed: 0,
            lessonsCompleted: 0,
            totalTimeSpent: 0
          };
          student.lessonsAccessed = progress.lessonsAccessed;
          student.lessonsCompleted = progress.lessonsCompleted;
          student.totalTimeSpent = progress.totalTimeSpent;
        });
      }

      res.json({
        success: true,
        data: {
          students,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalItems: totalStudents,
            totalPages: Math.ceil(totalStudents / parseInt(pageSize))
          }
        }
      });
    } catch (error) {
      console.error('Get enrolled students error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch enrolled students'
      });
    }
  },

  /**
   * GET /api/courses/:courseId/students/:studentId/progress
   * Get detailed progress for a specific student in a course
   */
  async getStudentProgress(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId, studentId } = req.params;

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
        userRole === 'chapter_admin' ||
        userRole === 'platform_admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view student progress for this course'
        });
      }

      // Check if student is enrolled
      const enrollment = await db('user_course_enrollments as uce')
        .join('users as u', 'uce.user_id', 'u.id')
        .where({
          'uce.user_id': studentId,
          'uce.course_id': courseId
        })
        .select(
          'u.id as user_id',
          'u.first_name',
          'u.last_name',
          'u.email',
          'u.profile_picture',
          'uce.enrollment_status',
          'uce.enrolled_at',
          'uce.completed_at',
          'uce.progress_percentage',
          'uce.last_accessed_at'
        )
        .first();

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Student is not enrolled in this course'
        });
      }

      // Get lesson-by-lesson progress
      const lessonProgress = await db('lessons as l')
        .leftJoin('user_lesson_progress as ulp', function() {
          this.on('l.id', '=', 'ulp.lesson_id')
            .andOn('ulp.user_id', '=', db.raw('?', [studentId]));
        })
        .where('l.course_id', courseId)
        .orderBy('l.order', 'asc')
        .select(
          'l.id as lesson_id',
          'l.title',
          'l.order',
          'l.duration',
          'ulp.progress',
          'ulp.is_completed',
          'ulp.completed_at',
          'ulp.last_accessed_at',
          'ulp.time_spent',
          'ulp.view_count',
          'ulp.last_watched_timestamp'
        );

      // Get quiz scores if any
      const quizScores = await db('quiz_sessions as qs')
        .join('quizzes as q', 'qs.quiz_id', 'q.id')
        .join('lessons as l', 'q.lesson_id', 'l.id')
        .where({
          'qs.user_id': studentId,
          'l.course_id': courseId
        })
        .select(
          'l.id as lesson_id',
          'q.id as quiz_id',
          'q.title as quiz_title',
          'qs.score_percentage',
          'qs.is_completed',
          'qs.started_at',
          'qs.completed_at',
          'qs.attempt_number'
        )
        .orderBy('qs.started_at', 'desc');

      // Calculate summary statistics
      const totalLessons = lessonProgress.length;
      const completedLessons = lessonProgress.filter(l => l.is_completed).length;
      const totalTimeSpent = lessonProgress.reduce((sum, l) => sum + (parseInt(l.time_spent) || 0), 0);
      const averageProgress = lessonProgress.reduce((sum, l) => sum + (parseFloat(l.progress) || 0), 0) / totalLessons;

      // Get engagement timeline (last 30 days)
      const engagementTimeline = await db('user_lesson_progress as ulp')
        .join('lessons as l', 'ulp.lesson_id', 'l.id')
        .where({
          'ulp.user_id': studentId,
          'l.course_id': courseId
        })
        .where('ulp.last_accessed_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
        .select(
          db.raw("DATE_TRUNC('day', ulp.last_accessed_at)::date as date"),
          db.raw('COUNT(DISTINCT ulp.lesson_id) as lessons_accessed'),
          db.raw('SUM(ulp.time_spent) as time_spent')
        )
        .groupBy(db.raw("DATE_TRUNC('day', ulp.last_accessed_at)::date"))
        .orderBy('date', 'asc');

      res.json({
        success: true,
        data: {
          student: enrollment,
          summary: {
            totalLessons,
            completedLessons,
            completionRate: totalLessons > 0 ? ((completedLessons / totalLessons) * 100).toFixed(2) : 0,
            totalTimeSpent,
            averageProgress: (averageProgress * 100).toFixed(2)
          },
          lessonProgress,
          quizScores,
          engagementTimeline
        }
      });
    } catch (error) {
      console.error('Get student progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student progress'
      });
    }
  },

  /**
   * GET /api/courses/:courseId/analytics/engagement
   * Get time-series engagement data for a course
   */
  async getEngagementAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;
      const { startDate, endDate, granularity = 'daily' } = req.query;

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
        userRole === 'chapter_admin' ||
        userRole === 'platform_admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view analytics for this course'
        });
      }

      // Set default date range (last 30 days if not provided)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Check cache first
      const cacheKey = analyticsCache.generateKey('engagement', {
        courseId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        granularity
      });

      const cachedData = analyticsCache.get(cacheKey);
      if (cachedData) {
        return res.json({
          success: true,
          data: cachedData,
          cached: true
        });
      }

      // Determine date grouping based on granularity
      let dateGroupSelect;
      let dateGroupBy;
      switch (granularity) {
        case 'hourly':
          dateGroupSelect = db.raw("DATE_TRUNC('hour', ulp.last_accessed_at) as date");
          dateGroupBy = db.raw("DATE_TRUNC('hour', ulp.last_accessed_at)");
          break;
        case 'weekly':
          dateGroupSelect = db.raw("DATE_TRUNC('week', ulp.last_accessed_at) as date");
          dateGroupBy = db.raw("DATE_TRUNC('week', ulp.last_accessed_at)");
          break;
        case 'monthly':
          dateGroupSelect = db.raw("DATE_TRUNC('month', ulp.last_accessed_at) as date");
          dateGroupBy = db.raw("DATE_TRUNC('month', ulp.last_accessed_at)");
          break;
        default: // daily
          dateGroupSelect = db.raw("DATE_TRUNC('day', ulp.last_accessed_at) as date");
          dateGroupBy = db.raw("DATE_TRUNC('day', ulp.last_accessed_at)");
      }

      // Daily active students
      const dailyActiveStudents = await db('user_lesson_progress as ulp')
        .join('lessons as l', 'ulp.lesson_id', 'l.id')
        .where('l.course_id', courseId)
        .whereBetween('ulp.last_accessed_at', [start, end])
        .select(
          dateGroupSelect,
          db.raw('COUNT(DISTINCT ulp.user_id) as active_students'),
          db.raw('COUNT(DISTINCT ulp.lesson_id) as lessons_accessed'),
          db.raw('SUM(ulp.time_spent) as total_time_spent'),
          db.raw('COUNT(CASE WHEN ulp.is_completed = TRUE THEN 1 END) as lessons_completed')
        )
        .groupBy(dateGroupBy)
        .orderBy('date', 'asc');

      // Lesson completion rates
      const lessonCompletionRates = await db('lessons as l')
        .leftJoin('user_lesson_progress as ulp', 'l.id', 'ulp.lesson_id')
        .where('l.course_id', courseId)
        .groupBy('l.id', 'l.title', 'l.order')
        .select(
          'l.id as lesson_id',
          'l.title',
          'l.order',
          db.raw('COUNT(DISTINCT ulp.user_id) as total_views'),
          db.raw('COUNT(DISTINCT CASE WHEN ulp.is_completed = TRUE THEN ulp.user_id END) as completions'),
          db.raw('AVG(ulp.progress) as average_progress'),
          db.raw('AVG(ulp.time_spent) as average_time_spent')
        )
        .orderBy('l.order', 'asc');

      // Calculate completion rate and drop-off points
      const lessonStats = lessonCompletionRates.map((lesson, index) => {
        const totalViews = parseInt(lesson.total_views) || 0;
        const completions = parseInt(lesson.completions) || 0;
        const completionRate = totalViews > 0 ? ((completions / totalViews) * 100).toFixed(2) : 0;
        
        // Identify drop-off: if completion rate drops significantly from previous lesson
        let isDropOffPoint = false;
        if (index > 0) {
          const prevLesson = lessonCompletionRates[index - 1];
          const prevViews = parseInt(prevLesson.total_views) || 0;
          const viewDropRate = prevViews > 0 ? ((prevViews - totalViews) / prevViews) * 100 : 0;
          isDropOffPoint = viewDropRate > 30; // More than 30% drop in views
        }

        return {
          lessonId: lesson.lesson_id,
          title: lesson.title,
          order: lesson.order,
          totalViews,
          completions,
          completionRate: parseFloat(completionRate),
          averageProgress: parseFloat(lesson.average_progress) || 0,
          averageTimeSpent: parseInt(lesson.average_time_spent) || 0,
          isDropOffPoint
        };
      });

      // Enrollment trend over time
      const enrollmentTrend = await db('user_course_enrollments')
        .where('course_id', courseId)
        .whereBetween('enrolled_at', [start, end])
        .select(
          db.raw("DATE_TRUNC('day', enrolled_at)::date as date"),
          db.raw('COUNT(*) as new_enrollments')
        )
        .groupBy(db.raw("DATE_TRUNC('day', enrolled_at)::date"))
        .orderBy('date', 'asc');

      // Time of day heatmap (when students are most active)
      const timeOfDayActivity = await db('user_lesson_progress as ulp')
        .join('lessons as l', 'ulp.lesson_id', 'l.id')
        .where('l.course_id', courseId)
        .whereBetween('ulp.last_accessed_at', [start, end])
        .select(
          db.raw("EXTRACT(HOUR FROM ulp.last_accessed_at) as hour"),
          db.raw("EXTRACT(DOW FROM ulp.last_accessed_at) as day_of_week"),
          db.raw('COUNT(*) as activity_count')
        )
        .groupBy(db.raw("EXTRACT(HOUR FROM ulp.last_accessed_at), EXTRACT(DOW FROM ulp.last_accessed_at)"))
        .orderBy('hour', 'asc');

      // Average watch time per lesson
      const watchTimeByLesson = await db('lessons as l')
        .leftJoin('user_lesson_progress as ulp', 'l.id', 'ulp.lesson_id')
        .where('l.course_id', courseId)
        .groupBy('l.id', 'l.title', 'l.duration')
        .select(
          'l.id as lesson_id',
          'l.title',
          'l.duration as lesson_duration',
          db.raw('AVG(ulp.time_spent) as average_watch_time'),
          db.raw('COUNT(DISTINCT ulp.user_id) as unique_viewers')
        )
        .orderBy('l.order', 'asc');

      const responseData = {
        courseId: parseInt(courseId),
        dateRange: {
          start,
          end,
          granularity
        },
        dailyActiveStudents,
        lessonStats,
        dropOffPoints: lessonStats.filter(l => l.isDropOffPoint),
        enrollmentTrend,
        timeOfDayActivity,
        watchTimeByLesson
      };

      // Cache the results for 5 minutes
      analyticsCache.set(cacheKey, responseData, 5 * 60 * 1000);

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('Get engagement analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch engagement analytics'
      });
    }
  },

  /**
   * GET /api/courses/:courseId/analytics/export
   * Export analytics data as CSV or PDF
   */
  async exportAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { courseId } = req.params;
      const { format = 'csv', reportType = 'summary' } = req.query;

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
        userRole === 'chapter_admin' ||
        userRole === 'platform_admin';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to export analytics for this course'
        });
      }

      // Gather data based on report type
      let data;
      let filename;

      if (reportType === 'students') {
        // Export student list with progress
        data = await db('user_course_enrollments as uce')
          .join('users as u', 'uce.user_id', 'u.id')
          .leftJoin(
            db('user_lesson_progress as ulp')
              .join('lessons as l', 'ulp.lesson_id', 'l.id')
              .where('l.course_id', courseId)
              .select(
                'ulp.user_id',
                db.raw('COUNT(*) as lessons_accessed'),
                db.raw('COUNT(CASE WHEN ulp.is_completed = TRUE THEN 1 END) as lessons_completed'),
                db.raw('SUM(ulp.time_spent) as total_time_spent')
              )
              .groupBy('ulp.user_id')
              .as('progress'),
            'uce.user_id',
            'progress.user_id'
          )
          .where('uce.course_id', courseId)
          .select(
            'u.first_name',
            'u.last_name',
            'u.email',
            'uce.enrollment_status',
            'uce.enrolled_at',
            'uce.progress_percentage',
            'uce.last_accessed_at',
            'progress.lessons_accessed',
            'progress.lessons_completed',
            'progress.total_time_spent'
          )
          .orderBy('u.last_name', 'asc');

        filename = `${course.title.replace(/[^a-z0-9]/gi, '_')}_students_${Date.now()}`;
      } else {
        // Export summary analytics
        const lessonStats = await db('lessons as l')
          .leftJoin('user_lesson_progress as ulp', 'l.id', 'ulp.lesson_id')
          .where('l.course_id', courseId)
          .groupBy('l.id', 'l.title', 'l.order')
          .select(
            'l.title as lesson_title',
            'l.order as lesson_order',
            db.raw('COUNT(DISTINCT ulp.user_id) as total_views'),
            db.raw('COUNT(DISTINCT CASE WHEN ulp.is_completed = TRUE THEN ulp.user_id END) as completions'),
            db.raw('AVG(ulp.progress) * 100 as average_progress_percentage'),
            db.raw('AVG(ulp.time_spent) as average_time_spent_seconds')
          )
          .orderBy('l.order', 'asc');

        data = lessonStats;
        filename = `${course.title.replace(/[^a-z0-9]/gi, '_')}_analytics_${Date.now()}`;
      }

      if (format === 'csv') {
        // Generate CSV
        const csv = convertToCSV(data);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);
      } else if (format === 'json') {
        // Return JSON for client-side PDF generation
        res.json({
          success: true,
          data: {
            courseTitle: course.title,
            courseId: parseInt(courseId),
            reportType,
            generatedAt: new Date(),
            records: data
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid format. Supported formats: csv, json'
        });
      }
    } catch (error) {
      console.error('Export analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export analytics'
      });
    }
  }
};

/**
 * Helper function to convert data array to CSV format
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  const csvHeaders = headers.join(',');
  
  // Create CSV data rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      // Handle dates
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // Handle strings with commas or quotes
      if (typeof value === 'string') {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }
      
      // Handle numbers and booleans
      return value.toString();
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

module.exports = analyticsController;
