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

      const members = await db('study_group_members').where('group_id', id).orderBy('joined_at', 'asc');

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
  }
};

module.exports = studyGroupController;
