const uptimeMonitoringService = require('../services/uptimeMonitoringService');

const uptimeController = {
  // Get current uptime statistics
  async getUptimeStats(req, res) {
    try {
      const { hours = 24 } = req.query;
      const stats = await uptimeMonitoringService.getUptimeStatistics(parseInt(hours));

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get uptime stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch uptime statistics'
      });
    }
  },

  // Perform manual health check
  async performHealthCheck(req, res) {
    try {
      const result = await uptimeMonitoringService.performHealthCheck();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed: ' + error.message
      });
    }
  },

  // Get active alerts
  async getActiveAlerts(req, res) {
    try {
      const alerts = await uptimeMonitoringService.getActiveAlerts();

      res.json({
        success: true,
        data: { alerts }
      });
    } catch (error) {
      console.error('Get active alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch alerts'
      });
    }
  },

  // Resolve alert
  async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      await uptimeMonitoringService.resolveAlert(alertId);

      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } catch (error) {
      console.error('Resolve alert error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve alert'
      });
    }
  }
};

module.exports = uptimeController;
