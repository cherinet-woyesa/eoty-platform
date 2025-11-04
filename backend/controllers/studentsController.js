const db = require('../config/database');

const studentsController = {
  // List students associated with the teacher's courses, with filters and sorting
  async listStudents(req, res) {
    try {
      const teacherId = req.user.id;
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
      const teacherId = req.user.id;

      // Fetch all students associated with the teacher's courses
      const students = await db('users as u')
        .join('user_lesson_progress as ulp', 'u.id', 'ulp.user_id')
        .join('lessons as l', 'ulp.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .groupBy('u.id')
        .select(
          'u.id',
          db.raw('COUNT(DISTINCT c.id) as enrolled_courses'),
          db.raw('ROUND(AVG(ulp.progress)::numeric, 0) as progress_percent'),
          db.raw('MAX(ulp.last_accessed_at) as last_active_at')
        );

      const now = Date.now();
      let totalProgress = 0;
      let totalEnrolledCourses = 0;
      let activeTodayCount = 0;

      students.forEach(student => {
        totalProgress += parseInt(student.progress_percent, 10);
        totalEnrolledCourses += parseInt(student.enrolled_courses, 10);
        const lastActive = student.last_active_at ? new Date(student.last_active_at).getTime() : 0;
        const hoursDiff = (now - lastActive) / (1000 * 60 * 60);
        if (hoursDiff <= 24) {
          activeTodayCount++;
        }
      });

      const totalStudents = students.length;
      const avgProgress = totalStudents > 0 ? Math.round(totalProgress / totalStudents) : 0;
      const avgEnrolledCourses = totalStudents > 0 ? (totalEnrolledCourses / totalStudents).toFixed(1) : 0;

      res.json({
        success: true,
        data: {
          totalStudents,
          avgProgress,
          avgEnrolledCourses,
          activeTodayCount,
          students: students.map(s => ({ // Return a simplified list of students if needed by frontend
            id: s.id,
            enrolled_courses: s.enrolled_courses,
            progress_percent: s.progress_percent,
            last_active_at: s.last_active_at
          }))
        }
      });

    } catch (error) {
      console.error('Get student dashboard error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch student dashboard data' });
    }
  },
  async streamUpdates(req, res) {
    try {
      const teacherId = req.user.id;
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


