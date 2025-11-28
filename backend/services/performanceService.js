// backend/services/performanceService.js - NEW FILE
const db = require('../config/database');

class PerformanceService {
  constructor() {
    this.responseTimeThreshold = 3000; // 3 seconds
    this.accuracyThreshold = 0.90; // 90%
    this.metricsCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  // Track response time for performance monitoring
  async trackResponseTime(sessionId, startTime, endTime, operation) {
    const responseTime = endTime - startTime;
    const isWithinThreshold = responseTime <= this.responseTimeThreshold;

    try {
      await db('performance_metrics').insert({
        session_id: sessionId,
        operation: operation,
        response_time_ms: responseTime,
        within_threshold: isWithinThreshold,
        threshold_ms: this.responseTimeThreshold,
        timestamp: new Date()
      });

      // Update real-time metrics cache
      this.updateMetricsCache(operation, responseTime, isWithinThreshold);

      return {
        responseTime,
        isWithinThreshold,
        threshold: this.responseTimeThreshold
      };
    } catch (error) {
      console.error('Failed to track response time:', error);
      return null;
    }
  }

  // Track accuracy metrics
  async trackAccuracy(sessionId, question, response, accuracyScore, metrics = {}) {
    const isAccurate = accuracyScore >= this.accuracyThreshold;

    try {
      // Check if table exists before inserting
      const hasTable = await db.schema.hasTable('accuracy_metrics');
      if (!hasTable) {
        console.warn('accuracy_metrics table does not exist, skipping log');
        return {
          accuracyScore,
          isAccurate,
          threshold: this.accuracyThreshold
        };
      }

      await db('accuracy_metrics').insert({
        session_id: sessionId,
        question: question ? question.substring(0, 500) : null,
        response: response ? response.substring(0, 1000) : null,
        accuracy_score: accuracyScore,
        is_accurate: isAccurate,
        faith_alignment: metrics.faithAlignment ? JSON.stringify(metrics.faithAlignment) : null,
        moderation_flags: metrics.moderationFlags ? JSON.stringify(metrics.moderationFlags) : null,
        user_feedback: metrics.userFeedback,
        timestamp: new Date()
      });

      return {
        accuracyScore,
        isAccurate,
        threshold: this.accuracyThreshold
      };
    } catch (error) {
      console.error('Failed to track accuracy:', error);
      return null;
    }
  }

  // Update real-time metrics cache
  updateMetricsCache(operation, responseTime, isWithinThreshold) {
    const now = Date.now();
    const cacheKey = `metrics_${operation}`;
    
    if (!this.metricsCache.has(cacheKey)) {
      this.metricsCache.set(cacheKey, {
        operation,
        totalRequests: 0,
        totalTime: 0,
        withinThreshold: 0,
        lastUpdated: now,
        dataPoints: []
      });
    }

    const metrics = this.metricsCache.get(cacheKey);
    metrics.totalRequests++;
    metrics.totalTime += responseTime;
    if (isWithinThreshold) metrics.withinThreshold++;
    metrics.lastUpdated = now;
    
    // Keep only last 100 data points for rolling average
    metrics.dataPoints.push({ responseTime, timestamp: now });
    if (metrics.dataPoints.length > 100) {
      metrics.dataPoints.shift();
    }

    this.metricsCache.set(cacheKey, metrics);
  }

  // Get performance statistics
  async getPerformanceStats(timeframe = '1hour') {
    let startTime = new Date();
    
    switch (timeframe) {
      case '1hour':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case '24hours':
        startTime.setHours(startTime.getHours() - 24);
        break;
      case '7days':
        startTime.setDate(startTime.getDate() - 7);
        break;
      default:
        startTime.setHours(startTime.getHours() - 1);
    }

    const stats = await db('performance_metrics')
      .where('timestamp', '>=', startTime)
      .select(
        db.raw('AVG(response_time_ms) as avg_response_time'),
        db.raw('PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time'),
        db.raw('COUNT(*) as total_requests'),
        db.raw('COUNT(CASE WHEN within_threshold = true THEN 1 END) as within_threshold_count'),
        db.raw('operation')
      )
      .groupBy('operation');

    const accuracyStats = await db('accuracy_metrics')
      .where('timestamp', '>=', startTime)
      .select(
        db.raw('AVG(accuracy_score) as avg_accuracy'),
        db.raw('COUNT(*) as total_responses'),
        db.raw('COUNT(CASE WHEN is_accurate = true THEN 1 END) as accurate_count')
      )
      .first();

    // Calculate real-time metrics from cache
    const realTimeMetrics = this.getRealTimeMetrics();

    return {
      timeframe,
      responseTime: {
        average: Math.round(stats.find(s => s.operation === 'ai_response')?.avg_response_time || 0),
        p95: Math.round(stats.find(s => s.operation === 'ai_response')?.p95_response_time || 0),
        withinThreshold: {
          count: stats.find(s => s.operation === 'ai_response')?.within_threshold_count || 0,
          total: stats.find(s => s.operation === 'ai_response')?.total_requests || 0,
          percentage: stats.find(s => s.operation === 'ai_response')?.total_requests ? 
            (stats.find(s => s.operation === 'ai_response').within_threshold_count / stats.find(s => s.operation === 'ai_response').total_requests) * 100 : 0
        }
      },
      accuracy: {
        average: parseFloat(accuracyStats?.avg_accuracy || 0),
        accurateCount: accuracyStats?.accurate_count || 0,
        totalResponses: accuracyStats?.total_responses || 0,
        percentage: accuracyStats?.total_responses ? 
          (accuracyStats.accurate_count / accuracyStats.total_responses) * 100 : 0
      },
      realTime: realTimeMetrics
    };
  }

  // Get real-time metrics from cache
  getRealTimeMetrics() {
    const metrics = {};
    const now = Date.now();

    for (const [key, data] of this.metricsCache.entries()) {
      // Remove stale cache entries
      if (now - data.lastUpdated > this.cacheExpiry) {
        this.metricsCache.delete(key);
        continue;
      }

      metrics[data.operation] = {
        averageResponseTime: Math.round(data.totalTime / data.totalRequests),
        requestsPerMinute: this.calculateRequestsPerMinute(data.dataPoints),
        withinThresholdPercentage: (data.withinThreshold / data.totalRequests) * 100,
        totalRequests: data.totalRequests
      };
    }

    return metrics;
  }

  // Calculate requests per minute from data points
  calculateRequestsPerMinute(dataPoints) {
    if (dataPoints.length < 2) return 0;
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentPoints = dataPoints.filter(point => point.timestamp > oneMinuteAgo);
    
    return recentPoints.length;
  }

  // Performance alerts for slow responses
  async checkPerformanceAlerts() {
    const stats = await this.getPerformanceStats('1hour');
    const alerts = [];

    // Check response time threshold
    if (stats.responseTime.withinThreshold.percentage < 90) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `Response time threshold compliance dropped to ${stats.responseTime.withinThreshold.percentage.toFixed(1)}%`,
        metric: 'response_time',
        value: stats.responseTime.withinThreshold.percentage
      });
    }

    // Check accuracy threshold
    if (stats.accuracy.percentage < 85) {
      alerts.push({
        type: 'accuracy', 
        severity: 'warning',
        message: `Accuracy rate dropped to ${stats.accuracy.percentage.toFixed(1)}%`,
        metric: 'accuracy',
        value: stats.accuracy.percentage
      });
    }

    // Store alerts if any
    if (alerts.length > 0) {
      await this.storeAlerts(alerts);
    }

    return alerts;
  }

  // Store performance alerts
  async storeAlerts(alerts) {
    try {
      for (const alert of alerts) {
        await db('performance_alerts').insert({
          alert_type: alert.type,
          severity: alert.severity,
          message: alert.message,
          metric: alert.metric,
          metric_value: alert.value,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to store performance alerts:', error);
    }
  }

  // Clean up old metrics data
  async cleanupOldMetrics(retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const deletedMetrics = await db('performance_metrics')
        .where('timestamp', '<', cutoffDate)
        .delete();

      const deletedAccuracy = await db('accuracy_metrics')
        .where('timestamp', '<', cutoffDate)
        .delete();

      console.log(`Cleaned up ${deletedMetrics} performance metrics and ${deletedAccuracy} accuracy metrics older than ${retentionDays} days`);
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error);
    }
  }
}

module.exports = new PerformanceService();