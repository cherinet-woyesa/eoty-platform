/**
 * Mux Cost Monitoring Service
 * Tracks Mux usage metrics and estimates costs
 */

const db = require('../config/database');
const muxService = require('./muxService');

// Mux pricing (as of 2024 - update these based on actual pricing)
const MUX_PRICING = {
  // Video encoding
  encoding: {
    perMinute: 0.005, // $0.005 per minute of video encoded
  },
  // Video storage
  storage: {
    perGBMonth: 0.05, // $0.05 per GB per month
  },
  // Video delivery/streaming
  delivery: {
    perGB: 0.10, // $0.10 per GB delivered
  },
  // Live streaming (if used)
  liveStreaming: {
    perMinute: 0.015, // $0.015 per minute of live streaming
  }
};

class MuxCostMonitoringService {
  /**
   * Calculate encoding costs based on video duration
   * 
   * @param {number} durationSeconds - Video duration in seconds
   * @returns {number} Estimated encoding cost in USD
   */
  calculateEncodingCost(durationSeconds) {
    const durationMinutes = durationSeconds / 60;
    return durationMinutes * MUX_PRICING.encoding.perMinute;
  }

  /**
   * Calculate storage costs based on video size
   * 
   * @param {number} sizeBytes - Video size in bytes
   * @param {number} months - Number of months stored (default: 1)
   * @returns {number} Estimated storage cost in USD
   */
  calculateStorageCost(sizeBytes, months = 1) {
    const sizeGB = sizeBytes / (1024 * 1024 * 1024);
    return sizeGB * MUX_PRICING.storage.perGBMonth * months;
  }

  /**
   * Calculate delivery costs based on bandwidth usage
   * 
   * @param {number} bytesDelivered - Total bytes delivered
   * @returns {number} Estimated delivery cost in USD
   */
  calculateDeliveryCost(bytesDelivered) {
    const deliveredGB = bytesDelivered / (1024 * 1024 * 1024);
    return deliveredGB * MUX_PRICING.delivery.perGB;
  }

  /**
   * Get usage metrics for all Mux videos
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Usage metrics
   */
  async getUsageMetrics(options = {}) {
    try {
      const { startDate, endDate } = options;

      // Get all Mux videos
      let query = db('lessons')
        .where({ video_provider: 'mux' })
        .whereNotNull('mux_asset_id');

      if (startDate) {
        query = query.where('mux_created_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('mux_created_at', '<=', endDate);
      }

      const muxVideos = await query.select('*');

      // Calculate metrics
      const metrics = {
        totalVideos: muxVideos.length,
        totalDuration: 0, // in seconds
        totalStorage: 0, // in bytes (estimated)
        readyVideos: 0,
        processingVideos: 0,
        erroredVideos: 0
      };

      muxVideos.forEach(video => {
        if (video.duration) {
          metrics.totalDuration += video.duration;
        }

        // Estimate storage (rough estimate: 1 minute = ~10MB for HD video)
        if (video.duration) {
          const estimatedSizeMB = (video.duration / 60) * 10;
          metrics.totalStorage += estimatedSizeMB * 1024 * 1024;
        }

        // Count by status
        if (video.mux_status === 'ready') {
          metrics.readyVideos++;
        } else if (video.mux_status === 'preparing' || video.mux_status === 'processing') {
          metrics.processingVideos++;
        } else if (video.mux_status === 'errored') {
          metrics.erroredVideos++;
        }
      });

      return metrics;
    } catch (error) {
      console.error('Failed to get usage metrics:', error);
      throw error;
    }
  }

  /**
   * Get delivery metrics from analytics
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Delivery metrics
   */
  async getDeliveryMetrics(options = {}) {
    try {
      const { startDate, endDate, timeframe = '30:days' } = options;

      let dateFilter = db('video_analytics');

      if (startDate && endDate) {
        dateFilter = dateFilter.whereBetween('session_started_at', [startDate, endDate]);
      } else if (timeframe) {
        const [amount, unit] = timeframe.split(':');
        const daysAgo = unit === 'days' ? parseInt(amount) : 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        dateFilter = dateFilter.where('session_started_at', '>=', cutoffDate);
      }

      // Get view statistics
      const viewStats = await dateFilter
        .select(
          db.raw('COUNT(*) as total_views'),
          db.raw('SUM(watch_time_seconds) as total_watch_time'),
          db.raw('AVG(watch_time_seconds) as avg_watch_time')
        )
        .first();

      // Estimate bandwidth (rough estimate: 1 minute of HD video = ~15MB)
      const totalWatchTimeMinutes = (parseInt(viewStats.total_watch_time) || 0) / 60;
      const estimatedBandwidthMB = totalWatchTimeMinutes * 15;
      const estimatedBandwidthBytes = estimatedBandwidthMB * 1024 * 1024;

      return {
        totalViews: parseInt(viewStats.total_views) || 0,
        totalWatchTime: parseInt(viewStats.total_watch_time) || 0,
        averageWatchTime: parseFloat(viewStats.avg_watch_time) || 0,
        estimatedBandwidth: estimatedBandwidthBytes
      };
    } catch (error) {
      console.error('Failed to get delivery metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate total estimated costs
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Cost estimates
   */
  async calculateCosts(options = {}) {
    try {
      const { timeframe = '30:days' } = options;

      // Get usage metrics
      const usageMetrics = await this.getUsageMetrics(options);
      const deliveryMetrics = await this.getDeliveryMetrics({ timeframe });

      // Calculate costs
      const encodingCost = this.calculateEncodingCost(usageMetrics.totalDuration);
      const storageCost = this.calculateStorageCost(usageMetrics.totalStorage, 1);
      const deliveryCost = this.calculateDeliveryCost(deliveryMetrics.estimatedBandwidth);

      const totalCost = encodingCost + storageCost + deliveryCost;

      return {
        timeframe,
        breakdown: {
          encoding: {
            cost: encodingCost,
            metrics: {
              totalVideos: usageMetrics.totalVideos,
              totalDurationMinutes: Math.round(usageMetrics.totalDuration / 60),
              pricePerMinute: MUX_PRICING.encoding.perMinute
            }
          },
          storage: {
            cost: storageCost,
            metrics: {
              totalStorageGB: (usageMetrics.totalStorage / (1024 * 1024 * 1024)).toFixed(2),
              pricePerGBMonth: MUX_PRICING.storage.perGBMonth
            }
          },
          delivery: {
            cost: deliveryCost,
            metrics: {
              totalViews: deliveryMetrics.totalViews,
              totalWatchTimeHours: Math.round(deliveryMetrics.totalWatchTime / 3600),
              estimatedBandwidthGB: (deliveryMetrics.estimatedBandwidth / (1024 * 1024 * 1024)).toFixed(2),
              pricePerGB: MUX_PRICING.delivery.perGB
            }
          }
        },
        total: totalCost,
        currency: 'USD',
        note: 'These are estimates based on typical Mux pricing. Actual costs may vary.',
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to calculate costs:', error);
      throw error;
    }
  }

  /**
   * Get cost trends over time
   * 
   * @param {number} months - Number of months to analyze
   * @returns {Promise<Array>} Monthly cost trends
   */
  async getCostTrends(months = 6) {
    try {
      const trends = [];
      const now = new Date();

      for (let i = 0; i < months; i++) {
        const endDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startDate = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);

        const costs = await this.calculateCosts({
          startDate,
          endDate
        });

        trends.push({
          month: endDate.toISOString().substring(0, 7), // YYYY-MM format
          ...costs
        });
      }

      return trends.reverse(); // Oldest to newest
    } catch (error) {
      console.error('Failed to get cost trends:', error);
      throw error;
    }
  }

  /**
   * Get cost breakdown by course
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Cost breakdown by course
   */
  async getCostsByCourse(options = {}) {
    try {
      const { limit = 10 } = options;

      // Get courses with Mux videos
      const courses = await db('courses')
        .join('lessons', 'courses.id', 'lessons.course_id')
        .where('lessons.video_provider', 'mux')
        .whereNotNull('lessons.mux_asset_id')
        .groupBy('courses.id', 'courses.title')
        .select(
          'courses.id',
          'courses.title',
          db.raw('COUNT(lessons.id) as video_count'),
          db.raw('SUM(lessons.duration) as total_duration')
        )
        .orderBy('video_count', 'desc')
        .limit(limit);

      // Calculate costs for each course
      const courseCosts = courses.map(course => {
        const encodingCost = this.calculateEncodingCost(course.total_duration || 0);
        
        // Estimate storage
        const estimatedSizeMB = ((course.total_duration || 0) / 60) * 10;
        const estimatedSizeBytes = estimatedSizeMB * 1024 * 1024;
        const storageCost = this.calculateStorageCost(estimatedSizeBytes, 1);

        return {
          courseId: course.id,
          courseTitle: course.title,
          videoCount: parseInt(course.video_count),
          totalDurationMinutes: Math.round((course.total_duration || 0) / 60),
          estimatedMonthlyCost: encodingCost + storageCost
        };
      });

      return courseCosts;
    } catch (error) {
      console.error('Failed to get costs by course:', error);
      throw error;
    }
  }

  /**
   * Get cost projections for next month
   * 
   * @returns {Promise<Object>} Cost projections
   */
  async getProjectedCosts() {
    try {
      // Get current month costs
      const currentCosts = await this.calculateCosts({ timeframe: '30:days' });

      // Get previous month for comparison
      const previousMonthStart = new Date();
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      const previousMonthEnd = new Date();
      
      const previousCosts = await this.calculateCosts({
        startDate: previousMonthStart,
        endDate: previousMonthEnd
      });

      // Calculate growth rate
      const growthRate = previousCosts.total > 0
        ? ((currentCosts.total - previousCosts.total) / previousCosts.total) * 100
        : 0;

      // Project next month (simple linear projection)
      const projectedTotal = currentCosts.total * (1 + (growthRate / 100));

      return {
        current: currentCosts,
        previous: previousCosts,
        growthRate: growthRate.toFixed(2),
        projected: {
          total: projectedTotal,
          breakdown: {
            encoding: currentCosts.breakdown.encoding.cost * (1 + (growthRate / 100)),
            storage: currentCosts.breakdown.storage.cost * (1 + (growthRate / 100)),
            delivery: currentCosts.breakdown.delivery.cost * (1 + (growthRate / 100))
          },
          currency: 'USD',
          note: 'Projection based on current growth rate'
        }
      };
    } catch (error) {
      console.error('Failed to get projected costs:', error);
      throw error;
    }
  }

  /**
   * Get cost alerts (if costs exceed thresholds)
   * 
   * @param {Object} thresholds - Cost thresholds
   * @returns {Promise<Array>} Cost alerts
   */
  async getCostAlerts(thresholds = {}) {
    try {
      const {
        monthlyLimit = 1000, // $1000 per month
        dailyLimit = 50, // $50 per day
        warningThreshold = 0.8 // 80% of limit
      } = thresholds;

      const alerts = [];

      // Check monthly costs
      const monthlyCosts = await this.calculateCosts({ timeframe: '30:days' });
      
      if (monthlyCosts.total >= monthlyLimit) {
        alerts.push({
          severity: 'critical',
          type: 'monthly_limit_exceeded',
          message: `Monthly cost limit exceeded: $${monthlyCosts.total.toFixed(2)} / $${monthlyLimit}`,
          currentCost: monthlyCosts.total,
          limit: monthlyLimit
        });
      } else if (monthlyCosts.total >= monthlyLimit * warningThreshold) {
        alerts.push({
          severity: 'warning',
          type: 'monthly_limit_warning',
          message: `Monthly costs approaching limit: $${monthlyCosts.total.toFixed(2)} / $${monthlyLimit}`,
          currentCost: monthlyCosts.total,
          limit: monthlyLimit,
          percentage: ((monthlyCosts.total / monthlyLimit) * 100).toFixed(1)
        });
      }

      // Check daily costs
      const dailyCosts = await this.calculateCosts({ timeframe: '1:days' });
      
      if (dailyCosts.total >= dailyLimit) {
        alerts.push({
          severity: 'critical',
          type: 'daily_limit_exceeded',
          message: `Daily cost limit exceeded: $${dailyCosts.total.toFixed(2)} / $${dailyLimit}`,
          currentCost: dailyCosts.total,
          limit: dailyLimit
        });
      } else if (dailyCosts.total >= dailyLimit * warningThreshold) {
        alerts.push({
          severity: 'warning',
          type: 'daily_limit_warning',
          message: `Daily costs approaching limit: $${dailyCosts.total.toFixed(2)} / $${dailyLimit}`,
          currentCost: dailyCosts.total,
          limit: dailyLimit,
          percentage: ((dailyCosts.total / dailyLimit) * 100).toFixed(1)
        });
      }

      return alerts;
    } catch (error) {
      console.error('Failed to get cost alerts:', error);
      throw error;
    }
  }
}

module.exports = new MuxCostMonitoringService();
