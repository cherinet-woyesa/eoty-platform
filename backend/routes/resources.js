const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const {
  validateResourceUpload,
  validateResourceDownload,
  validateResourceDelete,
  validateResourceGet
} = require('../middleware/resourceValidation');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/courses/lessons/:lessonId/resources
 * Get all resources for a lesson
 * Accessible by: students (enrolled), teachers (course owner), admins
 */
router.get(
  '/lessons/:lessonId/resources',
  requirePermission('lesson:view'),
  validateResourceGet,
  resourceController.getResources
);

/**
 * POST /api/courses/lessons/:lessonId/resources
 * Upload a resource file for a lesson
 * Accessible by: teachers (course owner), admins
 */
router.post(
  '/lessons/:lessonId/resources',
  requirePermission('lesson:edit'),
  resourceController.uploadMiddleware,
  validateResourceUpload,
  resourceController.uploadResource
);

/**
 * GET /api/courses/lessons/:lessonId/resources/:resourceId/download
 * Generate download URL for a resource
 * Accessible by: students (enrolled), teachers (course owner), admins
 */
router.get(
  '/lessons/:lessonId/resources/:resourceId/download',
  requirePermission('lesson:view'),
  validateResourceDownload,
  resourceController.downloadResource
);

/**
 * DELETE /api/courses/lessons/:lessonId/resources/:resourceId
 * Delete a resource
 * Accessible by: teachers (course owner), admins
 */
router.delete(
  '/lessons/:lessonId/resources/:resourceId',
  requirePermission('lesson:delete'),
  validateResourceDelete,
  resourceController.deleteResource
);

module.exports = router;
