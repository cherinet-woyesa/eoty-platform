const db = require('../config/database');

const discussionController = {
  // Get discussions for a lesson
  async getLessonDiscussions(req, res) {
    try {
      const { lessonId } = req.params;
      const { sort_by = 'newest', show_pinned_only = false, video_timestamp, parent_id } = req.query;

      let query = db('lesson_discussions as ld')
        .leftJoin('users as u', 'ld.user_id', 'u.id')
        .where('ld.lesson_id', lessonId)
        .where('ld.is_approved', true)
        .select(
          'ld.*',
          'u.first_name',
          'u.last_name',
          'u.profile_picture'
        );

      // Filter by pinned only
      if (show_pinned_only === 'true') {
        query = query.where('ld.is_pinned', true);
      }

      // Filter by video timestamp
      if (video_timestamp) {
        query = query.where('ld.video_timestamp', video_timestamp);
      }

      // Filter by parent_id (for replies)
      if (parent_id !== undefined) {
        if (parent_id === 'null') {
          query = query.whereNull('ld.parent_id');
        } else {
          query = query.where('ld.parent_id', parent_id);
        }
      }

      // Sort by
      switch (sort_by) {
        case 'oldest':
          query = query.orderBy('ld.created_at', 'asc');
          break;
        case 'most_liked':
          query = query.orderBy('ld.likes_count', 'desc');
          break;
        case 'newest':
        default:
          query = query.orderBy('ld.created_at', 'desc');
          break;
      }

      const discussions = await query;

      // Get replies for each discussion
      const discussionsWithReplies = await Promise.all(
        discussions.map(async (discussion) => {
          const replies = await db('lesson_discussions as ld')
            .leftJoin('users as u', 'ld.user_id', 'u.id')
            .where('ld.parent_id', discussion.id)
            .where('ld.is_approved', true)
            .select(
              'ld.*',
              'u.first_name',
              'u.last_name',
              'u.profile_picture'
            )
            .orderBy('ld.created_at', 'asc');

          return {
            ...discussion,
            replies
          };
        })
      );

      res.json({
        success: true,
        data: { discussions: discussionsWithReplies }
      });
    } catch (error) {
      console.error('Get discussions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch discussions'
      });
    }
  },

  // Create a new discussion
  async createDiscussion(req, res) {
    try {
      const userId = req.user.userId;
      const { lessonId } = req.params;
      const { content, video_timestamp, parent_id } = req.body;

      const discussionId = await db('lesson_discussions').insert({
        user_id: userId,
        lesson_id: lessonId,
        parent_id: parent_id || null,
        content,
        video_timestamp: video_timestamp || null,
        is_approved: true,
        is_pinned: false,
        likes_count: 0,
        replies_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      // If this is a reply, update the parent's reply count
      if (parent_id) {
        await db('lesson_discussions')
          .where('id', parent_id)
          .increment('replies_count', 1);
      }

      // Get the created discussion with user info
      const discussion = await db('lesson_discussions as ld')
        .leftJoin('users as u', 'ld.user_id', 'u.id')
        .where('ld.id', discussionId[0].id)
        .select(
          'ld.*',
          'u.first_name',
          'u.last_name',
          'u.profile_picture'
        )
        .first();

      res.status(201).json({
        success: true,
        message: 'Discussion created successfully',
        data: { discussion }
      });
    } catch (error) {
      console.error('Create discussion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create discussion'
      });
    }
  },

  // Update a discussion
  async updateDiscussion(req, res) {
    try {
      const userId = req.user.userId;
      const { discussionId } = req.params;
      const { content, is_pinned, is_approved } = req.body;

      // Check if user owns the discussion or is a moderator
      const discussion = await db('lesson_discussions')
        .where('id', discussionId)
        .first();

      if (!discussion) {
        return res.status(404).json({
          success: false,
          message: 'Discussion not found'
        });
      }

      // Only allow content updates for the owner
      const updateData = { updated_at: new Date() };
      if (content && discussion.user_id === userId) {
        updateData.content = content;
      }
      if (is_pinned !== undefined) {
        updateData.is_pinned = is_pinned;
      }
      if (is_approved !== undefined) {
        updateData.is_approved = is_approved;
      }

      await db('lesson_discussions')
        .where('id', discussionId)
        .update(updateData);

      res.json({
        success: true,
        message: 'Discussion updated successfully'
      });
    } catch (error) {
      console.error('Update discussion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update discussion'
      });
    }
  },

  // Delete a discussion
  async deleteDiscussion(req, res) {
    try {
      const userId = req.user.userId;
      const { discussionId } = req.params;

      // Check if user owns the discussion
      const discussion = await db('lesson_discussions')
        .where('id', discussionId)
        .first();

      if (!discussion) {
        return res.status(404).json({
          success: false,
          message: 'Discussion not found'
        });
      }

      if (discussion.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this discussion'
        });
      }

      // If this is a parent discussion, also delete replies
      if (!discussion.parent_id) {
        await db('lesson_discussions')
          .where('parent_id', discussionId)
          .del();
      } else {
        // If this is a reply, decrement parent's reply count
        await db('lesson_discussions')
          .where('id', discussion.parent_id)
          .decrement('replies_count', 1);
      }

      await db('lesson_discussions')
        .where('id', discussionId)
        .del();

      res.json({
        success: true,
        message: 'Discussion deleted successfully'
      });
    } catch (error) {
      console.error('Delete discussion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete discussion'
      });
    }
  },

  // Toggle like on a discussion
  async toggleLike(req, res) {
    try {
      const userId = req.user.userId;
      const { discussionId } = req.params;

      // Check if user already liked this discussion
      const existingLike = await db('discussion_likes')
        .where({ user_id: userId, discussion_id: discussionId })
        .first();

      if (existingLike) {
        // Unlike
        await db('discussion_likes')
          .where({ user_id: userId, discussion_id: discussionId })
          .del();

        await db('lesson_discussions')
          .where('id', discussionId)
          .decrement('likes_count', 1);

        res.json({
          success: true,
          data: { liked: false }
        });
      } else {
        // Like
        await db('discussion_likes').insert({
          user_id: userId,
          discussion_id: discussionId,
          created_at: new Date()
        });

        await db('lesson_discussions')
          .where('id', discussionId)
          .increment('likes_count', 1);

        res.json({
          success: true,
          data: { liked: true }
        });
      }
    } catch (error) {
      console.error('Toggle like error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle like'
      });
    }
  },

  // Flag a discussion
  async flagDiscussion(req, res) {
    try {
      const userId = req.user.userId;
      const { discussionId } = req.params;
      const { reason } = req.body;

      await db('discussion_flags').insert({
        user_id: userId,
        discussion_id: discussionId,
        reason,
        created_at: new Date()
      });

      res.json({
        success: true,
        message: 'Discussion flagged successfully'
      });
    } catch (error) {
      console.error('Flag discussion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to flag discussion'
      });
    }
  },

  // Get discussion statistics
  async getDiscussionStats(req, res) {
    try {
      const { lessonId } = req.params;

      const stats = await db('lesson_discussions')
        .where('lesson_id', lessonId)
        .where('is_approved', true)
        .select(
          db.raw('COUNT(*) as total_discussions'),
          db.raw('COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as top_level_discussions'),
          db.raw('COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as replies'),
          db.raw('SUM(likes_count) as total_likes'),
          db.raw('COUNT(CASE WHEN is_pinned = true THEN 1 END) as pinned_discussions')
        )
        .first();

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get discussion stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch discussion statistics'
      });
    }
  }
};

module.exports = discussionController;

