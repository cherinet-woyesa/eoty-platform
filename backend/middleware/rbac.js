const db = require('../config/database');
const accessLogService = require('../services/accessLogService');

// Role hierarchy constants (REQUIREMENT: Youth, moderator, admin, guest roles)
// Higher numbers = higher privileges
// NOTE: Base role has been generalized from 'student' to 'user'; `student` is kept as a legacy alias.
const ROLE_HIERARCHY = {
  'guest': 0,          // No authentication, view-only
  'youth': 1,          // Youth members (same level as base user, with privacy protections)
  'user': 1,           // Regular platform members (courses, resources, community)
  'student': 1,        // Legacy base member role, treated same as 'user'
  'moderator': 2,      // Content moderators
  'teacher': 2,        // Course creators and teachers
  'chapter_admin': 3,  // Chapter-level administrators
  'admin': 4           // Platform administrators (single top-level admin role)
};

// Helper function to check if user's role is equal to or higher than required role
const isRoleOrHigher = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

// Standardized error response utility
const createErrorResponse = (code, message, details = {}) => {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
};

// Permission checking middleware
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      console.log(`[RBAC] Checking permission: ${permission} for user: ${req.user?.email}`);
      
      // Check if user is authenticated
      if (!req.user) {
        console.log('[RBAC] Authentication required: req.user is null');
        return res.status(401).json(
          createErrorResponse(
            'AUTHENTICATION_REQUIRED',
            'Authentication required',
            { resource: req.originalUrl }
          )
        );
      }
      
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      // Validate userId
      if (!userId) {
        console.log('[RBAC] Invalid user token: userId is null');
        return res.status(401).json(
          createErrorResponse(
            'INVALID_TOKEN',
            'Invalid user token',
            { resource: req.originalUrl }
          )
        );
      }
      
      // Admins have all permissions
      if (userRole === 'admin') {
        console.log(`[RBAC] Permission ${permission} GRANTED for ${userRole} user ${req.user.email}`);
        return next();
      }
      
      // Get user's permissions based on their role
      const userPermissions = await db('role_permissions as rp')
        .join('user_permissions as up', 'rp.permission_id', 'up.id')
        .where('rp.role', userRole)
        .select('up.permission_key');
      
      const userPermissionKeys = userPermissions.map(p => p.permission_key);
      console.log(`[RBAC] User ${req.user.email} (ID: ${userId}, Role: ${userRole}) has permissions: ${userPermissionKeys.join(', ')}`);

      // Special-case: base members (user/student/youth/teacher/admin/...) can always view courses
      // This ensures course catalog and basic course views are available to all authenticated users.
      if (permission === 'course:view') {
        const userLevel = ROLE_HIERARCHY[userRole] || 0;
        const baseLevel = ROLE_HIERARCHY['user'] || 0;
        if (userLevel >= baseLevel) {
          console.log(`[RBAC] Permission ${permission} GRANTED by default for role ${userRole}`);
          return next();
        }
      }

      // Special-case: teachers can upload videos (fallback for development/testing)
      if (permission === 'video:upload' && userRole === 'teacher') {
        console.log(`[RBAC] Permission ${permission} GRANTED by fallback for teacher ${req.user.email}`);
        return next();
      }

      // Special-case: teachers can create courses (fallback for development/testing)
      if (permission === 'course:create' && userRole === 'teacher') {
        console.log(`[RBAC] Permission ${permission} GRANTED by fallback for teacher ${req.user.email}`);
        return next();
      }

      // Special-case: teachers can view lessons (fallback for development/testing)
      if (permission === 'lesson:view' && userRole === 'teacher') {
        console.log(`[RBAC] Permission ${permission} GRANTED by fallback for teacher ${req.user.email}`);
        return next();
      }

      // Special-case: teachers can edit lessons (fallback for development/testing)
      if (permission === 'lesson:edit' && userRole === 'teacher') {
        console.log(`[RBAC] Permission ${permission} GRANTED by fallback for teacher ${req.user.email}`);
        return next();
      }

      // Special-case: teachers can manage content (fallback for development/testing)
      if (permission === 'content:manage' && userRole === 'teacher') {
        console.log(`[RBAC] Permission ${permission} GRANTED by fallback for teacher ${req.user.email}`);
        return next();
      }

      // Special-case: teachers can create lessons (fallback for development/testing)
      if (permission === 'lesson:create' && userRole === 'teacher') {
        console.log(`[RBAC] Permission ${permission} GRANTED by fallback for teacher ${req.user.email}`);
        return next();
      }

      // Special-case: teachers can delete lessons (fallback for development/testing)
      if (permission === 'lesson:delete' && userRole === 'teacher') {
        console.log(`[RBAC] Permission ${permission} GRANTED by fallback for teacher ${req.user.email}`);
        return next();
      }

      // Special-case: teachers can create discussions (fallback for development/testing)
      if (permission === 'discussion:create' && userRole === 'teacher') {
        console.log(`[RBAC] Permission ${permission} GRANTED by fallback for teacher ${req.user.email}`);
        return next();
      }

      // Special-case: students/users can view lessons (fallback for development/testing)
      if (permission === 'lesson:view' && (userRole === 'student' || userRole === 'user' || userRole === 'youth')) {
        console.log(`[RBAC] Permission ${permission} GRANTED by fallback for student/user ${req.user.email}`);
        return next();
      }
      
      // Check if user has the required permission or system admin
      if (userPermissionKeys.includes(permission) || userPermissionKeys.includes('system:admin')) {
        console.log(`[RBAC] Permission ${permission} GRANTED for user ${req.user.email}`);
        return next();
      }
      
      // For chapter-specific permissions, check if user is chapter admin
      if (req.user.chapter_id && userPermissionKeys.includes(`${permission.split(':')[0]}:any`)) {
        console.log(`[RBAC] Chapter-specific permission ${permission} GRANTED for user ${req.user.email}`);
        return next();
      }
      
      console.log(`[RBAC] Permission ${permission} DENIED for user ${req.user.email}`);
      
      // Log access denial
      accessLogService.logAccessDenial({
        userId,
        userRole,
        resource: req.originalUrl,
        requiredRole: 'permission:' + permission,
        action: req.method,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { permission }
      }).catch(err => console.error('Failed to log access denial:', err));
      
      return res.status(403).json(
        createErrorResponse(
          'INSUFFICIENT_PERMISSION',
          'Access denied: Insufficient permissions',
          {
            userRole,
            requiredPermission: permission,
            resource: req.originalUrl
          }
        )
      );
      
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json(
        createErrorResponse(
          'INTERNAL_ERROR',
          'Error checking permissions',
          { permission }
        )
      );
    }
  };
};

// Role checking middleware with hierarchy support
const requireRole = (roles, options = {}) => {
  return (req, res, next) => {
    const { allowHigher = true, strict = false } = options;
    const userRole = req.user?.role;
    
    // Check if user is authenticated
    if (!req.user || !userRole) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          details: {
            resource: req.originalUrl
          }
        }
      });
    }
    
    // Normalize roles to array
    if (typeof roles === 'string') {
      roles = [roles];
    }
    
    // Strict mode: exact role match required
    if (strict) {
      if (roles.includes(userRole)) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'Access denied: Exact role match required',
          details: {
            userRole,
            requiredRole: roles,
            resource: req.originalUrl
          }
        }
      });
    }
    
    // Hierarchy mode: check if user role is equal to or higher than any required role
    if (allowHigher) {
      for (const requiredRole of roles) {
        if (isRoleOrHigher(userRole, requiredRole)) {
          return next();
        }
      }
    } else {
      // No hierarchy: exact match only
      if (roles.includes(userRole)) {
        return next();
      }
    }
    
    // Log access denial
    accessLogService.logAccessDenial({
      userId: req.user.userId,
      userRole,
      resource: req.originalUrl,
      requiredRole: Array.isArray(roles) ? roles.join('|') : roles,
      action: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { strict, allowHigher }
    }).catch(err => console.error('Failed to log access denial:', err));
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_ROLE',
        message: 'Access denied: Insufficient role privileges',
        details: {
          userRole,
          requiredRole: roles,
          resource: req.originalUrl
        }
      }
    });
  };
};

// Chapter access middleware
const requireChapterAccess = () => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(
            'AUTHENTICATION_REQUIRED',
            'Authentication required',
            { resource: req.originalUrl }
          )
        );
      }
      
      const userId = req.user.userId;
      const userRole = req.user.role;
      const targetChapterId = req.params.chapterId || req.body.chapter_id;
      
      // Validate userId
      if (!userId) {
        return res.status(401).json(
          createErrorResponse(
            'INVALID_TOKEN',
            'Invalid user token',
            { resource: req.originalUrl }
          )
        );
      }
      
      if (!targetChapterId) {
        return next();
      }
      
      // Admins can access all chapters
      if (userRole === 'admin') {
        return next();
      }
      
      // Check if user has access to this chapter
      const chapterAccess = await db('user_chapter_assignments')
        .where({ user_id: userId, chapter_id: targetChapterId })
        .first();
      
      if (chapterAccess || req.user.chapter_id === targetChapterId) {
        return next();
      }
      
      return res.status(403).json(
        createErrorResponse(
          'CHAPTER_ACCESS_DENIED',
          'Access denied: No access to this chapter',
          {
            userRole,
            userId,
            targetChapterId,
            userChapterId: req.user.chapter_id,
            resource: req.originalUrl
          }
        )
      );
      
    } catch (error) {
      console.error('Chapter access check error:', error);
      return res.status(500).json(
        createErrorResponse(
          'INTERNAL_ERROR',
          'Error checking chapter access',
          { targetChapterId }
        )
      );
    }
  };
};

// Admin access middleware
const requireAdmin = () => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json(
        createErrorResponse(
          'AUTHENTICATION_REQUIRED',
          'Authentication required',
          { resource: req.originalUrl }
        )
      );
    }
    
    const userRole = req.user.role;
    
    if (userRole === 'admin') {
      return next();
    }
    
    return res.status(403).json(
      createErrorResponse(
        'ADMIN_ACCESS_REQUIRED',
        'Access denied: Admin role required',
        {
          userRole,
          requiredRole: ['admin'],
          resource: req.originalUrl
        }
      )
    );
  };
};

// Resource ownership validation middleware
const requireOwnership = (resourceType, options = {}) => {
  return async (req, res, next) => {
    try {
      const {
        resourceParam = 'id',
        ownerField = 'created_by',
        allowAdmin = true,
        allowTeacherForCourse = true
      } = options;
      
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
            details: {
              resource: req.originalUrl
            }
          }
        });
      }
      
      const userId = req.user.userId;
      const userRole = req.user.role;
      const resourceId = req.params[resourceParam] || req.body[resourceParam];
      
      // Validate resource ID
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Resource ID is required',
            details: {
              resourceType,
              resourceParam
            }
          }
        });
      }
      
      // Admins bypass ownership checks
      if (allowAdmin && userRole === 'admin') {
        return next();
      }
      
      // Check resource ownership
      let query = db(resourceType).where('id', resourceId);
      
      // For courses, teachers can access if they created it
      if (resourceType === 'courses' && allowTeacherForCourse && isRoleOrHigher(userRole, 'teacher')) {
        query = query.where(ownerField, userId);
        const resource = await query.first();
        
        if (resource) {
          return next();
        }
      } else {
        // Standard ownership check
        query = query.where(ownerField, userId);
        const resource = await query.first();
        
        if (resource) {
          return next();
        }
      }
      
      // Check if resource exists at all
      const resourceExists = await db(resourceType)
        .where('id', resourceId)
        .first();
      
      if (!resourceExists) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `${resourceType} not found`,
            details: {
              resourceType,
              resourceId
            }
          }
        });
      }
      
      // Resource exists but user doesn't own it
      return res.status(403).json({
        success: false,
        error: {
          code: 'OWNERSHIP_REQUIRED',
          message: 'Access denied: You do not own this resource',
          details: {
            resourceType,
            resourceId,
            userRole,
            userId
          }
        }
      });
      
    } catch (error) {
      console.error('Ownership validation error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error validating resource ownership',
          details: {
            resourceType
          }
        }
      });
    }
  };
};

// Enrollment validation middleware for student access to courses
const requireEnrollment = (options = {}) => {
  return async (req, res, next) => {
    try {
      const { courseParam = 'courseId', allowTeacher = true } = options;
      
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
            details: {
              resource: req.originalUrl
            }
          }
        });
      }
      
      const userId = req.user.userId;
      const userRole = req.user.role;
      const courseId = req.params[courseParam] || req.body[courseParam];
      
      if (!courseId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Course ID is required',
            details: {
              courseParam
            }
          }
        });
      }
      
      // Admins can access all courses
      if (userRole === 'admin') {
        return next();
      }
      
      // Teachers can access courses they created
      if (allowTeacher && isRoleOrHigher(userRole, 'teacher')) {
        const course = await db('courses')
          .where({ id: courseId, created_by: userId })
          .first();
        
        if (course) {
          return next();
        }
      }
      
      // Check if student is enrolled
      const enrollment = await db('user_course_enrollments')
        .where({
          user_id: userId,
          course_id: courseId,
          enrollment_status: 'active'
        })
        .first();
      
      if (enrollment) {
        return next();
      }
      
      // Check if course exists
      const courseExists = await db('courses')
        .where('id', courseId)
        .first();
      
      if (!courseExists) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Course not found',
            details: {
              courseId
            }
          }
        });
      }
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'ENROLLMENT_REQUIRED',
          message: 'Access denied: You must be enrolled in this course',
          details: {
            courseId,
            userRole
          }
        }
      });
      
    } catch (error) {
      console.error('Enrollment validation error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error validating course enrollment'
        }
      });
    }
  };
};

// Convenience role helpers for backward compatibility
// `requireStudent` now represents the base member tier (user/student/youth/teacher/admin/...)
const requireStudent = requireRole(['user', 'student', 'youth', 'teacher', 'admin', 'chapter_admin']);
const requireTeacher = requireRole(['teacher', 'admin', 'chapter_admin']);
const requireChapterAdmin = requireRole(['chapter_admin', 'admin']);
// `platform_admin` has been removed; treat any usages of requirePlatformAdmin as plain admin access.
const requirePlatformAdmin = requireRole(['admin']);

module.exports = {
  requirePermission,
  requireRole,
  requireChapterAccess,
  requireAdmin,
  requireOwnership,
  requireEnrollment,
  isRoleOrHigher,
  ROLE_HIERARCHY,
  createErrorResponse,
  // Convenience helpers
  requireStudent,
  requireTeacher,
  requireChapterAdmin,
  requirePlatformAdmin
};