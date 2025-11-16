const { Forum, ForumTopic, ForumPost } = require('../models/Forum');
const { UserBadge, Leaderboard } = require('../models/Forum');
const db = require('../config/database');
const achievementService = require('../services/achievementService');

const forumController = {
  // Get forums for user's chapter
  async getForums(req, res) {
    try {
      const userId = req.user.userId;
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

  // Get forum topics (REQUIREMENT: Private/public threads)
  async getTopics(req, res) {
    try {
      const { forumId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user.userId;

      // Check forum access
      const hasAccess = await Forum.checkMembership(forumId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this forum'
        });
      }

      // Get topics with private/public filtering (REQUIREMENT: Private/public threads)
      const topics = await ForumTopic.findByForum(forumId, parseInt(page), parseInt(limit), userId);
      
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

  // Search forum posts (REQUIREMENT: Forum posts indexed for search)
  async searchForumPosts(req, res) {
    try {
      const { query } = req.query;
      const userId = req.user.userId;
      const { chapterId } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      const user = await db('users').where({ id: userId }).select('chapter_id').first();
      const searchChapterId = chapterId || user?.chapter_id;

      const socialFeaturesService = require('../services/socialFeaturesService');
      const results = await socialFeaturesService.searchForumPosts(query, searchChapterId, 20);

      res.json({
        success: true,
        data: {
          results,
          query,
          count: results.length
        }
      });
    } catch (error) {
      console.error('Search forum posts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search forum posts'
      });
    }
  },

  // Create new topic (REQUIREMENT: Private/public threads)
  async createTopic(req, res) {
    try {
      const { forumId, title, content, isPrivate = false, allowedChapterId = null } = req.body;
      const userId = req.user.userId;

      // Check forum access
      const hasAccess = await Forum.checkMembership(forumId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this forum'
        });
      }

      // Auto-moderation check (REQUIREMENT: Prevents spam, abusive content)
      const moderationResult = await achievementService.moderateContent(content, userId);
      if (moderationResult.needsModeration) {
        return res.status(400).json({
          success: false,
          message: 'Content requires moderation',
          flags: moderationResult.flags
        });
      }

      // Get user's chapter for private thread access
      const user = await db('users').where({ id: userId }).select('chapter_id').first();
      const allowedChapter = isPrivate ? (allowedChapterId || user.chapter_id) : null;

      const topic = await ForumTopic.create({
        forum_id: forumId,
        title,
        content,
        author_id: userId,
        is_private: isPrivate, // REQUIREMENT: Private/public threads
        allowed_chapter_id: allowedChapter
      });

      // Award participation badge with real-time update (REQUIREMENT: Updates within 1 minute)
      const socialFeaturesService = require('../services/socialFeaturesService');
      await socialFeaturesService.checkAndAwardBadges(userId, 'participation', {
        chapterId: user.chapter_id,
        forumId: forumId,
        topicId: topic.id
      });

      // Index for search (REQUIREMENT: Forum posts indexed for search)
      await socialFeaturesService.indexForumPost(null, topic.id, `${title} ${content}`);

      // Track engagement
      await db('user_engagement').insert({
        user_id: userId,
        engagement_type: 'forum_topic_created',
        entity_type: 'forum_topic',
        entity_id: topic.id,
        points_earned: 10,
        metadata: { forum_id: forumId, is_private: isPrivate }
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
      const userId = req.user.userId;

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

      let posts = await ForumPost.findByTopic(topicId, parseInt(page), parseInt(limit));
      
      // REQUIREMENT: Youth privacy is strictly enforced
      const youthPrivacyService = require('../services/youthPrivacyService');
      posts = await Promise.all(
        posts.map(post => youthPrivacyService.enforceYouthPrivacyOnForumPost(post, userId))
      );
      
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
      const userId = req.user.userId;

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
        user_id: userId,
        content,
        parent_id: parentId
      });

      // Index for search (REQUIREMENT: Forum posts indexed for search)
      const socialFeaturesService = require('../services/socialFeaturesService');
      await socialFeaturesService.indexForumPost(post.id, topicId, content);

      // Award participation badges with real-time update (REQUIREMENT: Updates within 1 minute)
      const user = await db('users').where({ id: userId }).select('chapter_id').first();
      await socialFeaturesService.checkAndAwardBadges(userId, 'participation', {
        chapterId: user?.chapter_id,
        topicId: topicId,
        postId: post.id
      });

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
      const userId = req.user.userId;

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
      const userId = req.user.userId;

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
      const userId = req.user.userId;

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