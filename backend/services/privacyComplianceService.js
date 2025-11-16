// backend/services/privacyComplianceService.js
// Privacy Compliance Service - REQUIREMENT: No sensitive data retention

const db = require('../config/database');

class PrivacyComplianceService {
  constructor() {
    // Privacy settings from environment
    this.settings = {
      retainConversationData: process.env.RETAIN_CONVERSATION_DATA === 'true',
      retentionPeriodDays: parseInt(process.env.CONVERSATION_RETENTION_DAYS) || 30,
      anonymizeUserData: process.env.ANONYMIZE_USER_DATA === 'true',
      autoDeleteEnabled: process.env.AUTO_DELETE_ENABLED !== 'false',
      deletionSchedule: process.env.DELETION_SCHEDULE || 'daily' // daily, weekly, monthly
    };

    // Tables that may contain sensitive data
    this.sensitiveDataTables = [
      'ai_conversations',
      'user_lesson_progress',
      'user_quiz_attempts',
      'video_annotations',
      'lesson_discussions',
      'moderated_content',
      'user_engagement'
    ];
  }

  // Anonymize user data (REQUIREMENT: No sensitive data retention)
  async anonymizeUserData(userId) {
    try {
      // Anonymize conversations (if table exists)
      const conversationsTableExists = await db.schema.hasTable('ai_conversations');
      if (conversationsTableExists) {
        await db('ai_conversations')
          .where({ user_id: userId })
          .update({
            user_id: null,
            user_query: '[ANONYMIZED]',
            ai_response: '[ANONYMIZED]',
            anonymized_at: new Date()
          });
      }

      // Anonymize progress data (if table and column exist)
      const progressTableExists = await db.schema.hasTable('user_lesson_progress');
      if (progressTableExists) {
        const hasAnonymizedAt = await db.schema.hasColumn('user_lesson_progress', 'anonymized_at');
        if (hasAnonymizedAt) {
          await db('user_lesson_progress')
            .where({ user_id: userId })
            .update({
              user_id: null,
              anonymized_at: new Date()
            });
        } else {
          // Just set user_id to null if anonymized_at doesn't exist
          await db('user_lesson_progress')
            .where({ user_id: userId })
            .update({ user_id: null });
        }
      }

      // Anonymize quiz attempts (if table exists)
      const quizAttemptsTableExists = await db.schema.hasTable('user_quiz_attempts');
      if (quizAttemptsTableExists) {
        const quizHasAnonymized = await db.schema.hasColumn('user_quiz_attempts', 'anonymized_at');
        if (quizHasAnonymized) {
          await db('user_quiz_attempts')
            .where({ user_id: userId })
            .update({
              user_id: null,
              answers: JSON.stringify({ anonymized: true }),
              anonymized_at: new Date()
            });
        } else {
          await db('user_quiz_attempts')
            .where({ user_id: userId })
            .update({
              user_id: null,
              answers: JSON.stringify({ anonymized: true })
            });
        }
      }

      // Anonymize annotations (if table exists)
      const annotationsTableExists = await db.schema.hasTable('video_annotations');
      if (annotationsTableExists) {
        const annotationsHasAnonymized = await db.schema.hasColumn('video_annotations', 'anonymized_at');
        if (annotationsHasAnonymized) {
          await db('video_annotations')
            .where({ user_id: userId })
            .update({
              user_id: null,
              content: '[ANONYMIZED]',
              anonymized_at: new Date()
            });
        } else {
          await db('video_annotations')
            .where({ user_id: userId })
            .update({
              user_id: null,
              content: '[ANONYMIZED]'
            });
        }
      }

      // Anonymize discussions (if table exists)
      const discussionsTableExists = await db.schema.hasTable('lesson_discussions');
      if (discussionsTableExists) {
        const discussionsHasAnonymized = await db.schema.hasColumn('lesson_discussions', 'anonymized_at');
        if (discussionsHasAnonymized) {
          await db('lesson_discussions')
            .where({ user_id: userId })
            .update({
              user_id: null,
              content: '[ANONYMIZED]',
              anonymized_at: new Date()
            });
        } else {
          await db('lesson_discussions')
            .where({ user_id: userId })
            .update({
              user_id: null,
              content: '[ANONYMIZED]'
            });
        }
      }

      console.log(`User data anonymized for user ID: ${userId}`);
      return { success: true, anonymized: true };
    } catch (error) {
      console.error('Anonymize user data error:', error);
      throw error;
    }
  }

  // Delete expired data (REQUIREMENT: No sensitive data retention)
  async deleteExpiredData() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.settings.retentionPeriodDays);

      let deletedCount = 0;

      // Delete expired conversations
      if (!this.settings.retainConversationData) {
        // Check if table exists
        const tableExists = await db.schema.hasTable('ai_conversations');
        if (tableExists) {
          const conversationsDeleted = await db('ai_conversations')
            .where('created_at', '<', cutoffDate)
            .delete();
          deletedCount += conversationsDeleted;
        }
      }

      // Delete expired progress data (older than retention period) - if table exists
      const progressTableExists = await db.schema.hasTable('user_lesson_progress');
      if (progressTableExists) {
        const hasAnonymizedAt = await db.schema.hasColumn('user_lesson_progress', 'anonymized_at');
        let progressDeleted = 0;
        
        if (hasAnonymizedAt) {
          progressDeleted = await db('user_lesson_progress')
            .where('last_accessed_at', '<', cutoffDate)
            .whereNull('anonymized_at')
            .delete();
        } else {
          // If column doesn't exist, just delete based on date
          progressDeleted = await db('user_lesson_progress')
            .where('last_accessed_at', '<', cutoffDate)
            .delete();
        }
        deletedCount += progressDeleted;
      }

      // Delete expired quiz attempts (if table exists)
      const quizAttemptsTableExists = await db.schema.hasTable('user_quiz_attempts');
      if (quizAttemptsTableExists) {
        const quizAttemptsHasAnonymized = await db.schema.hasColumn('user_quiz_attempts', 'anonymized_at');
        let quizAttemptsDeleted = 0;
        if (quizAttemptsHasAnonymized) {
          quizAttemptsDeleted = await db('user_quiz_attempts')
            .where('completed_at', '<', cutoffDate)
            .whereNull('anonymized_at')
            .delete();
        } else {
          quizAttemptsDeleted = await db('user_quiz_attempts')
            .where('completed_at', '<', cutoffDate)
            .delete();
        }
        deletedCount += quizAttemptsDeleted;
      }

      // Delete expired annotations (keep public ones) - if table exists
      const annotationsTableExists = await db.schema.hasTable('video_annotations');
      if (annotationsTableExists) {
        const annotationsHasAnonymized = await db.schema.hasColumn('video_annotations', 'anonymized_at');
        let annotationsDeleted = 0;
        if (annotationsHasAnonymized) {
          annotationsDeleted = await db('video_annotations')
            .where('created_at', '<', cutoffDate)
            .where('is_public', false)
            .whereNull('anonymized_at')
            .delete();
        } else {
          annotationsDeleted = await db('video_annotations')
            .where('created_at', '<', cutoffDate)
            .where('is_public', false)
            .delete();
        }
        deletedCount += annotationsDeleted;
      }

      // Delete expired discussions (keep moderated ones for audit) - if table exists
      const discussionsTableExists = await db.schema.hasTable('lesson_discussions');
      if (discussionsTableExists) {
        const discussionsHasAnonymized = await db.schema.hasColumn('lesson_discussions', 'anonymized_at');
        let discussionsDeleted = 0;
        if (discussionsHasAnonymized) {
          discussionsDeleted = await db('lesson_discussions')
            .where('created_at', '<', cutoffDate)
            .where('is_moderated', false)
            .whereNull('anonymized_at')
            .delete();
        } else {
          discussionsDeleted = await db('lesson_discussions')
            .where('created_at', '<', cutoffDate)
            .where('is_moderated', false)
            .delete();
        }
        deletedCount += discussionsDeleted;
      }

      // Log deletion (if table exists)
      const logsTableExists = await db.schema.hasTable('privacy_deletion_logs');
      if (logsTableExists) {
        try {
          await db('privacy_deletion_logs').insert({
            deletion_date: new Date(),
            records_deleted: deletedCount,
            retention_period_days: this.settings.retentionPeriodDays,
            cutoff_date: cutoffDate
          });
        } catch (logError) {
          // Silently fail if logging fails
          console.warn('Failed to log deletion:', logError.message);
        }
      }

      console.log(`Deleted ${deletedCount} expired records (cutoff: ${cutoffDate.toISOString()})`);
      return { success: true, deletedCount };
    } catch (error) {
      // Silently fail if column doesn't exist
      if (error.code === '42703') {
        return { success: true, deletedCount: 0 };
      }
      console.error('Delete expired data error:', error);
      return { success: false, error: error.message, deletedCount: 0 };
    }
  }

  // Get data retention status
  async getRetentionStatus() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.settings.retentionPeriodDays);

      const stats = {
        retentionPeriodDays: this.settings.retentionPeriodDays,
        cutoffDate: cutoffDate.toISOString(),
        totalRecords: {},
        expiredRecords: {},
        anonymizedRecords: {}
      };

      // Count records in each sensitive table
      for (const table of this.sensitiveDataTables) {
        try {
          const total = await db(table).count('* as count').first();
          const expired = await db(table)
            .where('created_at', '<', cutoffDate)
            .count('* as count')
            .first();
          const anonymized = await db(table)
            .whereNotNull('anonymized_at')
            .count('* as count')
            .first();

          stats.totalRecords[table] = parseInt(total.count);
          stats.expiredRecords[table] = parseInt(expired.count);
          stats.anonymizedRecords[table] = parseInt(anonymized.count);
        } catch (error) {
          // Table might not exist, skip it
          console.warn(`Table ${table} not found, skipping`);
        }
      }

      return stats;
    } catch (error) {
      console.error('Get retention status error:', error);
      throw error;
    }
  }

  // Schedule automatic data deletion
  startScheduledDeletion() {
    if (!this.settings.autoDeleteEnabled) {
      console.log('Automatic data deletion is disabled');
      return;
    }

    const scheduleInterval = this.getScheduleInterval();
    
    console.log(`Starting scheduled data deletion (${this.settings.deletionSchedule})`);
    
    // Run immediately on start
    this.deleteExpiredData().catch(err => {
      console.error('Initial data deletion failed:', err);
    });

    // Schedule periodic deletion
    this.deletionInterval = setInterval(() => {
      this.deleteExpiredData().catch(err => {
        console.error('Scheduled data deletion failed:', err);
      });
    }, scheduleInterval);
  }

  // Stop scheduled deletion
  stopScheduledDeletion() {
    if (this.deletionInterval) {
      clearInterval(this.deletionInterval);
      this.deletionInterval = null;
      console.log('Stopped scheduled data deletion');
    }
  }

  // Get schedule interval in milliseconds
  getScheduleInterval() {
    switch (this.settings.deletionSchedule) {
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }
}

// Create singleton instance
const privacyComplianceService = new PrivacyComplianceService();

module.exports = privacyComplianceService;


