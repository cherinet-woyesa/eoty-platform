const db = require('../config/database');

class ContentUpload {
  static async create(uploadData) {
    const [uploadId] = await db('content_uploads').insert(uploadData).returning('id');
    return await this.findById(uploadId.id || uploadId);
  }

  static async findById(id) {
    return await db('content_uploads')
      .where('content_uploads.id', id)
      .join('users as uploader', db.raw('content_uploads.uploaded_by::text'), '=', 'uploader.id')
      .leftJoin('users as approver', db.raw('content_uploads.approved_by::text'), '=', 'approver.id')
      .select(
        'content_uploads.*',
        'uploader.first_name as uploader_first_name',
        'uploader.last_name as uploader_last_name',
        'approver.first_name as approver_first_name',
        'approver.last_name as approver_last_name'
      )
      .first();
  }

  static async findByStatus(status, chapterId = null, page = 1, limit = 20) {
    try {
      // Check if table exists
      const tableExists = await db.schema.hasTable('content_uploads');
      if (!tableExists) {
        return [];
      }

      const offset = (page - 1) * limit;
      let query = db('content_uploads')
        .join('users as uploader', db.raw('content_uploads.uploaded_by::text'), '=', 'uploader.id')
        .select(
          'content_uploads.*',
          'uploader.first_name as uploader_first_name',
          'uploader.last_name as uploader_last_name'
        )
        .orderBy('content_uploads.created_at', 'desc')
        .offset(offset)
        .limit(limit);

      // Only filter by status if provided
      if (status) {
        query = query.where('content_uploads.status', status);
      }

      if (chapterId) {
        query = query.where('content_uploads.chapter_id', chapterId);
      }

      return await query;
    } catch (error) {
      console.error('ContentUpload.findByStatus error:', error);
      // If table doesn't exist or other DB error, return empty array
      if (error.code === '42P01') { // Table does not exist
        return [];
      }
      throw error; // Re-throw other errors
    }
  }

  static async updateStatus(id, status, approvedBy = null, rejectionReason = null) {
    const updateData = {
      status,
      updated_at: new Date()
    };

    if (status === 'approved' && approvedBy) {
      updateData.approved_by = approvedBy;
      updateData.approved_at = new Date();
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    return await db('content_uploads')
      .where({ id })
      .update(updateData);
  }

  static async checkQuota(chapterId, contentType) {
    try {
      // Check if table exists first
      const tableExists = await db.schema.hasTable('content_quotas');
      if (!tableExists) {
        // Return unlimited quota if table doesn't exist
        return {
          id: null,
          chapter_id: chapterId,
          content_type: contentType,
          monthly_limit: 0, // 0 = unlimited
          current_usage: 0,
          period_start: new Date(),
          period_end: new Date()
        };
      }

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const quota = await db('content_quotas')
        .where({
          chapter_id: chapterId,
          content_type: contentType,
          period_start: periodStart,
          period_end: periodEnd
        })
        .first();

      if (!quota) {
        // Create default quota if none exists
        const defaultQuotas = {
          video: 50, // 50 videos per month
          document: 100, // 100 documents per month
          image: 200 // 200 images per month
        };

        const [newQuotaId] = await db('content_quotas').insert({
          chapter_id: chapterId,
          content_type: contentType,
          monthly_limit: defaultQuotas[contentType] || 50,
          current_usage: 0,
          period_start: periodStart,
          period_end: periodEnd
        }).returning('id');

        return await db('content_quotas').where({ id: newQuotaId.id || newQuotaId }).first();
      }

      return quota;
    } catch (error) {
      // If table doesn't exist or other error, return unlimited quota
      if (error.code === '42P01') { // Table does not exist
        console.warn('content_quotas table does not exist, allowing unlimited uploads');
        return {
          id: null,
          chapter_id: chapterId,
          content_type: contentType,
          monthly_limit: 0, // 0 = unlimited
          current_usage: 0,
          period_start: new Date(),
          period_end: new Date()
        };
      }
      throw error; // Re-throw other errors
    }
  }

  static async incrementQuota(chapterId, contentType) {
    try {
      const quota = await this.checkQuota(chapterId, contentType);
      
      // If quota table doesn't exist or quota is unlimited, skip increment
      if (!quota.id || quota.monthly_limit === 0) {
        return; // No quota tracking needed
      }
      
      if (quota.monthly_limit > 0 && quota.current_usage >= quota.monthly_limit) {
        throw new Error(`Monthly quota exceeded for ${contentType}. Limit: ${quota.monthly_limit}`);
      }

      // Check if table exists before trying to update
      const tableExists = await db.schema.hasTable('content_quotas');
      if (tableExists && quota.id) {
        return await db('content_quotas')
          .where({ id: quota.id })
          .increment('current_usage', 1);
      }
    } catch (error) {
      // If table doesn't exist, just log and continue
      if (error.code === '42P01') { // Table does not exist
        console.warn('content_quotas table does not exist, skipping quota increment');
        return;
      }
      throw error; // Re-throw quota exceeded errors
    }
  }
}

class FlaggedContent {
  static async create(flagData) {
    const [flagId] = await db('flagged_content').insert(flagData).returning('id');
    return await this.findById(flagId.id || flagId);
  }

  static async findById(id) {
    return await db('flagged_content')
      .where({ id })
      .join('users as flagger', 'flagged_content.flagged_by', 'flagger.id')
      .leftJoin('users as reviewer', 'flagged_content.reviewed_by', 'reviewer.id')
      .select(
        'flagged_content.*',
        'flagger.first_name as flagger_first_name',
        'flagger.last_name as flagger_last_name',
        'reviewer.first_name as reviewer_first_name',
        'reviewer.last_name as reviewer_last_name'
      )
      .first();
  }

  static async findByStatus(status, page = 1, limit = 20) {
    try {
      // Check if table exists
      const tableExists = await db.schema.hasTable('flagged_content');
      if (!tableExists) {
        console.warn('flagged_content table does not exist. Returning empty array.');
        return [];
      }

      const offset = (page - 1) * limit;
      
      return await db('flagged_content')
        .where({ status })
        .join('users as flagger', 'flagged_content.flagged_by', 'flagger.id')
        .select(
          'flagged_content.*',
          'flagger.first_name as flagger_first_name',
          'flagger.last_name as flagger_last_name'
        )
        .orderBy('flagged_content.created_at', 'asc') // Oldest first for review queue
        .offset(offset)
        .limit(limit);
    } catch (error) {
      console.error('FlaggedContent.findByStatus error:', error);
      // If table doesn't exist or other DB error, return empty array
      if (error.code === '42P01') { // Table does not exist
        return [];
      }
      throw error; // Re-throw other errors
    }
  }

  static async updateStatus(id, status, reviewedBy, reviewNotes = null, actionTaken = null) {
    return await db('flagged_content')
      .where({ id })
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
        review_notes: reviewNotes,
        action_taken: actionTaken,
        updated_at: new Date()
      });
  }

  static async getStats(timeframe = '7days') {
    try {
      // Check if table exists
      const tableExists = await db.schema.hasTable('flagged_content');
      if (!tableExists) {
        console.warn('flagged_content table does not exist. Returning empty stats.');
        return {
          total: 0,
          by_status: {},
          by_reason: {},
          avg_review_time: 0
        };
      }

      const dateFilter = this.getDateFilter(timeframe);
      
      const totalFlags = await db('flagged_content')
        .where('created_at', '>=', dateFilter)
        .count('id as count')
        .first();

    const byStatus = await db('flagged_content')
      .where('created_at', '>=', dateFilter)
      .groupBy('status')
      .select('status')
      .count('id as count');

    const byReason = await db('flagged_content')
      .where('created_at', '>=', dateFilter)
      .groupBy('flag_reason')
      .select('flag_reason')
      .count('id as count');

      const avgReviewTime = await db.raw(`
        SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))/3600) as avg_hours
        FROM flagged_content 
        WHERE status != 'pending' AND created_at >= ?
      `, [dateFilter]);

      return {
        total: parseInt(totalFlags.count) || 0,
        by_status: byStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        by_reason: byReason.reduce((acc, item) => {
          acc[item.flag_reason] = parseInt(item.count);
          return acc;
        }, {}),
        avg_review_time: parseFloat(avgReviewTime.rows[0]?.avg_hours) || 0
      };
    } catch (error) {
      console.error('FlaggedContent.getStats error:', error);
      // If table doesn't exist or other DB error, return empty stats
      if (error.code === '42P01') { // Table does not exist
        return {
          total: 0,
          by_status: {},
          by_reason: {},
          avg_review_time: 0
        };
      }
      throw error; // Re-throw other errors
    }
  }

  static getDateFilter(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case '24hours':
        return new Date(now.setDate(now.getDate() - 1));
      case '7days':
        return new Date(now.setDate(now.getDate() - 7));
      case '30days':
        return new Date(now.setDate(now.getDate() - 30));
      default:
        return new Date(now.setDate(now.getDate() - 7));
    }
  }
}

class Analytics {
  static async generateDailySnapshot() {
    try {
      const snapshotDate = new Date();
      snapshotDate.setHours(0, 0, 0, 0);

      const metrics = await this.calculateMetrics(snapshotDate);
      const chapterComparison = await this.compareChapters(snapshotDate);
      const trends = await this.calculateTrends(snapshotDate);

      const [snapshotId] = await db('analytics_snapshots').insert({
        snapshot_type: 'daily',
        snapshot_date: snapshotDate,
        metrics: JSON.stringify(metrics),
        chapter_comparison: JSON.stringify(chapterComparison),
        trends: JSON.stringify(trends)
      }).returning('id');

      return await db('analytics_snapshots').where({ id: snapshotId.id || snapshotId }).first();
    } catch (error) {
      console.error('Error generating daily snapshot:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  static async calculateMetrics(date) {
    // User metrics
    const totalUsers = await db('users').count('id as count').first();
    const activeUsers = await db('users')
      .where('last_login_at', '>=', new Date(date.setDate(date.getDate() - 30)))
      .count('id as count')
      .first();

    // Content metrics
    const totalContent = await db('resources')
      .where('is_public', true)
      .count('id as count')
      .first();

    const forumActivity = await db('forum_posts')
      .where('created_at', '>=', new Date(date.setDate(date.getDate() - 7)))
      .count('id as count')
      .first();

    // Engagement metrics
    const completionRate = await this.calculateCompletionRate();
    const avgSessionTime = await this.calculateAvgSessionTime();

    return {
      users: {
        total: parseInt(totalUsers.count) || 0,
        active: parseInt(activeUsers.count) || 0,
        growth: await this.calculateUserGrowth(date)
      },
      content: {
        total: parseInt(totalContent.count) || 0,
        uploads_today: await this.getTodayUploads(),
        approval_rate: await this.calculateApprovalRate()
      },
      engagement: {
        forum_posts: parseInt(forumActivity.count) || 0,
        completion_rate: completionRate,
        avg_session_minutes: avgSessionTime
      },
      technical: {
        uptime: 99.9, // This would come from monitoring system
        response_time: await this.calculateAvgResponseTime()
      }
    };
  }

  static async compareChapters(date) {
    try {
      const chapters = await db('users')
        .distinct('chapter_id')
        .whereNotNull('chapter_id')
        .pluck('chapter_id');
      
      const comparison = {};
      
      for (const chapterId of chapters) {
        if (!chapterId) continue; // Skip null values
        
        try {
          const userCount = await db('users')
            .where({ chapter_id: chapterId })
            .count('id as count')
            .first();

          const activeUsers = await db('users')
            .where({ 
              chapter_id: chapterId
            })
            .where('last_login_at', '>=', new Date(new Date().setDate(new Date().getDate() - 30)))
            .count('id as count')
            .first();

          const forumPosts = await db('forum_posts')
            .join('users', 'forum_posts.user_id', 'users.id')
            .where('users.chapter_id', chapterId)
            .where('forum_posts.created_at', '>=', new Date(new Date().setDate(new Date().getDate() - 7)))
            .count('forum_posts.id as count')
            .first();

          comparison[chapterId] = {
            total_users: parseInt(userCount.count) || 0,
            active_users: parseInt(activeUsers.count) || 0,
            recent_posts: parseInt(forumPosts.count) || 0,
            engagement_score: await this.calculateChapterEngagement(chapterId)
          };
        } catch (chapterError) {
          console.error(`Error processing chapter ${chapterId}:`, chapterError);
          // Continue with other chapters even if one fails
          comparison[chapterId] = {
            total_users: 0,
            active_users: 0,
            recent_posts: 0,
            engagement_score: 0
          };
        }
      }

      return comparison;
    } catch (error) {
      console.error('Error in compareChapters:', error);
      return {};
    }
  }

  static async calculateTrends(date) {
    const sevenDaysAgo = new Date(date);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // User growth trend
    const userGrowth = await db('users')
      .where('created_at', '>=', sevenDaysAgo)
      .groupByRaw('DATE(created_at)')
      .select(db.raw('DATE(created_at) as date'))
      .count('id as new_users')
      .orderBy('date', 'asc');

    // Content upload trend
    const uploadTrend = await db('content_uploads')
      .where('created_at', '>=', sevenDaysAgo)
      .groupByRaw('DATE(created_at)')
      .select(db.raw('DATE(created_at) as date'))
      .count('id as uploads')
      .orderBy('date', 'asc');

    return {
      user_growth: userGrowth,
      upload_trend: uploadTrend,
      peak_usage_hours: await this.calculatePeakHours()
    };
  }

  static async calculateCompletionRate() {
    // This would calculate course/lesson completion rates
    // Simplified for example
    return 0.75; // 75% completion rate
  }

  static async calculateAvgSessionTime() {
    // This would come from actual session tracking
    return 25; // 25 minutes average
  }

  static async calculateAvgResponseTime() {
    // This would come from API monitoring
    return 150; // 150ms average response time
  }

  static async getTodayUploads() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db('content_uploads')
      .where('created_at', '>=', today)
      .count('id as count')
      .first();

    return parseInt(result.count) || 0;
  }

  static async calculateApprovalRate() {
    const total = await db('content_uploads').count('id as count').first();
    const approved = await db('content_uploads')
      .where({ status: 'approved' })
      .count('id as count')
      .first();

    return total.count > 0 ? (approved.count / total.count) : 0;
  }

  static async calculateUserGrowth(date) {
    const thirtyDaysAgo = new Date(date);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const previous = await db('users')
      .where('created_at', '<', thirtyDaysAgo)
      .count('id as count')
      .first();

    const current = await db('users').count('id as count').first();

    return previous.count > 0 ? ((current.count - previous.count) / previous.count) : 0;
  }

  static async getUserActivityRate(chapterId) {
    try {
      // Calculate activity rate based on recent logins and engagement
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const totalUsers = await db('users')
        .where({ chapter_id: chapterId })
        .count('id as count')
        .first();
      
      const activeUsers = await db('users')
        .where({ chapter_id: chapterId })
        .where('last_login_at', '>=', thirtyDaysAgo)
        .count('id as count')
        .first();
      
      const total = parseInt(totalUsers.count) || 0;
      const active = parseInt(activeUsers.count) || 0;
      
      // Return normalized score (0-1) based on active user percentage
      return total > 0 ? Math.min(active / total, 1) : 0;
    } catch (error) {
      console.error(`Error in getUserActivityRate for chapter ${chapterId}:`, error);
      return 0;
    }
  }

  static async getContentConsumption(chapterId) {
    try {
      // Calculate content consumption based on lesson progress and resource views
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const chapterUsers = await db('users')
        .where({ chapter_id: chapterId })
        .count('id as count')
        .first();
      
      const totalUsers = parseInt(chapterUsers.count) || 0;
      
      if (totalUsers === 0) return 0;
      
      // Check if user_lesson_progress table exists
      const hasTable = await db.schema.hasTable('user_lesson_progress');
      if (!hasTable) {
        return 0;
      }
      
      // Get lesson progress activity
      const progressActivity = await db('user_lesson_progress')
        .join('users', 'user_lesson_progress.user_id', 'users.id')
        .where('users.chapter_id', chapterId)
        .where('user_lesson_progress.last_accessed_at', '>=', sevenDaysAgo)
        .countDistinct('user_lesson_progress.user_id as count')
        .first();
      
      const activeConsumers = parseInt(progressActivity.count) || 0;
      
      // Return normalized score (0-1) based on users consuming content
      return Math.min(activeConsumers / totalUsers, 1);
    } catch (error) {
      console.error(`Error in getContentConsumption for chapter ${chapterId}:`, error);
      return 0;
    }
  }

  static async getForumParticipation(chapterId) {
    try {
      // Calculate forum participation based on posts and engagement
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const chapterUsers = await db('users')
        .where({ chapter_id: chapterId })
        .count('id as count')
        .first();
      
      const totalUsers = parseInt(chapterUsers.count) || 0;
      
      if (totalUsers === 0) return 0;
      
      // Get users who posted in forums
      const forumParticipants = await db('forum_posts')
        .join('users', 'forum_posts.user_id', 'users.id')
        .where('users.chapter_id', chapterId)
        .where('forum_posts.created_at', '>=', sevenDaysAgo)
        .countDistinct('forum_posts.user_id as count')
        .first();
      
      const activeParticipants = parseInt(forumParticipants.count) || 0;
      
      // Return normalized score (0-1) based on forum participation
      return Math.min(activeParticipants / totalUsers, 1);
    } catch (error) {
      console.error(`Error in getForumParticipation for chapter ${chapterId}:`, error);
      return 0;
    }
  }

  static async calculateChapterEngagement(chapterId) {
    try {
      // Calculate engagement score based on multiple factors
      const factors = await Promise.all([
        this.getUserActivityRate(chapterId),
        this.getContentConsumption(chapterId),
        this.getForumParticipation(chapterId)
      ]);

      const sum = factors.reduce((acc, factor) => acc + (factor || 0), 0);
      return factors.length > 0 ? sum / factors.length : 0;
    } catch (error) {
      console.error(`Error in calculateChapterEngagement for chapter ${chapterId}:`, error);
      return 0;
    }
  }

  static async calculatePeakHours() {
    // This would analyze usage patterns to find peak hours
    return {
      morning: '9:00-11:00',
      evening: '19:00-21:00'
    };
  }
}

class AdminAudit {
  static async logAction(adminId, actionType, targetType, targetId, actionDetails, beforeState = null, afterState = null, ipAddress = null, userAgent = null) {
    try {
      // Check if table exists
      const tableExists = await db.schema.hasTable('admin_audit_logs');
      if (!tableExists) {
        console.warn('admin_audit_logs table does not exist, skipping audit log');
        return null;
      }

      const [logId] = await db('admin_audit_logs').insert({
        admin_id: adminId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        action_details: actionDetails,
        before_state: beforeState ? JSON.stringify(beforeState) : null,
        after_state: afterState ? JSON.stringify(afterState) : null,
        ip_address: ipAddress,
        user_agent: userAgent
      }).returning('id');

      return await db('admin_audit_logs').where({ id: logId.id || logId }).first();
    } catch (error) {
      // If table doesn't exist or other error, log warning but don't throw
      if (error.code === '42P01') { // Table does not exist
        console.warn('admin_audit_logs table does not exist, skipping audit log');
        return null;
      }
      console.error('Error logging audit action:', error);
      // Don't throw - audit logging should not break the main operation
      return null;
    }
  }

  static async getLogs(adminId = null, actionType = null, startDate = null, endDate = null, page = 1, limit = 50) {
    try {
      // Check if table exists
      const tableExists = await db.schema.hasTable('admin_audit_logs');
      if (!tableExists) {
        return [];
      }

      const offset = (page - 1) * limit;
      let query = db('admin_audit_logs')
        .join('users', db.raw('admin_audit_logs.admin_id::text'), '=', 'users.id')
        .select(
          'admin_audit_logs.*',
          'users.first_name',
          'users.last_name',
          'users.email'
        )
        .orderBy('admin_audit_logs.created_at', 'desc')
        .offset(offset)
        .limit(limit);

      if (adminId) {
        query = query.where('admin_audit_logs.admin_id', adminId);
      }

      if (actionType) {
        query = query.where('admin_audit_logs.action_type', actionType);
      }

      if (startDate) {
        query = query.where('admin_audit_logs.created_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('admin_audit_logs.created_at', '<=', endDate);
      }

      return await query;
    } catch (error) {
      // If table doesn't exist or other error, return empty array
      if (error.code === '42P01') { // Table does not exist
        return [];
      }
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }
}

class ContentTag {
  static async create(tagData) {
    const [tagId] = await db('content_tags').insert(tagData).returning('id');
    return await this.findById(tagId.id || tagId);
  }

  static async findById(id) {
    return await db('content_tags').where({ id }).first();
  }

  static async findAllActive() {
    return await db('content_tags').where({ is_active: true }).orderBy('name', 'asc');
  }

  static async findByCategory(category) {
    return await db('content_tags').where({ category, is_active: true }).orderBy('name', 'asc');
  }

  static async tagContent(contentType, contentId, tagId, taggedBy) {
    const [relationId] = await db('content_tag_relationships').insert({
      content_type: contentType,
      content_id: contentId,
      tag_id: tagId,
      tagged_by: taggedBy
    }).returning('id');

    return await db('content_tag_relationships').where({ id: relationId.id || relationId }).first();
  }

  static async getContentTags(contentType, contentId) {
    return await db('content_tag_relationships')
      .where({
        content_type: contentType,
        content_id: contentId
      })
      .join('content_tags', 'content_tag_relationships.tag_id', 'content_tags.id')
      .select(
        'content_tags.*',
        'content_tag_relationships.created_at as tagged_at'
      );
  }

  static async removeContentTag(contentType, contentId, tagId) {
    return await db('content_tag_relationships')
      .where({
        content_type: contentType,
        content_id: contentId,
        tag_id: tagId
      })
      .delete();
  }
}

module.exports = {
  ContentUpload,
  FlaggedContent,
  Analytics,
  AdminAudit,
  ContentTag
};