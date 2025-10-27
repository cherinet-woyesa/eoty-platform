const db = require('../config/database');

// Permission checking middleware
const requirePermission = (permission) => {
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
      
      // Validate userId
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid user token'
        });
      }
      
      // Get user's role and permissions
      const userPermissions = await db('users as u')
        .join('role_permissions as rp', 'u.role', 'rp.role')
        .join('user_permissions as up', 'rp.permission_id', 'up.id')
        .where('u.id', userId)
        .select('up.permission_key');
      
      const userPermissionKeys = userPermissions.map(p => p.permission_key);
      
      // Check if user has the required permission or system admin
      if (userPermissionKeys.includes(permission) || userPermissionKeys.includes('system:admin')) {
        return next();
      }
      
      // For chapter-specific permissions, check if user is chapter admin
      if (req.user.chapter_id && userPermissionKeys.includes(`${permission.split(':')[0]}:any`)) {
        // Additional chapter-based checks can be added here
        return next();
      }
      
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