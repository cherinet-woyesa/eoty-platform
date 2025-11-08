const { OnboardingFlow, UserOnboarding, HelpSystem } = require('../models/Onboarding');
const db = require('../config/database');

const onboardingController = {
  // Get user's onboarding progress
  async getOnboardingProgress(req, res) {
    try {
      const userId = req.user.userId;
      const user = await db('users').where({ id: userId }).select('role').first();
      
      // Determine which flow to use based on user role
      const audience = this.getAudienceForRole(user.role);
      const flow = await OnboardingFlow.findActiveByAudience(audience);
      
      if (!flow) {
        return res.json({
          success: true,
          data: {
            has_onboarding: false,
            message: 'No onboarding flow available for your role'
          }
        });
      }

      const progress = await UserOnboarding.getProgress(userId, flow.id);

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

  // Complete a step
  async completeStep(req, res) {
    try {
      const { stepId, flowId, timeSpent, completionData } = req.body;
      const userId = req.user.userId;

      const progress = await UserOnboarding.completeStep(
        userId, 
        stepId, 
        flowId, 
        timeSpent, 
        completionData
      );

      res.json({
        success: true,
        message: 'Step completed successfully',
        data: { progress }
      });
    } catch (error) {
      console.error('Complete step error:', error);
      
      if (error.message.includes('requirements not met')) {
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

  // Skip a step
  async skipStep(req, res) {
    try {
      const { stepId, flowId } = req.body;
      const userId = req.user.userId;

      const progress = await UserOnboarding.skipStep(userId, stepId, flowId);

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

  // Get contextual help
  async getHelp(req, res) {
    try {
      const { component, page, audience, category } = req.query;
      const userId = req.user.userId;
      
      let helpResource;

      if (component) {
        helpResource = await HelpSystem.getHelpForComponent(component, audience);
      } else if (page) {
        helpResource = await HelpSystem.getHelpForPage(page, audience);
      } else if (category) {
        const faqs = await HelpSystem.getFAQs(category, audience);
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
      await HelpSystem.trackHelpUsage(userId, helpResource.id, 'viewed', {
        component,
        page,
        audience
      });

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

  // Track help interaction
  async trackHelpInteraction(req, res) {
    try {
      const { helpResourceId, interactionType, context } = req.body;
      const userId = req.user.userId;

      await HelpSystem.trackHelpUsage(userId, helpResourceId, interactionType, context);

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

  // Get popular help topics
  async getPopularHelp(req, res) {
    try {
      const { audience = 'all', limit = 5 } = req.query;
      const userId = req.user.userId;

      const popularHelp = await HelpSystem.getPopularHelp(audience, parseInt(limit));

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

  // Dismiss onboarding
  async dismissOnboarding(req, res) {
    try {
      const { flowId } = req.body;
      const userId = req.user.userId;

      await db('user_onboarding')
        .where({ user_id: userId, flow_id: flowId })
        .update({
          status: 'skipped',
          last_activity_at: new Date()
        });

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

  // Restart onboarding
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

      const progress = await UserOnboarding.getProgress(userId, flowId);

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

  // Utility method to determine audience based on role
  getAudienceForRole(role) {
    switch (role) {
      case 'student':
        return 'new_user';
      case 'teacher':
        return 'new_teacher';
      case 'admin':
      case 'admin':
        return 'new_admin';
      default:
        return 'new_user';
    }
  }
};

module.exports = onboardingController;
