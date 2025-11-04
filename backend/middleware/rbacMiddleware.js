/**
 * RBAC (Role-Based Access Control) Middleware for Better Auth
 * 
 * This middleware provides role-based and permission-based access control
 * for Better Auth sessions. It integrates with the existing EOTY Platform
 * permission system.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

/**
 * Permission map defining what each role can do
 * This matches the existing EOTY Platform RBAC system
 */
const PERMISSION_MAP = {
  student: [
    'course:view',
    'lesson:view',
    'quiz:take',
    'discussion:participate',
    'resource:view',
    'forum:participate',
    'achievement:view',
    'profile:view_own',
    'profile:edit_own',
  ],
  teacher: [
    'course:view',
    'course:create',
    'course:edit_own',
    'lesson:view',
    'lesson:create',
    'lesson:edit_own',
    'quiz:create',
    'quiz:edit_own',
    'quiz:take',
    'discussion:participate',
    'discussion:moderate',
    'resource:view',
    'resource:create',
    'forum:participate',
    'forum:moderate',
    'achievement:view',
    'student:view',
    'profile:view_own',
    'profile:edit_own',
  ],
  chapter_admin: [
    'course:view',
    'course:create',
    'course:edit_own',
    'course:edit_any',
    'course:delete',
    'lesson:view',
    'lesson:create',
    'lesson:edit_own',
    'lesson:edit_any',
    'lesson:delete',
    'quiz:create',
    'quiz:edit_own',
    'quiz:edit_any',
    'quiz:delete',
    'quiz:take',
    'discussion:participate',
    'discussion:moderate',
    'resource:view',
    'resource:create',
    'resource:edit_any',
    'resource:delete',
    'forum:participate',
    'forum:moderate',
    'achievement:view',
    'achievement:manage',
    'student:view',
    'student:manage',
    'teacher:view',
    'teacher:manage',
    'user:manage',
    'chapter:manage',
    'profile:view_own',
    'profile:edit_own',
    'profile:view_any',
  ],
  platform_admin: [
    'system:admin',
    'course:view',
    'course:create',
    'course:edit_own',
    'course:edit_any',
    'course:delete',
    'lesson:view',
    'lesson:create',
    'lesson:edit_own',
    'lesson:edit_any',
    'lesson:delete',
    'quiz:create',
    'quiz:edit_own',
    'quiz:edit_any',
    'quiz:delete',
    'quiz:take',
    'discussion:participate',
    'discussion:moderate',
    'resource:view',
    'resource:create',
    'resource:edit_any',
    'resource:delete',
    'forum:participate',
    'forum:moderate',
    'achievement:view',
    'achievement:manage',
    'student:view',
    'student:manage',
    'teacher:view',
    'teacher:manage',
    'user:manage',
    'chapter:manage',
    'chapter:create',
    'chapter:delete',
    'profile:view_own',
    'profile:edit_own',
    'profile:view_any',
    'profile:edit_any',
  ],
};

/**
 * Require specific role(s) middleware
 * 
 * Validates that the authenticated user has one of the allowed roles.
 * Must be used after requireAuth middleware.
 * 
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Single role
 * router.post('/courses', requireAuth, requireRole('teacher'), createCourse);
 * 
 * @example
 * // Multiple roles
 * router.get('/admin', requireAuth, requireRole(['chapter_admin', 'platform_admin']), adminDashboard);
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: {
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to access this resource',
        },
      });
    }

    // Normalize to array
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Check if user has one of the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `This action requires one of the following roles: ${roles.join(', ')}`,
          requiredRoles: roles,
          userRole: req.user.role,
        },
      });
    }

    next();
  };
};

/**
 * Require specific permission middleware
 * 
 * Validates that the authenticated user's role has the required permission.
 * Must be used after requireAuth middleware.
 * 
 * @param {string} permission - Required permission (e.g., 'course:create')
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.post('/courses', requireAuth, requirePermission('course:create'), createCourse);
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: {
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to access this resource',
        },
      });
    }

    // Get permissions for user's role
    const userPermissions = PERMISSION_MAP[req.user.role] || [];

    // Check if user has the required permission
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: {
          code: 'INSUFFICIENT_PERMISSION',
          message: `This action requires the '${permission}' permission`,
          requiredPermission: permission,
          userRole: req.user.role,
        },
      });
    }

    next();
  };
};

/**
 * Require chapter assignment middleware
 * 
 * Validates that the authenticated user is assigned to a chapter.
 * Must be used after requireAuth middleware.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * 
 * @example
 * router.get('/chapter-resources', requireAuth, requireChapter, getChapterResources);
 */
const requireChapter = (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: {
        code: 'AUTH_REQUIRED',
        message: 'You must be logged in to access this resource',
      },
    });
  }

  // Check if user has a chapter assignment
  if (!req.user.chapter_id) {
    return res.status(403).json({
      success: false,
      message: 'Chapter assignment required',
      error: {
        code: 'CHAPTER_REQUIRED',
        message: 'You must be assigned to a chapter to access this resource',
      },
    });
  }

  next();
};

/**
 * Check if user has permission (utility function)
 * 
 * Helper function to check if a user has a specific permission.
 * Can be used in route handlers for conditional logic.
 * 
 * @param {Object} user - User object from req.user
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission, false otherwise
 * 
 * @example
 * if (hasPermission(req.user, 'course:edit_any')) {
 *   // Allow editing any course
 * } else if (hasPermission(req.user, 'course:edit_own')) {
 *   // Only allow editing own courses
 * }
 */
const hasPermission = (user, permission) => {
  if (!user || !user.role) {
    return false;
  }

  const userPermissions = PERMISSION_MAP[user.role] || [];
  return userPermissions.includes(permission);
};

/**
 * Check if user has role (utility function)
 * 
 * Helper function to check if a user has a specific role.
 * Can be used in route handlers for conditional logic.
 * 
 * @param {Object} user - User object from req.user
 * @param {string|string[]} roles - Role or array of roles to check
 * @returns {boolean} True if user has one of the roles, false otherwise
 * 
 * @example
 * if (hasRole(req.user, ['chapter_admin', 'platform_admin'])) {
 *   // Allow admin actions
 * }
 */
const hasRole = (user, roles) => {
  if (!user || !user.role) {
    return false;
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
};

module.exports = {
  requireRole,
  requirePermission,
  requireChapter,
  hasPermission,
  hasRole,
  PERMISSION_MAP,
};
