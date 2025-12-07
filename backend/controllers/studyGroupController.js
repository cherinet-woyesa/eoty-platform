const db = require('../config/database');

const studyGroupController = {
  // List public groups and optionally user's groups
  async listGroups(req, res) {
    try {
      const userId = req.user?.userId || null;

      // Public groups
      const publicGroups = await db('study_groups').where('is_public', true).orderBy('created_at', 'desc').limit(200);

      // If authenticated, also return user's groups
      let myGroups = [];
      if (userId) {
        myGroups = await db('study_groups as g')
          .join('study_group_members as m', 'g.id', 'm.group_id')
          .where('m.user_id', userId)
          .select('g.*', 'm.role', 'm.joined_at');
      }

      res.json({ success: true, data: { publicGroups, myGroups } });
    } catch (error) {
      console.error('listGroups error:', error);
      res.status(500).json({ success: false, message: 'Failed to list study groups' });
    }
  },

  // Create a study group
  async createGroup(req, res) {
    try {
      const userId = req.user.userId;
      const { name, description, is_public = true, max_members = 50 } = req.body;

      if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

      const [group] = await db('study_groups').insert({
        name,
        description,
        is_public,
        max_members,
        created_by: userId,
        created_by_name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      // Add creator as member
      await db('study_group_members').insert({
        group_id: group.id,
        user_id: userId,
        user_name: group.created_by_name,
        role: 'admin',
        joined_at: new Date()
      });

      res.status(201).json({ success: true, data: { group } });
    } catch (error) {
      console.error('createGroup error:', error);
      res.status(500).json({ success: false, message: 'Failed to create group' });
    }
  },

  // Get group detail
  async getGroup(req, res) {
    try {
      const { id } = req.params;
      const group = await db('study_groups').where('id', id).first();
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      const members = await db('study_group_members')
        .join('users as u', 'u.id', 'study_group_members.user_id')
        .where('group_id', id)
        .orderBy('joined_at', 'asc')
        .select(
          'study_group_members.*',
          db.raw("COALESCE(u.first_name || ' ' || u.last_name, u.email) as name"),
          'u.profile_picture'
        );

      res.json({ success: true, data: { group, members } });
    } catch (error) {
      console.error('getGroup error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch group' });
    }
  },

  // Join a group
  async joinGroup(req, res) {
    try {
      const userId = req.user.userId;
      const { group_id } = req.body;
      if (!group_id) return res.status(400).json({ success: false, message: 'group_id is required' });

      const group = await db('study_groups').where('id', group_id).first();
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      const existing = await db('study_group_members').where({ group_id, user_id: userId }).first();
      if (existing) return res.json({ success: true, message: 'Already a member' });

      // Check capacity
      const memberCount = await db('study_group_members').where('group_id', group_id).count('id as cnt').first();
      if (memberCount.cnt >= group.max_members) return res.status(400).json({ success: false, message: 'Group is full' });

      await db('study_group_members').insert({
        group_id,
        user_id: userId,
        user_name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
        role: 'member',
        joined_at: new Date()
      });

      res.json({ success: true, message: 'Joined group' });
    } catch (error) {
      console.error('joinGroup error:', error);
      res.status(500).json({ success: false, message: 'Failed to join group' });
    }
  },

  // Leave a group
  async leaveGroup(req, res) {
    try {
      const userId = req.user.userId;
      const { group_id } = req.body;
      if (!group_id) return res.status(400).json({ success: false, message: 'group_id is required' });

      await db('study_group_members').where({ group_id, user_id: userId }).del();

      res.json({ success: true, message: 'Left group' });
    } catch (error) {
      console.error('leaveGroup error:', error);
      res.status(500).json({ success: false, message: 'Failed to leave group' });
    }
  },

  // Messages
  async listMessages(req, res) {
    try {
      const { id } = req.params;
      const messages = await db('study_group_messages as m')
        .join('users as u', 'u.id', 'm.user_id')
        .where('m.group_id', id)
        .orderBy('m.created_at', 'asc')
        .limit(200)
        .select(
          'm.id',
          'm.group_id',
          'm.user_id',
          'm.content',
          'm.created_at',
          db.raw("COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name"),
          'u.profile_picture'
        );
      res.json({ success: true, data: { messages } });
    } catch (error) {
      console.error('listMessages error:', error);
      res.status(500).json({ success: false, message: 'Failed to load messages' });
    }
  },

  async postMessage(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { content } = req.body;
      if (!content) return res.status(400).json({ success: false, message: 'Content is required' });

      // Ensure membership
      const member = await db('study_group_members').where({ group_id: id, user_id: userId }).first();
      if (!member) return res.status(403).json({ success: false, message: 'Not a group member' });

      const [message] = await db('study_group_messages')
        .insert({
          group_id: id,
          user_id: userId,
          content,
          created_at: new Date()
        })
        .returning('*');

      res.status(201).json({ success: true, data: { message } });
    } catch (error) {
      console.error('postMessage error:', error);
      res.status(500).json({ success: false, message: 'Failed to post message' });
    }
  },

  // Assignments
  async listAssignments(req, res) {
    try {
      const { id } = req.params;
      const assignments = await db('study_group_assignments')
        .where('group_id', id)
        .orderBy('created_at', 'desc');
      res.json({ success: true, data: { assignments } });
    } catch (error) {
      console.error('listAssignments error:', error);
      res.status(500).json({ success: false, message: 'Failed to load assignments' });
    }
  },

  async createAssignment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { title, description, due_date, total_points = 100 } = req.body;
      if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

      const member = await db('study_group_members').where({ group_id: id, user_id: userId }).first();
      if (!member || member.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can create assignments' });
      }

      const [assignment] = await db('study_group_assignments')
        .insert({
          group_id: id,
          created_by: userId,
          title,
          description,
          due_date: due_date ? new Date(due_date) : null,
          total_points,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      res.status(201).json({ success: true, data: { assignment } });
    } catch (error) {
      console.error('createAssignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to create assignment' });
    }
  },

  // Submissions
  async listSubmissions(req, res) {
    try {
      const { assignmentId } = req.params;
      const submissions = await db('study_group_submissions as s')
        .join('users as u', 'u.id', 's.student_id')
        .where('s.assignment_id', assignmentId)
        .select(
          's.*',
          db.raw("COALESCE(u.first_name || ' ' || u.last_name, u.email) as student_name"),
          'u.profile_picture'
        )
        .orderBy('s.submitted_at', 'desc');
      res.json({ success: true, data: { submissions } });
    } catch (error) {
      console.error('listSubmissions error:', error);
      res.status(500).json({ success: false, message: 'Failed to load submissions' });
    }
  },

  async submitAssignment(req, res) {
    try {
      const userId = req.user.userId;
      const { assignmentId } = req.params;
      const { content, file_url } = req.body;

      const assignment = await db('study_group_assignments').where('id', assignmentId).first();
      if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

      const member = await db('study_group_members').where({ group_id: assignment.group_id, user_id: userId }).first();
      if (!member) return res.status(403).json({ success: false, message: 'Not a group member' });

      const existing = await db('study_group_submissions')
        .where({ assignment_id: assignmentId, student_id: userId })
        .first();
      if (existing) {
        await db('study_group_submissions')
          .where({ assignment_id: assignmentId, student_id: userId })
          .update({
            content,
            file_url,
            submitted_at: new Date()
          });
      } else {
        await db('study_group_submissions').insert({
          assignment_id: assignmentId,
          student_id: userId,
          content,
          file_url,
          submitted_at: new Date()
        });
      }

      res.json({ success: true, message: 'Submission saved' });
    } catch (error) {
      console.error('submitAssignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit assignment' });
    }
  },

  async gradeSubmission(req, res) {
    try {
      const graderId = req.user.userId;
      const { assignmentId, submissionId } = req.params;
      const { grade, feedback } = req.body;

      const assignment = await db('study_group_assignments').where('id', assignmentId).first();
      if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

      const userRole = req.user.role;
      // Only teachers (or higher, if needed) can grade; admin is optional but disallowed per request
      if (userRole !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Only teachers can grade submissions' });
      }

      await db('study_group_submissions')
        .where({ id: submissionId, assignment_id: assignmentId })
        .update({
          grade,
          feedback,
          graded_at: new Date(),
          graded_by: graderId
        });

      res.json({ success: true, message: 'Submission graded' });
    } catch (error) {
      console.error('gradeSubmission error:', error);
      res.status(500).json({ success: false, message: 'Failed to grade submission' });
    }
  }
};

module.exports = studyGroupController;
