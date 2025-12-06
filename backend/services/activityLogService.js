/**
 * FR7: Activity Log Service
 * REQUIREMENT: Login history, abnormal activity alerts
 */

const db = require('../config/database');

class ActivityLogService {
  /**
   * Log an activity event (REQUIREMENT: Login history)
   * @param {Object} activityData - Activity information
   * @param {number|null} userId - User ID (null for failed login attempts)
   * @param {string} activityType - Type of activity (login, logout, failed_login, etc.)
   * @param {Object} requestInfo - Request information (ip, userAgent, etc.)
   * @param {boolean} success - Whether activity was successful
   * @param {string|null} failureReason - Reason for failure if unsuccessful
   * @param {Object} metadata - Additional metadata
   */
  async logActivity({
    userId = null,
    activityType,
    ipAddress = null,
    userAgent = null,
    success = true,
    failureReason = null,
    metadata = {}
  }) {
    try {
      // Parse user agent for device info
      const deviceInfo = this.parseUserAgent(userAgent);
      
      // Get location from IP (simplified - in production, use IP geolocation service)
      const location = await this.getLocationFromIP(ipAddress);

      const [logEntry] = await db('activity_logs').insert({
        user_id: userId,
        activity_type: activityType,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        location: location,
        success: success,
        failure_reason: failureReason,
        metadata: JSON.stringify(metadata),
        created_at: new Date()
      }).returning('*');

      // Check for abnormal activity patterns (REQUIREMENT: Abnormal activity alerts)
      if (userId) {
        await this.checkAbnormalActivity(userId, activityType, ipAddress, success);
      }

      return logEntry;
    } catch (error) {
      // Check if error is due to missing table
      if (error.code === '42P01') { // undefined_table
        console.warn('Activity logs table missing, skipping log entry');
      } else {
        console.error('Error logging activity:', error);
      }
      // Don't throw - activity logging should not break the main flow
      return null;
    }
  }

  /**
   * Get user's login history (REQUIREMENT: Login history)
   * @param {number} userId - User ID
   * @param {Object} options - Query options (limit, offset, activityType)
   */
  async getUserActivityHistory(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      activityType = null,
      startDate = null,
      endDate = null
    } = options;

    let query = db('activity_logs')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (activityType) {
      query = query.where('activity_type', activityType);
    }

    if (startDate) {
      query = query.where('created_at', '>=', startDate);
    }

    if (endDate) {
      query = query.where('created_at', '<=', endDate);
    }

    return await query;
  }

  /**
   * Get recent failed login attempts for an IP or user
   * @param {string|null} ipAddress - IP address
   * @param {number|null} userId - User ID
   * @param {number} minutes - Time window in minutes (default 15)
   */
  async getRecentFailedAttempts(ipAddress = null, userId = null, minutes = 15) {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    let query = db('activity_logs')
      .where('activity_type', 'failed_login')
      .where('success', false)
      .where('created_at', '>=', since);

    if (ipAddress) {
      query = query.where('ip_address', ipAddress);
    }

    if (userId) {
      query = query.where('user_id', userId);
    }

    return await query;
  }

  /**
   * Check for abnormal activity patterns (REQUIREMENT: Abnormal activity alerts)
   * @param {number} userId - User ID
   * @param {string} activityType - Type of activity
   * @param {string} ipAddress - IP address
   * @param {boolean} success - Whether activity was successful
   */
  async checkAbnormalActivity(userId, activityType, ipAddress, success) {
    try {
      // Check for multiple IPs in short time (potential account compromise)
      if (activityType === 'login' && success) {
        const recentLogins = await db('activity_logs')
          .where('user_id', userId)
          .where('activity_type', 'login')
          .where('success', true)
          .where('created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
          .select('ip_address')
          .distinct();

        if (recentLogins.length > 3) {
          // Multiple IPs detected
          await this.createAbnormalActivityAlert({
            userId,
            alertType: 'multiple_ips',
            description: `User logged in from ${recentLogins.length} different IP addresses in the last 24 hours`,
            severity: 'medium',
            activityData: { ipAddresses: recentLogins.map(l => l.ip_address) }
          });
        }
      }

      // Check for multiple failed login attempts
      if (activityType === 'failed_login' && !success) {
        const failedAttempts = await this.getRecentFailedAttempts(ipAddress, userId, 15);
        
        if (failedAttempts.length >= 5) {
          await this.createAbnormalActivityAlert({
            userId,
            alertType: 'failed_attempts',
            description: `${failedAttempts.length} failed login attempts in the last 15 minutes`,
            severity: 'high',
            activityData: { attemptCount: failedAttempts.length, ipAddress }
          });
        }
      }

      // Check for suspicious location (login from very different location)
      if (activityType === 'login' && success && ipAddress) {
        const recentLogin = await db('activity_logs')
          .where('user_id', userId)
          .where('activity_type', 'login')
          .where('success', true)
          .where('ip_address', '!=', ipAddress)
          .orderBy('created_at', 'desc')
          .first();

        if (recentLogin && recentLogin.location) {
          // In production, compare locations more intelligently
          // For now, flag if location changed
          await this.createAbnormalActivityAlert({
            userId,
            alertType: 'suspicious_location',
            description: `Login from new location. Previous: ${recentLogin.location}, Current: ${ipAddress}`,
            severity: 'medium',
            activityData: { previousLocation: recentLogin.location, currentIP: ipAddress }
          });
        }
      }
    } catch (error) {
      console.error('Error checking abnormal activity:', error);
      // Don't throw - abnormal activity checking should not break the main flow
    }
  }

  /**
   * Create an abnormal activity alert (REQUIREMENT: Abnormal activity alerts)
   * @param {Object} alertData - Alert information
   */
  async createAbnormalActivityAlert({
    userId,
    alertType,
    description,
    severity = 'medium',
    activityData = {}
  }) {
    try {
      // Check if similar alert already exists and is unresolved
      const existingAlert = await db('abnormal_activity_alerts')
        .where('user_id', userId)
        .where('alert_type', alertType)
        .where('is_resolved', false)
        .where('created_at', '>=', new Date(Date.now() - 60 * 60 * 1000)) // Last hour
        .first();

      if (existingAlert) {
        // Update existing alert instead of creating duplicate
        return await db('abnormal_activity_alerts')
          .where('id', existingAlert.id)
          .update({
            description,
            severity,
            activity_data: JSON.stringify(activityData),
            updated_at: new Date()
          });
      }

      // Create new alert
      const [alert] = await db('abnormal_activity_alerts').insert({
        user_id: userId,
        alert_type: alertType,
        description,
        severity,
        activity_data: JSON.stringify(activityData),
        is_resolved: false,
        created_at: new Date()
      }).returning('*');

      return alert;
    } catch (error) {
      console.error('Error creating abnormal activity alert:', error);
      return null;
    }
  }

  /**
   * Get unresolved alerts for a user
   * @param {number} userId - User ID
   */
  async getUserAlerts(userId) {
    return await db('abnormal_activity_alerts')
      .where('user_id', userId)
      .where('is_resolved', false)
      .orderBy('created_at', 'desc');
  }

  /**
   * Resolve an alert
   * @param {number} alertId - Alert ID
   * @param {number} resolvedBy - Admin user ID who resolved it
   */
  async resolveAlert(alertId, resolvedBy) {
    return await db('abnormal_activity_alerts')
      .where('id', alertId)
      .update({
        is_resolved: true,
        resolved_at: new Date(),
        resolved_by: resolvedBy,
        updated_at: new Date()
      });
  }

  /**
   * Parse user agent string to extract device info
   * @param {string} userAgent - User agent string
   */
  parseUserAgent(userAgent) {
    if (!userAgent) {
      return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
    }

    const ua = userAgent.toLowerCase();
    
    // Detect device type
    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    // Detect browser
    let browser = 'unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'chrome';
    } else if (ua.includes('firefox')) {
      browser = 'firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'safari';
    } else if (ua.includes('edg')) {
      browser = 'edge';
    }

    // Detect OS
    let os = 'unknown';
    if (ua.includes('windows')) {
      os = 'windows';
    } else if (ua.includes('mac')) {
      os = 'macos';
    } else if (ua.includes('linux')) {
      os = 'linux';
    } else if (ua.includes('android')) {
      os = 'android';
    } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
      os = 'ios';
    }

    return { deviceType, browser, os };
  }

  /**
   * Get location from IP address (simplified - in production use IP geolocation service)
   * @param {string} ipAddress - IP address
   */
  async getLocationFromIP(ipAddress) {
    if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1') {
      return 'Local';
    }

    // In production, use a service like MaxMind GeoIP2, ipapi.co, or ip-api.com
    // For now, return a placeholder
    // TODO: Integrate with IP geolocation service
    return 'Unknown';
  }
}

module.exports = new ActivityLogService();

