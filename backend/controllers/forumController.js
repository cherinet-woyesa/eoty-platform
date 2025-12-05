const { Forum, ForumTopic, ForumPost } = require('../models/Forum');
const { UserBadge, Leaderboard } = require('../models/Forum');
const db = require('../config/database');
const autoModerationService = require('../services/autoModerationService');
const privacyService = require('../services/privacyService');
const rateLimiter = require('../middleware/rateLimiter');
const realtimeUpdateService = require('../services/realtimeUpdateService');
const achievementService = require('../services/achievementService');

const forumController = {
  // Create new forum (REQUIREMENT: Forum creation for teachers)
  async createForum(req, res) {
    try {
      const { title, description, category, isPublic = false, allowedChapterId = null } = req.body;
      const userId = req.user.userId;

      // Check if user has permission to create forums
      const hasPermission = req.user.permissions?.includes('discussion:create') ||
                           req.user.permissions?.includes('forum:create') ||
                           req.user.role === 'admin' ||
                           req.user.role === 'teacher';

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create forums'
        });
      }

      // Get user's chapter
      const user = await db('users').where({ id: userId }).select('chapter_id').first();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.chapter_id) {
        return res.status(400).json({
          success: false,
          message: 'User must be assigned to a chapter to create forums'
        });
      }

      // Auto-moderation check for title and description
      const achievementService = require('../services/achievementService');
      const titleModeration = await achievementService.moderateContent(title, userId);
      const descModeration = await achievementService.moderateContent(description || '', userId);

      if (titleModeration.needsModeration || descModeration.needsModeration) {
        return res.status(400).json({
          success: false,
          message: 'Forum title or description requires moderation',
          flags: [...(titleModeration.flags || []), ...(descModeration.flags || [])]
        });
      }

      const forum = await Forum.create({
        title,
        description,
        chapter_id: user.chapter_id,
        created_by: userId,
        is_public: isPublic,
        is_active: true
      });

      // Track engagement
      await db('user_engagement').insert({
        user_id: userId,
        engagement_type: 'forum_created',
        content_type: 'forum',
        content_id: forum.id,
        points_earned: 25,
        metadata: { category, is_public: isPublic }
      });

      res.status(201).json({
        success: true,
        message: 'Forum created successfully',
        data: { forum }
      });
    } catch (error) {
      console.error('Create forum error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create forum'
      });
    }
  },

  // Get forums accessible to user (public + user's chapter)
  async getForums(req, res) {
    try {
      const userId = req.user.userId;

      const forums = await Forum.findAccessibleForums(userId);

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

      // Rate limiting (REQUIREMENT: Prevents spam)
      const rateLimitMiddleware = rateLimiter('post');
      await new Promise((resolve, reject) => {
        rateLimitMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // User validation and spam prevention
      const userValidation = await autoModerationService.validateUserAction(userId, 'post');
      if (!userValidation.allowed) {
        return res.status(403).json({
          success: false,
          message: userValidation.reason,
          details: userValidation.details
        });
      }

      // Auto-moderation check (REQUIREMENT: Prevents spam, abusive content)
      const moderationResult = await autoModerationService.submitForModeration(
        'topic',
        null, // Will be set after creation
        `${title} ${content}`,
        userId
      );

      if (moderationResult.autoFlagged) {
        return res.status(400).json({
          success: false,
          message: 'Your content has been flagged for review. Please try again later.',
          reason: moderationResult.reason
        });
      }

      // Sanitize content
      const sanitizedContent = autoModerationService.sanitizeContent(content);
      const sanitizedTitle = autoModerationService.sanitizeContent(title);

      // Get user's chapter for private thread access
      const user = await db('users').where({ id: userId }).select('chapter_id').first();
      const allowedChapter = isPrivate ? (allowedChapterId || user.chapter_id) : null;

      const topic = await ForumTopic.create({
        forum_id: forumId,
        title: sanitizedTitle,
        content: sanitizedContent,
        author_id: userId
      });

      // Update moderation record with actual topic ID
      if (moderationResult.moderationStatus === 'approved') {
        await db('content_moderation')
          .where({ content_type: 'topic', content_id: null })
          .where('created_at', '>', db.raw("NOW() - INTERVAL '1 minute'"))
          .update({ content_id: topic.id });
      }

      // Queue real-time updates for badges/leaderboards (REQUIREMENT: Updates within 1 minute)
      await realtimeUpdateService.queueUpdate('badge', userId, user.chapter_id, {
        action: 'topic_created',
        topic_id: topic.id
      });

      await realtimeUpdateService.queueUpdate('leaderboard', userId, user.chapter_id, {
        action: 'topic_created',
        points: 10 // Points for creating a topic
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
        content_type: 'forum_topic',
        content_id: topic.id,
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

  // Get topic with replies
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

      // Check if user liked this topic
      const userLike = await db('forum_topic_likes')
        .where({ topic_id: topicId, user_id: userId })
        .first();

      // Get topic with additional fields
      const topicWithMeta = {
        ...topic,
        user_liked: !!userLike,
        likes_count: topic.like_count || 0,
        is_locked: topic.is_locked || false,
        is_pinned: topic.is_pinned || false
      };

      // Increment view count
      await ForumTopic.incrementViewCount(topicId);

      // Get replies (all forum_posts for this topic)
      const replies = await db('forum_posts')
        .where({ topic_id: topicId })
        .join('users', 'forum_posts.author_id', 'users.id')
        .select(
          'forum_posts.*',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as author_name"),
          db.raw('0 as likes_count') // Add likes_count field for consistency
        )
        .orderBy('forum_posts.created_at', 'asc')
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit));

      // REQUIREMENT: Youth privacy is strictly enforced
      const youthPrivacyService = require('../services/youthPrivacyService');
      const processedReplies = await Promise.all(
        replies.map(reply => youthPrivacyService.enforceYouthPrivacyOnForumPost(reply, userId))
      );

      res.json({
        success: true,
        data: {
          topic: topicWithMeta,
          replies: processedReplies
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
        author_id: userId,
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
        content_type: 'forum_post',
        content_id: post.id,
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

  // Like a topic
  async likeTopic(req, res) {
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

      // Check if already liked
      const existingLike = await db('forum_topic_likes')
        .where({ topic_id: topicId, user_id: userId })
        .first();

      if (existingLike) {
        // Unlike the topic
        await db('forum_topic_likes')
          .where({ topic_id: topicId, user_id: userId })
          .del();

        await db('forum_topics')
          .where({ id: topicId })
          .decrement('like_count', 1);

        res.json({
          success: true,
          message: 'Topic unliked successfully'
        });
      } else {
        // Like the topic
        await db('forum_topic_likes').insert({
          topic_id: topicId,
          user_id: userId
        });

        await db('forum_topics')
          .where({ id: topicId })
          .increment('like_count', 1);

        res.json({
          success: true,
          message: 'Topic liked successfully'
        });
      }
    } catch (error) {
      console.error('Like topic error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to like topic'
      });
    }
  },

  // Create reply to topic
  async createReply(req, res) {
    try {
      const { topicId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Reply content is required'
        });
      }

      const topic = await ForumTopic.findById(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Create reply (post)
      const [replyId] = await db('forum_posts').insert({
        topic_id: topicId,
        author_id: userId,
        content: content.trim()
      }).returning('id');

      const reply = await db('forum_posts')
        .where({ id: replyId })
        .leftJoin('users', 'forum_posts.author_id', 'users.id')
        .select(
          'forum_posts.*',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as author_name")
        )
        .first();

      res.json({
        success: true,
        data: { reply }
      });
    } catch (error) {
      console.error('Create reply error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create reply'
      });
    }
  },

  // Share a topic
  async shareTopic(req, res) {
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

      // Generate shareable link
      const shareLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forums/${topic.forum_id}/topics/${topicId}`;

      res.json({
        success: true,
        data: {
          shareLink,
          topicTitle: topic.title
        }
      });
    } catch (error) {
      console.error('Share topic error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate share link'
      });
    }
  },

  // Report a topic
  async reportTopic(req, res) {
    try {
      const { topicId } = req.params;
      const { reason, details } = req.body;
      const userId = req.user.userId;

      const topic = await ForumTopic.findById(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Check if already reported
      const existingReport = await db('forum_reports')
        .where({ topic_id: topicId, reported_by: userId })
        .first();

      if (existingReport) {
        return res.status(400).json({
          success: false,
          message: 'You have already reported this topic'
        });
      }

      // Create report
      await db('forum_reports').insert({
        topic_id: topicId,
        reported_by: userId,
        reason,
        details,
        status: 'pending'
      });

      res.json({
        success: true,
        message: 'Topic reported successfully'
      });
    } catch (error) {
      console.error('Report topic error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to report topic'
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
  },

  // Polls functionality
  createPoll: async function(req, res) {
    try {
      const { topicId } = req.params;
      const { question, description, options, allowMultipleVotes, isAnonymous, endsAt } = req.body;
      const userId = req.user.userId;

      // Check if topic exists and user can create polls
      const topic = await ForumTopic.findById(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Check if user has permission to create polls (topic author or moderator)
      if (topic.author_id !== userId) {
        // Check if user is moderator/admin
        const user = await db('users').where({ id: userId }).select('role').first();
        if (!['moderator', 'admin'].includes(user.role)) {
          return res.status(403).json({
            success: false,
            message: 'Only topic authors and moderators can create polls'
          });
        }
      }

      // Check if poll already exists for this topic
      const existingPoll = await db('forum_polls').where({ topic_id: topicId }).first();
      if (existingPoll) {
        return res.status(400).json({
          success: false,
          message: 'A poll already exists for this topic'
        });
      }

      // Validate options
      if (!options || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Poll must have at least 2 options'
        });
      }

      // Create poll
      const [poll] = await db('forum_polls').insert({
        topic_id: topicId,
        question,
        description,
        allow_multiple_votes: allowMultipleVotes || false,
        is_anonymous: isAnonymous || false,
        ends_at: endsAt ? new Date(endsAt) : null,
        created_by: userId
      }).returning('*');

      // Create poll options
      const pollOptions = options.map((optionText, index) => ({
        poll_id: poll.id,
        option_text: optionText,
        order_index: index
      }));

      await db('forum_poll_options').insert(pollOptions);

      res.json({
        success: true,
        data: { poll },
        message: 'Poll created successfully'
      });
    } catch (error) {
      console.error('Create poll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create poll'
      });
    }
  },

  votePoll: async function(req, res) {
    try {
      const { pollId } = req.params;
      const { optionIds } = req.body; // array of option IDs
      const userId = req.user.userId;

      // Check if poll exists
      const poll = await db('forum_polls').where({ id: pollId }).first();
      if (!poll) {
        return res.status(404).json({
          success: false,
          message: 'Poll not found'
        });
      }

      // Check if poll has ended
      if (poll.ends_at && new Date() > new Date(poll.ends_at)) {
        return res.status(400).json({
          success: false,
          message: 'Poll has ended'
        });
      }

      // Validate option IDs
      if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one option must be selected'
        });
      }

      // Check if user already voted (unless multiple votes allowed)
      const existingVotes = await db('forum_poll_votes')
        .where({ poll_id: pollId, user_id: userId })
        .select('option_id');

      if (existingVotes.length > 0 && !poll.allow_multiple_votes) {
        return res.status(400).json({
          success: false,
          message: 'You have already voted on this poll'
        });
      }

      // Validate that all option IDs belong to this poll
      const validOptions = await db('forum_poll_options')
        .where('poll_id', pollId)
        .whereIn('id', optionIds)
        .select('id');

      if (validOptions.length !== optionIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid poll options'
        });
      }

      // If multiple votes not allowed, remove existing votes
      if (!poll.allow_multiple_votes && existingVotes.length > 0) {
        await db('forum_poll_votes')
          .where({ poll_id: pollId, user_id: userId })
          .del();

        // Decrement vote counts for previously selected options
        for (const vote of existingVotes) {
          await db('forum_poll_options')
            .where({ id: vote.option_id })
            .decrement('vote_count', 1);
        }
      }

      // Add new votes
      const votesToInsert = optionIds.map(optionId => ({
        poll_id: pollId,
        option_id: optionId,
        user_id: userId
      }));

      await db('forum_poll_votes').insert(votesToInsert);

      // Increment vote counts
      for (const optionId of optionIds) {
        await db('forum_poll_options')
          .where({ id: optionId })
          .increment('vote_count', 1);
      }

      res.json({
        success: true,
        message: 'Vote submitted successfully'
      });
    } catch (error) {
      console.error('Vote poll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit vote'
      });
    }
  },

  pinTopic: async function(req, res) {
    try {
      const { topicId } = req.params;
      const userId = req.user.userId;

      // Check if topic exists
      const topic = await ForumTopic.findById(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Check if user has permission to pin topics (moderator/admin)
      const user = await db('users').where({ id: userId }).select('role').first();
      if (!['moderator', 'admin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only moderators and admins can pin topics'
        });
      }

      // Update topic
      await db('forum_topics')
        .where({ id: topicId })
        .update({
          is_pinned: true,
          pinned_by: userId,
          pinned_at: new Date(),
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Topic pinned successfully'
      });
    } catch (error) {
      console.error('Pin topic error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pin topic'
      });
    }
  },

  unpinTopic: async function(req, res) {
    try {
      const { topicId } = req.params;
      const userId = req.user.userId;

      // Check if topic exists
      const topic = await ForumTopic.findById(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Check if user has permission to unpin topics (moderator/admin)
      const user = await db('users').where({ id: userId }).select('role').first();
      if (!['moderator', 'admin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only moderators and admins can unpin topics'
        });
      }

      // Update topic
      await db('forum_topics')
        .where({ id: topicId })
        .update({
          is_pinned: false,
          pinned_by: null,
          pinned_at: null,
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Topic unpinned successfully'
      });
    } catch (error) {
      console.error('Unpin topic error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unpin topic'
      });
    }
  },

  uploadAttachment: async function(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const { postId, topicId } = req.body;
      const userId = req.user.userId;

      // Validate that either postId or topicId is provided, but not both
      if ((!postId && !topicId) || (postId && topicId)) {
        return res.status(400).json({
          success: false,
          message: 'Either postId or topicId must be provided, but not both'
        });
      }

      // Check permissions
      if (postId) {
        const post = await db('forum_posts').where({ id: postId }).first();
        if (!post) {
          return res.status(404).json({
            success: false,
            message: 'Post not found'
          });
        }
        if (post.author_id !== userId) {
          return res.status(403).json({
            success: false,
            message: 'You can only upload attachments to your own posts'
          });
        }
      }

      if (topicId) {
        const topic = await ForumTopic.findById(topicId);
        if (!topic) {
          return res.status(404).json({
            success: false,
            message: 'Topic not found'
          });
        }
        if (topic.author_id !== userId) {
          return res.status(403).json({
            success: false,
            message: 'You can only upload attachments to your own topics'
          });
        }
      }

      // Determine file type
      const mimeType = req.file.mimetype;
      let fileType = 'document';
      if (mimeType.startsWith('image/')) {
        fileType = 'image';
      } else if (mimeType.startsWith('video/')) {
        fileType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        fileType = 'audio';
      }

      // Create unique filename
      const fileExtension = req.file.originalname.split('.').pop();
      const uniqueName = `forum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const filePath = `/uploads/forum/${uniqueName}`;

      // Save file (in production, this would upload to cloud storage)
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../uploads/forum');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      fs.writeFileSync(path.join(uploadsDir, uniqueName), req.file.buffer);

      // Save attachment record
      const [attachment] = await db('forum_attachments').insert({
        post_id: postId || null,
        topic_id: topicId || null,
        file_name: uniqueName,
        original_name: req.file.originalname,
        file_path: filePath,
        file_type: fileType,
        mime_type: mimeType,
        file_size: req.file.size,
        uploaded_by: userId
      }).returning('*');

      res.json({
        success: true,
        data: { attachment },
        message: 'File uploaded successfully'
      });
    } catch (error) {
      console.error('Upload attachment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload file'
      });
    }
  },

  deleteAttachment: async function(req, res) {
    try {
      const { attachmentId } = req.params;
      const userId = req.user.userId;

      // Check if attachment exists
      const attachment = await db('forum_attachments').where({ id: attachmentId }).first();
      if (!attachment) {
        return res.status(404).json({
          success: false,
          message: 'Attachment not found'
        });
      }

      // Check if user owns the attachment
      if (attachment.uploaded_by !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own attachments'
        });
      }

      // Delete file from storage
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../uploads/forum', attachment.file_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete attachment record
      await db('forum_attachments').where({ id: attachmentId }).del();

      res.json({
        success: true,
        message: 'Attachment deleted successfully'
      });
    } catch (error) {
      console.error('Delete attachment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete attachment'
      });
    }
  },

  // Get leaderboards with privacy controls (REQUIREMENT: Non-sensitive profile info)
  async getLeaderboards(req, res) {
    try {
      const { type = 'chapter', chapterId, limit = 20 } = req.query;
      const userId = req.user?.userId;

      let leaderboardQuery = db('leaderboard_entries as le')
        .leftJoin('users as u', 'le.user_id', 'u.id')
        .where('le.leaderboard_type', type)
        .orderBy('le.points', 'desc')
        .orderBy('le.updated_at', 'desc')
        .limit(parseInt(limit));

      // Filter by chapter if specified
      if (chapterId) {
        leaderboardQuery = leaderboardQuery.where('le.chapter_id', chapterId);
      }

      const leaderboardEntries = await leaderboardQuery.select([
        'le.*',
        'u.first_name',
        'u.last_name',
        'u.profile_picture',
        'u.role'
      ]);

      // Apply privacy filtering (REQUIREMENT: Youth privacy enforcement)
      const filteredLeaderboard = await privacyService.filterLeaderboardData(
        leaderboardEntries.map(entry => ({
          user_id: entry.user_id,
          rank: entry.rank,
          points: entry.points,
          first_name: entry.first_name,
          last_name: entry.last_name,
          profile_picture: entry.profile_picture,
          role: entry.role
        }))
      );

      res.json({
        success: true,
        data: {
          leaderboard: filteredLeaderboard,
          type,
          chapterId,
          total: filteredLeaderboard.length
        }
      });
    } catch (error) {
      console.error('Get leaderboards error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboards'
      });
    }
  },

  // Update user privacy settings
  async updatePrivacySettings(req, res) {
    try {
      const userId = req.user.userId;
      const settings = req.body;

      const result = await privacyService.updatePrivacySettings(userId, settings);

      if (result.success) {
        res.json({
          success: true,
          message: 'Privacy settings updated successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update privacy settings',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Update privacy settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update privacy settings'
      });
    }
  }
};

module.exports = forumController;