const chapterArchivingService = require('./chapterArchivingService');
const realtimeUpdateService = require('./realtimeUpdateService');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Start all scheduled jobs
  start() {
    if (this.isRunning) return;

    console.log('🚀 Starting scheduled services...');
    this.isRunning = true;

    // Chapter archiving - run daily at 2 AM
    this.scheduleJob('chapterArchiving', () => {
      this.runChapterArchiving();
    }, '0 2 * * *'); // Daily at 2 AM

    // Real-time update queue processing - run every 30 seconds
    this.scheduleJob('realtimeUpdates', () => {
      realtimeUpdateService.processQueue();
    }, '*/30 * * * * *'); // Every 30 seconds

    // System health checks - run every 5 minutes
    this.scheduleJob('systemHealth', () => {
      this.runSystemHealthCheck();
    }, '*/5 * * * *'); // Every 5 minutes

    // Leaderboard updates - run hourly
    this.scheduleJob('leaderboardRefresh', () => {
      this.refreshAllLeaderboards();
    }, '0 * * * *'); // Every hour

    console.log('✅ Scheduled services started');
  }

  // Stop all scheduled jobs
  stop() {
    if (!this.isRunning) return;

    console.log('🛑 Stopping scheduled services...');
    this.isRunning = false;

    // Clear all intervals
    for (const [jobName, jobData] of this.jobs) {
      if (jobData.interval) {
        clearInterval(jobData.interval);
      }
    }

    this.jobs.clear();
    console.log('✅ Scheduled services stopped');
  }

  // Schedule a recurring job using cron-like syntax
  scheduleJob(jobName, jobFunction, cronExpression) {
    const intervalMs = this.cronToMs(cronExpression);

    if (!intervalMs) {
      console.warn(`⚠️ Invalid cron expression for ${jobName}: ${cronExpression}`);
      return;
    }

    const interval = setInterval(jobFunction, intervalMs);
    this.jobs.set(jobName, { interval, cronExpression, jobFunction });

    console.log(`📅 Scheduled ${jobName} to run every ${intervalMs}ms (${cronExpression})`);
  }

  // Convert simple cron expressions to milliseconds
  cronToMs(cronExpression) {
    // Support for basic cron patterns
    const patterns = {
      // Seconds: */30 * * * * *
      '*/30 * * * * *': 30 * 1000,
      // Minutes: */5 * * * *
      '*/5 * * * *': 5 * 60 * 1000,
      // Hourly: 0 * * * *
      '0 * * * *': 60 * 60 * 1000,
      // Daily at 2 AM: 0 2 * * *
      '0 2 * * *': 24 * 60 * 60 * 1000
    };

    return patterns[cronExpression] || null;
  }

  // Run chapter archiving
  async runChapterArchiving() {
    try {
      console.log('🏛️ Running chapter archiving job...');
      const result = await chapterArchivingService.archiveInactiveChapters();

      if (result.error) {
        console.error('❌ Chapter archiving failed:', result.error);
      } else {
        console.log(`✅ Archived ${result.archived} chapters`);
      }
    } catch (error) {
      console.error('❌ Chapter archiving job error:', error);
    }
  }

  // Run system health check
  async runSystemHealthCheck() {
    try {
      const db = require('../config/database');
      const startTime = Date.now();

      // Test database connection
      await db.raw('SELECT 1');
      const responseTime = Date.now() - startTime;

      // Determine health status
      let status = 'healthy';
      if (responseTime > 5000) status = 'degraded';
      if (responseTime > 30000) status = 'down';

      // Record health data
      await db('system_health').insert({
        component: 'database',
        status,
        response_time: responseTime,
        health_data: {
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });

      // Clean up old health records (keep last 1000)
      await db('system_health')
        .where('id', '<', db.raw('(SELECT id FROM system_health ORDER BY id DESC LIMIT 1 OFFSET 999)'))
        .del();

      console.log(`🏥 System health: ${status} (${responseTime}ms)`);
    } catch (error) {
      console.error('❌ System health check failed:', error);

      // Record failure
      try {
        const db = require('../config/database');
        await db('system_health').insert({
          component: 'database',
          status: 'down',
          error_message: error.message,
          health_data: { error: true }
        });
      } catch (dbError) {
        console.error('❌ Failed to record health failure:', dbError);
      }
    }
  }

  // Refresh all leaderboards
  async refreshAllLeaderboards() {
    try {
      console.log('📊 Refreshing leaderboards...');
      const db = require('../config/database');

      // Get all active chapters
      const chapters = await db('chapters')
        .where({ is_active: true })
        .select('id');

      // Update leaderboards for each chapter
      for (const chapter of chapters) {
        await this.updateChapterLeaderboard(chapter.id);
      }

      console.log('✅ Leaderboards refreshed');
    } catch (error) {
      console.error('❌ Leaderboard refresh error:', error);
    }
  }

  // Update leaderboard for a specific chapter
  async updateChapterLeaderboard(chapterId) {
    try {
      const db = require('../config/database');

      // Get all users in the chapter with their activity scores
      const userStats = await db('users as u')
        .leftJoin('community_posts as cp', function() {
          this.on('u.id', '=', 'cp.author_id')
              .andOn('cp.created_at', '>', db.raw("NOW() - INTERVAL '30 days'"));
        })
        .leftJoin('community_post_likes as cpl', function() {
          this.on('u.id', '=', 'cpl.user_id')
              .andOn('cpl.created_at', '>', db.raw("NOW() - INTERVAL '30 days'"));
        })
        .leftJoin('community_post_comments as cpc', function() {
          this.on('u.id', '=', 'cpc.author_id')
              .andOn('cpc.created_at', '>', db.raw("NOW() - INTERVAL '30 days'"));
        })
        .where('u.chapter_id', chapterId)
        .select([
          'u.id',
          db.raw('COUNT(DISTINCT cp.id) as posts_count'),
          db.raw('COUNT(DISTINCT cpl.id) as likes_count'),
          db.raw('COUNT(DISTINCT cpc.id) as comments_count'),
          db.raw('EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 86400 as days_active')
        ])
        .groupBy('u.id', 'u.created_at');

      // Calculate scores and update leaderboards
      for (const user of userStats) {
        const score = this.calculateLeaderboardScore(user);
        await realtimeUpdateService.queueUpdate('leaderboard', user.id, chapterId, {
          action: 'scheduled_refresh',
          points: score
        });
      }
    } catch (error) {
      console.error(`❌ Chapter ${chapterId} leaderboard update error:`, error);
    }
  }

  // Calculate leaderboard score (same as in realtimeUpdateService)
  calculateLeaderboardScore(stats) {
    const postWeight = 10;
    const likeWeight = 2;
    const commentWeight = 5;
    const activityWeight = 1;

    return (
      (stats.posts_count || 0) * postWeight +
      (stats.likes_count || 0) * likeWeight +
      (stats.comments_count || 0) * commentWeight +
      (stats.days_active || 0) * activityWeight
    );
  }

  // Get scheduler status
  getStatus() {
    const jobs = [];
    for (const [jobName, jobData] of this.jobs) {
      jobs.push({
        name: jobName,
        cron: jobData.cronExpression,
        active: this.isRunning
      });
    }

    return {
      running: this.isRunning,
      jobs: jobs,
      uptime: process.uptime()
    };
  }
}

module.exports = new SchedulerService();
