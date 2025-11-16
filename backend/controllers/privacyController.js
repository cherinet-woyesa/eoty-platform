// backend/controllers/privacyController.js
// Privacy Compliance Controller - REQUIREMENT: No sensitive data retention

const privacyComplianceService = require('../services/privacyComplianceService');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const privacyController = {
  // Get retention status (admin only)
  async getRetentionStatus(req, res) {
    try {
      const status = await privacyComplianceService.getRetentionStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Get retention status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get retention status'
      });
    }
  },

  // Anonymize user data (admin only)
  async anonymizeUserData(req, res) {
    try {
      const { userId } = req.params;
      
      await privacyComplianceService.anonymizeUserData(parseInt(userId));
      
      res.json({
        success: true,
        message: 'User data anonymized successfully'
      });
    } catch (error) {
      console.error('Anonymize user data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to anonymize user data'
      });
    }
  },

  // Manually trigger data deletion (admin only)
  async deleteExpiredData(req, res) {
    try {
      const result = await privacyComplianceService.deleteExpiredData();
      
      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} expired records`,
        data: result
      });
    } catch (error) {
      console.error('Delete expired data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete expired data'
      });
    }
  }
};

module.exports = privacyController;


