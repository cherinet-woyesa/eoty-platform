// backend/controllers/moderationController.js - NEW FILE
const moderationService = require('../services/moderationService');
const db = require('../config/database');

const moderationController = {
  // Get pending escalations with filtering
  async getPendingEscalations(req, res) {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        priority, 
        contentType, 
        severity,
        dateFrom, 
        dateTo 
      } = req.query;

      const filters = {};
      if (priority) filters.priority = priority;
      if (contentType) filters.content_type = contentType;
      if (severity) filters.severity = severity;
      if (dateFrom) filters.date_from = new Date(dateFrom);
      if (dateTo) filters.date_to = new Date(dateTo);

      const escalations = await moderationService.getPendingItems(
        parseInt(limit), 
        parseInt(offset), 
        filters
      );

      res.json({
        success: true,
        data: {
          escalations,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: escalations.length
          }
        }
      });
    } catch (error) {
      console.error('Get pending escalations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending escalations'
      });
    }
  },

  // Resolve a single escalation
  async resolveEscalation(req, res) {
    try {
      const { escalationId } = req.params;
      const moderatorId = req.user.userId;
      const { 
        action, 
        category, 
        resolutionNotes,
        notifyUser = false 
      } = req.body;

      if (!['approve', 'reject', 'escalate_higher'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be: approve, reject, or escalate_higher'
        });
      }

      const resolution = {
        action,
        category: category || 'doctrinal',
        resolutionNotes: resolutionNotes || ''
      };

      const result = await moderationService.resolveEscalation(
        escalationId, 
        moderatorId, 
        resolution
      );

      // Notify user if requested
      if (notifyUser) {
        await moderationService.notifyUserOfResolution(escalationId, resolution);
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Resolve escalation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve escalation'
      });
    }
  },

  // Bulk resolve escalations
  async bulkResolveEscalations(req, res) {
    try {
      const { escalationIds, action, category, resolutionNotes } = req.body;
      const moderatorId = req.user.userId;

      if (!Array.isArray(escalationIds) || escalationIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'escalationIds must be a non-empty array'
        });
      }

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be: approve or reject'
        });
      }

      const resolution = {
        action,
        category: category || 'doctrinal',
        resolutionNotes: resolutionNotes || `Bulk ${action} by moderator`
      };

      const result = await moderationService.bulkResolveEscalations(
        escalationIds, 
        moderatorId, 
        resolution
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          resolvedCount: escalationIds.length
        }
      });
    } catch (error) {
      console.error('Bulk resolve escalations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk resolve escalations'
      });
    }
  },

  // Get moderation statistics
  async getModerationStats(req, res) {
    try {
      const { timeframe = '7days' } = req.query;

      const stats = await moderationService.getModerationStats(timeframe);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get moderation stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch moderation statistics'
      });
    }
  },

  // Get user moderation history
  async getUserModerationHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const history = await db('moderated_content')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset))
        .select('*');

      const total = await db('moderated_content')
        .where('user_id', userId)
        .count('* as count')
        .first();

      // Get user information
      const user = await db('users')
        .where('id', userId)
        .select('username', 'email', 'created_at')
        .first();

      res.json({
        success: true,
        data: {
          user,
          history,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: parseInt(total.count)
          }
        }
      });
    } catch (error) {
      console.error('Get user moderation history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user moderation history'
      });
    }
  },

  // Get auto-moderation logs
  async getAutoModerationLogs(req, res) {
    try {
      const { limit = 50, offset = 0, dateFrom, dateTo } = req.query;

      let query = db('auto_moderation_logs')
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset))
        .select('*');

      if (dateFrom) {
        query = query.where('created_at', '>=', new Date(dateFrom));
      }

      if (dateTo) {
        query = query.where('created_at', '<=', new Date(dateTo));
      }

      const logs = await query;

      const total = await db('auto_moderation_logs')
        .modify(q => {
          if (dateFrom) q.where('created_at', '>=', new Date(dateFrom));
          if (dateTo) q.where('created_at', '<=', new Date(dateTo));
        })
        .count('* as count')
        .first();

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: parseInt(total.count)
          }
        }
      });
    } catch (error) {
      console.error('Get auto moderation logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch auto moderation logs'
      });
    }
  },

  // Update moderation settings
  async updateModerationSettings(req, res) {
    try {
      const { settings } = req.body;

      // Validate settings
      const validSettings = [
        'faithAlignmentThreshold',
        'sensitiveTopicCount',
        'autoModerateConfidence',
        'highSeverityAutoEscalate'
      ];

      const invalidSettings = Object.keys(settings).filter(key => !validSettings.includes(key));
      
      if (invalidSettings.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid settings: ${invalidSettings.join(', ')}`
        });
      }

      // Store settings in database
      for (const [key, value] of Object.entries(settings)) {
        await db('moderation_settings')
          .insert({
            setting_key: key,
            setting_value: JSON.stringify(value),
            updated_by: req.user.userId,
            updated_at: new Date()
          })
          .onConflict('setting_key')
          .merge();
      }

      res.json({
        success: true,
        message: 'Moderation settings updated successfully'
      });
    } catch (error) {
      console.error('Update moderation settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update moderation settings'
      });
    }
  }
};

module.exports = moderationController;