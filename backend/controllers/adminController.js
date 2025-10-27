const { ContentUpload, FlaggedContent, Analytics, AdminAudit, ContentTag } = require('../models/Admin');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const authConfig = require('../config/auth');

const adminController = {
  // Create user with specific role (admin only)
  async createUser(req, res) {
    try {
      // Check if requesting user is an admin
      const requestingUserRole = req.user.role;
      if (requestingUserRole !== 'chapter_admin' && requestingUserRole !== 'platform_admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create users'
        });
      }

      const { firstName, lastName, email, password, chapter, role } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password || !chapter || !role) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Validate role - only allow specific roles
      const validRoles = ['student', 'teacher', 'chapter_admin'];
      // Platform admin can only be created by another platform admin
      if (role === 'platform_admin' && requestingUserRole !== 'platform_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only platform admins can create other platform admins'
        });
      }

      if (!validRoles.includes(role) && !(role === 'platform_admin' && requestingUserRole === 'platform_admin')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }

      // Chapter admin can only create users in their own chapter
      if (requestingUserRole === 'chapter_admin' && chapter !== req.user.chapter_id) {
        return res.status(403).json({
          success: false,
          message: 'Chapter admins can only create users in their own chapter'
        });
      }

      // Check if user already exists
      const existingUser = await db('users').where({ email }).first();
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const saltRounds = authConfig.bcryptRounds;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user data
      const userData = {
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: role,
        chapter_id: chapter,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Insert user and get the ID (PostgreSQL compatible)
      const result = await db('users').insert(userData).returning('id');
      const userId = result[0].id;

      console.log('User created with ID:', userId, 'Role:', role, 'By admin:', req.user.userId);

      // Get the created user without password
      const user = await db('users')
        .where({ id: userId })
        .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active')
        .first();

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active
          }
        }
      });

    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during user creation'
      });
    }
  },

  // Get all users (admin only)
  async getUsers(req, res) {
    try {
      // Check if requesting user is an admin
      const requestingUserRole = req.user.role;
      if (requestingUserRole !== 'chapter_admin' && requestingUserRole !== 'platform_admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view users'
        });
      }

      let query = db('users').select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'created_at');

      // Chapter admin can only see users in their own chapter
      if (requestingUserRole === 'chapter_admin') {
        query = query.where('chapter_id', req.user.chapter_id);
      }

      const users = await query.orderBy('created_at', 'desc');

      res.json({
        success: true,
        data: {
          users: users.map(user => ({
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active,
            createdAt: user.created_at
          }))
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Update user role (admin only)
  async updateUserRole(req, res) {
    try {
      const { userId, newRole } = req.body;
      const requestingUserRole = req.user.role;

      // Check if requesting user is an admin
      if (requestingUserRole !== 'chapter_admin' && requestingUserRole !== 'platform_admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update user roles'
        });
      }

      // Validate role
      const validRoles = ['student', 'teacher', 'chapter_admin'];
      if (newRole === 'platform_admin' && requestingUserRole !== 'platform_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only platform admins can assign platform admin role'
        });
      }

      if (!validRoles.includes(newRole) && !(newRole === 'platform_admin' && requestingUserRole === 'platform_admin')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }

      // Get the user to update
      const userToUpdate = await db('users').where({ id: userId }).first();
      if (!userToUpdate) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Chapter admin can only update users in their own chapter
      if (requestingUserRole === 'chapter_admin' && userToUpdate.chapter_id !== req.user.chapter_id) {
        return res.status(403).json({
          success: false,
          message: 'Chapter admins can only update users in their own chapter'
        });
      }

      // Prevent users from changing their own role to a higher one
      if (userId === req.user.userId && newRole !== userToUpdate.role) {
        return res.status(403).json({
          success: false,
          message: 'Cannot change your own role'
        });
      }

      // Update the user's role
      await db('users')
        .where({ id: userId })
        .update({ 
          role: newRole,
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: {
          user: {
            id: userId,
            role: newRole
          }
        }
      });

    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Upload management
  async getUploadQueue(req, res) {
    try {
      const { status, chapter, page = 1, limit = 20 } = req.query;
      const userId = req.user.userId;

      // Check admin permissions
      const user = await db('users').where({ id: userId }).select('role', 'chapter_id').first();
      if (!['chapter_admin', 'platform_admin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const uploads = await ContentUpload.findByStatus(
        status || 'pending',
        user.role === 'chapter_admin' ? user.chapter_id : chapter,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: { uploads }
      });
    } catch (error) {
      console.error('Get upload queue error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch upload queue'
      });
    }
  },

  async uploadContent(req, res) {
    try {
      const { title, description, category, tags, chapterId } = req.body;
      const userId = req.user.userId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Check quota
      const fileType = file.mimetype.split('/')[0]; // video, image, etc.
      const quota = await ContentUpload.checkQuota(chapterId, fileType);
      
      if (quota.monthly_limit > 0 && quota.current_usage >= quota.monthly_limit) {
        return res.status(400).json({
          success: false,
          message: `Monthly ${fileType} quota exceeded. Limit: ${quota.monthly_limit}`
        });
      }

      // Create upload record
      const upload = await ContentUpload.create({
        title,
        description,
        file_name: file.originalname,
        file_type: fileType,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        uploaded_by: userId,
        chapter_id: chapterId,
        tags: tags ? JSON.parse(tags) : [],
        category,
        status: 'pending',
        metadata: {
          processing: {
            started_at: new Date(),
            status: 'uploaded'
          }
        }
      });

      // Increment quota
      await ContentUpload.incrementQuota(chapterId, fileType);

      // Log audit
      await AdminAudit.logAction(
        userId,
        'content_upload',
        'content',
        upload.id,
        `Uploaded ${fileType}: ${title}`
      );

      res.status(201).json({
        success: true,
        message: 'Content uploaded successfully and queued for approval',
        data: { upload }
      });
    } catch (error) {
      console.error('Upload content error:', error);
      
      if (error.message.includes('quota exceeded')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to upload content'
      });
    }
  },

  async approveContent(req, res) {
    try {
      const { uploadId } = req.params;
      const { action } = req.body; // 'approve' or 'reject'
      const userId = req.user.userId;
      const rejectionReason = req.body.rejectionReason;

      const upload = await ContentUpload.findById(uploadId);
      if (!upload) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found'
        });
      }

      let newStatus;
      let actionType;

      if (action === 'approve') {
        newStatus = 'approved';
        actionType = 'content_approve';
        
        // Move file to permanent location and process
        // This would involve file processing logic
        await ContentUpload.updateStatus(uploadId, newStatus, userId);
        
      } else if (action === 'reject') {
        newStatus = 'rejected';
        actionType = 'content_reject';
        
        if (!rejectionReason) {
          return res.status(400).json({
            success: false,
            message: 'Rejection reason is required'
          });
        }
        
        await ContentUpload.updateStatus(uploadId, newStatus, null, rejectionReason);
        
        // Delete the uploaded file
        // fs.unlinkSync(upload.file_path); // In production, handle async
      }

      // Log audit
      await AdminAudit.logAction(
        userId,
        actionType,
        'content',
        uploadId,
        `${action === 'approve' ? 'Approved' : 'Rejected'} content: ${upload.title}`,
        { status: upload.status },
        { status: newStatus }
      );

      res.json({
        success: true,
        message: `Content ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      console.error('Approve content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process content'
      });
    }
  },

  // Moderation tools
  async getFlaggedContent(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const userId = req.user.userId;

      // Check moderator permissions
      const user = await db('users').where({ id: userId }).select('role').first();
      if (!['chapter_admin', 'platform_admin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const flaggedContent = await FlaggedContent.findByStatus(
        status || 'pending',
        parseInt(page),
        parseInt(limit)
      );

      const stats = await FlaggedContent.getStats('7days');

      res.json({
        success: true,
        data: {
          flagged_content: flaggedContent,
          stats
        }
      });
    } catch (error) {
      console.error('Get flagged content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flagged content'
      });
    }
  },

  async reviewFlaggedContent(req, res) {
    try {
      const { flagId } = req.params;
      const { action, notes, moderationAction } = req.body;
      const userId = req.user.userId;

      const flag = await FlaggedContent.findById(flagId);
      if (!flag) {
        return res.status(404).json({
          success: false,
          message: 'Flag not found'
        });
      }

      let newStatus;
      let actionTaken = moderationAction;

      switch (action) {
        case 'dismiss':
          newStatus = 'dismissed';
          actionTaken = 'dismissed';
          break;
        case 'remove':
          newStatus = 'action_taken';
          actionTaken = 'removed';
          // Actually remove the content
          await this.removeContent(flag.content_type, flag.content_id, userId);
          break;
        case 'warn':
          newStatus = 'action_taken';
          actionTaken = 'warned';
          await this.warnUser(flag.content_type, flag.content_id, userId, notes);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action'
          });
      }

      await FlaggedContent.updateStatus(flagId, newStatus, userId, notes, actionTaken);

      // Log audit
      await AdminAudit.logAction(
        userId,
        'content_moderation',
        flag.content_type,
        flag.content_id,
        `Moderated ${flag.content_type}: ${actionTaken}. Flag reason: ${flag.flag_reason}`,
        { status: flag.status },
        { status: newStatus, action_taken: actionTaken }
      );

      res.json({
        success: true,
        message: `Flag reviewed successfully. Action: ${actionTaken}`
      });
    } catch (error) {
      console.error('Review flagged content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to review flagged content'
      });
    }
  },

  async removeContent(contentType, contentId, moderatorId) {
    // Implementation for removing different content types
    switch (contentType) {
      case 'forum_post':
        await db('forum_posts').where({ id: contentId }).update({
          is_moderated: true,
          moderation_reason: 'Removed by moderator'
        });
        break;
      case 'resource':
        await db('resources').where({ id: contentId }).update({ is_public: false });
        break;
      // Add other content types as needed
    }
  },

  async warnUser(contentType, contentId, moderatorId, notes) {
    // Get user ID from content
    let userId;
    
    switch (contentType) {
      case 'forum_post':
        const post = await db('forum_posts').where({ id: contentId }).select('author_id').first();
        userId = post.author_id;
        break;
      // Add other content types as needed
    }

    if (userId) {
      await db('user_moderation').insert({
        user_id: userId,
        action_type: 'warn',
        reason: notes,
        moderator_id: moderatorId
      });
    }
  },

  // Analytics dashboard
  async getAnalytics(req, res) {
    try {
      const { timeframe = '7days', compare = false } = req.query;
      const userId = req.user.userId;

      // Check admin permissions
      const user = await db('users').where({ id: userId }).select('role').first();
      if (!['chapter_admin', 'platform_admin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Generate or get latest analytics
      let snapshot = await db('analytics_snapshots')
        .where({ snapshot_type: 'daily' })
        .orderBy('snapshot_date', 'desc')
        .first();

      if (!snapshot || this.isSnapshotStale(snapshot.snapshot_date)) {
        snapshot = await Analytics.generateDailySnapshot();
      }

      const metrics = typeof snapshot.metrics === 'string' 
        ? JSON.parse(snapshot.metrics) 
        : snapshot.metrics;
      
      const chapterComparison = typeof snapshot.chapter_comparison === 'string'
        ? JSON.parse(snapshot.chapter_comparison)
        : snapshot.chapter_comparison;
      
      const trends = typeof snapshot.trends === 'string'
        ? JSON.parse(snapshot.trends)
        : snapshot.trends;

      // Get real-time alerts
      const alerts = await this.getSystemAlerts();

      res.json({
        success: true,
        data: {
          metrics,
          chapter_comparison: chapterComparison,
          trends,
          alerts,
          snapshot_date: snapshot.snapshot_date
        }
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics'
      });
    }
  },

  isSnapshotStale(snapshotDate) {
    const now = new Date();
    const snapshotTime = new Date(snapshotDate);
    const hoursDiff = (now - snapshotTime) / (1000 * 60 * 60);
    return hoursDiff > 24; // Consider stale after 24 hours
  },

  async getSystemAlerts() {
    const alerts = [];

    // Check for quota warnings
    const quotaAlerts = await db('content_quotas')
      .where('current_usage', '>=', db.raw('monthly_limit * 0.8')) // 80% of quota
      .where('monthly_limit', '>', 0)
      .join('users', 'content_quotas.chapter_id', 'users.chapter_id')
      .select('content_quotas.*')
      .groupBy('content_quotas.id');

    quotaAlerts.forEach(quota => {
      alerts.push({
        type: 'quota_warning',
        severity: 'warning',
        message: `Chapter ${quota.chapter_id} is at ${Math.round((quota.current_usage / quota.monthly_limit) * 100)}% of ${quota.content_type} quota`,
        chapter_id: quota.chapter_id,
        content_type: quota.content_type
      });
    });

    // Check for unresolved flags
    const pendingFlags = await db('flagged_content')
      .where({ status: 'pending' })
      .where('created_at', '<=', new Date(Date.now() - 2 * 60 * 60 * 1000)) // Older than 2 hours
      .count('id as count')
      .first();

    if (pendingFlags.count > 0) {
      alerts.push({
        type: 'pending_flags',
        severity: 'warning',
        message: `${pendingFlags.count} flagged items pending review for over 2 hours`,
        count: pendingFlags.count
      });
    }

    return alerts;
  },

  // Content tagging
  async getTags(req, res) {
    try {
      const { category } = req.query;
      
      const tags = category 
        ? await ContentTag.findByCategory(category)
        : await ContentTag.findAllActive();

      res.json({
        success: true,
        data: { tags }
      });
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tags'
      });
    }
  },

  async createTag(req, res) {
    try {
      const { name, category, color } = req.body;
      const userId = req.user.userId;

      const tag = await ContentTag.create({
        name,
        category,
        color,
        created_by: userId
      });

      // Log audit
      await AdminAudit.logAction(
        userId,
        'tag_create',
        'tag',
        tag.id,
        `Created tag: ${name}`
      );

      res.status(201).json({
        success: true,
        message: 'Tag created successfully',
        data: { tag }
      });
    } catch (error) {
      console.error('Create tag error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create tag'
      });
    }
  },

  async tagContent(req, res) {
    try {
      const { contentType, contentId, tagId } = req.body;
      const userId = req.user.userId;

      const relation = await ContentTag.tagContent(contentType, contentId, tagId, userId);

      // Log audit
      await AdminAudit.logAction(
        userId,
        'content_tag',
        contentType,
        contentId,
        `Tagged ${contentType} with tag ID: ${tagId}`
      );

      res.json({
        success: true,
        message: 'Content tagged successfully',
        data: { relation }
      });
    } catch (error) {
      console.error('Tag content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to tag content'
      });
    }
  },

  // Audit logs
  async getAuditLogs(req, res) {
    try {
      const { adminId, actionType, startDate, endDate, page = 1, limit = 50 } = req.query;
      const userId = req.user.userId;

      // Check admin permissions
      const user = await db('users').where({ id: userId }).select('role').first();
      if (!['chapter_admin', 'platform_admin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const logs = await AdminAudit.getLogs(
        adminId,
        actionType,
        startDate,
        endDate,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: { logs }
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit logs'
      });
    }
  },

  // Export data
  async exportData(req, res) {
    try {
      const { type, format, startDate, endDate } = req.query;
      const userId = req.user.userId;

      // Check platform admin permissions for full export
      const user = await db('users').where({ id: userId }).select('role').first();
      if (user.role !== 'platform_admin') {
        return res.status(403).json({
          success: false,
          message: 'Platform admin access required for data export'
        });
      }

      // Generate export data based on type
      const exportData = await this.generateExportData(type, startDate, endDate);

      // Log export action
      await AdminAudit.logAction(
        userId,
        'data_export',
        'system',
        null,
        `Exported ${type} data in ${format} format from ${startDate} to ${endDate}`
      );

      res.json({
        success: true,
        data: {
          export: exportData,
          metadata: {
            type,
            format,
            generated_at: new Date().toISOString(),
            record_count: exportData.length
          }
        },
        message: `Export in ${format} format would be generated here`
      });
    } catch (error) {
      console.error('Export data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export data'
      });
    }
  },

  async generateExportData(type, startDate, endDate) {
    switch (type) {
      case 'usage':
        return await this.exportUsageData(startDate, endDate);
      case 'content':
        return await this.exportContentData(startDate, endDate);
      case 'users':
        return await this.exportUserData(startDate, endDate);
      default:
        return [];
    }
  },

  async exportUsageData(startDate, endDate) {
    // Export comprehensive usage data
    const usageData = await db('user_engagement')
      .whereBetween('created_at', [startDate, endDate])
      .select('*')
      .orderBy('created_at', 'asc');

    return usageData;
  },

  async exportContentData(startDate, endDate) {
    // Export content creation and usage data
    const contentData = await db('resources')
      .whereBetween('created_at', [startDate, endDate])
      .select('*')
      .orderBy('created_at', 'asc');

    return contentData;
  },

  async exportUserData(startDate, endDate) {
    // Export user activity data (anonymized for privacy)
    const userData = await db('users')
      .whereBetween('created_at', [startDate, endDate])
      .select(
        'id',
        'role',
        'chapter_id',
        'is_active',
        'last_login_at',
        'created_at'
      )
      .orderBy('created_at', 'asc');

    return userData;
  }
};

module.exports = adminController;