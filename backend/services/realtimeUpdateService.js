const db = require('../config/database');

class RealtimeUpdateService {
  constructor() {
    this.updateQueue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  // Queue an update for processing
  async queueUpdate(updateType, userId, chapterId, updateData) {
    try {
      // Add to database queue for persistence
      const [queuedUpdate] = await db('realtime_update_queue').insert({
        update_type: updateType,
        user_id: userId,
        chapter_id: chapterId,
        update_data: updateData,
        status: 'pending'
      }).returning('*');

      console.log(`📋 Queued ${updateType} update for user ${userId}`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }

      return { success: true, queueId: queuedUpdate.id };
    } catch (error) {
      console.error('Queue update error:', error);
      return { success: false, error: error.message };
    }
  }

  // Process the update queue
  async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log('🔄 Starting real-time update processing...');

    try {
      while (true) {
        // Get pending updates (limit to 10 at a time for performance)
        const pendingUpdates = await db('realtime_update_queue')
          .where({ status: 'pending' })
          .orWhere(function() {
            this.where({ status: 'failed' })
                .where('retry_count', '<', this.maxRetries)
                .where('next_retry_at', '<=', new Date());
          })
          .orderBy('created_at', 'asc')
          .limit(10);

        if (pendingUpdates.length === 0) {
          break; // No more updates to process
        }

        console.log(`📊 Processing ${pendingUpdates.length} updates`);

        // Process each update
        for (const update of pendingUpdates) {
          try {
            await this.processUpdate(update);
            await db('realtime_update_queue')
              .where({ id: update.id })
              .update({ status: 'completed' });
          } catch (error) {
            console.error(`❌ Update ${update.id} failed:`, error);

            const retryCount = update.retry_count + 1;
            const nextRetryAt = new Date(Date.now() + (this.retryDelay * retryCount));

            if (retryCount >= this.maxRetries) {
              await db('realtime_update_queue')
                .where({ id: update.id })
                .update({
                  status: 'failed',
                  retry_count: retryCount
                });
            } else {
              await db('realtime_update_queue')
                .where({ id: update.id })
                .update({
                  status: 'failed',
                  retry_count: retryCount,
                  next_retry_at: nextRetryAt
                });
            }
          }
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Real-time update processing completed');
    } catch (error) {
      console.error('❌ Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual update
  async processUpdate(update) {
    const { update_type, user_id, chapter_id, update_data } = update;

    switch (update_type) {
      case 'badge':
        await this.updateUserBadges(user_id, update_data);
        break;

      case 'leaderboard':
        await this.updateLeaderboard(user_id, chapter_id, update_data);
        break;

      case 'achievement':
        await this.updateUserAchievements(user_id, update_data);
        break;

      default:
        console.warn(`Unknown update type: ${update_type}`);
    }
  }

  // Update user badges based on achievements
  async updateUserBadges(userId, achievementData) {
    try {
      // Check if user qualifies for new badges
      const userStats = await this.getUserStats(userId);
      const availableBadges = await db('badges')
        .where({ is_active: true })
        .select('*');

      const newBadges = [];

      for (const badge of availableBadges) {
        // Check if user already has this badge
        const existingBadge = await db('user_badges')
          .where({ user_id: userId, badge_id: badge.id })
          .first();

        if (existingBadge) continue;

        // Check if user meets badge requirements
        const requirements = badge.requirements || {};
        let qualifies = true;

        // Check various criteria
        if (requirements.posts_count && userStats.posts < requirements.posts_count) {
          qualifies = false;
        }
        if (requirements.likes_received && userStats.likes_received < requirements.likes_received) {
          qualifies = false;
        }
        if (requirements.comments_count && userStats.comments < requirements.comments_count) {
          qualifies = false;
        }
        if (requirements.days_active && userStats.days_active < requirements.days_active) {
          qualifies = false;
        }

        if (qualifies) {
          newBadges.push(badge);
        }
      }

      // Award new badges
      for (const badge of newBadges) {
        await db('user_badges').insert({
          user_id: userId,
          badge_id: badge.id,
          earned_at: new Date()
        });

        console.log(`🏆 Awarded badge "${badge.name}" to user ${userId}`);
      }

      return { awarded: newBadges.length };
    } catch (error) {
      console.error('Badge update error:', error);
      throw error;
    }
  }

  // Update leaderboard rankings
  async updateLeaderboard(userId, chapterId, activityData) {
    try {
      // Calculate user's new score
      const userStats = await this.getUserStats(userId);
      const score = this.calculateLeaderboardScore(userStats);

      // Update or insert leaderboard entry
      const existingEntry = await db('leaderboard_entries')
        .where({
          user_id: userId,
          chapter_id: chapterId,
          leaderboard_type: 'chapter'
        })
        .first();

      if (existingEntry) {
        await db('leaderboard_entries')
          .where({ id: existingEntry.id })
          .update({
            points: score,
            updated_at: new Date()
          });
      } else {
        await db('leaderboard_entries').insert({
          user_id: userId,
          chapter_id: chapterId,
          leaderboard_type: 'chapter',
          points: score,
          rank: 0 // Will be calculated below
        });
      }

      // Update ranks for the chapter
      await this.updateChapterRanks(chapterId);

      console.log(`📊 Updated leaderboard for user ${userId} in chapter ${chapterId}`);
      return { score };
    } catch (error) {
      console.error('Leaderboard update error:', error);
      throw error;
    }
  }

  // Update chapter ranks
  async updateChapterRanks(chapterId) {
    try {
      // Get all entries for this chapter ordered by points
      const entries = await db('leaderboard_entries')
        .where({ chapter_id: chapterId, leaderboard_type: 'chapter' })
        .orderBy('points', 'desc')
        .select('*');

      // Update ranks
      for (let i = 0; i < entries.length; i++) {
        await db('leaderboard_entries')
          .where({ id: entries[i].id })
          .update({ rank: i + 1 });
      }
    } catch (error) {
      console.error('Chapter ranks update error:', error);
      throw error;
    }
  }

  // Update user achievements
  async updateUserAchievements(userId, achievementData) {
    try {
      // This could be expanded based on specific achievement logic
      // For now, just log the achievement
      console.log(`🎯 Achievement update for user ${userId}:`, achievementData);

      // Could trigger notifications, special rewards, etc.
      return { processed: true };
    } catch (error) {
      console.error('Achievement update error:', error);
      throw error;
    }
  }

  // Get comprehensive user statistics
  async getUserStats(userId) {
    try {
      const [
        posts,
        likesReceived,
        comments,
        daysActive
      ] = await Promise.all([
        db('community_posts').where({ author_id: userId }).count('id as count').first(),
        db('community_posts as cp')
          .leftJoin('community_post_likes as cpl', 'cp.id', 'cpl.post_id')
          .where({ 'cp.author_id': userId })
          .count('cpl.id as count')
          .first(),
        db('community_post_comments').where({ author_id: userId }).count('id as count').first(),
        // Calculate days since first activity
        db('users').where({ id: userId }).select('created_at').first()
      ]);

      const firstActivity = new Date(daysActive.created_at);
      const daysActiveCount = Math.floor((Date.now() - firstActivity.getTime()) / (1000 * 60 * 60 * 24));

      return {
        posts: parseInt(posts.count),
        likes_received: parseInt(likesReceived.count),
        comments: parseInt(comments.count),
        days_active: daysActiveCount
      };
    } catch (error) {
      console.error('User stats error:', error);
      return { posts: 0, likes_received: 0, comments: 0, days_active: 0 };
    }
  }

  // Calculate leaderboard score
  calculateLeaderboardScore(stats) {
    // Weighted scoring algorithm
    const postWeight = 10;
    const likeWeight = 2;
    const commentWeight = 5;
    const activityWeight = 1;

    return (
      stats.posts * postWeight +
      stats.likes_received * likeWeight +
      stats.comments * commentWeight +
      stats.days_active * activityWeight
    );
  }

  // Start the queue processor (call this on server startup)
  startQueueProcessor() {
    // Process queue every 30 seconds
    setInterval(() => {
      this.processQueue();
    }, 30000);

    // Also process immediately on startup
    this.processQueue();
  }
}

module.exports = new RealtimeUpdateService();
