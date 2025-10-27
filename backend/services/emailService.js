const db = require('../config/database');

class AnalyticsService {
  constructor() {
    this.metricCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Real-time metrics calculation
  async calculateRealTimeMetrics() {
    const cacheKey = 'realtime_metrics';
    const cached = this.metricCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const [
      activeUsersNow,
      currentUploads,
      pendingFlags,
      systemHealth
    ] = await Promise.all([
      this.getActiveUsersNow(),
      this.getCurrentUploads(),
      this.getPendingFlags(),
      this.getSystemHealth()
    ]);

    const metrics = {
      active_users: activeUsersNow,
      uploads_in_progress: currentUploads,
      pending_moderation: pendingFlags,
      system_health: systemHealth,
      last_updated: new Date()
    };

    this.metricCache.set(cacheKey, {
      timestamp: Date.now(),
      data: metrics
    });

    return metrics;
  }

  async getActiveUsersNow() {
    // Users active in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const result = await db('users')
      .where('last_login_at', '>=', fifteenMinutesAgo)
      .count('id as count')
      .first();

    return parseInt(result.count) || 0;
  }

  async getCurrentUploads() {
    const result = await db('content_uploads')
      .whereIn('status', ['pending', 'processing'])
      .count('id as count')
      .first();

    return parseInt(result.count) || 0;
  }

  async getPendingFlags() {
    const result = await db('flagged_content')
      .where({ status: 'pending' })
      .count('id as count')
      .first();

    return parseInt(result.count) || 0;
  }

  async getSystemHealth() {
    // Check database connection
    const dbHealth = await this.checkDatabaseHealth();
    
    // Check file system (simplified)
    const storageHealth = await this.checkStorageHealth();
    
    // Check external services (AI, etc.)
    const servicesHealth = await this.checkServicesHealth();

    return {
      database: dbHealth,
      storage: storageHealth,
      services: servicesHealth,
      overall: dbHealth && storageHealth && servicesHealth ? 'healthy' : 'degraded'
    };
  }

  async checkDatabaseHealth() {
    try {
      await db.raw('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async checkStorageHealth() {
    // Simplified storage check
    // In production, check disk space, S3 connectivity, etc.
    return true;
  }

  async checkServicesHealth() {
    // Check external services like AI, email, etc.
    const checks = {
      ai_service: await this.checkAIService(),
      email_service: await this.checkEmailService()
    };

    return Object.values(checks).every(check => check);
  }

  async checkAIService() {
    try {
      // Simple check - in production, ping AI service
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkEmailService() {
    // Check email service connectivity
    return true;
  }

  // Chapter comparison analytics
  async compareChapterPerformance(timeframe = '30days') {
    const chapters = await db('users').distinct('chapter_id').pluck('chapter_id');
    
    const comparison = {};
    const dateFilter = this.getDateFilter(timeframe);

    for (const chapterId of chapters) {
      const metrics = await this.getChapterMetrics(chapterId, dateFilter);
      comparison[chapterId] = metrics;
    }

    // Calculate rankings
    const rankedChapters = this.rankChapters(comparison);
    
    return {
      comparison,
      rankings: rankedChapters,
      timeframe
    };
  }

  async getChapterMetrics(chapterId, dateFilter) {
    const [
      userGrowth,
      contentActivity,
      forumEngagement,
      completionRates
    ] = await Promise.all([
      this.calculateUserGrowth(chapterId, dateFilter),
      this.calculateContentActivity(chapterId, dateFilter),
      this.calculateForumEngagement(chapterId, dateFilter),
      this.calculateCompletionRates(chapterId, dateFilter)
    ]);

    return {
      user_growth: userGrowth,
      content_activity: contentActivity,
      forum_engagement: forumEngagement,
      completion_rates: completionRates,
      overall_score: this.calculateOverallScore(userGrowth, contentActivity, forumEngagement, completionRates)
    };
  }

  rankChapters(comparison) {
    const chapters = Object.entries(comparison).map(([chapterId, metrics]) => ({
      chapter_id: chapterId,
      score: metrics.overall_score
    }));

    return chapters
      .sort((a, b) => b.score - a.score)
      .map((chapter, index) => ({
        ...chapter,
        rank: index + 1
      }));
  }

  // Trend analysis
  async analyzeTrends(metric, timeframe = '90days') {
    const dateFilter = this.getDateFilter(timeframe);
    
    switch (metric) {
      case 'user_growth':
        return await this.analyzeUserGrowthTrend(dateFilter);
      case 'content_consumption':
        return await this.analyzeContentConsumptionTrend(dateFilter);
      case 'engagement':
        return await this.analyzeEngagementTrend(dateFilter);
      default:
        return {};
    }
  }

  async analyzeUserGrowthTrend(dateFilter) {
    const dailyGrowth = await db('users')
      .where('created_at', '>=', dateFilter)
      .groupByRaw('DATE(created_at)')
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(id) as new_users')
      )
      .orderBy('date', 'asc');

    return {
      data: dailyGrowth,
      trend: this.calculateTrendDirection(dailyGrowth.map(d => d.new_users)),
      summary: this.generateTrendSummary(dailyGrowth, 'user growth')
    };
  }

  // Alert system for anomalies
  async checkForAnomalies() {
    const anomalies = [];

    // Check for sudden drop in activity
    const activityDrop = await this.checkActivityDrop();
    if (activityDrop) {
      anomalies.push({
        type: 'activity_drop',
        severity: 'high',
        message: 'Significant drop in user activity detected',
        details: activityDrop
      });
    }

    // Check for moderation backlog
    const moderationBacklog = await this.checkModerationBacklog();
    if (moderationBacklog) {
      anomalies.push({
        type: 'moderation_backlog',
        severity: 'medium',
        message: 'Moderation queue is growing faster than processing',
        details: moderationBacklog
      });
    }

    // Check for content quality issues
    const qualityIssues = await this.checkContentQuality();
    if (qualityIssues) {
      anomalies.push({
        type: 'content_quality',
        severity: 'low',
        message: 'Potential content quality issues detected',
        details: qualityIssues
      });
    }

    return anomalies;
  }

  async checkActivityDrop() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayActivity = await db('user_engagement')
      .where('created_at', '>=', today.setHours(0, 0, 0, 0))
      .count('id as count')
      .first();

    const yesterdayActivity = await db('user_engagement')
      .whereBetween('created_at', [yesterday.setHours(0, 0, 0, 0), yesterday.setHours(23, 59, 59, 999)])
      .count('id as count')
      .first();

    const dropPercentage = yesterdayActivity.count > 0 
      ? ((yesterdayActivity.count - todayActivity.count) / yesterdayActivity.count) * 100
      : 0;

    return dropPercentage > 50 ? { drop_percentage: dropPercentage } : null;
  }

  // Utility methods
  getDateFilter(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case '24hours':
        return new Date(now.setDate(now.getDate() - 1));
      case '7days':
        return new Date(now.setDate(now.getDate() - 7));
      case '30days':
        return new Date(now.setDate(now.getDate() - 30));
      case '90days':
        return new Date(now.setDate(now.getDate() - 90));
      default:
        return new Date(now.setDate(now.getDate() - 30));
    }
  }

  calculateTrendDirection(data) {
    if (data.length < 2) return 'stable';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((avgSecond - avgFirst) / avgFirst) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  generateTrendSummary(data, metric) {
    const values = data.map(d => d.new_users || d.count || 0);
    const total = values.reduce((a, b) => a + b, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return {
      total,
      average: Math.round(average),
      peak: max,
      low: min,
      variability: ((max - min) / average * 100).toFixed(1) + '%'
    };
  }

  calculateOverallScore(userGrowth, contentActivity, forumEngagement, completionRates) {
    // Weighted scoring algorithm
    const weights = {
      user_growth: 0.25,
      content_activity: 0.30,
      forum_engagement: 0.25,
      completion_rates: 0.20
    };

    const score = 
      (userGrowth.score * weights.user_growth) +
      (contentActivity.score * weights.content_activity) +
      (forumEngagement.score * weights.forum_engagement) +
      (completionRates.score * weights.completion_rates);

    return Math.min(100, Math.max(0, score));
  }
}

module.exports = new AnalyticsService();

class EmailService {
  async sendWelcomeEmail(user) {
    // Implementation for welcome emails
  }

  async sendNotification(user, message) {
    // Implementation for notifications
  }
}

module.exports = new EmailService();