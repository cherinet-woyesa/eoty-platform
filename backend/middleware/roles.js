const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Specific role helpers for all roles
const requireStudent = authorize(['student', 'teacher', 'chapter_admin', 'platform_admin']);
const requireTeacher = authorize(['teacher', 'chapter_admin', 'platform_admin']);
const requireChapterAdmin = authorize(['chapter_admin', 'platform_admin']);
const requirePlatformAdmin = authorize(['platform_admin']);

// Permission-based middleware
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const User = require('../models/User');
      const userPermissions = await User.getPermissions(req.user.userId);
      
      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permission denied. Required: ${permission}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

module.exports = {
  authorize,
  requireStudent,
  requireTeacher,
  requireChapterAdmin,
  requirePlatformAdmin,
  requirePermission
};