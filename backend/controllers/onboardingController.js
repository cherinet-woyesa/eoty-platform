/**
 * FR6: Onboarding Controller
 * Handles onboarding-related API requests
 * REQUIREMENT: Step-by-step guide, milestone-based, auto-resume, reminders
 */

const onboardingService = require('../services/onboardingService');
const db = require('../config/database');

const onboardingController = {
  /**
   * Get user's onboarding progress (REQUIREMENT: Auto-resume)
   */
  async getOnboardingProgress(req, res) {
    try {
      const userId = req.user.userId;
      const user = await db('users').where({ id: userId }).select('role').first();
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Determine which flow to use based on user role
      const audience = onboardingService.getAudienceForRole(user.role);
      const flow = await onboardingService.findActiveFlowByAudience(audience);
      
      if (!flow) {
        return res.json({
          success: true,
          data: {
            has_onboarding: false,
            message: 'No onboarding flow available for your role'
          }
        });
      }

      // Get progress with auto-resume
      const progress = await onboardingService.getProgress(userId, flow.id);

      // If no progress exists, initialize onboarding (REQUIREMENT: 100% new users see guided onboarding)
      if (!progress) {
        await onboardingService.initializeOnboardingForUser(userId, user.role);
        const newProgress = await onboardingService.getProgress(userId, flow.id);
        
        return res.json({
          success: true,
          data: {
            has_onboarding: true,
            flow: flow,
            progress: newProgress,
            is_completed: false
          }
        });
      }

      res.json({
        success: true,
        data: {
          has_onboarding: true,
          flow: flow,
          progress: progress,
          is_completed: progress.progress === 100
        }
      });
    } catch (error) {
      console.error('Get onboarding progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch onboarding progress'
      });
    }
  },

  /**
   * Complete a step (REQUIREMENT: Prevents progress when prerequisites unmet)
   */
  async completeStep(req, res) {
    try {
      const { stepId, flowId, timeSpent, completionData } = req.body;
      const userId = req.user.userId;

      const progress = await onboardingService.completeStep(
        userId, 
        stepId, 
        flowId, 
        timeSpent || 0, 
        completionData || {}
      );

      res.json({
        success: true,
        message: 'Step completed successfully',
        data: { progress }
      });
    } catch (error) {
      console.error('Complete step error:', error);
      
      if (error.message.includes('requirements not met') || error.message.includes('Prerequisites')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to complete step'
      });
    }
  },

  /**
   * Skip a step (REQUIREMENT: Triggers follow-up reminders)
   */
  async skipStep(req, res) {
    try {
      const { stepId, flowId } = req.body;
      const userId = req.user.userId;

      const progress = await onboardingService.skipStep(userId, stepId, flowId);

      res.json({
        success: true,
        message: 'Step skipped successfully',
        data: { progress }
      });
    } catch (error) {
      console.error('Skip step error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to skip step'
      });
    }
  },

  /**
   * Dismiss onboarding (REQUIREMENT: Triggers follow-up reminders)
   */
  async dismissOnboarding(req, res) {
    try {
      const { flowId } = req.body;
      const userId = req.user.userId;

      await db('user_onboarding')
        .where({ user_id: userId, flow_id: flowId })
        .update({
          status: 'dismissed',
          last_activity_at: new Date()
        });

      // Schedule reminder (REQUIREMENT: Follow-up reminders)
      await onboardingService.scheduleReminder(userId, flowId, 'aborted');

      res.json({
        success: true,
        message: 'Onboarding dismissed successfully'
      });
    } catch (error) {
      console.error('Dismiss onboarding error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to dismiss onboarding'
      });
    }
  },

  /**
   * Restart onboarding
   */
  async restartOnboarding(req, res) {
    try {
      const { flowId } = req.body;
      const userId = req.user.userId;

      // Reset progress
      await db('user_onboarding')
        .where({ user_id: userId, flow_id: flowId })
        .update({
          status: 'in_progress',
          progress: 0.00,
          current_step_id: null,
          completed_steps: JSON.stringify([]),
          skipped_steps: JSON.stringify([]),
          started_at: new Date(),
          last_activity_at: new Date()
        });

      // Clear step completions
      await db('onboarding_step_completions')
        .where({ user_id: userId, flow_id: flowId })
        .delete();

      // Cancel reminders
      await db('onboarding_reminders')
        .where({ user_id: userId, flow_id: flowId, is_active: true })
        .update({ is_active: false });

      const progress = await onboardingService.getProgress(userId, flowId);

      res.json({
        success: true,
        message: 'Onboarding restarted successfully',
        data: { progress }
      });
    } catch (error) {
      console.error('Restart onboarding error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restart onboarding'
      });
    }
  },

  /**
   * Get milestones (REQUIREMENT: Milestone-based)
   */
  async getMilestones(req, res) {
    try {
      const { flowId } = req.query;
      const userId = req.user.userId;

      if (!flowId) {
        return res.status(400).json({
          success: false,
          message: 'flowId is required'
        });
      }

      const milestones = await onboardingService.getMilestones(parseInt(flowId), userId);

      res.json({
        success: true,
        data: { milestones }
      });
    } catch (error) {
      console.error('Get milestones error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch milestones'
      });
    }
  },

  /**
   * Get contextual help (REQUIREMENT: Contextual help, FAQ)
   */
  async getHelp(req, res) {
    try {
      const { component, page, audience, category } = req.query;
      const userId = req.user.userId;
      
      // Get user role for audience
      const user = await db('users').where({ id: userId }).select('role').first();
      const userAudience = audience || onboardingService.getAudienceForRole(user?.role || 'student');

      let helpResource;

      if (component) {
        helpResource = await db('help_resources')
          .where({ component, audience: userAudience, is_active: true })
          .orWhere({ component, audience: 'all', is_active: true })
          .first();
      } else if (page) {
        helpResource = await db('help_resources')
          .where({ page, audience: userAudience, is_active: true })
          .orWhere({ page, audience: 'all', is_active: true })
          .first();
      } else if (category) {
        const faqs = await db('help_resources')
          .where({ category, resource_type: 'faq', audience: userAudience, is_active: true })
          .orWhere({ category, resource_type: 'faq', audience: 'all', is_active: true })
          .orderBy('view_count', 'desc')
          .limit(20);
        
        return res.json({
          success: true,
          data: { faqs, type: 'faq_list' }
        });
      }

      if (!helpResource) {
        return res.status(404).json({
          success: false,
          message: 'No help resources found'
        });
      }

      // Track help view
      await db('help_usage_tracking').insert({
        user_id: userId,
        help_resource_id: helpResource.id,
        interaction_type: 'viewed',
        context: JSON.stringify({ component, page, audience: userAudience }),
        interacted_at: new Date()
      });

      // Update view count
      await db('help_resources')
        .where({ id: helpResource.id })
        .increment('view_count', 1);

      res.json({
        success: true,
        data: { help: helpResource }
      });
    } catch (error) {
      console.error('Get help error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch help resources'
      });
    }
  },

  /**
   * Track help interaction
   */
  async trackHelpInteraction(req, res) {
    try {
      const { helpResourceId, interactionType, context } = req.body;
      const userId = req.user.userId;

      await db('help_usage_tracking').insert({
        user_id: userId,
        help_resource_id: helpResourceId,
        interaction_type: interactionType || 'viewed',
        context: JSON.stringify(context || {}),
        interacted_at: new Date()
      });

      // Update helpful count if marked as helpful
      if (interactionType === 'helpful') {
        await db('help_resources')
          .where({ id: helpResourceId })
          .increment('helpful_count', 1);
      }

      res.json({
        success: true,
        message: 'Help interaction tracked successfully'
      });
    } catch (error) {
      console.error('Track help interaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track help interaction'
      });
    }
  },

  /**
   * Get popular help topics
   */
  async getPopularHelp(req, res) {
    try {
      const { audience = 'all', limit = 5 } = req.query;
      const userId = req.user.userId;

      // Get user role for audience
      const user = await db('users').where({ id: userId }).select('role').first();
      const userAudience = audience === 'all' ? onboardingService.getAudienceForRole(user?.role || 'student') : audience;

      const popularHelp = await db('help_resources')
        .where({ audience: userAudience, is_active: true })
        .orWhere({ audience: 'all', is_active: true })
        .orderBy('view_count', 'desc')
        .orderBy('helpful_count', 'desc')
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: { popular_help: popularHelp }
      });
    } catch (error) {
      console.error('Get popular help error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch popular help topics'
      });
    }
  },

  /**
   * Get completion statistics (REQUIREMENT: 95% completion within 7 days)
   */
  async getCompletionStats(req, res) {
    try {
      const { days = 7 } = req.query;
      const stats = await onboardingService.getCompletionStats(parseInt(days));

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get completion stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch completion statistics'
      });
    }
  },

  /**
   * Get user's active reminders (REQUIREMENT: Follow-up reminders)
   */
  async getReminders(req, res) {
    try {
      const userId = req.user.userId;

      const reminders = await db('onboarding_reminders')
        .where({ user_id: userId, is_active: true })
        .where('next_reminder_at', '<=', new Date())
        .orderBy('next_reminder_at', 'asc');

      res.json({
        success: true,
        data: { reminders }
      });
    } catch (error) {
      console.error('Get reminders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reminders'
      });
    }
  },

  /**
   * Get user's completion rewards (REQUIREMENT: Completion rewards)
   */
  async getCompletionRewards(req, res) {
    try {
      const userId = req.user.userId;
      const { flowId } = req.query;

      let query = db('onboarding_completion_rewards')
        .where({ user_id: userId });

      if (flowId) {
        query = query.where({ flow_id: parseInt(flowId) });
      }

      const rewards = await query.orderBy('earned_at', 'desc');

      res.json({
        success: true,
        data: { rewards }
      });
    } catch (error) {
      console.error('Get completion rewards error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch completion rewards'
      });
    }
  }
};

module.exports = onboardingController;

