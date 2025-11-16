const db = require('../config/database');
const axios = require('axios');

class UptimeMonitoringService {
  constructor() {
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.uptimeThreshold = 99.0; // 99% threshold
    this.checkIntervalId = null;
    this.isRunning = false;
  }

  /**
   * Perform health check on video streaming service
   * @returns {Promise<{isHealthy: boolean, errorMessage?: string, checkDuration: number}>}
   */
  async performHealthCheck() {
    const startTime = Date.now();
    
    try {
      // Check Mux service availability
      // In production, this would check actual video playback endpoints
      const muxCheck = await this.checkMuxService();
      
      // Check database connectivity
      const dbCheck = await this.checkDatabase();
      
      // Check if we can query lessons with videos
      const videoCheck = await this.checkVideoAvailability();

      const isHealthy = muxCheck.healthy && dbCheck.healthy && videoCheck.healthy;
      const errorMessage = !isHealthy 
        ? [muxCheck.error, dbCheck.error, videoCheck.error].filter(Boolean).join('; ')
        : null;

      const checkDuration = Date.now() - startTime;

      // Record health check
      await this.recordHealthCheck(isHealthy, errorMessage, checkDuration);

      return {
        isHealthy,
        errorMessage,
        checkDuration
      };
    } catch (error) {
      const checkDuration = Date.now() - startTime;
      const errorMessage = `Health check failed: ${error.message}`;
      
      await this.recordHealthCheck(false, errorMessage, checkDuration);

      return {
        isHealthy: false,
        errorMessage,
        checkDuration
      };
    }
  }

  /**
   * Check Mux service availability
   */
  async checkMuxService() {
    try {
      // Check if Mux environment variables are set
      const hasMuxToken = !!process.env.MUX_TOKEN_ID && !!process.env.MUX_TOKEN_SECRET;
      
      if (!hasMuxToken) {
        return { healthy: false, error: 'Mux credentials not configured' };
      }

      // In production, you might want to make an actual API call to Mux
      // For now, we'll just check if credentials exist
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: `Mux check failed: ${error.message}` };
    }
  }

  /**
   * Check database connectivity
   */
  async checkDatabase() {
    try {
      await db.raw('SELECT 1');
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: `Database check failed: ${error.message}` };
    }
  }

  /**
   * Check if videos are available (sample check)
   */
  async checkVideoAvailability() {
    try {
      // Check if we can query lessons with video providers
      const hasVideosTable = await db.schema.hasTable('lessons');
      
      if (!hasVideosTable) {
        return { healthy: false, error: 'Lessons table not found' };
      }

      // Check if there are any lessons with Mux videos
      const hasMuxPlaybackId = await db.schema.hasColumn('lessons', 'mux_playback_id');
      
      if (hasMuxPlaybackId) {
        const muxVideoCount = await db('lessons')
          .whereNotNull('mux_playback_id')
          .where('mux_status', 'ready')
          .count('id as count')
          .first();

        // If we have videos but none are ready, that's a concern
        if (muxVideoCount && parseInt(muxVideoCount.count) === 0) {
          return { healthy: true, error: 'No ready videos found (may be normal if no videos uploaded)' };
        }
      }

      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: `Video availability check failed: ${error.message}` };
    }
  }

  /**
   * Record health check result
   */
  async recordHealthCheck(isHealthy, errorMessage, checkDuration) {
    try {
      const hasTable = await db.schema.hasTable('uptime_monitoring');
      if (!hasTable) {
        console.warn('Uptime monitoring table does not exist');
        return;
      }

      // Calculate current uptime percentage
      const uptimePercentage = await this.calculateUptimePercentage();

      await db('uptime_monitoring').insert({
        is_healthy: isHealthy,
        error_message: errorMessage || null,
        check_duration_ms: checkDuration,
        uptime_percentage: uptimePercentage,
        timestamp: new Date()
      });

      // Check if we need to create an alert
      if (!isHealthy || uptimePercentage < this.uptimeThreshold) {
        await this.createAlert(isHealthy, uptimePercentage, errorMessage);
      }

      // Aggregate hourly statistics
      await this.aggregateHourlyStatistics();
    } catch (error) {
      console.error('Failed to record health check:', error);
    }
  }

  /**
   * Calculate current uptime percentage
   */
  async calculateUptimePercentage() {
    try {
      const hasTable = await db.schema.hasTable('uptime_monitoring');
      if (!hasTable) return 100.0;

      // Get checks from last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const checks = await db('uptime_monitoring')
        .where('timestamp', '>=', twentyFourHoursAgo)
        .select('is_healthy');

      if (checks.length === 0) return 100.0;

      const healthyCount = checks.filter(c => c.is_healthy).length;
      const percentage = (healthyCount / checks.length) * 100;

      return parseFloat(percentage.toFixed(2));
    } catch (error) {
      console.error('Failed to calculate uptime percentage:', error);
      return 100.0;
    }
  }

  /**
   * Create alert if uptime is below threshold
   */
  async createAlert(isHealthy, uptimePercentage, errorMessage) {
    try {
      const hasTable = await db.schema.hasTable('uptime_alerts');
      if (!hasTable) {
        console.warn('Uptime alerts table does not exist');
        return;
      }

      // Check for existing unresolved alerts
      const existingAlert = await db('uptime_alerts')
        .where('resolved', false)
        .orderBy('timestamp', 'desc')
        .first();

      if (existingAlert) {
        // Update existing alert
        await db('uptime_alerts')
          .where('id', existingAlert.id)
          .update({
            severity: uptimePercentage < 95 ? 'CRITICAL' : 'WARNING',
            message: errorMessage || `Uptime below threshold: ${uptimePercentage}%`,
            uptime_percentage: uptimePercentage,
            consecutive_failures: existingAlert.consecutive_failures + 1,
            timestamp: new Date()
          });
      } else {
        // Create new alert
        const severity = uptimePercentage < 95 ? 'CRITICAL' : 'WARNING';
        await db('uptime_alerts').insert({
          severity,
          message: errorMessage || `Uptime below threshold: ${uptimePercentage}%`,
          uptime_percentage: uptimePercentage,
          consecutive_failures: 1,
          resolved: false,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }

  /**
   * Aggregate hourly statistics
   */
  async aggregateHourlyStatistics() {
    try {
      const hasTable = await db.schema.hasTable('uptime_statistics');
      if (!hasTable) return;

      // Get current hour
      const now = new Date();
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

      // Check if statistics already exist for this hour
      const existing = await db('uptime_statistics')
        .where('timestamp', '>=', currentHour)
        .where('timestamp', '<', new Date(currentHour.getTime() + 60 * 60 * 1000))
        .first();

      if (existing) {
        // Update existing statistics
        const checks = await db('uptime_monitoring')
          .where('timestamp', '>=', currentHour)
          .where('timestamp', '<', new Date(currentHour.getTime() + 60 * 60 * 1000));

        const totalChecks = checks.length;
        const successfulChecks = checks.filter(c => c.is_healthy).length;
        const failedChecks = totalChecks - successfulChecks;
        const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

        await db('uptime_statistics')
          .where('id', existing.id)
          .update({
            total_checks: totalChecks,
            successful_checks: successfulChecks,
            failed_checks: failedChecks,
            uptime_percentage: parseFloat(uptimePercentage.toFixed(2)),
            meets_threshold: uptimePercentage >= this.uptimeThreshold,
            timestamp: new Date()
          });
      } else {
        // Create new statistics
        const checks = await db('uptime_monitoring')
          .where('timestamp', '>=', currentHour)
          .where('timestamp', '<', new Date(currentHour.getTime() + 60 * 60 * 1000));

        const totalChecks = checks.length;
        const successfulChecks = checks.filter(c => c.is_healthy).length;
        const failedChecks = totalChecks - successfulChecks;
        const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

        await db('uptime_statistics').insert({
          total_checks: totalChecks,
          successful_checks: successfulChecks,
          failed_checks: failedChecks,
          uptime_percentage: parseFloat(uptimePercentage.toFixed(2)),
          meets_threshold: uptimePercentage >= this.uptimeThreshold,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to aggregate hourly statistics:', error);
    }
  }

  /**
   * Start monitoring service (alias for compatibility)
   */
  startMonitoring() {
    return this.start();
  }

  /**
   * Start monitoring service
   */
  start() {
    if (this.isRunning) {
      console.log('Uptime monitoring is already running');
      return;
    }

    console.log('Starting uptime monitoring service...');
    this.isRunning = true;

    // Perform initial check
    this.performHealthCheck();

    // Schedule periodic checks
    this.checkIntervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);

    console.log(`Uptime monitoring started (checking every ${this.checkInterval / 1000 / 60} minutes)`);
  }

  /**
   * Stop monitoring service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping uptime monitoring service...');
    this.isRunning = false;

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }

    console.log('Uptime monitoring stopped');
  }

  /**
   * Get current uptime statistics
   */
  async getUptimeStatistics(hours = 24) {
    try {
      const hasTable = await db.schema.hasTable('uptime_statistics');
      if (!hasTable) {
        return {
          uptimePercentage: 100.0,
          meetsThreshold: true,
          message: 'Uptime monitoring table does not exist'
        };
      }

      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const stats = await db('uptime_statistics')
        .where('timestamp', '>=', cutoffTime)
        .select('*')
        .orderBy('timestamp', 'desc');

      if (stats.length === 0) {
        return {
          uptimePercentage: 100.0,
          meetsThreshold: true,
          message: 'No statistics available'
        };
      }

      // Calculate average uptime
      const totalUptime = stats.reduce((sum, stat) => sum + parseFloat(stat.uptime_percentage), 0);
      const averageUptime = totalUptime / stats.length;

      return {
        uptimePercentage: parseFloat(averageUptime.toFixed(2)),
        meetsThreshold: averageUptime >= this.uptimeThreshold,
        totalChecks: stats.reduce((sum, stat) => sum + parseInt(stat.total_checks), 0),
        successfulChecks: stats.reduce((sum, stat) => sum + parseInt(stat.successful_checks), 0),
        failedChecks: stats.reduce((sum, stat) => sum + parseInt(stat.failed_checks), 0),
        statistics: stats
      };
    } catch (error) {
      console.error('Failed to get uptime statistics:', error);
      return {
        uptimePercentage: 100.0,
        meetsThreshold: true,
        error: error.message
      };
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts() {
    try {
      const hasTable = await db.schema.hasTable('uptime_alerts');
      if (!hasTable) {
        return [];
      }

      return await db('uptime_alerts')
        .where('resolved', false)
        .orderBy('timestamp', 'desc');
    } catch (error) {
      console.error('Failed to get active alerts:', error);
      return [];
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId) {
    try {
      const hasTable = await db.schema.hasTable('uptime_alerts');
      if (!hasTable) return;

      await db('uptime_alerts')
        .where('id', alertId)
        .update({
          resolved: true,
          resolved_at: new Date()
        });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw error;
    }
  }
}

// Singleton instance
const uptimeMonitoringService = new UptimeMonitoringService();

module.exports = uptimeMonitoringService;
