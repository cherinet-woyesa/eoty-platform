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
 * GET /api/resources
 * Get all resources (general resource library)
 * Accessible by: all authenticated users
 */
router.get(
  '/',
  async (req, res) => {
    try {
      // Get all resources for the user
      const resourceService = require('../services/resourceService');
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      // Get all resources accessible to the user
      const resources = await resourceService.getAllUserResources(userId, userRole);
      
      res.json({
        success: true,
        data: { resources }
      });
    } catch (error) {
      console.error('Get all resources error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve resources'
      });
    }
  }
);

/**
 * GET /api/resources/filters
 * Get filter options for resources
 */
router.get(
  '/filters',
  async (req, res) => {
    try {
      const resourceService = require('../services/resourceService');
      const filters = await resourceService.getFilterOptions();
      
      res.json({
        success: true,
        data: filters
      });
    } catch (error) {
      console.error('Get resource filters error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve filter options'
      });
    }
  }
);

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
