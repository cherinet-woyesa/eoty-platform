const db = require('../config/database');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const cloudStorage = require('../services/cloudStorageService');

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
          's.content',
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
  },

  // Student: submit or update submission for an assignment
  async submitAssignment(req, res) {
    try {
      const userId = req.user.userId;
      const { assignmentId } = req.params;
      const { content } = req.body;
      const file = req.file;

      // Validate assignment
      const assignment = await db('assignments as a')
        .leftJoin('courses as c', 'a.course_id', 'c.id')
        .where('a.id', assignmentId)
        .select('a.*', 'c.title as course_title', 'c.created_by as course_owner')
        .first();

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      if (assignment.status !== 'published') {
        return res.status(400).json({ success: false, message: 'Assignment is not open for submissions' });
      }

      // Ensure student is enrolled in the course
      if (assignment.course_id) {
        const enrollment = await db('user_course_enrollments')
          .where({ course_id: assignment.course_id, user_id: userId })
          .first();
        if (!enrollment) {
          return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
        }
      }

      // Prepare submission content (support text + optional attachment info)
      let submissionContent = null;
      if (file) {
        // Move file from temp to documents folder (keep same name)
        const fs = require('fs');
        const path = require('path');
        const tempPath = file.path;
        const destDir = path.join('uploads', 'documents');
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        const destPath = path.join(destDir, path.basename(file.filename || file.path));
        try {
          fs.renameSync(tempPath, destPath);
        } catch (moveErr) {
          console.error('Failed to move uploaded file:', moveErr);
        }

        const fileUrl = `/uploads/documents/${path.basename(destPath)}`;
        submissionContent = JSON.stringify({ text: content || null, attachment: { filename: file.originalname, url: fileUrl } });
      } else {
        submissionContent = content || null;
      }

      // Upsert submission (unique constraint on assignment_id + student_id)
      const existing = await db('assignment_submissions')
        .where({ assignment_id: assignmentId, student_id: String(userId) })
        .first();

      let submission;
      if (existing) {
        await db('assignment_submissions')
          .where({ id: existing.id })
          .update({
            content: submissionContent || existing.content,
            submitted_at: new Date(),
            status: 'submitted',
            updated_at: new Date()
          });

        submission = await db('assignment_submissions').where({ id: existing.id }).first();
      } else {
        const insert = await db('assignment_submissions')
          .insert({
            assignment_id: assignmentId,
            student_id: String(userId),
            content: submissionContent || null,
            submitted_at: new Date(),
            status: 'submitted'
          })
          .returning('*');

        submission = insert[0];
      }

      // Notify teacher/course owner about new submission
      try {
        const hasUserNotifications = await db.schema.hasTable('user_notifications');
        if (hasUserNotifications && assignment.course_owner) {
          await db('user_notifications').insert({
            user_id: assignment.course_owner,
            title: 'New assignment submission',
            message: `Student submitted assignment "${assignment.title}" in course "${assignment.course_title || ''}".`,
            notification_type: 'course',
            data: JSON.stringify({ type: 'assignment_submitted', assignmentId: assignment.id, submissionId: submission.id }),
            action_url: `/teacher/assignments/${assignment.id}`,
            priority: 'normal'
          });
        }
      } catch (notifyError) {
        console.error('Failed to create notification for submission:', notifyError);
      }

      res.json({ success: true, message: 'Submission saved', data: { submission } });
    } catch (error) {
      console.error('Submit assignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit assignment' });
    }
  },

  // Student: get presigned PUT URL for assignment attachment
  async presignAttachment(req, res) {
    try {
      const userId = req.user.userId;
      const { assignmentId } = req.params;
      const { fileName, contentType } = req.body;

      if (!fileName) {
        return res.status(400).json({ success: false, message: 'fileName is required' });
      }

      // Validate assignment exists and is published
      const assignment = await db('assignments').where({ id: assignmentId }).first();
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }
      if (assignment.status !== 'published') {
        return res.status(400).json({ success: false, message: 'Assignment is not open for submissions' });
      }

      // Construct a safe S3 key
      const timestamp = Date.now();
      const safeName = cloudStorage.sanitizeKey(fileName);
      const key = `assignments/attachments/${userId}/${timestamp}-${safeName}`;

      const command = new PutObjectCommand({
        Bucket: cloudStorage.bucket,
        Key: key,
        ContentType: contentType || 'application/octet-stream',
        CacheControl: 'private, max-age=0'
      });

      const presignedUrl = await getSignedUrl(cloudStorage.s3Client, command, { expiresIn: 3600 });

      return res.json({
        success: true,
        data: {
          presignedUrl,
          key,
          storageUrl: cloudStorage.getStorageUrl(key),
          cdnUrl: cloudStorage.getCloudFrontUrl(key)
        }
      });
    } catch (error) {
      console.error('Presign attachment error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate presigned URL' });
    }
  }
};

module.exports = assignmentsController;



