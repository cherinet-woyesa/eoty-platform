/**
 * Chapter Role Routes - API routes for chapter-specific role management
 * Supports FR7 multi-city chapter system with regional roles
 */

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const ChapterRoleController = require('../controllers/chapterRoleController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/rbac');

// All chapter role routes require authentication and admin privileges
router.use(authenticateToken, requireAdmin());

// Validation middleware
const assignRoleValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('chapterId').isInt().withMessage('Valid chapter ID is required'),
  body('role').isIn(['chapter_admin', 'regional_coordinator']).withMessage('Invalid role type'),
  body('permissions').optional().isObject().withMessage('Permissions must be an object')
];

const removeRoleValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('chapterId').isInt().withMessage('Valid chapter ID is required'),
  body('role').isIn(['chapter_admin', 'regional_coordinator']).withMessage('Invalid role type')
];

// Chapter role management routes
router.post('/assign',
  requirePermission('user:manage'),
  assignRoleValidation,
  ChapterRoleController.assignChapterRole
);

router.delete('/remove',
  requirePermission('user:manage'),
  removeRoleValidation,
  ChapterRoleController.removeChapterRole
);

// Query routes
router.get('/user/:userId',
  requirePermission('user:view'),
  param('userId').notEmpty(),
  ChapterRoleController.getUserChapterRoles
);

router.get('/chapter/:chapterId',
  requirePermission('chapter:view'),
  param('chapterId').isInt(),
  ChapterRoleController.getChapterRoleUsers
);

router.get('/check/:userId/:chapterId/:role',
  requirePermission('user:view'),
  param('userId').notEmpty(),
  param('chapterId').isInt(),
  param('role').isIn(['chapter_admin', 'regional_coordinator']),
  ChapterRoleController.checkChapterRole
);

// Admin-only routes
router.get('/regional-coordinators',
  requirePermission('user:view'),
  ChapterRoleController.getRegionalCoordinators
);

router.get('/regional-admins/:region',
  requirePermission('user:view'),
  param('region').notEmpty(),
  ChapterRoleController.getRegionalAdmins
);

// Permission routes
router.get('/permissions/:userId',
  requirePermission('user:view'),
  param('userId').notEmpty(),
  ChapterRoleController.getUserEffectivePermissions
);

// Get all chapter roles
router.get('/all',
  requirePermission('user:view'),
  ChapterRoleController.getAllChapterRoles
);

module.exports = router;
