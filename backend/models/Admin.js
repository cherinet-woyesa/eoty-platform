const db = require('../config/database');

class ContentUpload {
  static async create(uploadData) {
    const [uploadId] = await db('content_uploads').insert(uploadData).returning('id');
    return await this.findById(uploadId.id || uploadId);
  }

  static async findById(id) {
    return await db('content_uploads')
      .where({ id })
      .join('users as uploader', 'content_uploads.uploaded_by', 'uploader.id')
      .leftJoin('users as approver', 'content_uploads.approved_by', 'approver.id')
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
    const offset = (page - 1) * limit;
    let query = db('content_uploads')
      .where({ status })
      .join('users as uploader', 'content_uploads.uploaded_by', 'uploader.id')
      .select(
        'content_uploads.*',
        'uploader.first_name as uploader_first_name',
        'uploader.last_name as uploader_last_name'
      )
      .orderBy('content_uploads.created_at', 'desc')
      .offset(offset)
      .limit(limit);

    if (chapterId) {
      query = query.where('content_uploads.chapter_id', chapterId);
    }

    return await query;
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
  }

  static async incrementQuota(chapterId, contentType) {
    const quota = await this.checkQuota(chapterId, contentType);
    
    if (quota.monthly_limit > 0 && quota.current_usage >= quota.monthly_limit) {
      throw new Error(`Monthly quota exceeded for ${contentType}. Limit: ${quota.monthly_limit}`);
    }

    return await db('content_quotas')
      .where({ id: quota.id })
      .increment('current_usage', 1);
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
    const chapters = await db('users').distinct('chapter_id').pluck('chapter_id');
    
    const comparison = {};
    
    for (const chapterId of chapters) {
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
        .join('users', 'forum_posts.author_id', 'users.id')
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
    }

    return comparison;
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

  static async calculateChapterEngagement(chapterId) {
    // Calculate engagement score based on multiple factors
    const factors = await Promise.all([
      this.getUserActivityRate(chapterId),
      this.getContentConsumption(chapterId),
      this.getForumParticipation(chapterId)
    ]);

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
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
  }

  static async getLogs(adminId = null, actionType = null, startDate = null, endDate = null, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    let query = db('admin_audit_logs')
      .join('users', 'admin_audit_logs.admin_id', 'users.id')
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