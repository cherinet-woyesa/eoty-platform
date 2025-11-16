// backend/controllers/socialFeaturesController.js
// Social Features Controller - REQUIREMENT: FR4

const socialFeaturesService = require('../services/socialFeaturesService');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const socialFeaturesController = {
  // Get forum uptime status (REQUIREMENT: 100% uptime for forum access)
  async getForumUptimeStatus(req, res) {
    try {
      const status = await socialFeaturesService.getForumUptimeStatus();
      
      res.json({
        success: true,
        data: {
          ...status,
          requirement: '100%',
          meetsRequirement: status.uptime >= 100
        }
      });
    } catch (error) {
      console.error('Get forum uptime status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get forum uptime status'
      });
    }
  },

  // Trigger auto-archive (admin only)
  async triggerAutoArchive(req, res) {
    try {
      const autoArchiveJob = require('../jobs/autoArchiveJob');
      const result = await autoArchiveJob.runArchive();
      
      res.json({
        success: true,
        message: 'Auto-archive completed',
        data: result
      });
    } catch (error) {
      console.error('Trigger auto-archive error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to run auto-archive'
      });
    }
  }
};

module.exports = socialFeaturesController;


