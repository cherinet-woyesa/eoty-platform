// backend/services/analyticsService.js - NEW FILE
const db = require('../config/database');

class AnalyticsService {
  constructor() {
    this.sessionCache = new Map();
  }

  // Comprehensive interaction logging
  async logInteraction(sessionId, interaction) {
    try {
      const {
        userId,
        type,
        question,
        response,
        context,
        performance,
        faithAlignment,
        moderation,
        language,
        userFeedback
      } = interaction;

      // Log main interaction
      const result = await db('interaction_logs').insert({
        session_id: sessionId,
        user_id: userId,
        interaction_type: type,
        question: question ? question.substring(0, 1000) : '[No Question]',
        response: response ? response.substring(0, 2000) : '[No Response]',
        context: context ? JSON.stringify(context) : null,
        performance_metrics: performance ? JSON.stringify(performance) : null,
        faith_alignment: faithAlignment ? JSON.stringify(faithAlignment) : null,
        moderation_flags: moderation?.flags ? JSON.stringify(moderation.flags) : null,
        language: language,
        user_feedback: userFeedback,
        timestamp: new Date()
      }).returning('id');

      // Handle different return formats (array of objects or array of values)
      const interactionId = result[0]?.id || result[0];

      // Log performance metrics if available
      if (performance) {
        await this.logPerformanceMetrics(interactionId, performance);
      }

      // Log faith alignment if available
      if (faithAlignment) {
        await this.logFaithAlignment(interactionId, faithAlignment);
      }

      // Log moderation events if available
      if (moderation) {
        await this.logModerationEvent(interactionId, moderation);
      }

      // Update session analytics
      await this.updateSessionAnalytics(sessionId, interaction);

      return interactionId;
    } catch (error) {
      console.error('Failed to log interaction:', error);
      throw error;
    }
  }

  // Log performance metrics
  async logPerformanceMetrics(interactionId, performance) {
    await db('performance_logs').insert({
      interaction_id: interactionId,
      response_time_ms: performance.responseTime,
      ai_processing_time: performance.aiProcessingTime,
      database_time: performance.databaseTime,
      cache_hit: performance.cacheHit,
      total_time_ms: performance.totalTime,
      timestamp: new Date()
    });
  }

  // Log faith alignment metrics
  async logFaithAlignment(interactionId, faithAlignment) {
    await db('faith_alignment_logs').insert({
      interaction_id: interactionId,
      alignment_score: faithAlignment.score,
      is_aligned: faithAlignment.isAligned,
      issues: faithAlignment.issues ? JSON.stringify(faithAlignment.issues) : null,
      warnings: faithAlignment.warnings ? JSON.stringify(faithAlignment.warnings) : null,
      suggestions: faithAlignment.suggestions ? JSON.stringify(faithAlignment.suggestions) : null,
      timestamp: new Date()
    });
  }

  // Log moderation events
  async logModerationEvent(interactionId, moderation) {
    await db('moderation_logs').insert({
      interaction_id: interactionId,
      needs_moderation: moderation.needsModeration,
      flags: moderation.flags ? JSON.stringify(moderation.flags) : null,
      severity: moderation.severity,
      confidence: moderation.confidence,
      auto_moderated: moderation.autoModerated || false,
      timestamp: new Date()
    });
  }

  // Update session analytics
  async updateSessionAnalytics(sessionId, interaction) {
    const cacheKey = `session_${sessionId}`;
    
    if (!this.sessionCache.has(cacheKey)) {
      this.sessionCache.set(cacheKey, {
        sessionId,
        startTime: new Date(),
        interactionCount: 0,
        totalResponseTime: 0,
        faithAlignmentScores: [],
        languages: new Set(),
        moderationEvents: 0
      });
    }

    const session = this.sessionCache.get(cacheKey);
    session.interactionCount++;
    
    if (interaction.performance?.responseTime) {
      session.totalResponseTime += interaction.performance.responseTime;
    }
    
    if (interaction.faithAlignment?.score) {
      session.faithAlignmentScores.push(interaction.faithAlignment.score);
    }
    
    if (interaction.language) {
      session.languages.add(interaction.language);
    }
    
    if (interaction.moderation?.needsModeration) {
      session.moderationEvents++;
    }

    this.sessionCache.set(cacheKey, session);

    // Persist session analytics periodically
    if (session.interactionCount % 10 === 0) {
      await this.persistSessionAnalytics(session);
    }
  }

  // Persist session analytics to database
  async persistSessionAnalytics(session) {
    try {
      const avgResponseTime = session.totalResponseTime / session.interactionCount;
      const avgFaithAlignment = session.faithAlignmentScores.length > 0 ? 
        session.faithAlignmentScores.reduce((a, b) => a + b, 0) / session.faithAlignmentScores.length : 0;

      await db('session_analytics').insert({
        session_id: session.sessionId,
        start_time: session.startTime,
        end_time: new Date(),
        interaction_count: session.interactionCount,
        avg_response_time: avgResponseTime,
        avg_faith_alignment: avgFaithAlignment,
        languages_used: Array.from(session.languages),
        moderation_event_count: session.moderationEvents,
        timestamp: new Date()
      });

      // Clear the session from cache after persisting
      this.sessionCache.delete(`session_${session.sessionId}`);
    } catch (error) {
      console.error('Failed to persist session analytics:', error);
    }
  }

  // Get comprehensive analytics
  async getAnalytics(timeframe = '7days', filters = {}) {
    let startTime = new Date();
    
    switch (timeframe) {
      case '24hours':
        startTime.setHours(startTime.getHours() - 24);
        break;
      case '7days':
        startTime.setDate(startTime.getDate() - 7);
        break;
      case '30days':
        startTime.setDate(startTime.getDate() - 30);
        break;
      default:
        startTime.setDate(startTime.getDate() - 7);
    }

    // Base analytics query
    const baseStats = await db('interaction_logs')
      .where('timestamp', '>=', startTime)
      .select(
        db.raw('COUNT(*) as total_interactions'),
        db.raw('COUNT(DISTINCT session_id) as unique_sessions'),
        db.raw('COUNT(DISTINCT user_id) as unique_users'),
        db.raw('AVG(JSON_EXTRACT_PATH(performance_metrics::json, \'responseTime\')::numeric) as avg_response_time')
      )
      .first();

    // Language distribution
    const languageStats = await db('interaction_logs')
      .where('timestamp', '>=', startTime)
      .whereNotNull('language')
      .select('language')
      .count('* as count')
      .groupBy('language')
      .orderBy('count', 'desc');

    // Faith alignment statistics
    const faithStats = await db('faith_alignment_logs')
      .join('interaction_logs', 'faith_alignment_logs.interaction_id', 'interaction_logs.id')
      .where('interaction_logs.timestamp', '>=', startTime)
      .select(
        db.raw('AVG(alignment_score) as avg_alignment'),
        db.raw('COUNT(CASE WHEN is_aligned = true THEN 1 END) as aligned_count'),
        db.raw('COUNT(*) as total_checked')
      )
      .first();

    // Moderation statistics
    const moderationStats = await db('moderation_logs')
      .join('interaction_logs', 'moderation_logs.interaction_id', 'interaction_logs.id')
      .where('interaction_logs.timestamp', '>=', startTime)
      .select(
        db.raw('COUNT(*) as total_moderated'),
        db.raw('COUNT(CASE WHEN needs_moderation = true THEN 1 END) as needed_moderation'),
        db.raw('COUNT(CASE WHEN auto_moderated = true THEN 1 END) as auto_moderated')
      )
      .first();

    // Performance compliance
    const performanceStats = await db('performance_logs')
      .join('interaction_logs', 'performance_logs.interaction_id', 'interaction_logs.id')
      .where('interaction_logs.timestamp', '>=', startTime)
      .select(
        db.raw('AVG(response_time_ms) as avg_response_time'),
        db.raw('COUNT(CASE WHEN response_time_ms <= 3000 THEN 1 END) as within_threshold'),
        db.raw('COUNT(*) as total_measured')
      )
      .first();

    return {
      timeframe,
      overview: {
        totalInteractions: parseInt(baseStats.total_interactions) || 0,
        uniqueSessions: parseInt(baseStats.unique_sessions) || 0,
        uniqueUsers: parseInt(baseStats.unique_users) || 0,
        avgResponseTime: Math.round(parseFloat(baseStats.avg_response_time) || 0)
      },
      language: {
        distribution: languageStats.map(stat => ({
          language: stat.language,
          count: parseInt(stat.count),
          percentage: (parseInt(stat.count) / parseInt(baseStats.total_interactions)) * 100
        })),
        totalLanguages: languageStats.length
      },
      faithAlignment: {
        averageScore: parseFloat(faithStats?.avg_alignment) || 0,
        alignedCount: parseInt(faithStats?.aligned_count) || 0,
        totalChecked: parseInt(faithStats?.total_checked) || 0,
        alignmentRate: faithStats?.total_checked ? 
          (parseInt(faithStats.aligned_count) / parseInt(faithStats.total_checked)) * 100 : 0
      },
      moderation: {
        totalModerated: parseInt(moderationStats?.total_moderated) || 0,
        neededModeration: parseInt(moderationStats?.needed_moderation) || 0,
        autoModerated: parseInt(moderationStats?.auto_moderated) || 0,
        moderationRate: moderationStats?.total_moderated ? 
          (parseInt(moderationStats.needed_moderation) / parseInt(moderationStats.total_moderated)) * 100 : 0
      },
      performance: {
        averageResponseTime: Math.round(parseFloat(performanceStats?.avg_response_time) || 0),
        withinThreshold: parseInt(performanceStats?.within_threshold) || 0,
        totalMeasured: parseInt(performanceStats?.total_measured) || 0,
        complianceRate: performanceStats?.total_measured ? 
          (parseInt(performanceStats.within_threshold) / parseInt(performanceStats.total_measured)) * 100 : 0
      }
    };
  }

  // Get user-specific analytics
  async getUserAnalytics(userId, timeframe = '30days') {
    let startTime = new Date();
    
    switch (timeframe) {
      case '7days':
        startTime.setDate(startTime.getDate() - 7);
        break;
      case '30days':
        startTime.setDate(startTime.getDate() - 30);
        break;
      case '90days':
        startTime.setDate(startTime.getDate() - 90);
        break;
      default:
        startTime.setDate(startTime.getDate() - 30);
    }

    const userStats = await db('interaction_logs')
      .where('user_id', userId)
      .where('timestamp', '>=', startTime)
      .select(
        db.raw('COUNT(*) as total_interactions'),
        db.raw('COUNT(DISTINCT session_id) as sessions_count'),
        db.raw('AVG(JSON_EXTRACT_PATH(performance_metrics::json, \'responseTime\')::numeric) as avg_response_time')
      )
      .first();

    const faithStats = await db('faith_alignment_logs')
      .join('interaction_logs', 'faith_alignment_logs.interaction_id', 'interaction_logs.id')
      .where('interaction_logs.user_id', userId)
      .where('interaction_logs.timestamp', '>=', startTime)
      .select(
        db.raw('AVG(alignment_score) as avg_alignment'),
        db.raw('COUNT(*) as total_checked')
      )
      .first();

    const languagePrefs = await db('interaction_logs')
      .where('user_id', userId)
      .where('timestamp', '>=', startTime)
      .whereNotNull('language')
      .select('language')
      .count('* as count')
      .groupBy('language')
      .orderBy('count', 'desc')
      .first();

    return {
      userId,
      timeframe,
      interactions: {
        total: parseInt(userStats.total_interactions) || 0,
        sessions: parseInt(userStats.sessions_count) || 0,
        avgResponseTime: Math.round(parseFloat(userStats.avg_response_time) || 0)
      },
      faithAlignment: {
        averageScore: parseFloat(faithStats?.avg_alignment) || 0,
        totalChecked: parseInt(faithStats?.total_checked) || 0
      },
      preferences: {
        preferredLanguage: languagePrefs?.language || 'Unknown',
        languageUsage: parseInt(languagePrefs?.count) || 0
      }
    };
  }

  // Clean up old analytics data
  async cleanupOldAnalytics(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const tables = [
        'interaction_logs',
        'performance_logs', 
        'faith_alignment_logs',
        'moderation_logs',
        'session_analytics'
      ];

      let totalDeleted = 0;
      for (const table of tables) {
        const deleted = await db(table)
          .where('timestamp', '<', cutoffDate)
          .delete();
        totalDeleted += deleted;
      }

      console.log(`Cleaned up ${totalDeleted} analytics records older than ${retentionDays} days`);
    } catch (error) {
      console.error('Failed to cleanup old analytics:', error);
    }
  }
}

module.exports = new AnalyticsService();