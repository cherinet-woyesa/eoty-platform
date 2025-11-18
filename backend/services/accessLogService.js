const db = require('../config/database');

/**
 * Service for logging access denials and security events
 * Provides comprehensive audit trail for role-based access control
 */
class AccessLogService {
  /**
   * Log an access denial attempt
   * @param {Object} params - Log parameters
   * @param {number} params.userId - ID of the user attempting access
   * @param {string} params.userRole - Role of the user
   * @param {string} params.resource - Resource being accessed (route/endpoint)
   * @param {string} params.requiredRole - Role required for access
   * @param {string} params.action - Action attempted (view, edit, delete, etc.)
   * @param {string} params.ipAddress - IP address of the request
   * @param {string} params.userAgent - User agent string
   * @param {Object} params.metadata - Additional metadata
   */
  async logAccessDenial({
    userId,
    userRole,
    resource,
    requiredRole,
    action = 'access',
    ipAddress = null,
    userAgent = null,
    metadata = {}
  }) {
    try {
      // Check if access_logs table exists first
      const tableExists = await db.schema.hasTable('access_logs');

      if (tableExists) {
        await db('access_logs').insert({
          user_id: userId,
          user_role: userRole,
          resource,
          required_role: requiredRole,
          action,
          access_granted: false,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: JSON.stringify(metadata),
          created_at: new Date()
        });

        console.log(`[ACCESS DENIED] User ${userId} (${userRole}) attempted to ${action} ${resource} (requires ${requiredRole})`);
      } else {
        console.log(`[ACCESS DENIED - NO LOG] User ${userId} (${userRole}) attempted to ${action} ${resource} (requires ${requiredRole}) - access_logs table not ready`);
      }
    } catch (error) {
      console.error('Error logging access denial:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Log a successful access
   * @param {Object} params - Log parameters
   */
  async logAccessGranted({
    userId,
    userRole,
    resource,
    action = 'access',
    ipAddress = null,
    userAgent = null,
    metadata = {}
  }) {
    try {
      // Check if access_logs table exists first
      const tableExists = await db.schema.hasTable('access_logs');

      if (tableExists) {
        await db('access_logs').insert({
          user_id: userId,
          user_role: userRole,
          resource,
          required_role: userRole, // User had sufficient role
          action,
          access_granted: true,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: JSON.stringify(metadata),
          created_at: new Date()
        });
      } else {
        console.log(`[ACCESS GRANTED - NO LOG] User ${userId} (${userRole}) accessed ${resource} - access_logs table not ready`);
      }
    } catch (error) {
      console.error('Error logging access grant:', error);
    }
  }

  /**
   * Get access logs with filtering
   * @param {Object} filters - Filter parameters
   * @param {number} filters.userId - Filter by user ID
   * @param {string} filters.userRole - Filter by user role
   * @param {boolean} filters.accessGranted - Filter by access result
   * @param {Date} filters.startDate - Filter by start date
   * @param {Date} filters.endDate - Filter by end date
   * @param {number} filters.limit - Limit results
   * @param {number} filters.offset - Offset for pagination
   */
  async getAccessLogs({
    userId = null,
    userRole = null,
    accessGranted = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0
  }) {
    try {
      let query = db('access_logs')
        .select(
          'access_logs.*',
          'users.first_name',
          'users.last_name',
          'users.email'
        )
        .leftJoin('users', 'access_logs.user_id', 'users.id')
        .orderBy('access_logs.created_at', 'desc');

      if (userId) {
        query = query.where('access_logs.user_id', userId);
      }

      if (userRole) {
        query = query.where('access_logs.user_role', userRole);
      }

      if (accessGranted !== null) {
        query = query.where('access_logs.access_granted', accessGranted);
      }

      if (startDate) {
        query = query.where('access_logs.created_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('access_logs.created_at', '<=', endDate);
      }

      const logs = await query.limit(limit).offset(offset);

      // Parse metadata JSON
      return logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : {}
      }));
    } catch (error) {
      console.error('Error fetching access logs:', error);
      throw error;
    }
  }

  /**
   * Get access denial statistics
   * @param {Object} filters - Filter parameters
   */
  async getAccessDenialStats({
    startDate = null,
    endDate = null,
    groupBy = 'user_role' // 'user_role', 'resource', 'user_id'
  }) {
    try {
      let query = db('access_logs')
        .where('access_granted', false)
        .select(groupBy)
        .count('* as denial_count')
        .groupBy(groupBy)
        .orderBy('denial_count', 'desc');

      if (startDate) {
        query = query.where('created_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('created_at', '<=', endDate);
      }

      return await query;
    } catch (error) {
      console.error('Error fetching access denial stats:', error);
      throw error;
    }
  }

  /**
   * Get suspicious access patterns
   * Identifies users with high denial rates
   */
  async getSuspiciousAccessPatterns({
    minDenials = 10,
    timeWindowHours = 24
  }) {
    try {
      const startDate = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

      const patterns = await db('access_logs')
        .where('access_granted', false)
        .where('created_at', '>=', startDate)
        .select(
          'user_id',
          'user_role',
          db.raw('COUNT(*) as denial_count'),
          db.raw('COUNT(DISTINCT resource) as unique_resources'),
          db.raw('MAX(created_at) as last_attempt')
        )
        .groupBy('user_id', 'user_role')
        .having(db.raw('COUNT(*)'), '>=', minDenials)
        .orderBy('denial_count', 'desc');

      // Enrich with user information
      const enrichedPatterns = await Promise.all(
        patterns.map(async (pattern) => {
          const user = await db('users')
            .where('id', pattern.user_id)
            .select('first_name', 'last_name', 'email')
            .first();

          return {
            ...pattern,
            user
          };
        })
      );

      return enrichedPatterns;
    } catch (error) {
      console.error('Error fetching suspicious access patterns:', error);
      throw error;
    }
  }

  /**
   * Clean up old access logs
   * @param {number} daysToKeep - Number of days to keep logs
   */
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const deletedCount = await db('access_logs')
        .where('created_at', '<', cutoffDate)
        .delete();

      console.log(`Cleaned up ${deletedCount} old access logs`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      throw error;
    }
  }
}

module.exports = new AccessLogService();
