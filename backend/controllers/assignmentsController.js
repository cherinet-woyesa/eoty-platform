const db = require('../config/database');

const assignmentsController = {
  // List assignments for current teacher/admin with basic stats
  async listAssignments(req, res) {
    try {
      const userId = req.user.userId;
      const role = req.user.role;

      let query = db('assignments as a')
        .leftJoin('courses as c', 'a.course_id', 'c.id')
        .leftJoin('assignment_submissions as s', 'a.id', 's.assignment_id')
        .groupBy('a.id', 'c.title');

      if (role === 'teacher') {
        // Only assignments on courses the teacher owns
        query = query.where('c.created_by', userId);
      }

      const rows = await query.select(
        'a.id',
        'a.title',
        'a.course_id',
        'c.title as course_title',
        'a.due_date',
        'a.status',
        'a.created_at',
        db.raw('COUNT(DISTINCT s.id) as total_submissions'),
        db.raw("COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END) as graded_submissions"),
        db.raw('ROUND(AVG(s.score)::numeric, 0) as average_score')
      ).orderBy('a.due_date', 'asc');

      res.json({
        success: true,
        data: { assignments: rows }
      });
    } catch (error) {
      console.error('List assignments error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
    }
  },

  // Create assignment
  async createAssignment(req, res) {
    try {
      const userId = req.user.userId;
      const role = req.user.role;
      const { courseId, title, description, dueDate, maxPoints } = req.body;

      if (!title || !courseId) {
        return res.status(400).json({
          success: false,
          message: 'Title and course are required'
        });
      }

      // Ensure course exists and teacher/admin has permission
      const course = await db('courses').where({ id: courseId }).first();
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
      if (role === 'teacher' && course.created_by !== userId) {
        return res.status(403).json({ success: false, message: 'You do not own this course' });
      }

      const insertResult = await db('assignments')
        .insert({
          course_id: courseId,
          created_by: userId,
          title,
          description: description || null,
          due_date: dueDate ? new Date(dueDate) : null,
          max_points: maxPoints || 100,
          status: 'draft'
        })
        .returning('*');

      const assignment = insertResult[0];

      res.status(201).json({
        success: true,
        message: 'Assignment created',
        data: { assignment }
      });
    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to create assignment' });
    }
  },

  // Get single assignment with submissions (for teacher)
  async getAssignment(req, res) {
    try {
      const userId = req.user.userId;
      const role = req.user.role;
      const { assignmentId } = req.params;

      const assignment = await db('assignments as a')
        .leftJoin('courses as c', 'a.course_id', 'c.id')
        .where('a.id', assignmentId)
        .select(
          'a.*',
          'c.title as course_title',
          'c.created_by as course_owner'
        )
        .first();

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      if (role === 'teacher' && assignment.course_owner !== userId) {
        return res.status(403).json({ success: false, message: 'You do not have access to this assignment' });
      }

      const submissions = await db('assignment_submissions as s')
        .join('users as u', 's.student_id', 'u.id')
        .where('s.assignment_id', assignmentId)
        .select(
          's.id',
          's.student_id',
          'u.first_name',
          'u.last_name',
          'u.email',
          's.submitted_at',
          's.score',
          's.feedback',
          's.status',
          's.graded_at'
        )
        .orderBy('s.submitted_at', 'asc');

      res.json({
        success: true,
        data: {
          assignment,
          submissions
        }
      });
    } catch (error) {
      console.error('Get assignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch assignment' });
    }
  },

  // Update assignment (title, description, due_date, max_points, status)
  async updateAssignment(req, res) {
    try {
      const userId = req.user.userId;
      const role = req.user.role;
      const { assignmentId } = req.params;
      const { title, description, dueDate, maxPoints, status } = req.body;

      const assignment = await db('assignments as a')
        .leftJoin('courses as c', 'a.course_id', 'c.id')
        .where('a.id', assignmentId)
        .select('a.*', 'c.created_by as course_owner')
        .first();
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      if (role === 'teacher' && assignment.course_owner !== userId) {
        return res.status(403).json({ success: false, message: 'You do not have access to this assignment' });
      }

      const updateData = {
        updated_at: new Date()
      };

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (dueDate !== undefined) updateData.due_date = dueDate ? new Date(dueDate) : null;
      if (maxPoints !== undefined) updateData.max_points = maxPoints;
      if (status !== undefined) updateData.status = status;

      await db('assignments').where({ id: assignmentId }).update(updateData);

      const updated = await db('assignments').where({ id: assignmentId }).first();

      res.json({
        success: true,
        message: 'Assignment updated',
        data: { assignment: updated }
      });
    } catch (error) {
      console.error('Update assignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to update assignment' });
    }
  },

  // Publish assignment and notify enrolled students
  async publishAssignment(req, res) {
    try {
      const userId = req.user.userId;
      const role = req.user.role;
      const { assignmentId } = req.params;

      const assignment = await db('assignments as a')
        .leftJoin('courses as c', 'a.course_id', 'c.id')
        .where('a.id', assignmentId)
        .select('a.*', 'c.created_by as course_owner')
        .first();
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      if (role === 'teacher' && assignment.course_owner !== userId) {
        return res.status(403).json({ success: false, message: 'You do not have access to this assignment' });
      }

      await db('assignments')
        .where({ id: assignmentId })
        .update({
          status: 'published',
          updated_at: new Date()
        });

      // Notify enrolled students (if user_notifications table exists)
      try {
        const hasUserNotifications = await db.schema.hasTable('user_notifications');
        if (hasUserNotifications && assignment.course_id) {
          const enrolled = await db('user_course_enrollments')
            .where({ course_id: assignment.course_id })
            .select('user_id');

          const course = await db('courses').where({ id: assignment.course_id }).first();
          const notifications = enrolled.map((row) => ({
            user_id: row.user_id,
            title: 'New assignment published',
            message: `A new assignment "${assignment.title}" has been published in course "${course?.title || ''}".`,
            notification_type: 'course',
            data: JSON.stringify({
              type: 'assignment_published',
              assignmentId: assignment.id,
              courseId: assignment.course_id
            }),
            action_url: '/student/assignments',
            priority: 'normal'
          }));

          if (notifications.length > 0) {
            await db('user_notifications').insert(notifications);
          }
        }
      } catch (notifyError) {
        console.error('Failed to create notifications for assignment publish:', notifyError);
      }

      res.json({
        success: true,
        message: 'Assignment published'
      });
    } catch (error) {
      console.error('Publish assignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to publish assignment' });
    }
  },

  // Grade a submission
  async gradeSubmission(req, res) {
    try {
      const userId = req.user.userId;
      const role = req.user.role;
      const { assignmentId, submissionId } = req.params;
      const { score, feedback } = req.body;

      const assignment = await db('assignments as a')
        .leftJoin('courses as c', 'a.course_id', 'c.id')
        .where('a.id', assignmentId)
        .select('a.*', 'c.created_by as course_owner')
        .first();
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      if (role === 'teacher' && assignment.course_owner !== userId) {
        return res.status(403).json({ success: false, message: 'You do not have access to this assignment' });
      }

      const submission = await db('assignment_submissions')
        .where({ id: submissionId, assignment_id: assignmentId })
        .first();

      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }

      await db('assignment_submissions')
        .where({ id: submissionId })
        .update({
          score: score !== undefined ? score : null,
          feedback: feedback || null,
          status: 'graded',
          graded_at: new Date(),
          updated_at: new Date()
        });

      const updated = await db('assignment_submissions')
        .where({ id: submissionId })
        .first();

      // Notify student of grade
      try {
        const hasUserNotifications = await db.schema.hasTable('user_notifications');
        if (hasUserNotifications) {
          const course = assignment.course_id
            ? await db('courses').where({ id: assignment.course_id }).first()
            : null;

          await db('user_notifications').insert({
            user_id: updated.student_id,
            title: 'Assignment graded',
            message: `Your assignment "${assignment.title}" has been graded.`,
            notification_type: 'course',
            data: JSON.stringify({
              type: 'assignment_graded',
              assignmentId: assignment.id,
              courseId: assignment.course_id,
              submissionId: updated.id,
              score: updated.score
            }),
            action_url: '/student/assignments',
            priority: 'normal'
          });
        }
      } catch (notifyError) {
        console.error('Failed to create notification for graded assignment:', notifyError);
      }

      res.json({
        success: true,
        message: 'Submission graded',
        data: { submission: updated }
      });
    } catch (error) {
      console.error('Grade submission error:', error);
      res.status(500).json({ success: false, message: 'Failed to grade submission' });
    }
  },

  // Student: list assignments for current user
  async listStudentAssignments(req, res) {
    try {
      const userId = req.user.userId;

      // Get courses the student is enrolled in
      const enrollments = await db('user_course_enrollments')
        .where({ user_id: userId })
        .select('course_id');

      const courseIds = enrollments.map((e) => e.course_id);
      if (courseIds.length === 0) {
        return res.json({ success: true, data: { assignments: [] } });
      }

      const assignments = await db('assignments as a')
        .leftJoin('courses as c', 'a.course_id', 'c.id')
        .leftJoin('assignment_submissions as s', function () {
          this.on('a.id', '=', 's.assignment_id').andOn('s.student_id', '=', db.raw('?', [userId]));
        })
        .whereIn('a.course_id', courseIds)
        .andWhere('a.status', 'published')
        .select(
          'a.id',
          'a.title',
          'a.course_id',
          'c.title as course_title',
          'a.due_date',
          'a.max_points',
          'a.status',
          'a.created_at',
          's.id as submission_id',
          's.status as submission_status',
          's.score',
          's.graded_at'
        )
        .orderBy('a.due_date', 'asc');

      res.json({
        success: true,
        data: { assignments }
      });
    } catch (error) {
      console.error('List student assignments error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
    }
  }
};

module.exports = assignmentsController;


