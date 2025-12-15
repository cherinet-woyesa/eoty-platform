const db = require('../config/database');
const emailService = require('../services/emailService');

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
  // Get enrolled courses with pagination and filtering
  async getEnrolledCourses(req, res) {
    try {
      const studentId = req.user.userId;
      const { page = 1, limit = 12, search = '', status = 'all', sort = 'last_accessed' } = req.query;
      const offset = (page - 1) * limit;

      let query = db('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .leftJoin('users as instructor', 'c.created_by', 'instructor.id')
        .leftJoin('course_favorites as cf', function() {
          this.on('cf.course_id', '=', 'c.id').andOn('cf.user_id', '=', db.raw('?', [studentId]));
        })
        .leftJoin('bookmarks as bm', function() {
          this.on(db.raw('CAST(bm.entity_id AS INTEGER)'), '=', 'c.id')
            .andOn('bm.entity_type', '=', db.raw('?', ['course']))
            .andOn('bm.user_id', '=', db.raw('?', [studentId]));
        })
        .where('uce.user_id', studentId)
        .whereNot('uce.enrollment_status', 'dropped');

      if (search) {
        query = query.where(function() {
          this.where('c.title', 'ilike', `%${search}%`)
            .orWhere('c.description', 'ilike', `%${search}%`);
        });
      }

      if (status === 'in-progress') {
        query = query.where('uce.progress', '<', 100);
      } else if (status === 'completed') {
        query = query.where('uce.progress', '>=', 100);
      } else if (status === 'favorites') {
        query = query.whereNotNull('cf.id');
      }

      // Sorting
      if (sort === 'title') {
        query = query.orderBy('c.title', 'asc');
      } else if (sort === 'progress') {
        query = query.orderBy('uce.progress', 'desc');
      } else {
        // Default: last_accessed
        query = query.orderBy('uce.last_accessed_at', 'desc');
      }

      // Get total count for pagination (remove ordering to avoid PG group-by errors)
      const countResult = await query
        .clone()
        .clearSelect()
        .clearOrder()
        .count('* as count')
        .first();
      const total = parseInt(countResult.count, 10);

      // Get data
      const courses = await query
        .select(
          'c.id',
          'c.title',
          'c.description',
          'c.cover_image',
          'c.category',
          'c.level',
          'uce.progress as progress_percentage',
          'uce.enrollment_status',
          'uce.enrolled_at',
          'uce.last_accessed_at',
          'uce.completed_at',
          db.raw('CASE WHEN cf.user_id IS NOT NULL THEN true ELSE false END as is_favorite'),
          db.raw('CASE WHEN bm.id IS NOT NULL THEN true ELSE false END as is_bookmarked'),
          db.raw("(SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lesson_count"),
          db.raw("(SELECT COUNT(*) FROM user_course_enrollments WHERE course_id = c.id) as student_count"),
          db.raw("CONCAT(instructor.first_name, ' ', instructor.last_name) as created_by_name")
        )
        .limit(limit)
        .offset(offset);

      // Get next lessons for these courses
      const nextLessons = {};
      for (const course of courses) {
        const nextLesson = await db('lessons as l')
          .leftJoin('user_lesson_progress as ulp', function() {
            this.on('l.id', '=', 'ulp.lesson_id').andOn('ulp.user_id', '=', db.raw('?', [studentId]));
          })
          .where('l.course_id', course.id)
          .where(function() {
            this.whereNull('ulp.is_completed').orWhere('ulp.is_completed', false);
          })
          // lessons table uses "order" column, not order_index
          .orderBy('l.order', 'asc')
          .first('l.id', 'l.title');
        
        if (nextLesson) {
          nextLessons[course.id] = nextLesson;
        }
      }

      // Get stats
      const stats = {
        total: 0,
        inProgress: 0,
        completed: 0,
        favorites: 0,
        avgProgress: 0
      };

      try {
        const statsResult = await db('user_course_enrollments')
          .where('user_id', studentId)
          .whereNot('enrollment_status', 'dropped')
          .select(
            db.raw('COUNT(*) as total'),
            db.raw('COUNT(CASE WHEN progress < 100 THEN 1 END) as in_progress'),
            db.raw('COUNT(CASE WHEN progress >= 100 THEN 1 END) as completed'),
            db.raw('AVG(progress) as avg_progress')
          )
          .first();

        const favoritesResult = await db('course_favorites as cf')
          .join('user_course_enrollments as uce', 'cf.course_id', 'uce.course_id')
          .where('cf.user_id', studentId)
          .whereNot('uce.enrollment_status', 'dropped')
          .count('* as count')
          .first();

        stats.total = parseInt(statsResult?.total, 10) || 0;
        stats.inProgress = parseInt(statsResult?.in_progress, 10) || 0;
        stats.completed = parseInt(statsResult?.completed, 10) || 0;
        stats.favorites = parseInt(favoritesResult?.count, 10) || 0;
        stats.avgProgress = Math.round(parseFloat(statsResult?.avg_progress) || 0);
      } catch (err) {
        console.warn('Error fetching course stats:', err);
      }

      res.json({
        success: true,
        data: {
          courses,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
          },
          nextLessons,
          stats
        }
      });

    } catch (err) {
      console.error('Error fetching enrolled courses:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch enrolled courses' });
    }
  },

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
          .leftJoin('course_favorites as cf', function() {
            this.on('cf.course_id', '=', 'c.id').andOn('cf.user_id', '=', db.raw('?', [studentId]));
          })
          .leftJoin('bookmarks as bm', function() {
            this.on(db.raw('CAST(bm.entity_id AS INTEGER)'), '=', 'c.id')
              .andOn('bm.entity_type', '=', db.raw('?', ['course']))
              .andOn('bm.user_id', '=', db.raw('?', [studentId]));
          })
          .where('uce.user_id', studentId)
          .select(
            'c.id',
            'c.title',
            'c.description',
            'c.cover_image',
            'uce.enrollment_status',
            db.raw('CASE WHEN cf.user_id IS NOT NULL THEN true ELSE false END as is_favorite'),
            db.raw('CASE WHEN bm.id IS NOT NULL THEN true ELSE false END as is_bookmarked')
          )
          .groupBy('c.id', 'c.title', 'c.description', 'c.cover_image', 'uce.enrollment_status', 'cf.user_id', 'bm.id');

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
              cover_image: course.cover_image,
              is_favorite: !!course.is_favorite,
              is_bookmarked: !!course.is_bookmarked,
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
              cover_image: course.cover_image,
              is_favorite: !!course.is_favorite,
              is_bookmarked: !!course.is_bookmarked,
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

      // Get recent activity
      let recentActivity = [];
      try {
        recentActivity = await db('user_lesson_progress as ulp')
          .join('lessons as l', 'ulp.lesson_id', 'l.id')
          .join('courses as c', 'l.course_id', 'c.id')
          .where('ulp.user_id', studentId)
          .orderBy('ulp.last_accessed_at', 'desc')
          .limit(5)
          .select(
            'l.id as lesson_id',
            'l.title as lesson_title',
            'c.title as course_title',
            'c.id as course_id',
            'ulp.last_accessed_at',
            'ulp.progress',
            'ulp.is_completed'
          );
      } catch (err) {
        console.warn('Error fetching recent activity:', err.message);
      }

      // Get recommendations (courses not enrolled in)
      let recommendations = [];
      try {
        const enrolledCourseIds = await db('user_course_enrollments')
          .where('user_id', studentId)
          .pluck('course_id');
        
        recommendations = await db('courses')
          .whereNotIn('id', enrolledCourseIds)
          .where('is_published', true)
          .orderByRaw('RANDOM()')
          .limit(3)
          .select('id', 'title', 'description', 'cover_image', 'level', 'category');
      } catch (err) {
        console.warn('Error fetching recommendations:', err.message);
      }

      // Get next lessons for enrolled courses
      let nextLessons = {};
      try {
        for (const course of coursesWithProgress) {
          const nextLesson = await db('lessons as l')
            .leftJoin('user_lesson_progress as ulp', function() {
              this.on('l.id', '=', 'ulp.lesson_id').andOn('ulp.user_id', '=', db.raw('?', [studentId]));
            })
            .where('l.course_id', course.id)
            .where(function() {
              this.whereNull('ulp.is_completed').orWhere('ulp.is_completed', false);
            })
            .orderBy('l.order_index', 'asc')
            .first('l.id', 'l.title');
          
          if (nextLesson) {
            nextLessons[course.id] = nextLesson;
          }
        }
      } catch (err) {
        console.warn('Error fetching next lessons:', err.message);
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
          recentActivity,
          recommendations,
          nextLessons
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
      const { email, courseId } = req.body;
      const teacherId = req.user.userId;
      
      console.log(`[InviteStudent] Request received from teacher ${teacherId} for email ${email}, courseId: ${courseId}`);

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email required' });
      }

      const normalizedEmail = String(email).toLowerCase().trim();

      // Optional: check course exists and belongs to teacher (or teacher has access)
      let course = null;
      if (courseId) {
        // Validate courseId is a number
        if (isNaN(parseInt(courseId))) {
             console.warn(`[InviteStudent] Invalid courseId: ${courseId}`);
             return res.status(400).json({ success: false, message: 'Invalid course ID' });
        }

        course = await db('courses')
          .where({ id: courseId })
          .first();

        if (!course) {
          return res.status(404).json({
            success: false,
            message: 'Course not found'
          });
        }
      }

      // See if there is already a pending invitation for this email + course
      const existingInvite = await db('student_invitations')
        .where({
          email: normalizedEmail,
          invited_by: teacherId,
          course_id: courseId || null,
          status: 'pending'
        })
        .first();

      if (existingInvite) {
        return res.json({
          success: true,
          message: 'An invitation is already pending for this student.',
          data: { invitation: existingInvite }
        });
      }

      // Try to find an existing user with this email
      const existingUser = await db('users')
        .whereRaw('LOWER(email) = ?', [normalizedEmail])
        .first();

      // Create invitation record
      console.log(`Creating invitation for ${normalizedEmail} by teacher ${teacherId}`);
      const insertResult = await db('student_invitations')
        .insert({
          email: normalizedEmail,
          invited_by: teacherId,
          user_id: existingUser ? existingUser.id : null,
          course_id: courseId || null,
          status: 'pending'
        })
        .returning('*');

      const invitation = insertResult[0];
      console.log('Invitation created:', invitation);

      // If the user already exists, create an in-app notification using user_notifications
      if (existingUser) {
        try {
          const title = course
            ? 'Course invitation'
            : 'Learning invitation';
          const message = course
            ? `You have been invited to join the course "${course.title}".`
            : 'You have been invited to join a course on the platform.';

          await db('user_notifications').insert({
            user_id: existingUser.id,
            title,
            message,
            notification_type: 'course',
            data: JSON.stringify({
              type: 'course_invitation',
              invitationId: invitation.id,
              courseId: course ? course.id : null
            }),
            action_url: course ? `/student/invitations` : null,
            priority: 'normal'
          });
        } catch (notifyError) {
          console.error('Failed to create user notification for invitation:', notifyError);
          // Non-critical: do not fail the invite because of notification issues
        }
      }

      // Send email invitation
      try {
        const inviteLink = `${process.env.FRONTEND_URL || 'https://www.eotcommunity.org'}/register?email=${encodeURIComponent(normalizedEmail)}&invitation=${invitation.id}`;
        const subject = course ? `Invitation to join ${course.title}` : 'Invitation to join EOTY Platform';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello,</h2>
            <p>You have been invited to join <strong>${course ? course.title : 'EOTY Platform'}</strong>.</p>
            <p>Click the button below to accept the invitation and create your account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${inviteLink}">${inviteLink}</a></p>
          </div>
        `;
        await emailService.sendEmail(normalizedEmail, subject, html);
        console.log(`[InviteStudent] Email sent to ${normalizedEmail}`);
      } catch (emailError) {
        console.error('[InviteStudent] Failed to send email:', emailError);
        // Don't fail the request, just log it
      }

      res.json({
        success: true,
        message: 'Invitation sent successfully',
        data: { invitation }
      });
    } catch (error) {
      console.error('Invite student error:', error);
      res.status(500).json({ success: false, message: 'Failed to invite student' });
    }
  }
  ,
  async getMyInvitations(req, res) {
    try {
      const userId = req.user.userId;
      const user = await db('users')
        .where({ id: userId })
        .select('id', 'email')
        .first();

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const email = (user.email || '').toLowerCase();

      // Invitations can be for this specific user_id or for their email
      const invitations = await db('student_invitations as si')
        .leftJoin('courses as c', 'si.course_id', 'c.id')
        .leftJoin('users as t', 'si.invited_by', 't.id')
        .where(function () {
          this.where('si.user_id', userId)
            .orWhereRaw('LOWER(si.email) = ?', [email]);
        })
        .andWhere('si.status', 'pending')
        .select(
          'si.id',
          'si.email',
          'si.course_id',
          'si.status',
          'si.created_at',
          'c.title as course_title',
          't.first_name as teacher_first_name',
          't.last_name as teacher_last_name'
        )
        .orderBy('si.created_at', 'desc');

      res.json({
        success: true,
        data: { invitations }
      });
    } catch (error) {
      console.error('Get invitations error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch invitations' });
    }
  }
  ,
  async respondToInvitation(req, res) {
    try {
      const userId = req.user.userId;
      const { invitationId } = req.params;
      const { action } = req.body; // 'accept' | 'decline'

      if (!['accept', 'decline'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Invalid action' });
      }

      const user = await db('users')
        .where({ id: userId })
        .select('id', 'email', 'role')
        .first();

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const email = (user.email || '').toLowerCase();

      const invitation = await db('student_invitations')
        .where({ id: invitationId })
        .first();

      if (!invitation) {
        return res.status(404).json({ success: false, message: 'Invitation not found' });
      }

      // Ensure this invitation belongs to this user (by user_id or email)
      if (
        invitation.user_id &&
        invitation.user_id !== userId &&
        (invitation.email || '').toLowerCase() !== email
      ) {
        return res.status(403).json({ success: false, message: 'You are not allowed to act on this invitation' });
      }
      if (
        !invitation.user_id &&
        (invitation.email || '').toLowerCase() !== email
      ) {
        return res.status(403).json({ success: false, message: 'You are not allowed to act on this invitation' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ success: false, message: `Invitation already ${invitation.status}` });
      }

      if (action === 'decline') {
        await db('student_invitations')
          .where({ id: invitation.id })
          .update({
            status: 'declined',
            declined_at: new Date(),
            user_id: invitation.user_id || userId
          });

        return res.json({ success: true, message: 'Invitation declined' });
      }

      // Accept: mark invitation and enroll user in course if provided
      await db('student_invitations')
        .where({ id: invitation.id })
        .update({
          status: 'accepted',
          accepted_at: new Date(),
          user_id: invitation.user_id || userId
        });

      // If a course is linked, enroll the user
      if (invitation.course_id) {
        try {
          const existingEnrollment = await db('user_course_enrollments')
            .where({
              user_id: userId,
              course_id: invitation.course_id
            })
            .first();

          if (!existingEnrollment) {
            await db('user_course_enrollments').insert({
              user_id: userId,
              course_id: invitation.course_id,
              enrollment_status: 'active',
              enrolled_at: new Date()
            });
          } else if (existingEnrollment.enrollment_status !== 'active') {
            await db('user_course_enrollments')
              .where({ id: existingEnrollment.id })
              .update({
                enrollment_status: 'active',
                updated_at: new Date()
              });
          }
        } catch (enrollError) {
          console.error('Failed to enroll user from invitation:', enrollError);
          // Do not fail acceptance if enrollment has issues
        }
      }

      res.json({ success: true, message: 'Invitation accepted' });
    } catch (error) {
      console.error('Respond to invitation error:', error);
      res.status(500).json({ success: false, message: 'Failed to respond to invitation' });
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


