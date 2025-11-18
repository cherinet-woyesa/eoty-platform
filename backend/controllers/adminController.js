const { ContentUpload, FlaggedContent, Analytics, AdminAudit, ContentTag } = require('../models/Admin');
const adminToolsService = require('../services/adminToolsService');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const authConfig = require('../config/auth');

// Helper function to check if snapshot is stale
function isSnapshotStale(snapshotDate) {
  const now = new Date();
  const snapshotTime = new Date(snapshotDate);
  const hoursDiff = (now - snapshotTime) / (1000 * 60 * 60);
  return hoursDiff > 24; // Consider stale after 24 hours
}

// Helper function to build system alerts for analytics dashboard
async function getSystemAlerts() {
  const alerts = [];

  // Check for quota warnings
  try {
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
  } catch (err) {
    console.warn('content_quotas table may not exist:', err.message);
  }

  // Check for unresolved flags
  try {
    const pendingFlags = await db('flagged_content')
      .where({ status: 'pending' })
      .where('created_at', '<=', new Date(Date.now() - 2 * 60 * 60 * 1000)) // Older than 2 hours
      .count('id as count')
      .first();

    if (pendingFlags && pendingFlags.count > 0) {
      alerts.push({
        type: 'pending_flags',
        severity: 'warning',
        message: `${pendingFlags.count} flagged items pending review for over 2 hours`,
        count: pendingFlags.count
      });
    }
  } catch (err) {
    console.warn('flagged_content table may not exist:', err.message);
  }

  return alerts;
}

const adminController = {
  // Create user with specific role (admin only)
  async createUser(req, res) {
    try {
      // Check if requesting user is an admin
      const requestingUserRole = req.user.role;
      if (requestingUserRole !== 'admin') {
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
      const validRoles = ['student', 'teacher', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }

      // Get chapter ID - handle both string (chapter name) and integer (chapter_id)
      let chapterId;
      
      // First, try to parse as number (most common case from frontend)
      if (!isNaN(parseInt(chapter))) {
        chapterId = parseInt(chapter);
        const chapterRecord = await db('chapters').where({ id: chapterId, is_active: true }).first();
        if (!chapterRecord) {
          console.log('Chapter not found by ID:', chapterId);
          return res.status(400).json({
            success: false,
            message: `Invalid chapter ID specified: ${chapterId}`
          });
        }
      } else if (typeof chapter === 'string') {
        // Look up chapter by name
        const chapterRecord = await db('chapters').where({ name: chapter, is_active: true }).first();
        if (!chapterRecord) {
          console.log('Chapter not found by name:', chapter);
          return res.status(400).json({
            success: false,
            message: `Invalid chapter specified: ${chapter}`
          });
        }
        chapterId = chapterRecord.id;
      } else {
        console.log('Invalid chapter format:', typeof chapter, chapter);
        return res.status(400).json({
          success: false,
          message: 'Invalid chapter format'
        });
      }

      // Admins can create users in any chapter (no chapter restriction for simplified role system)

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
        chapter_id: chapterId,
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
      if (requestingUserRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view users'
        });
      }

      let query = db('users')
        .leftJoin('chapters', 'users.chapter_id', 'chapters.id')
        .select(
          'users.id', 
          'users.first_name', 
          'users.last_name', 
          'users.email', 
          'users.role', 
          'users.chapter_id', 
          'users.is_active', 
          'users.created_at', 
          'users.last_login_at',
          'chapters.name as chapter_name'
        );

      // Admins can see all users (no chapter restriction in simplified role system)

      const users = await query.orderBy('users.created_at', 'desc');

      res.json({
        success: true,
        data: {
          users: users.map(user => ({
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_name || user.chapter_id || 'N/A',
            chapterId: user.chapter_id,
            isActive: user.is_active,
            createdAt: user.created_at,
            lastLogin: user.last_login_at || null
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

  // Update user (admin only) - comprehensive update
  async updateUser(req, res) {
    try {
      const { userId, firstName, lastName, email, role, chapter, isActive } = req.body;
      const requestingUserRole = req.user.role;

      // Check if requesting user is an admin
      if (requestingUserRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update users'
        });
      }

      // Validate userId
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
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

      // Build update object
      const updateData = {
        updated_at: new Date()
      };

      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (email !== undefined) updateData.email = email.toLowerCase();
      if (isActive !== undefined) updateData.is_active = isActive;

      // Handle role update
      if (role !== undefined) {
        const validRoles = ['student', 'teacher', 'admin'];
        if (!validRoles.includes(role)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid role specified'
          });
        }
        
        // Prevent users from changing their own role
        if (userId === req.user.userId && role !== userToUpdate.role) {
          return res.status(403).json({
            success: false,
            message: 'Cannot change your own role'
          });
        }
        
        updateData.role = role;
      }

      // Handle chapter update
      if (chapter !== undefined) {
        let chapterId;
        
        // Try to parse as number first
        if (!isNaN(parseInt(chapter))) {
          chapterId = parseInt(chapter);
          const chapterRecord = await db('chapters').where({ id: chapterId, is_active: true }).first();
          if (!chapterRecord) {
            return res.status(400).json({
              success: false,
              message: `Invalid chapter ID specified: ${chapterId}`
            });
          }
        } else if (typeof chapter === 'string') {
          // Look up chapter by name
          const chapterRecord = await db('chapters').where({ name: chapter, is_active: true }).first();
          if (!chapterRecord) {
            return res.status(400).json({
              success: false,
              message: `Invalid chapter specified: ${chapter}`
            });
          }
          chapterId = chapterRecord.id;
        }
        
        updateData.chapter_id = chapterId;
      }

      // Check if email is being changed and if it's already taken
      if (email && email.toLowerCase() !== userToUpdate.email) {
        const existingUser = await db('users').where({ email: email.toLowerCase() }).first();
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'User with this email already exists'
          });
        }
      }

      // Update the user
      await db('users')
        .where({ id: userId })
        .update(updateData);

      // Get updated user
      const updatedUser = await db('users')
        .leftJoin('chapters', 'users.chapter_id', 'chapters.id')
        .where('users.id', userId)
        .select(
          'users.id',
          'users.first_name',
          'users.last_name',
          'users.email',
          'users.role',
          'users.chapter_id',
          'users.is_active',
          'users.created_at',
          'users.last_login_at',
          'chapters.name as chapter_name'
        )
        .first();

      res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            email: updatedUser.email,
            role: updatedUser.role,
            chapter: updatedUser.chapter_name || updatedUser.chapter_id || 'N/A',
            chapterId: updatedUser.chapter_id,
            isActive: updatedUser.is_active,
            createdAt: updatedUser.created_at,
            lastLogin: updatedUser.last_login_at || null
          }
        }
      });

    } catch (error) {
      console.error('Update user error:', error);
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
      if (requestingUserRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update user roles'
        });
      }

      // Validate role
      const validRoles = ['student', 'teacher', 'admin'];
      if (!validRoles.includes(newRole)) {
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

      // Admins can update any user (no chapter restriction in simplified role system)

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

  // Update user status (activate/deactivate) (admin only)
  async updateUserStatus(req, res) {
    try {
      const { userId, isActive } = req.body;
      const requestingUserRole = req.user.role;

      // Check if requesting user is an admin
      if (requestingUserRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update user status'
        });
      }

      // Validate input
      if (!userId || typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'userId and isActive (boolean) are required'
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

      // Admins can update any user (no chapter restriction in simplified role system)

      // Prevent users from deactivating themselves
      if (userId === req.user.userId && !isActive) {
        return res.status(403).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
      }

      // Update the user's status
      await db('users')
        .where({ id: userId })
        .update({ 
          is_active: isActive,
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: {
          user: {
            id: userId,
            isActive: isActive
          }
        }
      });

    } catch (error) {
      console.error('Update user status error:', error);
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
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Check if content_uploads table exists
      const tableExists = await db.schema.hasTable('content_uploads');
      if (!tableExists) {
        return res.json({
          success: true,
          data: { uploads: [], message: 'Content uploads table not yet initialized' }
        });
      }

      // If no status filter, get all uploads; otherwise filter by status
      let uploads;
      if (!status || status === '') {
        // Get all uploads regardless of status
        uploads = await ContentUpload.findByStatus(
          null, // null means get all
          user.role === 'admin' ? user.chapter_id : chapter,
          parseInt(page),
          parseInt(limit)
        );
      } else {
        uploads = await ContentUpload.findByStatus(
          status,
          user.role === 'admin' ? user.chapter_id : chapter,
          parseInt(page),
          parseInt(limit)
        );
      }

      res.json({
        success: true,
        data: { uploads }
      });
    } catch (error) {
      console.error('Get upload queue error:', error);
      
      // Handle specific database errors
      if (error.code === '42P01') { // Table does not exist
        return res.json({
          success: true,
          data: { uploads: [], message: 'Content uploads table not yet initialized' }
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch upload queue',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

      // Get chapter ID - handle both string (chapter name/slug) and integer (chapter_id)
      let resolvedChapterId;
      if (typeof chapterId === 'string' && !/^\d+$/.test(chapterId)) {
        // Look up chapter by name (case-insensitive) or slug
        // Try exact match first
        let chapterRecord = await db('chapters')
          .where({ name: chapterId, is_active: true })
          .first();
        
        // If not found, try case-insensitive match
        if (!chapterRecord) {
          chapterRecord = await db('chapters')
            .whereRaw('LOWER(name) = LOWER(?)', [chapterId])
            .where({ is_active: true })
            .first();
        }
        
        // If still not found, try matching by slug (e.g., "addis-ababa" -> "Addis Ababa Chapter")
        if (!chapterRecord) {
          const slugToNameMap = {
            'addis-ababa': 'Addis Ababa Chapter',
            'toronto': 'Toronto Chapter',
            'washington': 'Washington DC Chapter',
            'london': 'London Chapter',
            'bahir-dar': 'Bahir Dar Chapter'
          };
          
          const mappedName = slugToNameMap[chapterId.toLowerCase()];
          if (mappedName) {
            chapterRecord = await db('chapters')
              .where({ name: mappedName, is_active: true })
              .first();
          }
        }
        
        if (!chapterRecord) {
          return res.status(400).json({
            success: false,
            message: `Invalid chapter specified: "${chapterId}". Please use a valid chapter name or ID.`
          });
        }
        resolvedChapterId = chapterRecord.id;
      } else if (typeof chapterId === 'number' || !isNaN(parseInt(chapterId))) {
        // It's already a chapter ID
        resolvedChapterId = parseInt(chapterId);
        const chapterRecord = await db('chapters').where({ id: resolvedChapterId, is_active: true }).first();
        if (!chapterRecord) {
          return res.status(400).json({
            success: false,
            message: 'Invalid chapter ID specified'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid chapter format'
        });
      }

      // Check quota
      const fileType = file.mimetype.split('/')[0]; // video, image, etc.
      const quota = await ContentUpload.checkQuota(resolvedChapterId, fileType);
      
      if (quota.monthly_limit > 0 && quota.current_usage >= quota.monthly_limit) {
        return res.status(400).json({
          success: false,
          message: `Monthly ${fileType} quota exceeded. Limit: ${quota.monthly_limit}`
        });
      }

      // REQUIREMENT: Track upload time for <5 min requirement
      const uploadStartTime = Date.now();

      // Generate file path - use file.path if available (disk storage), otherwise generate a path
      let filePath = file.path;
      if (!filePath) {
        // If using memory storage, we need to save the file first
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        filePath = path.join(uploadsDir, `${name}-${uniqueSuffix}${ext}`);
        fs.writeFileSync(filePath, file.buffer);
      }

      // Parse tags - handle both string and array formats
      let parsedTags = [];
      if (tags) {
        if (typeof tags === 'string') {
          try {
            parsedTags = JSON.parse(tags);
            // Ensure it's an array
            if (!Array.isArray(parsedTags)) {
              // If it's an object, convert to array of keys or values
              if (typeof parsedTags === 'object') {
                parsedTags = Object.keys(parsedTags);
              } else {
                parsedTags = [];
              }
            }
          } catch (e) {
            // If parsing fails, treat as single tag
            parsedTags = [tags];
          }
        } else if (Array.isArray(tags)) {
          parsedTags = tags;
        }
      }

      // Check if content_uploads table exists
      const tableExists = await db.schema.hasTable('content_uploads');
      if (!tableExists) {
        return res.status(503).json({
          success: false,
          message: 'Content upload system is not yet initialized. Please contact administrator.'
        });
      }

      // Check if user is admin - auto-approve admin uploads
      const user = await db('users').where({ id: userId }).select('role').first();
      const isAdmin = user && user.role === 'admin';
      const initialStatus = isAdmin ? 'approved' : 'pending';

      // Create upload record
      const upload = await ContentUpload.create({
        title,
        description,
        file_name: file.originalname,
        file_type: fileType,
        file_path: filePath,
        file_size: file.size.toString(),
        mime_type: file.mimetype,
        uploaded_by: userId,
        chapter_id: resolvedChapterId,
        tags: parsedTags,
        category,
        status: initialStatus,
        metadata: {
          processing: {
            started_at: new Date(),
            status: 'uploaded'
          }
        }
      });

      // Verify upload was created successfully
      if (!upload || !upload.id) {
        console.error('Upload creation failed - no ID returned');
        return res.status(500).json({
          success: false,
          message: 'Failed to create upload record'
        });
      }

      // If admin upload, it's already approved (status set above)
      // No need to call updateStatus again since we set it during creation

      // REQUIREMENT: Track upload time (optional - don't fail if service unavailable)
      try {
        await adminToolsService.trackUploadTime(upload.id, uploadStartTime);
      } catch (trackError) {
        console.warn('Failed to track upload time (non-critical):', trackError.message);
      }

      // Increment quota (optional - don't fail if this fails)
      try {
        await ContentUpload.incrementQuota(resolvedChapterId, fileType);
      } catch (quotaError) {
        console.warn('Failed to increment quota (non-critical):', quotaError.message);
      }

      // Log audit (optional - don't fail if this fails)
      try {
        await AdminAudit.logAction(
          userId,
          'content_upload',
          'content',
          upload.id,
          `Uploaded ${fileType}: ${title}`
        );
      } catch (auditError) {
        console.warn('Failed to log audit (non-critical):', auditError.message);
      }

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
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      if (user.role !== 'admin') {
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

      // REQUIREMENT: Track review time for 2-hour requirement
      const reviewStartTime = flag.created_at ? new Date(flag.created_at).getTime() : Date.now();
      await adminToolsService.trackReviewTime(flagId, reviewStartTime);

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
        const post = await db('forum_posts').where({ id: contentId }).select('user_id').first();
        userId = post.user_id;
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
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      if (user.role !== 'admin') {
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

      if (!snapshot || isSnapshotStale(snapshot.snapshot_date)) {
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
      const alerts = await getSystemAlerts();

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

  // Get pending AI moderation items
  async getPendingAIModeration(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user.userId;

      // Check admin permissions
      const user = await db('users').where({ id: userId }).select('role').first();
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Get pending moderation items from the new moderation service
      const pendingItems = await db('moderated_content')
        .where('status', 'pending')
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit))
        .select('*');

      // Get total count for pagination
      const totalCount = await db('moderated_content')
        .where('status', 'pending')
        .count('id as count')
        .first();

      res.json({
        success: true,
        data: {
          items: pendingItems,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(totalCount.count)
          }
        }
      });
    } catch (error) {
      console.error('Get pending AI moderation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending moderation items'
      });
    }
  },

  // Review AI moderation item
  async reviewAIModeration(req, res) {
    try {
      const { itemId } = req.params;
      const { action, notes } = req.body;
      const userId = req.user.userId;

      // Check admin permissions
      const user = await db('users').where({ id: userId }).select('role').first();
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const item = await db('moderated_content')
        .where({ id: itemId })
        .first();

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Moderation item not found'
        });
      }

      let newStatus;
      switch (action) {
        case 'approve':
          newStatus = 'approved';
          break;
        case 'reject':
          newStatus = 'rejected';
          break;
        case 'escalate':
          newStatus = 'escalated';
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action. Use approve, reject, or escalate.'
          });
      }

      await db('moderated_content')
        .where({ id: itemId })
        .update({
          status: newStatus,
          moderated_by: userId,
          moderation_notes: notes,
          updated_at: new Date()
        });

      // Log audit
      await AdminAudit.logAction(
        userId,
        'ai_moderation_review',
        'moderated_content',
        itemId,
        `Reviewed AI moderation item: ${action}`,
        { status: item.status },
        { status: newStatus }
      );

      res.json({
        success: true,
        message: `Moderation item ${action}d successfully`
      });
    } catch (error) {
      console.error('Review AI moderation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to review moderation item'
      });
    }
  },

  // Get moderation statistics
  async getModerationStats(req, res) {
    try {
      const userId = req.user.userId;

      // Check admin permissions
      const user = await db('users').where({ id: userId }).select('role').first();
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Get statistics from moderated_content
      const stats = await db('moderated_content')
        .select(
          db.raw("COUNT(*) FILTER (WHERE status = 'pending') as pending"),
          db.raw("COUNT(*) FILTER (WHERE status = 'approved') as approved"),
          db.raw("COUNT(*) FILTER (WHERE status = 'rejected') as rejected"),
          db.raw("COUNT(*) FILTER (WHERE status = 'escalated') as escalated"),
          db.raw("COUNT(*) FILTER (WHERE faith_alignment_score >= 2) as high_faith_alignment"),
          db.raw("COUNT(*) FILTER (WHERE faith_alignment_score < 2) as low_faith_alignment")
        )
        .first();

      // Get escalation statistics (REQUIREMENT: Moderator workflow)
      const escalationStats = await db('moderation_escalations')
        .select(
          db.raw("COUNT(*) FILTER (WHERE status = 'pending') as pending_escalations"),
          db.raw("COUNT(*) FILTER (WHERE status = 'resolved') as resolved_escalations"),
          db.raw("COUNT(*) FILTER (WHERE priority = 'high') as high_priority"),
          db.raw("COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority"),
          db.raw("COUNT(*) FILTER (WHERE priority = 'low') as low_priority")
        )
        .first();

      // Get recent moderation activity
      const recentActivity = await db('moderated_content')
        .where('created_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .groupByRaw('DATE(created_at)')
        .select(
          db.raw('DATE(created_at) as date'),
          db.raw("COUNT(*) FILTER (WHERE status = 'pending') as pending"),
          db.raw("COUNT(*) FILTER (WHERE status = 'approved') as approved"),
          db.raw("COUNT(*) FILTER (WHERE status = 'rejected') as rejected")
        )
        .orderBy('date', 'asc');

      res.json({
        success: true,
        data: {
          stats: {
            ...stats,
            ...escalationStats
          },
          recent_activity: recentActivity
        }
      });
    } catch (error) {
      console.error('Get moderation stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch moderation statistics'
      });
    }
  },

  // Get moderation escalations (REQUIREMENT: Moderator workflow)
  async getModerationEscalations(req, res) {
    try {
      const { page = 1, limit = 20, priority, status = 'pending' } = req.query;
      const userId = req.user.userId;

      // Check admin permissions
      const user = await db('users').where({ id: userId }).select('role').first();
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      let query = db('moderation_escalations')
        .leftJoin('users', 'moderation_escalations.user_id', 'users.id')
        .select(
          'moderation_escalations.*',
          'users.first_name',
          'users.last_name',
          'users.email'
        )
        .where('moderation_escalations.status', status);

      if (priority) {
        query = query.where('moderation_escalations.priority', priority);
      }

      const escalations = await query
        .orderBy('moderation_escalations.priority', 'desc')
        .orderBy('moderation_escalations.created_at', 'desc')
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit));

      const totalCount = await db('moderation_escalations')
        .where('status', status)
        .modify((queryBuilder) => {
          if (priority) {
            queryBuilder.where('priority', priority);
          }
        })
        .count('id as count')
        .first();

      res.json({
        success: true,
        data: {
          escalations,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(totalCount.count)
          }
        }
      });
    } catch (error) {
      console.error('Get moderation escalations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch moderation escalations'
      });
    }
  },

  // Resolve moderation escalation (REQUIREMENT: Moderator workflow)
  async resolveEscalation(req, res) {
    try {
      const { escalationId } = req.params;
      const { resolution, status = 'resolved', notes } = req.body;
      const userId = req.user.userId;

      // Check admin permissions
      const user = await db('users').where({ id: userId }).select('role').first();
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const escalation = await db('moderation_escalations')
        .where({ id: escalationId })
        .first();

      if (!escalation) {
        return res.status(404).json({
          success: false,
          message: 'Escalation not found'
        });
      }

      await db('moderation_escalations')
        .where({ id: escalationId })
        .update({
          status: status,
          resolution: resolution,
          reviewed_by: userId,
          review_notes: notes,
          reviewed_at: new Date(),
          updated_at: new Date()
        });

      // Mark notification as read
      await db('moderator_notifications')
        .where('data', 'like', `%"escalationId":${escalationId}%`)
        .update({
          status: 'read',
          updated_at: new Date()
        });

      // Log audit
      await AdminAudit.logAction(
        userId,
        'escalation_resolved',
        'moderation_escalations',
        escalationId,
        `Resolved escalation: ${resolution}`,
        { status: escalation.status },
        { status: status, resolution: resolution }
      );

      res.json({
        success: true,
        message: 'Escalation resolved successfully'
      });
    } catch (error) {
      console.error('Resolve escalation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve escalation'
      });
    }
  },

  // Get moderator notifications (REQUIREMENT: Moderator workflow)
  async getModeratorNotifications(req, res) {
    try {
      const { limit = 20, unreadOnly = false } = req.query;
      const userId = req.user.userId;

      // Check admin permissions
      const user = await db('users').where({ id: userId }).select('role').first();
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      let query = db('moderator_notifications')
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit));

      if (unreadOnly === 'true') {
        query = query.where('status', 'unread');
      }

      const notifications = await query.select('*');

      res.json({
        success: true,
        data: {
          notifications
        }
      });
    } catch (error) {
      console.error('Get moderator notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
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
      if (user.role !== 'admin') {
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

      // Check admin permissions for full export
      const user = await db('users').where({ id: userId }).select('role').first();
      if (user.role !== 'admin') {
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
  },

  // Get admin statistics for dashboard
  async getStats(req, res) {
    try {
      const requestingUserRole = req.user.role;
      const requestingUserId = req.user.userId;

      // Check if requesting user is an admin
      if (requestingUserRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view admin statistics'
        });
      }

      // Admins can see all stats (no chapter filtering in simplified role system)

      // Total users
      const totalUsers = await db('users').count('id as count').first();

      // Active users (logged in within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeUsers = await db('users')
        .where('last_login_at', '>=', thirtyDaysAgo)
        .count('id as count')
        .first();

      // New registrations (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const newRegistrations = await db('users')
        .where('created_at', '>=', sevenDaysAgo)
        .count('id as count')
        .first();

      // Active courses
      let coursesQuery = db('courses').where('is_published', true);
      // Note: courses table might not have chapter_id, skip filtering if not available
      const activeCourses = await coursesQuery.count('id as count').first();

      // Completed lessons
      let completedLessons = { count: 0 };
      try {
        const completedLessonsResult = await db('user_lesson_progress')
          .where(function() {
            this.where('progress', 100).orWhere('is_completed', true);
          })
          .count('id as count')
          .first();
        completedLessons = completedLessonsResult || { count: 0 };
      } catch (err) {
        console.warn('Error querying completed lessons:', err.message);
      }

      // Pending approvals (from content uploads) - wrap in try-catch in case table doesn't exist
      let pendingApprovals = { count: 0 };
      try {
        let pendingApprovalsQuery = db('content_uploads').where('status', 'pending');
        // Admins can see all pending approvals (no chapter filtering)
        const contentApprovals = await pendingApprovalsQuery.count('id as count').first() || { count: 0 };
        
        // Also count pending teacher applications
        let teacherAppsCount = { count: 0 };
        try {
          teacherAppsCount = await db('teacher_applications')
            .where('status', 'pending')
            .count('id as count')
            .first() || { count: 0 };
        } catch (err) {
          console.warn('teacher_applications table may not exist:', err.message);
        }
        
        pendingApprovals = { count: parseInt(contentApprovals.count) + parseInt(teacherAppsCount.count) };
      } catch (err) {
        console.warn('content_uploads table may not exist:', err.message);
      }

      // Flagged content (pending review) - wrap in try-catch
      let flaggedContent = { count: 0 };
      try {
        const flaggedContentQuery = db('flagged_content').where('status', 'pending');
        flaggedContent = await flaggedContentQuery.count('id as count').first() || { count: 0 };
      } catch (err) {
        console.warn('flagged_content table may not exist:', err.message);
      }

      // Average engagement (completion rate) - use enrollment_status not completion_status
      let avgEngagement = 0;
      try {
        let totalEnrollmentsQuery = db('user_course_enrollments');
        const totalEnrollments = await totalEnrollmentsQuery.count('id as count').first() || { count: 0 };
        
        let completedEnrollmentsQuery = db('user_course_enrollments')
          .where('enrollment_status', 'completed');
        // Admins can see all enrollments (no chapter filtering)
        const completedEnrollments = await completedEnrollmentsQuery.count('id as count').first() || { count: 0 };
        
        avgEngagement = totalEnrollments.count > 0
          ? Math.round((completedEnrollments.count / totalEnrollments.count) * 100)
          : 0;
      } catch (err) {
        console.warn('user_course_enrollments table may not exist:', err.message);
      }

      res.json({
        success: true,
        data: {
          totalUsers: parseInt(totalUsers.count) || 0,
          activeUsers: parseInt(activeUsers.count) || 0,
          activeCourses: parseInt(activeCourses.count) || 0,
          completedLessons: parseInt(completedLessons.count) || 0,
          avgEngagement: avgEngagement,
          pendingApprovals: parseInt(pendingApprovals.count) || 0,
          flaggedContent: parseInt(flaggedContent.count) || 0,
          newRegistrations: parseInt(newRegistrations.count) || 0
        }
      });
    } catch (error) {
      console.error('Get admin stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admin statistics'
      });
    }
  },

  // Get all pending teacher applications
  async getTeacherApplications(req, res) {
    try {
      const requestingUserRole = req.user.role;
      if (requestingUserRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const { status = 'pending' } = req.query;

      const applications = await db('teacher_applications')
        .join('users', 'teacher_applications.user_id', 'users.id')
        .leftJoin('chapters', 'users.chapter_id', 'chapters.id')
        .leftJoin('users as reviewer', 'teacher_applications.reviewed_by', 'reviewer.id')
        .where('teacher_applications.status', status)
        .select(
          'teacher_applications.*',
          'users.id as user_id',
          'users.first_name',
          'users.last_name',
          'users.email',
          'users.created_at as user_created_at',
          'chapters.name as chapter_name',
          'chapters.location as chapter_location',
          'reviewer.first_name as reviewer_first_name',
          'reviewer.last_name as reviewer_last_name'
        )
        .orderBy('teacher_applications.created_at', 'desc');

      res.json({
        success: true,
        data: { applications }
      });
    } catch (error) {
      console.error('Get teacher applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Get single teacher application
  async getTeacherApplication(req, res) {
    try {
      const requestingUserRole = req.user.role;
      if (requestingUserRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const { applicationId } = req.params;

      const application = await db('teacher_applications')
        .join('users', 'teacher_applications.user_id', 'users.id')
        .leftJoin('chapters', 'users.chapter_id', 'chapters.id')
        .leftJoin('users as reviewer', 'teacher_applications.reviewed_by', 'reviewer.id')
        .where('teacher_applications.id', applicationId)
        .select(
          'teacher_applications.*',
          'users.id as user_id',
          'users.first_name',
          'users.last_name',
          'users.email',
          'users.role',
          'users.status as user_status',
          'users.created_at as user_created_at',
          'chapters.name as chapter_name',
          'chapters.location as chapter_location',
          'reviewer.first_name as reviewer_first_name',
          'reviewer.last_name as reviewer_last_name'
        )
        .first();

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      res.json({
        success: true,
        data: { application }
      });
    } catch (error) {
      console.error('Get teacher application error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Approve teacher application
  async approveTeacherApplication(req, res) {
    try {
      const requestingUserRole = req.user.role;
      if (requestingUserRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const { applicationId } = req.params;
      const { adminNotes } = req.body;
      const reviewerId = req.user.userId;

      // Get application
      const application = await db('teacher_applications')
        .where({ id: applicationId, status: 'pending' })
        .first();

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found or already processed'
        });
      }

      // Start transaction
      await db.transaction(async (trx) => {
        // Update application status
        await trx('teacher_applications')
          .where({ id: applicationId })
          .update({
            status: 'approved',
            reviewed_by: reviewerId,
            reviewed_at: new Date(),
            admin_notes: adminNotes || null,
            updated_at: new Date()
          });

        // Update user role and status
        await trx('users')
          .where({ id: application.user_id })
          .update({
            role: 'teacher',
            status: 'active',
            role_requested: 'teacher',
            updated_at: new Date()
          });
      });

      res.json({
        success: true,
        message: 'Teacher application approved successfully'
      });
    } catch (error) {
      console.error('Approve teacher application error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Reject teacher application
  async rejectTeacherApplication(req, res) {
    try {
      const requestingUserRole = req.user.role;
      if (requestingUserRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const { applicationId } = req.params;
      const { adminNotes } = req.body;
      const reviewerId = req.user.userId;

      // Get application
      const application = await db('teacher_applications')
        .where({ id: applicationId, status: 'pending' })
        .first();

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found or already processed'
        });
      }

      // Update application status
      await db('teacher_applications')
        .where({ id: applicationId })
        .update({
          status: 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: new Date(),
          admin_notes: adminNotes || null,
          updated_at: new Date()
        });

      // Update user status back to active (they can still use platform as student)
      await db('users')
        .where({ id: application.user_id })
        .update({
          status: 'active',
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Teacher application rejected'
      });
    } catch (error) {
      console.error('Reject teacher application error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // FR5: Upload Management Enhancements

  // Get upload preview (REQUIREMENT: Preview functionality)
  async getUploadPreview(req, res) {
    try {
      const { uploadId } = req.params;
      const preview = await adminToolsService.getUploadPreview(uploadId);
      
      res.json({
        success: true,
        data: { preview }
      });
    } catch (error) {
      console.error('Get upload preview error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get upload preview'
      });
    }
  },

  // Retry failed upload (REQUIREMENT: Handles failed uploads with retry)
  async retryUpload(req, res) {
    try {
      const { uploadId } = req.params;
      const userId = req.user.userId;
      
      const upload = await adminToolsService.retryUpload(uploadId, userId);
      
      res.json({
        success: true,
        message: 'Upload queued for retry',
        data: { upload }
      });
    } catch (error) {
      console.error('Retry upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retry upload'
      });
    }
  },

  // FR5: Moderation Tools Enhancements

  // Ban user (REQUIREMENT: Ban/unban users)
  async banUser(req, res) {
    try {
      const { userId } = req.params;
      const { reason, duration } = req.body; // duration in seconds
      const adminId = req.user.userId;
      
      const banData = await adminToolsService.banUser(userId, adminId, reason, duration);
      
      res.json({
        success: true,
        message: 'User banned successfully',
        data: { ban: banData }
      });
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to ban user'
      });
    }
  },

  // Unban user (REQUIREMENT: Ban/unban users)
  async unbanUser(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user.userId;
      
      await adminToolsService.unbanUser(userId, adminId);
      
      res.json({
        success: true,
        message: 'User unbanned successfully'
      });
    } catch (error) {
      console.error('Unban user error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to unban user'
      });
    }
  },

  // Ban post (REQUIREMENT: Ban/unban posts)
  async banPost(req, res) {
    try {
      const { postId } = req.params;
      const { reason } = req.body;
      const adminId = req.user.userId;
      
      await adminToolsService.banPost(postId, adminId, reason);
      
      res.json({
        success: true,
        message: 'Post banned successfully'
      });
    } catch (error) {
      console.error('Ban post error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to ban post'
      });
    }
  },

  // Unban post (REQUIREMENT: Ban/unban posts)
  async unbanPost(req, res) {
    try {
      const { postId } = req.params;
      const adminId = req.user.userId;
      
      await adminToolsService.unbanPost(postId, adminId);
      
      res.json({
        success: true,
        message: 'Post unbanned successfully'
      });
    } catch (error) {
      console.error('Unban post error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to unban post'
      });
    }
  },

  // Edit content (REQUIREMENT: Edit content)
  async editContent(req, res) {
    try {
      const { contentType, contentId } = req.params;
      const updates = req.body;
      const adminId = req.user.userId;
      
      const updatedContent = await adminToolsService.editContent(contentType, contentId, updates, adminId);
      
      res.json({
        success: true,
        message: 'Content edited successfully',
        data: { content: updatedContent }
      });
    } catch (error) {
      console.error('Edit content error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to edit content'
      });
    }
  },

  // FR5: Analytics Enhancements

  // Get retention metrics (REQUIREMENT: Retention metrics)
  async getRetentionMetrics(req, res) {
    try {
      const { timeframe = '30days' } = req.query;
      
      const metrics = await adminToolsService.getRetentionMetrics(timeframe);
      
      res.json({
        success: true,
        data: { metrics }
      });
    } catch (error) {
      console.error('Get retention metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch retention metrics'
      });
    }
  },

  // Verify dashboard accuracy (REQUIREMENT: 99% dashboard accuracy)
  async verifyDashboardAccuracy(req, res) {
    try {
      const { snapshotId } = req.params;
      
      const accuracy = await adminToolsService.verifyDashboardAccuracy(snapshotId);
      
      res.json({
        success: true,
        data: {
          accuracy,
          meetsRequirement: accuracy >= 0.99
        }
      });
    } catch (error) {
      console.error('Verify dashboard accuracy error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify dashboard accuracy'
      });
    }
  },

  // Export usage data (REQUIREMENT: Full export of usage data for annual review)
  async exportUsageData(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }
      
      const data = await adminToolsService.exportUsageData(
        new Date(startDate),
        new Date(endDate)
      );
      
      res.json({
        success: true,
        data: { export: data }
      });
    } catch (error) {
      console.error('Export usage data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export usage data'
      });
    }
  },

  // FR5: Audit & Anomaly Detection

  // Get anomalies (REQUIREMENT: Warns admins on audit or moderation anomalies)
  async getAnomalies(req, res) {
    try {
      const { severity, limit = 50 } = req.query;
      
      const anomalies = await adminToolsService.getAnomalies(severity, parseInt(limit));
      
      res.json({
        success: true,
        data: { anomalies }
      });
    } catch (error) {
      console.error('Get anomalies error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch anomalies'
      });
    }
  }
};

module.exports = adminController;
