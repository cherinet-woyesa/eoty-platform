const db = require('../config/database');

// Permission checking middleware
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      console.log(`[RBAC] Checking permission: ${permission} for user: ${req.user?.email}`);
      // Check if user is authenticated
      if (!req.user) {
        console.log('[RBAC] Authentication required: req.user is null');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const userId = req.user.userId;
      const userRole = req.user.role; // Get role from authenticated user object
      
      // Validate userId
      if (!userId) {
        console.log('[RBAC] Invalid user token: userId is null');
        return res.status(401).json({
          success: false,
          message: 'Invalid user token'
        });
      }
      
      // Platform admins and chapter admins have all permissions
      if (userRole === 'platform_admin' || userRole === 'chapter_admin') {
        console.log(`[RBAC] Permission ${permission} GRANTED for admin user ${req.user.email}`);
        return next();
      }
      
      // Get user's permissions based on their role
      const userPermissions = await db('role_permissions as rp')
        .join('user_permissions as up', 'rp.permission_id', 'up.id')
        .where('rp.role', userRole)
        .select('up.permission_key');
      
      const userPermissionKeys = userPermissions.map(p => p.permission_key);
      console.log(`[RBAC] User ${req.user.email} (ID: ${userId}, Role: ${userRole}) has permissions: ${userPermissionKeys.join(', ')}`);
      
      // Check if user has the required permission or system admin
      if (userPermissionKeys.includes(permission) || userPermissionKeys.includes('system:admin')) {
        console.log(`[RBAC] Permission ${permission} GRANTED for user ${req.user.email}`);
        return next();
      }
      
      // For chapter-specific permissions, check if user is chapter admin
      if (req.user.chapter_id && userPermissionKeys.includes(`${permission.split(':')[0]}:any`)) {
        console.log(`[RBAC] Chapter-specific permission ${permission} GRANTED for user ${req.user.email}`);
        // Additional chapter-based checks can be added here
        return next();
      }
      
      console.log(`[RBAC] Permission ${permission} DENIED for user ${req.user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to access this resource'
      });
      
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

// Role checking middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    
    if (typeof roles === 'string') {
      roles = [roles];
    }
    
    if (roles.includes(userRole) || userRole === 'platform_admin') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Insufficient role privileges'
    });
  };
};

// Chapter access middleware
const requireChapterAccess = () => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const userId = req.user.userId;
      const targetChapterId = req.params.chapterId || req.body.chapter_id;
      
      // Validate userId
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid user token'
        });
      }
      
      if (!targetChapterId) {
        return next();
      }
      
      // Platform admins can access all chapters
      if (req.user.role === 'platform_admin') {
        return next();
      }
      
      // Check if user has access to this chapter
      const chapterAccess = await db('user_chapter_assignments')
        .where({ user_id: userId, chapter_id: targetChapterId })
        .first();
      
      if (chapterAccess || req.user.chapter_id === targetChapterId) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: 'No access to this chapter'
      });
      
    } catch (error) {
      console.error('Chapter access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking chapter access'
      });
    }
  };
};

// Admin access middleware
const requireAdmin = () => {
  return (req, res, next) => {
    const userRole = req.user.role;
    
    if (userRole === 'chapter_admin' || userRole === 'platform_admin') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  };
};

module.exports = {
  requirePermission,
  requireRole,
  requireChapterAccess,
  requireAdmin
};