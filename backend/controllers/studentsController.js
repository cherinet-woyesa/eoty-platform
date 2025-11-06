const db = require('../config/database');

const studentsController = {
  // List students associated with the teacher's courses, with filters and sorting
  async listStudents(req, res) {
    try {
      const teacherId = req.user.userId;
      const { q = '', status = 'all', sort = 'last_active_at', order = 'desc' } = req.query;

      // Base set: users who have progress on lessons from courses created by teacher
      // Aggregations: enrolled_courses, avg progress, last_active_at
      let query = db('users as u')
        .join('user_lesson_progress as ulp', 'u.id', 'ulp.user_id')
        .join('lessons as l', 'ulp.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .groupBy('u.id')
        .select(
          'u.id',
          'u.first_name',
          'u.last_name',
          'u.email',
          db.raw('COUNT(DISTINCT c.id) as enrolled_courses'),
          db.raw('ROUND(AVG(ulp.progress)::numeric, 0) as progress_percent'),
          db.raw('MAX(ulp.last_accessed_at) as last_active_at')
        );

      if (q) {
        const like = `%${q.toLowerCase()}%`;
        query = query.andWhere(function () {
          this.whereRaw('LOWER(u.first_name) LIKE ?', [like])
            .orWhereRaw('LOWER(u.last_name) LIKE ?', [like])
            .orWhereRaw('LOWER(u.email) LIKE ?', [like]);
        });
      }

      // Derive status on the fly
      // active: last_active_at within 30 days, invited: no progress yet (handled differently), inactive: older than 30 days
      // Since this dataset is from ulp, "invited" won't appear here. We'll map active/inactive after fetch.

      // Sorting
      const sortMap = {
        name: db.raw("LOWER(CONCAT(u.first_name,' ',u.last_name))"),
        last_active_at: db.raw('MAX(ulp.last_accessed_at)'),
        progress_percent: db.raw('AVG(ulp.progress)')
      };
      const sortCol = sortMap[sort] || sortMap.last_active_at;
      query = query.orderBy(sortCol, order.toLowerCase() === 'asc' ? 'asc' : 'desc');

      const rows = await query;

      const now = Date.now();
      const withStatus = rows.map(r => {
        const lastActive = r.last_active_at ? new Date(r.last_active_at).getTime() : 0;
        const days = lastActive ? (now - lastActive) / (1000 * 60 * 60 * 24) : Infinity;
        const derived = days <= 30 ? 'active' : 'inactive';
        return { ...r, status: derived };
      });

      const filtered = status === 'all' ? withStatus : withStatus.filter(s => s.status === status);

      res.json({ success: true, data: { students: filtered } });
    } catch (error) {
      console.error('List students error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch students' });
    }
  }
  ,
  async getStudentDashboard(req, res) {
    try {
      const studentId = req.user.userId;
      console.log('Fetching dashboard for student:', studentId);

      // Get enrolled courses count
      let totalCourses = 0;
      try {
        const enrolledCoursesResult = await db('user_course_enrollments')
          .where('user_id', studentId)
          .count('id as count')
          .first();
        totalCourses = parseInt(enrolledCoursesResult?.count, 10) || 0;
      } catch (err) {
        console.warn('Error fetching enrolled courses:', err.message);
      }

      // Get completed courses count
      let completedCourses = 0;
      try {
        const completedCoursesResult = await db('user_course_enrollments')
          .where('user_id', studentId)
          .where('enrollment_status', 'completed')
          .count('id as count')
          .first();
        completedCourses = parseInt(completedCoursesResult?.count, 10) || 0;
      } catch (err) {
        console.warn('Error fetching completed courses:', err.message);
      }

      // Get total lessons from enrolled courses
      let totalLessons = 0;
      try {
        const totalLessonsResult = await db('lessons as l')
          .join('user_course_enrollments as uce', 'l.course_id', 'uce.course_id')
          .where('uce.user_id', studentId)
          .count('l.id as count')
          .first();
        totalLessons = parseInt(totalLessonsResult?.count, 10) || 0;
      } catch (err) {
        console.warn('Error fetching total lessons:', err.message);
      }

      // Get completed lessons count
      let completedLessons = 0;
      try {
        const completedLessonsResult = await db('user_lesson_progress')
          .where('user_id', studentId)
          .where(function() {
            this.where('progress', 100).orWhere('is_completed', true);
          })
          .count('id as count')
          .first();
        completedLessons = parseInt(completedLessonsResult?.count, 10) || 0;
      } catch (err) {
        console.warn('Error fetching completed lessons:', err.message);
      }

      // Calculate study streak (consecutive days with activity)
      let studyStreak = 0;
      try {
        const recentActivity = await db('user_lesson_progress')
          .where('user_id', studentId)
          .whereRaw('last_accessed_at >= NOW() - INTERVAL \'30 days\'')
          .select(db.raw('DATE(last_accessed_at) as activity_date'))
          .groupBy(db.raw('DATE(last_accessed_at)'))
          .orderBy('activity_date', 'desc');

        if (recentActivity.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          let currentDate = new Date(today);
          
          for (const activity of recentActivity) {
            const activityDate = new Date(activity.activity_date);
            activityDate.setHours(0, 0, 0, 0);
            
            if (activityDate.getTime() === currentDate.getTime()) {
              studyStreak++;
              currentDate.setDate(currentDate.getDate() - 1);
            } else {
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Error calculating study streak:', err.message);
        studyStreak = 0;
      }

      // Get total points (you can implement a points system later)
      const totalPoints = completedLessons * 50; // 50 points per completed lesson

      // Get enrolled courses with progress
      let coursesWithProgress = [];
      try {
        const enrolledCourses = await db('courses as c')
          .join('user_course_enrollments as uce', 'c.id', 'uce.course_id')
          .where('uce.user_id', studentId)
          .select(
            'c.id',
            'c.title',
            'c.description',
            'c.cover_image',
            'uce.enrollment_status'
          )
          .limit(10);

        // Get lesson counts and progress for each course
        coursesWithProgress = await Promise.all(enrolledCourses.map(async (course) => {
          try {
            const totalLessonsResult = await db('lessons')
              .where('course_id', course.id)
              .count('id as count')
              .first();
            const totalLessons = parseInt(totalLessonsResult?.count, 10) || 0;

            const completedLessonsResult = await db('user_lesson_progress')
              .join('lessons', 'user_lesson_progress.lesson_id', 'lessons.id')
              .where('lessons.course_id', course.id)
              .where('user_lesson_progress.user_id', studentId)
              .where(function() {
                this.where('user_lesson_progress.is_completed', true)
                  .orWhere('user_lesson_progress.progress', 100);
              })
              .count('user_lesson_progress.id as count')
              .first();
            const completedLessons = parseInt(completedLessonsResult?.count, 10) || 0;

            const avgProgressResult = await db('user_lesson_progress')
              .join('lessons', 'user_lesson_progress.lesson_id', 'lessons.id')
              .where('lessons.course_id', course.id)
              .where('user_lesson_progress.user_id', studentId)
              .avg('user_lesson_progress.progress as average')
              .first();
            const progress = avgProgressResult?.average ? Math.round(parseFloat(avgProgressResult.average)) : 0;

            return {
              id: course.id,
              title: course.title,
              description: course.description,
              coverImage: course.cover_image,
              progress,
              totalLessons,
              completedLessons,
              status: course.enrollment_status
            };
          } catch (err) {
            console.warn(`Error fetching progress for course ${course.id}:`, err.message);
            return {
              id: course.id,
              title: course.title,
              description: course.description,
              coverImage: course.cover_image,
              progress: 0,
              totalLessons: 0,
              completedLessons: 0,
              status: course.enrollment_status
            };
          }
        }));
      } catch (err) {
        console.warn('Error fetching enrolled courses:', err.message);
      }

      // Weekly goal progress (lessons completed this week)
      let weeklyProgress = 0;
      try {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weeklyProgressResult = await db('user_lesson_progress')
          .where('user_id', studentId)
          .where('completed_at', '>=', weekStart)
          .where(function() {
            this.where('is_completed', true).orWhere('progress', 100);
          })
          .count('id as count')
          .first();
        weeklyProgress = parseInt(weeklyProgressResult?.count, 10) || 0;
      } catch (err) {
        console.warn('Error fetching weekly progress:', err.message);
      }

      res.json({
        success: true,
        data: {
          progress: {
            totalCourses,
            completedCourses,
            totalLessons,
            completedLessons,
            studyStreak,
            totalPoints,
            nextGoal: `Complete ${Math.max(1, 5 - (completedLessons % 5))} more lessons`,
            weeklyGoal: 10,
            weeklyProgress
          },
          enrolledCourses: coursesWithProgress,
          recentActivity: [],
          recommendations: []
        }
      });

    } catch (error) {
      console.error('Get student dashboard error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch student dashboard data' });
    }
  },
  async streamUpdates(req, res) {
    try {
      const teacherId = req.user.userId;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders && res.flushHeaders();

      const write = (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      const fetchStudents = async () => {
        const rows = await db('users as u')
          .join('user_lesson_progress as ulp', 'u.id', 'ulp.user_id')
          .join('lessons as l', 'ulp.lesson_id', 'l.id')
          .join('courses as c', 'l.course_id', 'c.id')
          .where('c.created_by', teacherId)
          .groupBy('u.id')
          .select(
            'u.id', 'u.first_name', 'u.last_name', 'u.email',
            db.raw('COUNT(DISTINCT c.id) as enrolled_courses'),
            db.raw('ROUND(AVG(ulp.progress)::numeric, 0) as progress_percent'),
            db.raw('MAX(ulp.last_accessed_at) as last_active_at')
          );
        const now = Date.now();
        const students = rows.map(r => {
          const lastActive = r.last_active_at ? new Date(r.last_active_at).getTime() : 0;
          const days = lastActive ? (now - lastActive) / (1000 * 60 * 60 * 24) : Infinity;
          const status = days <= 30 ? 'active' : 'inactive';
          return { ...r, status };
        });
        write({ type: 'students', students });
      };

      await fetchStudents();
      const interval = setInterval(fetchStudents, 15000);

      req.on('close', () => {
        clearInterval(interval);
        res.end();
      });
    } catch (error) {
      console.error('SSE students error:', error);
      try { res.end(); } catch {}
    }
  }
  ,
  async inviteStudent(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email required' });
      // TODO: persist invitation, send email
      res.json({ success: true, message: 'Invitation sent' });
    } catch (error) {
      console.error('Invite student error:', error);
      res.status(500).json({ success: false, message: 'Failed to invite student' });
    }
  }
  ,
  async messageStudent(req, res) {
    try {
      const { studentId } = req.params;
      const { message } = req.body;
      if (!message) return res.status(400).json({ success: false, message: 'Message required' });
      // TODO: persist message/notification
      res.json({ success: true, message: 'Message queued' });
    } catch (error) {
      console.error('Message student error:', error);
      res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  }
};

module.exports = studentsController;


