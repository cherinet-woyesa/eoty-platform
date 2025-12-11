const db = require('../config/database');

class Forum {
  static async create(forumData) {
    const [forumId] = await db('forums').insert(forumData).returning('id');
    return await this.findById(forumId.id || forumId);
  }

  static async findById(id) {
    return await db('forums').where({ id }).first();
  }

  static async findByChapter(chapterId, includeInactive = false) {
    let query = db('forums').where({ chapter_id: chapterId });

    if (!includeInactive) {
      query = query.where({ is_active: true });
    }

    return await query.orderBy('created_at', 'desc');
  }

  // Get forums accessible to a user (public forums + user's chapter forums)
  static async findAccessibleForums(userId, includeInactive = false) {
    const user = await db('users').where({ id: userId }).select('chapter_id').first();

    let query = db('forums')
      .where(function() {
        this.where('forums.is_public', true) // Public forums from any chapter
           .orWhere('forums.chapter_id', user.chapter_id); // Private forums from user's chapter
      });

    if (!includeInactive) {
      query = query.where('forums.is_active', true);
    }

    return await query
      .leftJoin('users', 'forums.created_by', 'users.id')
      .select(
        'forums.*',
        'users.first_name as creator_first_name',
        'users.last_name as creator_last_name',
        'users.chapter_id as creator_chapter'
      )
      .orderBy('forums.created_at', 'desc');
  }

  static async checkMembership(forumId, userId) {
    const forum = await this.findById(forumId);
    if (!forum) return false;

    // Get user's chapter
    const user = await db('users').where({ id: userId }).select('chapter_id').first();
    
    // Check if forum is public or user is in same chapter
    // Use loose equality or string conversion to handle potential type mismatches (string vs int)
    if (forum.is_public || String(forum.chapter_id) === String(user.chapter_id)) {
      return true;
    }

    return false;
  }

  static async updateActivity(forumId) {
    return await db('forums')
      .where({ id: forumId })
      .update({ updated_at: new Date() });
  }
}

class ForumTopic {
  static async create(topicData) {
    const [topicId] = await db('forum_topics').insert(topicData).returning('id');
    
    // Update forum activity
    await Forum.updateActivity(topicData.forum_id);
    
    return await this.findById(topicId.id || topicId);
  }

  static async findById(id) {
    return await db('forum_topics')
      .where('forum_topics.id', id)
      .join('users', 'forum_topics.author_id', 'users.id')
      .select(
        'forum_topics.*',
        'users.first_name',
        'users.last_name',
        'users.chapter_id as author_chapter'
      )
      .first();
  }

  static async findByForum(forumId, page = 1, limit = 20, userId = null) {
    const offset = (page - 1) * limit;
    
    let query = db('forum_topics')
      .where({ forum_id: forumId })
      .join('users', 'forum_topics.author_id', 'users.id')
      .leftJoin('forum_posts', 'forum_topics.last_post_id', 'forum_posts.id')
      .leftJoin('users as last_users', 'forum_posts.author_id', 'last_users.id');

    // Forum access is already validated at the controller level
    // All topics from accessible forums are shown (no topic-level privacy implemented yet)
    
    return await query
      .select(
        'forum_topics.*',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'forum_posts.created_at as last_post_at',
        'last_users.first_name as last_post_first_name',
        'last_users.last_name as last_post_last_name'
      )
      .orderBy('forum_topics.is_pinned', 'desc')
      .orderBy('forum_topics.last_activity_at', 'desc')
      .offset(offset)
      .limit(limit);
  }

  static async incrementViewCount(topicId) {
    return await db('forum_topics')
      .where({ id: topicId })
      .increment('view_count', 1);
  }

  static async updateLastActivity(topicId, postId) {
    return await db('forum_topics')
      .where({ id: topicId })
      .update({
        last_post_id: postId,
        last_activity_at: new Date(),
        post_count: db.raw('post_count + 1')
      });
  }
}

class ForumPost {
  static async create(postData) {
    const [postId] = await db('forum_posts').insert(postData).returning('id');
    
    // Update topic activity
    if (postData.topic_id) {
      await ForumTopic.updateLastActivity(postData.topic_id, postId.id || postId);
    }
    
    return await this.findById(postId.id || postId);
  }

  static async findById(id) {
    return await db('forum_posts')
      .where({ id })
      .join('users', 'forum_posts.author_id', 'users.id')
      .select(
        'forum_posts.*',
        'users.first_name',
        'users.last_name',
        'users.chapter_id as author_chapter'
      )
      .first();
  }

  static async findByTopic(topicId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    
    return await db('forum_posts')
      .where({ topic_id: topicId })
      .whereNull('parent_id') // Only top-level posts
      .join('users', 'forum_posts.author_id', 'users.id')
      .select(
        'forum_posts.*',
        'users.first_name',
        'users.last_name',
        'users.chapter_id as author_chapter'
      )
      .orderBy('forum_posts.created_at', 'asc')
      .offset(offset)
      .limit(limit);
  }

  static async getReplies(parentId) {
    return await db('forum_posts')
      .where({ parent_id: parentId })
      .join('users', 'forum_posts.author_id', 'users.id')
      .select(
        'forum_posts.*',
        'users.first_name',
        'users.last_name'
      )
      .orderBy('forum_posts.created_at', 'asc');
  }

  static async moderatePost(postId, moderatorId, reason, action = 'moderate') {
    return await db('forum_posts')
      .where({ id: postId })
      .update({
        is_moderated: true,
        moderation_reason: reason
      });
  }
}

class Badge {
  static async create(badgeData) {
    const [badgeId] = await db('badges').insert(badgeData).returning('id');
    return await this.findById(badgeId.id || badgeId);
  }

  static async findById(id) {
    return await db('badges').where({ id }).first();
  }

  static async findAllActive() {
    return await db('badges').where({ is_active: true }).orderBy('points', 'desc');
  }

  static async findByType(badgeType) {
    return await db('badges').where({ badge_type: badgeType, is_active: true });
  }

  static async checkEligibility(userId, badgeId) {
    const badge = await this.findById(badgeId);
    if (!badge || !badge.requirements) return false;

    const requirements = badge.requirements;
    let eligible = true;

    // Check completion requirements
    if (requirements.lessons_completed) {
      const completed = await db('user_progress')
        .where({ user_id: userId, completed: true })
        .count('id as count')
        .first();
      eligible = eligible && (completed.count >= requirements.lessons_completed);
    }

    // Check forum participation
    if (requirements.forum_posts) {
      const posts = await db('forum_posts')
        .where({ author_id: userId })
        .count('id as count')
        .first();
      eligible = eligible && (posts.count >= requirements.forum_posts);
    }

    // Check resource engagement
    if (requirements.resources_viewed) {
      const resources = await db('resource_usage')
        .where({ user_id: userId, action: 'view' })
        .count('id as count')
        .first();
      eligible = eligible && (resources.count >= requirements.resources_viewed);
    }

    return eligible;
  }
}

class UserBadge {
  static async awardBadge(userId, badgeId, metadata = {}) {
    const existing = await db('user_badges')
      .where({ user_id: userId, badge_id: badgeId })
      .first();

    if (!existing) {
      const [userBadgeId] = await db('user_badges').insert({
        user_id: userId,
        badge_id: badgeId,
        metadata
      }).returning('id');

      // Track engagement
      await db('user_engagement').insert({
        user_id: userId,
        engagement_type: 'badge_earned',
        content_type: 'badge',
        content_id: badgeId,
        points_earned: metadata.points || 0,
        metadata: { badge_id: badgeId }
      });

      return await db('user_badges').where({ id: userBadgeId.id || userBadgeId }).first();
    }

    return existing;
  }

  static async getUserBadges(userId) {
    // Check if user_badges table exists
    const hasTable = await db.schema.hasTable('user_badges');
    if (!hasTable) {
      console.warn('user_badges table does not exist. Returning empty array.');
      return [];
    }
    return await db('user_badges')
      .where({ 'user_badges.user_id': userId })
      .join('badges', 'user_badges.badge_id', 'badges.id')
      .select(
        'user_badges.*',
        'badges.name',
        'badges.description',
        'badges.icon_url',
        'badges.badge_type',
        'badges.points'
      )
      .orderBy('user_badges.earned_at', 'desc');
  }

  static async getUserPoints(userId) {
    // Check if user_badges table exists
    const hasTable = await db.schema.hasTable('user_badges');
    if (!hasTable) {
      console.warn('user_badges table does not exist. Returning 0 points.');
      return 0;
    }
    
    const result = await db('user_badges')
      .where({ 'user_badges.user_id': userId })
      .join('badges', 'user_badges.badge_id', 'badges.id')
      .sum('badges.points as total_points')
      .first();

    return result?.total_points || 0;
  }
}

class Leaderboard {
  static async updateLeaderboard(userId, chapterId, points, leaderboardType = 'chapter', periodDate = null) {
    // Get user's anonymity preference (REQUIREMENT: Anonymity opts)
    const user = await db('users').where({ id: userId }).select('is_anonymous').first();
    const isAnonymous = user?.is_anonymous || false;

    const entry = await db('leaderboard_entries')
      .where({
        user_id: userId,
        chapter_id: chapterId,
        leaderboard_type: leaderboardType,
        period_date: periodDate
      })
      .first();

    if (entry) {
      await db('leaderboard_entries')
        .where({ id: entry.id })
        .update({ 
          points: points,
          is_anonymous: isAnonymous // Update anonymity status
        });
    } else {
      await db('leaderboard_entries').insert({
        user_id: userId,
        chapter_id: chapterId,
        leaderboard_type: leaderboardType,
        points: points,
        period_date: periodDate,
        is_anonymous: isAnonymous // REQUIREMENT: Anonymity opts
      });
    }

    // Recalculate ranks
    await this.calculateRanks(chapterId, leaderboardType, periodDate);
  }

  static async calculateRanks(chapterId, leaderboardType, periodDate = null) {
    const entries = await db('leaderboard_entries')
      .where({
        chapter_id: chapterId,
        leaderboard_type: leaderboardType,
        period_date: periodDate
      })
      .orderBy('points', 'desc')
      .select('id');

    let rank = 1;
    for (const entry of entries) {
      await db('leaderboard_entries')
        .where({ id: entry.id })
        .update({ rank: rank++ });
    }
  }

  static async getLeaderboard(chapterId, leaderboardType = 'chapter', periodDate = null, limit = 100, includeAnonymous = true) {
    let query = db('leaderboard_entries')
      .where({
        'leaderboard_entries.chapter_id': chapterId,
        'leaderboard_entries.leaderboard_type': leaderboardType,
        'leaderboard_entries.period_date': periodDate
      })
      .join('users', 'leaderboard_entries.user_id', 'users.id')
      .select(
        'leaderboard_entries.*',
        'users.first_name',
        'users.last_name',
        'users.chapter_id'
      )
      .orderBy('leaderboard_entries.rank', 'asc')
      .limit(limit);

    if (!includeAnonymous) {
      query = query.where('leaderboard_entries.is_anonymous', false);
    }

    return await query;
  }

  static async getGlobalLeaderboard(limit = 100, includeAnonymous = true) {
    // Sum points across all chapters for global ranking (REQUIREMENT: Global rankings)
    let query = db('leaderboard_entries')
      .where({ leaderboard_type: 'chapter' }) // Base on chapter leaderboards
      .join('users', 'leaderboard_entries.user_id', 'users.id')
      .select(
        'leaderboard_entries.user_id',
        'users.first_name',
        'users.last_name',
        'users.chapter_id',
        'leaderboard_entries.is_anonymous',
        db.raw('SUM(leaderboard_entries.points) as total_points')
      )
      .groupBy('leaderboard_entries.user_id', 'users.first_name', 'users.last_name', 'users.chapter_id', 'leaderboard_entries.is_anonymous')
      .orderBy('total_points', 'desc')
      .limit(limit);

    // REQUIREMENT: Anonymity opts
    if (!includeAnonymous) {
      query = query.where('leaderboard_entries.is_anonymous', false);
    }

    return await query;
  }
}

module.exports = {
  Forum,
  ForumTopic,
  ForumPost,
  Badge,
  UserBadge,
  Leaderboard
};