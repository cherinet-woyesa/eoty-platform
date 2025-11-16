const { Badge, UserBadge, Leaderboard } = require('../models/Forum');
const db = require('../config/database');

class AchievementService {
  constructor() {
    // Enhanced spam keywords (REQUIREMENT: Prevents spam, abusive content)
    this.spamKeywords = [
      'buy now', 'click here', 'make money', 'earn cash',
      'limited offer', 'act now', 'urgent', 'guaranteed',
      'work from home', 'get rich', 'financial freedom',
      'free money', 'no investment', 'guaranteed income',
      'click this link', 'visit this website', 'sign up now'
    ];

    // Enhanced abusive patterns (REQUIREMENT: Prevents spam, abusive content)
    this.abusivePatterns = [
      /(fuck|shit|asshole|bastard|bitch)/i,
      /(idiot|stupid|moron|retard)/i,
      /(kill yourself|die|suicide)/i,
      /(hate you|worthless|useless)/i,
      /(you're dumb|you're stupid|you're an idiot)/i,
      /(shut up|go away|leave me alone)/i
    ];

    // Rate limiting thresholds
    this.rateLimits = {
      postsPerMinute: 5,
      postsPerHour: 20,
      topicsPerDay: 10
    };
  }

  // Auto-moderation for forum content
  async moderateContent(content, userId) {
    const contentLower = content.toLowerCase();
    const flags = [];

    // Check for spam keywords
    this.spamKeywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        flags.push(`spam_${keyword.replace(/\s+/g, '_')}`);
      }
    });

    // Check for abusive language
    this.abusivePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        flags.push('abusive_language');
      }
    });

    // Enhanced rate limiting (REQUIREMENT: Prevents spam, abusive content)
    const recentPosts = await db('forum_posts')
      .where({ author_id: userId })
      .where('created_at', '>', new Date(Date.now() - 60 * 1000)) // Last 1 minute
      .count('id as count')
      .first();

    if (recentPosts.count >= this.rateLimits.postsPerMinute) {
      flags.push('posting_too_fast');
    }

    // Check hourly limit
    const hourlyPosts = await db('forum_posts')
      .where({ author_id: userId })
      .where('created_at', '>', new Date(Date.now() - 60 * 60 * 1000)) // Last hour
      .count('id as count')
      .first();

    if (hourlyPosts.count >= this.rateLimits.postsPerHour) {
      flags.push('excessive_posting');
    }

    // Check for repeated content (spam detection)
    const similarPosts = await db('forum_posts')
      .where({ author_id: userId })
      .where('content', 'like', `%${content.substring(0, 20)}%`)
      .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      .count('id as count')
      .first();

    if (similarPosts.count >= 3) {
      flags.push('repeated_content');
    }

    // Log moderation events
    if (flags.length > 0) {
      await db('moderation_logs').insert({
        moderator_id: null, // Auto-moderation
        action_type: 'auto_flag',
        target_type: 'user_content',
        target_id: userId,
        reason: flags.join(', '),
        details: { content_preview: content.substring(0, 100) }
      });
    }

    return {
      needsModeration: flags.length > 0,
      flags,
      allowed: flags.length === 0
    };
  }

  // Check and award forum participation badges
  async checkForumBadges(userId) {
    const userStats = await this.getUserForumStats(userId);
    
    // First Post Badge
    if (userStats.total_posts === 1) {
      await this.awardBadgeIfEligible(userId, 'first_post');
    }

    // Active Participant (10 posts)
    if (userStats.total_posts >= 10) {
      await this.awardBadgeIfEligible(userId, 'active_participant');
    }

    // Forum Leader (50 posts)
    if (userStats.total_posts >= 50) {
      await this.awardBadgeIfEligible(userId, 'forum_leader');
    }

    // Popular Post (post with 10+ likes)
    if (userStats.max_likes >= 10) {
      await this.awardBadgeIfEligible(userId, 'popular_contributor');
    }

    // Update leaderboard points
    await this.updateUserPoints(userId);
  }

  // Get user forum statistics
  async getUserForumStats(userId) {
    const totalPosts = await db('forum_posts')
      .where({ author_id: userId })
      .count('id as count')
      .first();

    const totalTopics = await db('forum_topics')
      .where({ author_id: userId })
      .count('id as count')
      .first();

    const maxLikes = await db('forum_posts')
      .where({ author_id: userId })
      .max('like_count as max')
      .first();

    return {
      total_posts: parseInt(totalPosts.count) || 0,
      total_topics: parseInt(totalTopics.count) || 0,
      max_likes: parseInt(maxLikes.max) || 0
    };
  }

  // Award badge if user is eligible (REQUIREMENT: Updates within 1 minute)
  async awardBadgeIfEligible(userId, badgeName) {
    const badge = await db('badges').where({ name: badgeName }).first();
    
    if (!badge) {
      console.warn(`Badge not found: ${badgeName}`);
      return;
    }

    const alreadyAwarded = await db('user_badges')
      .where({ user_id: userId, badge_id: badge.id })
      .first();

    if (!alreadyAwarded) {
      // Queue for real-time update (REQUIREMENT: Updates within 1 minute)
      const socialFeaturesService = require('./socialFeaturesService');
      await socialFeaturesService.queueBadgeUpdate(userId, badge.id, 'award', {
        badge_name: badgeName,
        points: badge.points
      });

      // Also award immediately for backward compatibility
      await UserBadge.awardBadge(userId, badge.id, {
        points: badge.points,
        awarded_at: new Date().toISOString()
      });

      console.log(`Awarded badge ${badgeName} to user ${userId}`);
    }
  }

  // Update user points for leaderboard (REQUIREMENT: Updates within 1 minute)
  async updateUserPoints(userId) {
    const user = await db('users').where({ id: userId }).select('chapter_id').first();
    const totalPoints = await UserBadge.getUserPoints(userId);

    // Update chapter leaderboard
    await Leaderboard.updateLeaderboard(userId, user.chapter_id, totalPoints, 'chapter');

    // Queue for real-time update (REQUIREMENT: Updates within 1 minute)
    const socialFeaturesService = require('./socialFeaturesService');
    await socialFeaturesService.queueLeaderboardUpdate(userId, user.chapter_id, 'points_change', 0, {
      total_points: totalPoints
    });

    // Update weekly leaderboard
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    await Leaderboard.updateLeaderboard(userId, user.chapter_id, totalPoints, 'weekly', weekStart);

    // Update monthly leaderboard  
    const monthStart = new Date();
    monthStart.setDate(1); // Start of month
    await Leaderboard.updateLeaderboard(userId, user.chapter_id, totalPoints, 'monthly', monthStart);
  }

  // Get badge progress for user
  async getBadgeProgress(userId, badgeId) {
    const badge = await Badge.findById(badgeId);
    if (!badge || !badge.requirements) return {};

    const requirements = badge.requirements;
    const progress = {};

    if (requirements.lessons_completed) {
      const completed = await db('user_progress')
        .where({ user_id: userId, completed: true })
        .count('id as count')
        .first();
      progress.lessons_completed = {
        current: parseInt(completed.count) || 0,
        required: requirements.lessons_completed
      };
    }

    if (requirements.forum_posts) {
      const posts = await db('forum_posts')
        .where({ author_id: userId })
        .count('id as count')
        .first();
      progress.forum_posts = {
        current: parseInt(posts.count) || 0,
        required: requirements.forum_posts
      };
    }

    if (requirements.resources_viewed) {
      const resources = await db('resource_usage')
        .where({ user_id: userId, action: 'view' })
        .count('id as count')
        .first();
      progress.resources_viewed = {
        current: parseInt(resources.count) || 0,
        required: requirements.resources_viewed
      };
    }

    return progress;
  }

  // Archive inactive chapters
  async archiveInactiveChapters() {
    const inactiveThreshold = new Date();
    inactiveThreshold.setMonth(inactiveThreshold.getMonth() - 6); // 6 months inactive

    const inactiveChapters = await db('forums')
      .select('chapter_id')
      .max('last_activity_at as last_activity')
      .groupBy('chapter_id')
      .having('last_activity', '<', inactiveThreshold);

    for (const chapter of inactiveChapters) {
      await db('forums')
        .where({ chapter_id: chapter.chapter_id })
        .update({ is_active: false });

      console.log(`Archived inactive chapter: ${chapter.chapter_id}`);
    }

    return inactiveChapters.length;
  }
}

module.exports = new AchievementService();