const { Forum, ForumTopic, ForumPost } = require('../models/Forum');
const { UserBadge, Leaderboard } = require('../models/Forum');
const db = require('../config/database');
const achievementService = require('../services/achievementService');

const forumController = {
  // Get forums for user's chapter
  async getForums(req, res) {
    try {
      const userId = req.user.id;
      const user = await db('users').where({ id: userId }).select('chapter_id').first();
      
      const forums = await Forum.findByChapter(user.chapter_id);
      
      res.json({
        success: true,
        data: { forums }
      });
    } catch (error) {
      console.error('Get forums error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forums'
      });
    }
  },

  // Get forum topics
  async getTopics(req, res) {
    try {
      const { forumId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user.id;

      // Check forum access
      const hasAccess = await Forum.checkMembership(forumId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this forum'
        });
      }

      const topics = await ForumTopic.findByForum(forumId, parseInt(page), parseInt(limit));
      
      res.json({
        success: true,
        data: { topics }
      });
    } catch (error) {
      console.error('Get topics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch topics'
      });
    }
  },

  // Create new topic
  async createTopic(req, res) {
    try {
      const { forumId, title, content } = req.body;
      const userId = req.user.id;

      // Check forum access
      const hasAccess = await Forum.checkMembership(forumId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this forum'
        });
      }

      // Auto-moderation check
      const moderationResult = await achievementService.moderateContent(content, userId);
      if (moderationResult.needsModeration) {
        return res.status(400).json({
          success: false,
          message: 'Content requires moderation',
          flags: moderationResult.flags
        });
      }

      const topic = await ForumTopic.create({
        forum_id: forumId,
        title,
        content,
        author_id: userId
      });

      // Award participation badge
      await achievementService.checkForumBadges(userId);

      // Track engagement
      await db('user_engagement').insert({
        user_id: userId,
        engagement_type: 'forum_topic_created',
        entity_type: 'forum_topic',
        entity_id: topic.id,
        points_earned: 10,
        metadata: { forum_id: forumId }
      });

      res.status(201).json({
        success: true,
        message: 'Topic created successfully',
        data: { topic }
      });
    } catch (error) {
      console.error('Create topic error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create topic'
      });
    }
  },

  // Get topic with posts
  async getTopic(req, res) {
    try {
      const { topicId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.user.id;

      const topic = await ForumTopic.findById(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Check forum access
      const hasAccess = await Forum.checkMembership(topic.forum_id, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this topic'
        });
      }

      // Increment view count
      await ForumTopic.incrementViewCount(topicId);

      const posts = await ForumPost.findByTopic(topicId, parseInt(page), parseInt(limit));
      
      // Get replies for each post
      const postsWithReplies = await Promise.all(
        posts.map(async (post) => {
          const replies = await ForumPost.getReplies(post.id);
          return { ...post, replies };
        })
      );

      res.json({
        success: true,
        data: {
          topic,
          posts: postsWithReplies
        }
      });
    } catch (error) {
      console.error('Get topic error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch topic'
      });
    }
  },

  // Create post (reply)
  async createPost(req, res) {
    try {
      const { topicId, content, parentId } = req.body;
      const userId = req.user.id;

      const topic = await ForumTopic.findById(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      if (topic.is_locked) {
        return res.status(400).json({
          success: false,
          message: 'Topic is locked'
        });
      }

      // Check forum access
      const hasAccess = await Forum.checkMembership(topic.forum_id, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this topic'
        });
      }

      // Auto-moderation check
      const moderationResult = await achievementService.moderateContent(content, userId);
      if (moderationResult.needsModeration) {
        return res.status(400).json({
          success: false,
          message: 'Content requires moderation',
          flags: moderationResult.flags
        });
      }

      const post = await ForumPost.create({
        topic_id: topicId,
        author_id: userId,
        content,
        parent_id: parentId
      });

      // Award participation badges
      await achievementService.checkForumBadges(userId);

      // Track engagement
      await db('user_engagement').insert({
        user_id: userId,
        engagement_type: 'forum_post_created',
        entity_type: 'forum_post',
        entity_id: post.id,
        points_earned: 5,
        metadata: { topic_id: topicId, parent_id: parentId }
      });

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: { post }
      });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create post'
      });
    }
  },

  // Like a post
  async likePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.id;

      const post = await ForumPost.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Check if already liked
      const existingLike = await db('forum_post_likes')
        .where({ post_id: postId, user_id: userId })
        .first();

      if (existingLike) {
        return res.status(400).json({
          success: false,
          message: 'Post already liked'
        });
      }

      // Add like
      await db('forum_post_likes').insert({
        post_id: postId,
        user_id: userId
      });

      // Update like count
      await db('forum_posts')
        .where({ id: postId })
        .increment('like_count', 1);

      res.json({
        success: true,
        message: 'Post liked successfully'
      });
    } catch (error) {
      console.error('Like post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to like post'
      });
    }
  },

  // Lock a topic (moderation)
  async lockTopic(req, res) {
    try {
      const { topicId } = req.params;
      const userId = req.user.id;

      const topic = await ForumTopic.findById(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Update topic to locked
      await db('forum_topics')
        .where({ id: topicId })
        .update({
          is_locked: true,
          locked_by: userId,
          locked_at: new Date()
        });

      res.json({
        success: true,
        message: 'Topic locked successfully'
      });
    } catch (error) {
      console.error('Lock topic error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to lock topic'
      });
    }
  },

  // Moderate a post (moderation)
  async moderatePost(req, res) {
    try {
      const { postId } = req.params;
      const { action, reason } = req.body; // action: 'delete', 'hide', 'warn'
      const userId = req.user.id;

      const post = await ForumPost.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      switch (action) {
        case 'delete':
          await db('forum_posts')
            .where({ id: postId })
            .del();
          break;
        case 'hide':
          await db('forum_posts')
            .where({ id: postId })
            .update({
              is_hidden: true,
              hidden_by: userId,
              hidden_at: new Date(),
              hidden_reason: reason
            });
          break;
        case 'warn':
          // Add warning to user
          await db('user_warnings').insert({
            user_id: post.author_id,
            moderator_id: userId,
            reason: reason,
            entity_type: 'forum_post',
            entity_id: postId
          });
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid moderation action'
          });
      }

      res.json({
        success: true,
        message: `Post ${action}d successfully`
      });
    } catch (error) {
      console.error('Moderate post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to moderate post'
      });
    }
  }
};

module.exports = forumController;