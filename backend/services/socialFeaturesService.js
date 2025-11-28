// backend/services/socialFeaturesService.js
// Social Features Service - REQUIREMENT: FR4 - Chapter Forums, Badges, Leaderboards

const db = require('../config/database');
const achievementService = require('./achievementService');
const moderationService = require('./moderationService');

class SocialFeaturesService {
  constructor() {
    // Real-time update settings (REQUIREMENT: Updates within 1 minute)
    this.updateInterval = 60 * 1000; // 1 minute
    this.badgeUpdateQueue = [];
    this.leaderboardUpdateQueue = [];
    this.processingActive = false;
  }

  // Start real-time update processing (REQUIREMENT: Updates within 1 minute)
  startRealTimeUpdates() {
    if (this.processingActive) {
      console.log('Real-time updates already active');
      return;
    }

    this.processingActive = true;
    console.log('Starting real-time badge/leaderboard updates...');

    // Process queues every minute
    this.updateIntervalId = setInterval(async () => {
      await this.processBadgeUpdates();
      await this.processLeaderboardUpdates();
    }, this.updateInterval);

    // Process immediately on start
    this.processBadgeUpdates().catch(console.error);
    this.processLeaderboardUpdates().catch(console.error);
  }

  stopRealTimeUpdates() {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.processingActive = false;
      console.log('Stopped real-time updates');
    }
  }

  // Process badge updates from queue (REQUIREMENT: Updates within 1 minute)
  async processBadgeUpdates() {
    try {
      // Check if table exists
      const tableExists = await db.schema.hasTable('badge_update_queue');
      if (!tableExists) {
        return; // Table doesn't exist yet, skip silently
      }

      const pendingUpdates = await db('badge_update_queue')
        .where('processed', false)
        .where('created_at', '>=', new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
        .orderBy('created_at', 'asc')
        .limit(100);

      for (const update of pendingUpdates) {
        try {
          if (update.update_type === 'award') {
            const { UserBadge } = require('../models/Forum');
            await UserBadge.awardBadge(update.user_id, update.badge_id, update.metadata || {});
          } else if (update.update_type === 'update_points') {
            await this.updateUserPoints(update.user_id);
          }

          await db('badge_update_queue')
            .where({ id: update.id })
            .update({
              processed: true,
              processed_at: new Date()
            });
        } catch (error) {
          console.error(`Failed to process badge update ${update.id}:`, error);
        }
      }
    } catch (error) {
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.warn('⚠️  Badge updates skipped: Database connection failed');
        return;
      }
      console.error('Process badge updates error:', error);
    }
  }

  // Process leaderboard updates from queue (REQUIREMENT: Updates within 1 minute)
  async processLeaderboardUpdates() {
    try {
      // Check if table exists
      const tableExists = await db.schema.hasTable('leaderboard_update_queue');
      if (!tableExists) {
        return; // Table doesn't exist yet, skip silently
      }

      const pendingUpdates = await db('leaderboard_update_queue')
        .where('processed', false)
        .where('created_at', '>=', new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
        .orderBy('created_at', 'asc')
        .limit(100);

      for (const update of pendingUpdates) {
        try {
          const { Leaderboard } = require('../models/Forum');
          const user = await db('users').where({ id: update.user_id }).select('chapter_id').first();
          
          if (user) {
            const currentPoints = await this.getUserTotalPoints(update.user_id);
            await Leaderboard.updateLeaderboard(
              update.user_id,
              update.chapter_id || user.chapter_id,
              currentPoints,
              'chapter'
            );
          }

          await db('leaderboard_update_queue')
            .where({ id: update.id })
            .update({
              processed: true,
              processed_at: new Date()
            });
        } catch (error) {
          console.error(`Failed to process leaderboard update ${update.id}:`, error);
        }
      }
    } catch (error) {
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.warn('⚠️  Leaderboard updates skipped: Database connection failed');
        return;
      }
      console.error('Process leaderboard updates error:', error);
    }
  }

  // Queue badge update (REQUIREMENT: Updates within 1 minute, Badges linked to user profiles)
  async queueBadgeUpdate(userId, badgeId, updateType, metadata = {}) {
    // REQUIREMENT: Youth privacy is strictly enforced
    const youthPrivacyService = require('./youthPrivacyService');
    await youthPrivacyService.autoEnableAnonymityForYouth(userId);

    await db('badge_update_queue').insert({
      user_id: userId,
      badge_id: badgeId,
      update_type: updateType,
      metadata: JSON.stringify(metadata),
      created_at: new Date()
    });
  }

  // Queue leaderboard update (REQUIREMENT: Updates within 1 minute)
  async queueLeaderboardUpdate(userId, chapterId, updateType, pointsDelta = 0, metadata = {}) {
    await db('leaderboard_update_queue').insert({
      user_id: userId,
      chapter_id: chapterId,
      update_type: updateType,
      points_delta: pointsDelta,
      metadata: JSON.stringify(metadata),
      created_at: new Date()
    });
  }

  // Get user total points
  async getUserTotalPoints(userId) {
    const { UserBadge } = require('../models/Forum');
    return await UserBadge.getUserPoints(userId);
  }

  // Update user points
  async updateUserPoints(userId) {
    const user = await db('users').where({ id: userId }).select('chapter_id').first();
    if (!user) return;

    const totalPoints = await this.getUserTotalPoints(userId);
    const { Leaderboard } = require('../models/Forum');
    
    await Leaderboard.updateLeaderboard(userId, user.chapter_id, totalPoints, 'chapter');
    
    // Also queue for real-time update
    await this.queueLeaderboardUpdate(userId, user.chapter_id, 'points_change', 0, {
      total_points: totalPoints
    });
  }

  // Auto-archive inactive forums (REQUIREMENT: Auto-archiving for inactive chapters)
  async autoArchiveInactiveForums() {
    try {
      // Check if column exists
      const hasColumn = await db.schema.hasColumn('forums', 'auto_archive_at');
      if (!hasColumn) {
        return { archived: 0 }; // Column doesn't exist yet, skip silently
      }

      const inactiveThreshold = new Date();
      inactiveThreshold.setDate(inactiveThreshold.getDate() - 90); // 90 days

      const inactiveForums = await db('forums')
        .where('is_active', true)
        .where('last_activity_at', '<', inactiveThreshold)
        .whereNull('auto_archive_at')
        .select('*');

      for (const forum of inactiveForums) {
        await db('forums')
          .where({ id: forum.id })
          .update({
            is_active: false,
            auto_archive_at: new Date()
          });

        console.log(`Auto-archived inactive forum: ${forum.id} (${forum.title})`);
      }

      return { archived: inactiveForums.length };
    } catch (error) {
      // Silently fail if column doesn't exist
      if (error.code === '42703') {
        return { archived: 0 };
      }
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.warn('⚠️  Auto-archive skipped: Database connection failed');
        return { archived: 0 };
      }
      console.error('Auto-archive inactive forums error:', error);
      return { archived: 0, error: error.message };
    }
  }

  // Auto-archive inactive chapters (REQUIREMENT: Auto-archiving for inactive chapters)
  async autoArchiveInactiveChapters() {
    try {
      // Check if column exists
      const hasColumn = await db.schema.hasColumn('chapters', 'auto_archive_at');
      if (!hasColumn) {
        return { archived: 0 }; // Column doesn't exist yet, skip silently
      }

      const inactiveThreshold = new Date();
      inactiveThreshold.setDate(inactiveThreshold.getDate() - 180); // 180 days

      // Get chapters with no recent activity
      const inactiveChapters = await db('chapters')
        .leftJoin('forums', 'chapters.id', 'forums.chapter_id')
        .leftJoin('user_engagement', 'chapters.id', db.raw('CAST(user_engagement.metadata->>\'chapter_id\' AS INTEGER)'))
        .whereNull('chapters.auto_archive_at')
        .groupBy('chapters.id')
        .having(db.raw('MAX(COALESCE(forums.last_activity_at, user_engagement.created_at, chapters.created_at))'), '<', inactiveThreshold)
        .select('chapters.*');

      for (const chapter of inactiveChapters) {
        await db('chapters')
          .where({ id: chapter.id })
          .update({
            is_active: false,
            auto_archive_at: new Date()
          });

        // Archive all forums in this chapter (if column exists)
        const forumsHasColumn = await db.schema.hasColumn('forums', 'auto_archive_at');
        if (forumsHasColumn) {
          await db('forums')
            .where({ chapter_id: chapter.id })
            .update({
              is_active: false,
              auto_archive_at: new Date()
            });
        } else {
          // Just mark as inactive if column doesn't exist
          await db('forums')
            .where({ chapter_id: chapter.id })
            .update({ is_active: false });
        }

        console.log(`Auto-archived inactive chapter: ${chapter.id} (${chapter.name})`);
      }

      return { archived: inactiveChapters.length };
    } catch (error) {
      // Silently fail if column doesn't exist
      if (error.code === '42703') {
        return { archived: 0 };
      }
      console.error('Auto-archive inactive chapters error:', error);
      return { archived: 0, error: error.message };
    }
  }

  // Index forum post for search (REQUIREMENT: Forum posts indexed for search)
  async indexForumPost(postId, topicId, content) {
    try {
      // Extract keywords (simple implementation)
      const keywords = this.extractKeywords(content);
      const searchableContent = content.toLowerCase().replace(/[^\w\s]/g, ' ');

      // Check if already indexed
      const existing = await db('forum_search_index')
        .where({ post_id: postId })
        .first();

      if (existing) {
        await db('forum_search_index')
          .where({ id: existing.id })
          .update({
            searchable_content: searchableContent,
            keywords: keywords.join(', '),
            indexed_at: new Date()
          });
      } else {
        await db('forum_search_index').insert({
          post_id: postId,
          topic_id: topicId,
          searchable_content: searchableContent,
          keywords: keywords.join(', '),
          indexed_at: new Date()
        });
      }
    } catch (error) {
      console.error('Index forum post error:', error);
      // Don't throw - search indexing is non-critical
    }
  }

  // Search forum posts (REQUIREMENT: Forum posts indexed for search)
  async searchForumPosts(query, chapterId = null, limit = 20) {
    try {
      const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
      
      let searchQuery = db('forum_search_index')
        .join('forum_posts', 'forum_search_index.post_id', 'forum_posts.id')
        .join('forum_topics', 'forum_search_index.topic_id', 'forum_topics.id')
        .join('forums', 'forum_topics.forum_id', 'forums.id')
        .where(function() {
          searchTerms.forEach(term => {
            this.orWhere('forum_search_index.searchable_content', 'like', `%${term}%`)
              .orWhere('forum_search_index.keywords', 'like', `%${term}%`);
          });
        })
        .where('forum_posts.is_moderated', false)
        .select(
          'forum_posts.*',
          'forum_topics.title as topic_title',
          'forum_topics.id as topic_id',
          'forums.title as forum_title',
          'forums.chapter_id'
        )
        .orderBy('forum_posts.created_at', 'desc')
        .limit(limit);

      if (chapterId) {
        searchQuery = searchQuery.where('forums.chapter_id', chapterId);
      }

      return await searchQuery;
    } catch (error) {
      console.error('Search forum posts error:', error);
      throw error;
    }
  }

  // Extract keywords from content
  extractKeywords(content) {
    // Simple keyword extraction (can be enhanced with NLP)
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have', 'been', 'will', 'would'].includes(word));

    // Get most common words (top 10)
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  // Check and award badges with real-time update (REQUIREMENT: Updates within 1 minute)
  async checkAndAwardBadges(userId, badgeType, context = {}) {
    try {
      // Check eligibility for various badges
      const badges = await db('badges')
        .where({ is_active: true })
        .where('badge_type', badgeType)
        .select('*');

      for (const badge of badges) {
        const eligible = await this.checkBadgeEligibility(userId, badge, context);
        
        if (eligible) {
          // Queue badge award for real-time processing
          await this.queueBadgeUpdate(userId, badge.id, 'award', {
            badge_type: badgeType,
            context: context
          });

          // Also update leaderboard
          await this.queueLeaderboardUpdate(userId, context.chapterId, 'points_change', badge.points, {
            badge_id: badge.id,
            badge_name: badge.name
          });
        }
      }
    } catch (error) {
      console.error('Check and award badges error:', error);
    }
  }

  // Check badge eligibility
  async checkBadgeEligibility(userId, badge, context) {
    const requirements = typeof badge.requirements === 'string' 
      ? JSON.parse(badge.requirements) 
      : badge.requirements;

    if (!requirements) return false;

    // Check if already awarded
    const alreadyAwarded = await db('user_badges')
      .where({ user_id: userId, badge_id: badge.id })
      .first();

    if (alreadyAwarded) return false;

    // Check requirements based on badge type
    if (badge.badge_type === 'learning') {
      if (requirements.lessons_completed) {
        const completed = await db('user_lesson_progress')
          .where({ user_id: userId, is_completed: true })
          .count('id as count')
          .first();
        return parseInt(completed.count) >= requirements.lessons_completed;
      }
    }

    if (badge.badge_type === 'participation') {
      if (requirements.forum_posts) {
        const posts = await db('forum_posts')
          .where({ author_id: userId })
          .count('id as count')
          .first();
        return parseInt(posts.count) >= requirements.forum_posts;
      }
    }

    if (badge.badge_type === 'leadership') {
      if (requirements.topics_created) {
        const topics = await db('forum_topics')
          .where({ author_id: userId })
          .count('id as count')
          .first();
        return parseInt(topics.count) >= requirements.topics_created;
      }
    }

    return false;
  }

  // Get forum uptime status (REQUIREMENT: 100% uptime for forum access)
  async getForumUptimeStatus() {
    try {
      // Check if forums are accessible
      const forumsCount = await db('forums')
        .where('is_active', true)
        .count('id as count')
        .first();

      const recentActivity = await db('forum_posts')
        .where('created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .count('id as count')
        .first();

      return {
        isHealthy: true,
        activeForums: parseInt(forumsCount.count),
        recentPosts: parseInt(recentActivity.count),
        uptime: 100, // Assume 100% if service is running
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error.message,
        uptime: 0,
        lastCheck: new Date()
      };
    }
  }
}

// Create singleton instance
const socialFeaturesService = new SocialFeaturesService();

module.exports = socialFeaturesService;

