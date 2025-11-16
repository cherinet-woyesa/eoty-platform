/**
 * @deprecated This file is deprecated. Please use '../middleware/rbac' instead.
 * This file will be removed in a future version.
 * 
 * Migration guide:
 * - Replace `require('../middleware/roles')` with `require('../middleware/rbac')`
 * - All functions are available in rbac.js with the same names
 */

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
const requireStudent = authorize(['student', 'teacher', 'admin', 'admin']);
const requireTeacher = authorize(['teacher', 'admin']);
const requireChapterAdmin = authorize('admin');
const requirePlatformAdmin = authorize(['admin']);

// Permission-based middleware - SIMPLIFIED VERSION
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      // For now, use role-based permissions instead of database lookup
      const rolePermissions = {
        'student': ['course:view', 'lesson:view'],
        'teacher': ['course:view', 'course:create', 'course:edit', 'course:delete', 'lesson:view', 'lesson:create', 'lesson:edit', 'lesson:delete', 'analytics:view'],
        'admin': ['course:view', 'course:create', 'course:edit', 'course:delete', 'lesson:view', 'lesson:create', 'lesson:edit', 'lesson:delete', 'user:manage', 'analytics:view'],
        'admin': ['course:view', 'course:create', 'course:edit', 'course:delete', 'lesson:view', 'lesson:create', 'lesson:edit', 'lesson:delete', 'user:manage', 'analytics:view']
      };

      const userPermissions = rolePermissions[req.user.role] || [];
      
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
