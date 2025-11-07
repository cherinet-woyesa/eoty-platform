const accessLogService = require('../services/accessLogService');

/**
 * Controller for access log management
 * Provides endpoints for viewing and analyzing security audit logs
 */
const accessLogController = {
  /**
   * Get access logs with filtering
   * GET /api/admin/access-logs
   */
  async getAccessLogs(req, res) {
    try {
      const {
        userId,
        userRole,
        accessGranted,
        startDate,
        endDate,
        limit = 100,
        offset = 0
      } = req.query;

      const logs = await accessLogService.getAccessLogs({
        userId: userId ? parseInt(userId) : null,
        userRole,
        accessGranted: accessGranted !== undefined ? accessGranted === 'true' : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          logs,
          count: logs.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Error fetching access logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch access logs',
        error: error.message
      });
    }
  },

  /**
   * Get access denial statistics
   * GET /api/admin/access-logs/stats
   */
  async getAccessDenialStats(req, res) {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'user_role'
      } = req.query;

      const stats = await accessLogService.getAccessDenialStats({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy
      });

      res.json({
        success: true,
        data: {
          stats,
          groupBy
        }
      });
    } catch (error) {
      console.error('Error fetching access denial stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch access denial statistics',
        error: error.message
      });
    }
  },

  /**
   * Get suspicious access patterns
   * GET /api/admin/access-logs/suspicious
   */
  async getSuspiciousPatterns(req, res) {
    try {
      const {
        minDenials = 10,
        timeWindowHours = 24
      } = req.query;

      const patterns = await accessLogService.getSuspiciousAccessPatterns({
        minDenials: parseInt(minDenials),
        timeWindowHours: parseInt(timeWindowHours)
      });

      res.json({
        success: true,
        data: {
          patterns,
          criteria: {
            minDenials: parseInt(minDenials),
            timeWindowHours: parseInt(timeWindowHours)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching suspicious patterns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch suspicious access patterns',
        error: error.message
      });
    }
  },

  /**
   * Clean up old access logs
   * DELETE /api/admin/access-logs/cleanup
   */
  async cleanupOldLogs(req, res) {
    try {
      const { daysToKeep = 90 } = req.body;

      const deletedCount = await accessLogService.cleanupOldLogs(parseInt(daysToKeep));

      res.json({
        success: true,
        message: `Successfully cleaned up ${deletedCount} old access logs`,
        data: {
          deletedCount,
          daysToKeep: parseInt(daysToKeep)
        }
      });
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clean up old logs',
        error: error.message
      });
    }
  }
};

module.exports = accessLogController;
