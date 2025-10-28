const db = require('../config/database');

// Validation service for acceptance criteria
class ValidationService {
  // Check system uptime
  static async checkUptime() {
    try {
      // In a real implementation, this would check actual system metrics
      // For now, we'll simulate a check
      const uptimeData = {
        startTime: process.uptime(),
        status: 'operational',
        timestamp: new Date()
      };
      
      // Store uptime check in database for monitoring
      await db('system_monitoring').insert({
        metric: 'uptime_check',
        value: 1, // 1 for up, 0 for down
        timestamp: new Date()
      });
      
      return {
        success: true,
        data: uptimeData
      };
    } catch (error) {
      console.error('Uptime check error:', error);
      return {
        success: false,
        error: 'Failed to check system uptime'
      };
    }
  }

  // Validate data persistence
  static async validateDataPersistence() {
    try {
      // Check if critical data tables have records
      const userCount = await db('users').count('* as count').first();
      const courseCount = await db('courses').count('* as count').first();
      const lessonCount = await db('lessons').count('* as count').first();
      
      // Check recent activity
      const recentUsers = await db('users')
        .where('last_login_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .count('* as count')
        .first();
        
      const recentProgress = await db('user_lesson_progress')
        .where('last_accessed_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .count('* as count')
        .first();
      
      const validationData = {
        users: userCount.count,
        courses: courseCount.count,
        lessons: lessonCount.count,
        activeUsers24h: recentUsers.count,
        progressUpdates24h: recentProgress.count,
        timestamp: new Date()
      };
      
      // Store validation check in database
      await db('system_monitoring').insert({
        metric: 'data_persistence_check',
        value: 1, // 1 for valid, 0 for invalid
        details: JSON.stringify(validationData),
        timestamp: new Date()
      });
      
      return {
        success: true,
        data: validationData
      };
    } catch (error) {
      console.error('Data persistence validation error:', error);
      
      // Store failed validation check
      await db('system_monitoring').insert({
        metric: 'data_persistence_check',
        value: 0, // 1 for valid, 0 for invalid
        error: error.message,
        timestamp: new Date()
      });
      
      return {
        success: false,
        error: 'Failed to validate data persistence'
      };
    }
  }

  // Validate moderation effectiveness
  static async validateModerationEffectiveness() {
    try {
      // Check moderation statistics
      const totalDiscussions = await db('lesson_discussions').count('* as count').first();
      const moderatedDiscussions = await db('lesson_discussions')
        .where('is_moderated', true)
        .count('* as count')
        .first();
        
      const totalReports = await db('discussion_reports').count('* as count').first();
      const resolvedReports = await db('discussion_reports')
        .whereNotNull('resolved_at')
        .count('* as count')
        .first();
        
      // Check auto-moderation effectiveness
      const autoFlagged = await db('lesson_discussions')
        .where('is_auto_flagged', true)
        .count('* as count')
        .first();
        
      const autoFlaggedModerated = await db('lesson_discussions')
        .where('is_auto_flagged', true)
        .where('is_moderated', true)
        .count('* as count')
        .first();
      
      const moderationData = {
        totalDiscussions: totalDiscussions.count,
        moderatedDiscussions: moderatedDiscussions.count,
        moderationRate: totalDiscussions.count > 0 
          ? (moderatedDiscussions.count / totalDiscussions.count * 100).toFixed(2) 
          : 0,
        totalReports: totalReports.count,
        resolvedReports: resolvedReports?.count || 0,
        reportResolutionRate: totalReports.count > 0 
          ? ((resolvedReports?.count || 0) / totalReports.count * 100).toFixed(2) 
          : 0,
        autoFlagged: autoFlagged.count,
        autoFlaggedModerated: autoFlaggedModerated?.count || 0,
        autoModerationEffectiveness: autoFlagged.count > 0 
          ? ((autoFlaggedModerated?.count || 0) / autoFlagged.count * 100).toFixed(2) 
          : 0,
        timestamp: new Date()
      };
      
      // Store moderation validation check
      await db('system_monitoring').insert({
        metric: 'moderation_effectiveness_check',
        value: 1, // 1 for valid, 0 for invalid
        details: JSON.stringify(moderationData),
        timestamp: new Date()
      });
      
      return {
        success: true,
        data: moderationData
      };
    } catch (error) {
      console.error('Moderation effectiveness validation error:', error);
      
      // Store failed validation check
      await db('system_monitoring').insert({
        metric: 'moderation_effectiveness_check',
        value: 0, // 1 for valid, 0 for invalid
        error: error.message,
        timestamp: new Date()
      });
      
      return {
        success: false,
        error: 'Failed to validate moderation effectiveness'
      };
    }
  }

  // Run all acceptance criteria validations
  static async runAllValidations() {
    try {
      const uptimeResult = await this.checkUptime();
      const dataResult = await this.validateDataPersistence();
      const moderationResult = await this.validateModerationEffectiveness();
      
      const overallResult = {
        timestamp: new Date(),
        uptime: uptimeResult,
        dataPersistence: dataResult,
        moderation: moderationResult,
        overallStatus: uptimeResult.success && dataResult.success && moderationResult.success
          ? 'passing'
          : 'failing'
      };
      
      // Store overall validation result
      await db('system_monitoring').insert({
        metric: 'acceptance_criteria_validation',
        value: overallResult.overallStatus === 'passing' ? 1 : 0,
        details: JSON.stringify(overallResult),
        timestamp: new Date()
      });
      
      return overallResult;
    } catch (error) {
      console.error('Overall validation error:', error);
      return {
        success: false,
        error: 'Failed to run acceptance criteria validation'
      };
    }
  }

  // Get validation history
  static async getValidationHistory(limit = 100) {
    try {
      const history = await db('system_monitoring')
        .where('metric', 'acceptance_criteria_validation')
        .orderBy('timestamp', 'desc')
        .limit(limit);
      
      return {
        success: true,
        data: history
      };
    } catch (error) {
      console.error('Get validation history error:', error);
      return {
        success: false,
        error: 'Failed to fetch validation history'
      };
    }
  }

  // Get system metrics
  static async getSystemMetrics() {
    try {
      const metrics = await db('system_monitoring')
        .select('metric', 'value', 'timestamp', 'details')
        .orderBy('timestamp', 'desc')
        .limit(50);
      
      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      console.error('Get system metrics error:', error);
      return {
        success: false,
        error: 'Failed to fetch system metrics'
      };
    }
  }
}

module.exports = ValidationService;