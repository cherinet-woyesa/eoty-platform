/**
 * FR6: Onboarding Service
 * Handles onboarding progress, milestones, reminders, and completion rewards
 * REQUIREMENT: Step-by-step guide, milestone-based, auto-resume, reminders
 */

const db = require('../config/database');
const cron = require('node-cron');

class OnboardingService {
  constructor() {
    this.reminderIntervals = {
      skipped: 24 * 60 * 60 * 1000, // 24 hours
      aborted: 48 * 60 * 60 * 1000, // 48 hours
      incomplete: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
  }

  /**
   * Initialize onboarding for new user (REQUIREMENT: 100% new users see guided onboarding)
   * Called after user registration
   */
  async initializeOnboardingForUser(userId, userRole) {
    try {
      const audience = this.getAudienceForRole(userRole);
      const flow = await this.findActiveFlowByAudience(audience);

      if (!flow) {
        console.warn(`No onboarding flow found for audience: ${audience}`);
        return null;
      }

      // Check if user already has onboarding
      const existing = await db('user_onboarding')
        .where({ user_id: userId, flow_id: flow.id })
        .first();

      if (existing) {
        return existing;
      }

      // Create user onboarding record
      const [userOnboarding] = await db('user_onboarding')
        .insert({
          user_id: userId,
          flow_id: flow.id,
          status: 'in_progress',
          progress: 0.00,
          started_at: new Date(),
          last_activity_at: new Date()
        })
        .returning('*');

      console.log(`Onboarding initialized for user ${userId}, flow ${flow.id}`);
      return userOnboarding;
    } catch (error) {
      console.error('Failed to initialize onboarding:', error);
      throw error;
    }
  }

  /**
   * Get user's onboarding progress with auto-resume (REQUIREMENT: Auto-resume)
   */
  async getProgress(userId, flowId) {
    try {
      const userOnboarding = await db('user_onboarding')
        .where({ user_id: userId, flow_id: flowId })
        .first();

      if (!userOnboarding) {
        return null;
      }

      // Get flow details
      const flow = await db('onboarding_flows')
        .where({ id: flowId })
        .first();

      // Get all steps
      const steps = await db('onboarding_steps')
        .where({ flow_id: flowId })
        .orderBy('order_index', 'asc');

      // Get completed steps
      const completedSteps = await db('onboarding_step_completions')
        .where({ user_id: userId, flow_id: flowId, completed: true })
        .pluck('step_id');

      // Get skipped steps
      const skippedSteps = JSON.parse(userOnboarding.skipped_steps || '[]');

      // Calculate progress
      const totalSteps = steps.length;
      const completedCount = completedSteps.length;
      const progress = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

      // Determine current step (auto-resume from last step)
      let currentStepId = userOnboarding.current_step_id;
      if (!currentStepId && completedCount > 0) {
        // Find first incomplete step
        const incompleteStep = steps.find(step => 
          !completedSteps.includes(step.id) && !skippedSteps.includes(step.id)
        );
        currentStepId = incompleteStep?.id || null;
      } else if (!currentStepId) {
        // Start from first step
        currentStepId = steps[0]?.id || null;
      }

      // Get milestones
      const milestones = await this.getMilestones(flowId, userId);

      return {
        id: userOnboarding.id,
        flow_id: flowId,
        flow_name: flow?.name,
        status: userOnboarding.status,
        progress: parseFloat(progress.toFixed(2)),
        current_step_id: currentStepId,
        completed_steps: completedSteps,
        skipped_steps: skippedSteps,
        milestones: milestones,
        started_at: userOnboarding.started_at,
        last_activity_at: userOnboarding.last_activity_at,
        completed_at: userOnboarding.completed_at
      };
    } catch (error) {
      console.error('Failed to get onboarding progress:', error);
      throw error;
    }
  }

  /**
   * Complete a step (REQUIREMENT: Prevents progress when prerequisites unmet)
   */
  async completeStep(userId, stepId, flowId, timeSpent = 0, completionData = {}) {
    try {
      // Get step details
      const step = await db('onboarding_steps')
        .where({ id: stepId, flow_id: flowId })
        .first();

      if (!step) {
        throw new Error('Step not found');
      }

      // Check prerequisites (REQUIREMENT: Prevents progress when prerequisites unmet)
      if (step.prerequisites && Array.isArray(step.prerequisites)) {
        const completedSteps = await db('onboarding_step_completions')
          .where({ user_id: userId, flow_id: flowId, completed: true })
          .pluck('step_id');

        const unmetPrerequisites = step.prerequisites.filter(prereqId => 
          !completedSteps.includes(prereqId)
        );

        if (unmetPrerequisites.length > 0) {
          throw new Error(`Prerequisites not met. Complete required steps first.`);
        }
      }

      // Record completion
      await db('onboarding_step_completions')
        .insert({
          user_id: userId,
          flow_id: flowId,
          step_id: stepId,
          completed: true,
          time_spent_seconds: timeSpent,
          completion_data: JSON.stringify(completionData),
          completed_at: new Date()
        })
        .onConflict(['user_id', 'flow_id', 'step_id'])
        .merge();

      // Update progress
      const progress = await this.getProgress(userId, flowId);
      
      await db('user_onboarding')
        .where({ user_id: userId, flow_id: flowId })
        .update({
          progress: progress.progress,
          current_step_id: progress.current_step_id,
          last_activity_at: new Date()
        });

      // Check if milestone completed
      if (step.milestone_id) {
        await this.checkMilestoneCompletion(userId, flowId, step.milestone_id);
      }

      // Check if onboarding is complete
      if (progress.progress >= 100) {
        await this.completeOnboarding(userId, flowId);
      }

      return progress;
    } catch (error) {
      console.error('Failed to complete step:', error);
      throw error;
    }
  }

  /**
   * Skip a step (REQUIREMENT: Skipped/aborted onboarding triggers follow-up reminders)
   */
  async skipStep(userId, stepId, flowId) {
    try {
      const userOnboarding = await db('user_onboarding')
        .where({ user_id: userId, flow_id: flowId })
        .first();

      if (!userOnboarding) {
        throw new Error('Onboarding not found');
      }

      const skippedSteps = JSON.parse(userOnboarding.skipped_steps || '[]');
      if (!skippedSteps.includes(stepId)) {
        skippedSteps.push(stepId);
      }

      // Record skip
      await db('onboarding_step_completions')
        .insert({
          user_id: userId,
          flow_id: flowId,
          step_id: stepId,
          completed: false,
          completed_at: new Date()
        })
        .onConflict(['user_id', 'flow_id', 'step_id'])
        .merge();

      // Update progress
      const progress = await this.getProgress(userId, flowId);
      
      await db('user_onboarding')
        .where({ user_id: userId, flow_id: flowId })
        .update({
          progress: progress.progress,
          current_step_id: progress.current_step_id,
          skipped_steps: JSON.stringify(skippedSteps),
          last_activity_at: new Date()
        });

      // Schedule reminder if user skips (REQUIREMENT: Follow-up reminders)
      await this.scheduleReminder(userId, flowId, 'skipped');

      return progress;
    } catch (error) {
      console.error('Failed to skip step:', error);
      throw error;
    }
  }

  /**
   * Complete onboarding and award rewards (REQUIREMENT: Completion rewards)
   */
  async completeOnboarding(userId, flowId) {
    try {
      await db('user_onboarding')
        .where({ user_id: userId, flow_id: flowId })
        .update({
          status: 'completed',
          progress: 100.00,
          completed_at: new Date(),
          last_activity_at: new Date()
        });

      // Award completion rewards (REQUIREMENT: Unlock badge, welcome message)
      const flow = await db('onboarding_flows').where({ id: flowId }).first();
      const audience = flow?.audience || 'new_user';

      // Award badge
      const badgeId = await this.getCompletionBadgeId(audience);
      if (badgeId) {
        const { UserBadge } = require('../models/Forum');
        try {
          await UserBadge.awardBadge(userId, badgeId, {
            source: 'onboarding_completion',
            flow_id: flowId
          });
        } catch (error) {
          console.error('Failed to award badge:', error);
        }
      }

      // Create reward record
      await db('onboarding_completion_rewards')
        .insert({
          user_id: userId,
          flow_id: flowId,
          reward_type: 'badge',
          badge_id: badgeId,
          welcome_message: this.getWelcomeMessage(audience),
          announcement_enabled: true,
          earned_at: new Date()
        });

      // Cancel any pending reminders
      await db('onboarding_reminders')
        .where({ user_id: userId, flow_id: flowId, is_active: true })
        .update({ is_active: false });

      console.log(`Onboarding completed for user ${userId}, flow ${flowId}`);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  }

  /**
   * Get milestones for a flow (REQUIREMENT: Milestone-based)
   */
  async getMilestones(flowId, userId) {
    try {
      const milestones = await db('onboarding_milestones')
        .where({ flow_id: flowId })
        .orderBy('order_index', 'asc');

      // Get user's milestone progress
      const completedSteps = await db('onboarding_step_completions')
        .where({ user_id: userId, flow_id: flowId, completed: true })
        .pluck('step_id');

      const steps = await db('onboarding_steps')
        .where({ flow_id: flowId })
        .whereIn('id', completedSteps);

      return milestones.map(milestone => {
        const milestoneSteps = steps.filter(s => s.milestone_id === milestone.id);
        const isCompleted = milestoneSteps.length >= milestone.step_count;
        
        return {
          id: milestone.id,
          name: milestone.name,
          description: milestone.description,
          step_count: milestone.step_count,
          completed_steps: milestoneSteps.length,
          is_completed: isCompleted,
          badge_id: milestone.badge_id,
          reward_type: milestone.reward_type,
          reward_data: milestone.reward_data
        };
      });
    } catch (error) {
      console.error('Failed to get milestones:', error);
      return [];
    }
  }

  /**
   * Check if milestone is completed and award reward
   */
  async checkMilestoneCompletion(userId, flowId, milestoneId) {
    try {
      const milestone = await db('onboarding_milestones')
        .where({ id: milestoneId, flow_id: flowId })
        .first();

      if (!milestone) return;

      const completedSteps = await db('onboarding_step_completions')
        .where({ user_id: userId, flow_id: flowId, completed: true })
        .pluck('step_id');

      const milestoneSteps = await db('onboarding_steps')
        .where({ flow_id: flowId, milestone_id: milestoneId })
        .pluck('id');

      const completedMilestoneSteps = milestoneSteps.filter(id => 
        completedSteps.includes(id)
      );

      // Check if milestone is complete
      if (completedMilestoneSteps.length >= milestone.step_count) {
        // Award milestone reward
        if (milestone.badge_id) {
          const { UserBadge } = require('../models/Forum');
          try {
            await UserBadge.awardBadge(userId, milestone.badge_id, {
              source: 'onboarding_milestone',
              milestone_id: milestoneId
            });
          } catch (error) {
            console.error('Failed to award milestone badge:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check milestone completion:', error);
    }
  }

  /**
   * Schedule reminder for skipped/aborted onboarding (REQUIREMENT: Follow-up reminders)
   */
  async scheduleReminder(userId, flowId, reminderType = 'skipped') {
    try {
      const existing = await db('onboarding_reminders')
        .where({ user_id: userId, flow_id: flowId, is_active: true })
        .first();

      const nextReminderAt = new Date();
      nextReminderAt.setTime(nextReminderAt.getTime() + this.reminderIntervals[reminderType]);

      if (existing) {
        await db('onboarding_reminders')
          .where({ id: existing.id })
          .update({
            reminder_type: reminderType,
            reminder_count: existing.reminder_count + 1,
            next_reminder_at: nextReminderAt,
            last_reminder_at: new Date()
          });
      } else {
        await db('onboarding_reminders')
          .insert({
            user_id: userId,
            flow_id: flowId,
            reminder_type: reminderType,
            reminder_count: 1,
            next_reminder_at: nextReminderAt,
            is_active: true
          });
      }
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
    }
  }

  /**
   * Process reminders (called by scheduled job)
   */
  async processReminders() {
    try {
      const now = new Date();
      const reminders = await db('onboarding_reminders')
        .where({ is_active: true })
        .where('next_reminder_at', '<=', now)
        .limit(100);

      for (const reminder of reminders) {
        try {
          // Check if user completed onboarding
          const userOnboarding = await db('user_onboarding')
            .where({ user_id: reminder.user_id, flow_id: reminder.flow_id })
            .first();

          if (userOnboarding?.status === 'completed') {
            // Cancel reminder
            await db('onboarding_reminders')
              .where({ id: reminder.id })
              .update({ is_active: false });
            continue;
          }

          // Send reminder (in production, this would send email/notification)
          console.log(`Sending onboarding reminder to user ${reminder.user_id}, type: ${reminder.reminder_type}`);

          // Schedule next reminder (max 3 reminders)
          if (reminder.reminder_count < 3) {
            const nextReminderAt = new Date();
            nextReminderAt.setTime(nextReminderAt.getTime() + this.reminderIntervals[reminder.reminder_type]);
            
            await db('onboarding_reminders')
              .where({ id: reminder.id })
              .update({
                reminder_count: reminder.reminder_count + 1,
                next_reminder_at: nextReminderAt,
                last_reminder_at: now
              });
          } else {
            // Max reminders reached, deactivate
            await db('onboarding_reminders')
              .where({ id: reminder.id })
              .update({ is_active: false });
          }
        } catch (error) {
          console.error(`Failed to process reminder ${reminder.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to process reminders:', error);
    }
  }

  /**
   * Start reminder processing job
   */
  startReminderJob() {
    // Run every 6 hours
    this.reminderJob = cron.schedule('0 */6 * * *', () => {
      this.processReminders();
    });
    console.log('Onboarding reminder job started');
  }

  /**
   * Stop reminder processing job
   */
  stopReminderJob() {
    if (this.reminderJob) {
      this.reminderJob.stop();
      console.log('Onboarding reminder job stopped');
    }
  }

  /**
   * Find active flow by audience
   */
  async findActiveFlowByAudience(audience) {
    try {
      const flow = await db('onboarding_flows')
        .where({ audience, is_active: true })
        .first();
      return flow;
    } catch (error) {
      console.error('Failed to find flow:', error);
      return null;
    }
  }

  /**
   * Get completion badge ID for audience
   */
  async getCompletionBadgeId(audience) {
    // Map audience to badge name
    const badgeMap = {
      'new_user': 'Welcome Badge',
      'new_teacher': 'Teacher Onboarded',
      'new_admin': 'Admin Certified'
    };

    const badgeName = badgeMap[audience];
    if (!badgeName) return null;

    try {
      const badge = await db('badges')
        .where({ name: badgeName, is_active: true })
        .first();
      return badge?.id || null;
    } catch (error) {
      console.error('Failed to get badge:', error);
      return null;
    }
  }

  /**
   * Get welcome message for audience
   */
  getWelcomeMessage(audience) {
    const messages = {
      'new_user': 'Welcome to the platform! You\'ve completed onboarding and unlocked all features.',
      'new_teacher': 'Congratulations! You\'re now ready to create and manage courses.',
      'new_admin': 'Welcome, administrator! You now have access to all admin tools.'
    };
    return messages[audience] || messages['new_user'];
  }

  /**
   * Get audience for role
   */
  getAudienceForRole(role) {
    switch (role) {
      case 'student':
        return 'new_user';
      case 'teacher':
        return 'new_teacher';
      case 'admin':
      case 'platform_admin':
        return 'new_admin';
      default:
        return 'new_user';
    }
  }

  /**
   * Track onboarding completion rate (REQUIREMENT: 95% completion within 7 days)
   */
  async getCompletionStats(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const totalUsers = await db('user_onboarding')
        .where('started_at', '>=', cutoffDate)
        .count('* as count')
        .first();

      const completedUsers = await db('user_onboarding')
        .where('started_at', '>=', cutoffDate)
        .where({ status: 'completed' })
        .count('* as count')
        .first();

      const total = parseInt(totalUsers?.count || 0);
      const completed = parseInt(completedUsers?.count || 0);
      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        total_users: total,
        completed_users: completed,
        completion_rate: parseFloat(completionRate.toFixed(2)),
        meets_requirement: completionRate >= 95,
        timeframe_days: days
      };
    } catch (error) {
      console.error('Failed to get completion stats:', error);
      return {
        total_users: 0,
        completed_users: 0,
        completion_rate: 0,
        meets_requirement: false,
        timeframe_days: days
      };
    }
  }
}

module.exports = new OnboardingService();


