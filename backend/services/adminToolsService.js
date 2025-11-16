/**
 * Admin Tools Service
 * Comprehensive service for FR5: Admin Tools
 * Handles upload management, moderation, analytics, and audit features
 */

const db = require('../config/database');
const { ContentUpload, FlaggedContent, AdminAudit, Analytics } = require('../models/Admin');

class AdminToolsService {
  /**
   * Upload Management
   */

  // Track upload time for <5 min requirement (REQUIREMENT: <5 min to upload and publish)
  async trackUploadTime(uploadId, startTime) {
    const uploadTime = Date.now() - startTime;
    const uploadTimeMinutes = uploadTime / 1000 / 60;
    
    // Only update metadata since upload_time_ms and upload_time_minutes columns don't exist
    await db('content_uploads')
      .where({ id: uploadId })
      .update({
        metadata: db.raw(`COALESCE(metadata, '{}'::jsonb) || '{"upload_time": ${uploadTime}, "upload_time_minutes": ${uploadTimeMinutes}}'::jsonb`)
      });

    // REQUIREMENT: Warn if upload exceeds 5 minutes
    if (uploadTimeMinutes > 5) {
      await this.logAnomaly('upload_time_exceeded', {
        uploadId,
        uploadTimeMinutes,
        threshold: 5
      });
    }

    return uploadTimeMinutes;
  }

  // Retry failed uploads (REQUIREMENT: Handles failed uploads with retry)
  async retryUpload(uploadId, adminId) {
    const upload = await ContentUpload.findById(uploadId);
    
    if (!upload) {
      throw new Error('Upload not found');
    }

    if (upload.status !== 'failed') {
      throw new Error('Upload is not in failed status');
    }

    // Reset upload status
    await db('content_uploads')
      .where({ id: uploadId })
      .update({
        status: 'pending',
        retry_count: db.raw('COALESCE(retry_count, 0) + 1'),
        last_retry_at: new Date(),
        error_message: null
      });

    // Log retry action
    await AdminAudit.logAction(
      adminId,
      'upload_retry',
      'content_upload',
      uploadId,
      `Retried failed upload: ${upload.title}`
    );

    return await ContentUpload.findById(uploadId);
  }

  // Get upload preview data (REQUIREMENT: Preview functionality)
  async getUploadPreview(uploadId) {
    const upload = await ContentUpload.findById(uploadId);
    
    if (!upload) {
      throw new Error('Upload not found');
    }

    const preview = {
      id: upload.id,
      title: upload.title,
      description: upload.description,
      file_type: upload.file_type,
      file_size: upload.file_size,
      mime_type: upload.mime_type,
      thumbnail_url: null,
      preview_url: null
    };

    // Generate preview URLs based on file type
    if (upload.file_type === 'video') {
      // For videos, we'd generate a thumbnail
      preview.thumbnail_url = `/api/admin/uploads/${uploadId}/thumbnail`;
      preview.preview_url = `/api/admin/uploads/${uploadId}/preview`;
    } else if (upload.file_type === 'image') {
      preview.preview_url = upload.file_path;
    } else if (upload.file_type === 'document') {
      // For PDFs, we'd generate a preview page
      preview.preview_url = `/api/admin/uploads/${uploadId}/preview?page=1`;
    }

    return preview;
  }

  /**
   * Moderation Tools
   */

  // Track review time for 2-hour requirement (REQUIREMENT: All flagged content reviewed within 2 hours)
  async trackReviewTime(flagId, reviewStartTime) {
    const reviewTime = Date.now() - reviewStartTime;
    const reviewTimeHours = reviewTime / 1000 / 60 / 60;
    
    await db('flagged_content')
      .where({ id: flagId })
      .update({
        review_time_ms: reviewTime,
        review_time_hours: reviewTimeHours
      });

    // REQUIREMENT: Warn if review exceeds 2 hours
    if (reviewTimeHours > 2) {
      await this.logAnomaly('review_time_exceeded', {
        flagId,
        reviewTimeHours,
        threshold: 2
      });
    }

    return reviewTimeHours;
  }

  // Ban/unban user (REQUIREMENT: Ban/unban users)
  async banUser(userId, adminId, reason, duration = null) {
    const user = await db('users').where({ id: userId }).first();
    
    if (!user) {
      throw new Error('User not found');
    }

    const banData = {
      user_id: userId,
      banned_by: adminId,
      reason,
      banned_at: new Date(),
      expires_at: duration ? new Date(Date.now() + duration * 1000) : null,
      is_permanent: !duration
    };

    await db('user_bans').insert(banData);

    await db('users')
      .where({ id: userId })
      .update({ is_active: false });

    // Log audit
    await AdminAudit.logAction(
      adminId,
      'user_ban',
      'user',
      userId,
      `Banned user: ${user.email}. Reason: ${reason}`,
      { is_active: true },
      { is_active: false, banned: true }
    );

    return banData;
  }

  async unbanUser(userId, adminId) {
    const user = await db('users').where({ id: userId }).first();
    
    if (!user) {
      throw new Error('User not found');
    }

    await db('user_bans')
      .where({ user_id: userId })
      .where(function() {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
      })
      .update({
        unbanned_at: new Date(),
        unbanned_by: adminId
      });

    await db('users')
      .where({ id: userId })
      .update({ is_active: true });

    // Log audit
    await AdminAudit.logAction(
      adminId,
      'user_unban',
      'user',
      userId,
      `Unbanned user: ${user.email}`,
      { is_active: false },
      { is_active: true, banned: false }
    );

    return { success: true };
  }

  // Ban/unban post (REQUIREMENT: Ban/unban posts)
  async banPost(postId, adminId, reason) {
    const post = await db('forum_posts').where({ id: postId }).first();
    
    if (!post) {
      throw new Error('Post not found');
    }

    await db('forum_posts')
      .where({ id: postId })
      .update({
        is_banned: true,
        ban_reason: reason,
        banned_at: new Date(),
        banned_by: adminId
      });

    // Log audit
    await AdminAudit.logAction(
      adminId,
      'post_ban',
      'forum_post',
      postId,
      `Banned post. Reason: ${reason}`
    );

    return { success: true };
  }

  async unbanPost(postId, adminId) {
    const post = await db('forum_posts').where({ id: postId }).first();
    
    if (!post) {
      throw new Error('Post not found');
    }

    await db('forum_posts')
      .where({ id: postId })
      .update({
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_by: null
      });

    // Log audit
    await AdminAudit.logAction(
      adminId,
      'post_unban',
      'forum_post',
      postId,
      'Unbanned post'
    );

    return { success: true };
  }

  // Edit content (REQUIREMENT: Edit content)
  async editContent(contentType, contentId, updates, adminId) {
    let tableName;
    let content;

    switch (contentType) {
      case 'forum_post':
        tableName = 'forum_posts';
        content = await db(tableName).where({ id: contentId }).first();
        break;
      case 'resource':
        tableName = 'resources';
        content = await db(tableName).where({ id: contentId }).first();
        break;
      case 'course':
        tableName = 'courses';
        content = await db(tableName).where({ id: contentId }).first();
        break;
      default:
        throw new Error('Unsupported content type');
    }

    if (!content) {
      throw new Error('Content not found');
    }

    const beforeState = { ...content };
    await db(tableName).where({ id: contentId }).update({
      ...updates,
      updated_at: new Date(),
      last_edited_by: adminId,
      last_edited_at: new Date()
    });

    const afterState = await db(tableName).where({ id: contentId }).first();

    // Log audit with before/after state
    await AdminAudit.logAction(
      adminId,
      'content_edit',
      contentType,
      contentId,
      `Edited ${contentType}`,
      beforeState,
      afterState
    );

    return afterState;
  }

  /**
   * Analytics & Accuracy
   */

  // Verify dashboard accuracy (REQUIREMENT: 99% dashboard accuracy)
  async verifyDashboardAccuracy(snapshotId) {
    const snapshot = await db('analytics_snapshots').where({ id: snapshotId }).first();
    
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    const metrics = typeof snapshot.metrics === 'string' 
      ? JSON.parse(snapshot.metrics) 
      : snapshot.metrics;

    // Recalculate metrics to verify accuracy
    const verifiedMetrics = await Analytics.calculateMetrics(snapshot.snapshot_date);
    
    // Compare and calculate accuracy
    const accuracy = this.calculateMetricsAccuracy(metrics, verifiedMetrics);
    
    await db('analytics_snapshots')
      .where({ id: snapshotId })
      .update({
        accuracy_score: accuracy,
        verified_at: new Date()
      });

    // REQUIREMENT: Warn if accuracy < 99%
    if (accuracy < 0.99) {
      await this.logAnomaly('dashboard_accuracy_low', {
        snapshotId,
        accuracy,
        threshold: 0.99
      });
    }

    return accuracy;
  }

  calculateMetricsAccuracy(original, verified) {
    // Calculate accuracy based on key metrics
    const keys = ['users.total', 'users.active', 'content.total', 'engagement.completion_rate'];
    let totalDiff = 0;
    let count = 0;

    keys.forEach(key => {
      const originalValue = this.getNestedValue(original, key);
      const verifiedValue = this.getNestedValue(verified, key);
      
      if (originalValue !== undefined && verifiedValue !== undefined) {
        const diff = Math.abs(originalValue - verifiedValue) / Math.max(originalValue, verifiedValue, 1);
        totalDiff += diff;
        count++;
      }
    });

    return count > 0 ? Math.max(0, 1 - (totalDiff / count)) : 1;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((o, p) => o && o[p], obj);
  }

  // Get retention metrics (REQUIREMENT: Retention metrics)
  async getRetentionMetrics(timeframe = '30days') {
    const dateFilter = this.getDateFilter(timeframe);
    
    // Calculate retention rates
    const newUsers = await db('users')
      .where('created_at', '>=', dateFilter)
      .count('id as count')
      .first();

    const retainedUsers = await db('users')
      .where('created_at', '>=', dateFilter)
      .where('last_login_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .count('id as count')
      .first();

    const retentionRate = newUsers.count > 0 
      ? (retainedUsers.count / newUsers.count) 
      : 0;

    return {
      new_users: parseInt(newUsers.count) || 0,
      retained_users: parseInt(retainedUsers.count) || 0,
      retention_rate: retentionRate,
      timeframe
    };
  }

  /**
   * Audit & Anomaly Detection
   */

  // Log anomaly (REQUIREMENT: Warns admins on audit or moderation anomalies)
  async logAnomaly(anomalyType, details) {
    const anomaly = {
      anomaly_type: anomalyType,
      details: JSON.stringify(details),
      severity: this.getAnomalySeverity(anomalyType),
      created_at: new Date()
    };

    const [anomalyId] = await db('admin_anomalies').insert(anomaly).returning('id');

    // Send notification to admins if high severity
    if (anomaly.severity === 'high') {
      await this.notifyAdminsOfAnomaly(anomalyId.id || anomalyId, anomalyType, details);
    }

    return anomalyId.id || anomalyId;
  }

  getAnomalySeverity(anomalyType) {
    const highSeverity = [
      'dashboard_accuracy_low',
      'review_time_exceeded',
      'upload_time_exceeded'
    ];

    return highSeverity.includes(anomalyType) ? 'high' : 'medium';
  }

  async notifyAdminsOfAnomaly(anomalyId, anomalyType, details) {
    // Get all active admins
    const admins = await db('users')
      .where({ role: 'admin', is_active: true })
      .select('id', 'email');

    // Create notifications for each admin
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      notification_type: 'admin_anomaly',
      title: `Admin Anomaly Detected: ${anomalyType}`,
      message: `Anomaly detected: ${JSON.stringify(details)}`,
      metadata: JSON.stringify({ anomalyId, anomalyType, details }),
      created_at: new Date()
    }));

    if (notifications.length > 0) {
      await db('notifications').insert(notifications);
    }
  }

  // Get anomalies (REQUIREMENT: Anomaly warnings)
  async getAnomalies(severity = null, limit = 50) {
    let query = db('admin_anomalies')
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (severity) {
      query = query.where({ severity });
    }

    return await query;
  }

  getDateFilter(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case '7days':
        return new Date(now.setDate(now.getDate() - 7));
      case '30days':
        return new Date(now.setDate(now.getDate() - 30));
      case '90days':
        return new Date(now.setDate(now.getDate() - 90));
      default:
        return new Date(now.setDate(now.getDate() - 30));
    }
  }

  // Export usage data for annual review (REQUIREMENT: Full export of usage data)
  async exportUsageData(startDate, endDate) {
    const data = {
      users: await db('users')
        .whereBetween('created_at', [startDate, endDate])
        .select('*'),
      content: await db('content_uploads')
        .whereBetween('created_at', [startDate, endDate])
        .select('*'),
      moderation: await db('flagged_content')
        .whereBetween('created_at', [startDate, endDate])
        .select('*'),
      analytics: await db('analytics_snapshots')
        .whereBetween('snapshot_date', [startDate, endDate])
        .select('*'),
      audit_logs: await db('admin_audit_logs')
        .whereBetween('created_at', [startDate, endDate])
        .select('*')
    };

    return data;
  }
}

module.exports = new AdminToolsService();


