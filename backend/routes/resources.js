const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const resourceLibraryController = require('../controllers/resourceLibraryController');
const resourceService = require('../services/resourceService');
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
 * POST /api/resources/upload
 * Upload a resource to the library (teachers and admins only)
 * Supports different scopes: chapter_wide, platform_wide
 */
router.post(
  '/upload',
  requirePermission('content:manage'),
  resourceLibraryController.uploadMiddleware,
  resourceLibraryController.uploadResource
);

/**
 * GET /api/resources/chapter/:chapterId
 * Get chapter-wide resources for a specific chapter
 */
router.get(
  '/chapter/:chapterId',
  async (req, res) => {
    try {
      const { chapterId } = req.params;
      const userId = req.user.userId;
      const filters = req.query;

      const { resources, total, page, limit } = await resourceService.getResourcesByScope(userId, 'chapter_wide', {
        chapterId: parseInt(chapterId),
        filters
      });

      res.json({
        success: true,
        data: { 
          resources,
          pagination: { total, page, limit }
        }
      });
    } catch (error) {
      console.error('Get chapter resources error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve chapter resources'
      });
    }
  }
);

/**
 * GET /api/resources/platform
 * Get platform-wide resources (accessible to all users)
 */
router.get(
  '/platform',
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const filters = req.query;

      const { resources, total, page, limit } = await resourceService.getResourcesByScope(userId, 'platform_wide', {
        filters
      });

      res.json({
        success: true,
        data: { 
          resources,
          pagination: { total, page, limit }
        }
      });
    } catch (error) {
      console.error('Get platform resources error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve platform resources'
      });
    }
  }
);

/**
 * GET /api/resources/course/:courseId
 * Get course-specific resources for a specific course
 */
router.get(
  '/course/:courseId',
  requirePermission('course:view'),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user.userId;
      const filters = req.query;

      const { resources, total, page, limit } = await resourceService.getResourcesByScope(userId, 'course_specific', {
        courseId: parseInt(courseId),
        filters
      });

      res.json({
        success: true,
        data: { 
          resources,
          pagination: { total, page, limit }
        }
      });
    } catch (error) {
      console.error('Get course resources error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve course resources'
      });
    }
  }
);

/**
 * GET /api/resources/filters
 * Get enhanced filter options (REQUIREMENT: Tag, type, topic, author, date)
 */
router.get(
  '/filters',
  async (req, res) => {
    try {
      const resourceLibraryService = require('../services/resourceLibraryService');
      const filters = await resourceLibraryService.getFilterOptions();
      
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
 * GET /api/resources/search
 * Enhanced search with all filters (REQUIREMENT: Tag, type, topic, author, date)
 * NOTE: Must come before /:id route to avoid route conflict
 */
router.get(
  '/search',
  resourceLibraryController.searchResources
);

/**
 * GET /api/resources/coverage
 * Get coverage statistics (REQUIREMENT: 80%+ coverage)
 * NOTE: Must come before /:id route to avoid route conflict
 */
router.get(
  '/coverage',
  requirePermission('admin:view'),
  resourceLibraryController.getCoverageStatistics
);

/**
 * GET /api/resources/chapter/:chapterId
 * Get chapter-wide resources for a specific chapter
 */
router.get(
  '/chapter/:chapterId',
  async (req, res) => {
    try {
      const { chapterId } = req.params;
      const userId = req.user.userId;
      const filters = req.query;

      const { resources, total, page, limit } = await resourceService.getResourcesByScope(userId, 'chapter_wide', {
        chapterId: parseInt(chapterId),
        filters
      });

      res.json({
        success: true,
        data: { 
          resources,
          pagination: { total, page, limit }
        }
      });
    } catch (error) {
      console.error('Get chapter resources error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve chapter resources'
      });
    }
  }
);

/**
 * GET /api/resources/platform
 * Get platform-wide resources (accessible to all users)
 */
router.get(
  '/platform',
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const filters = req.query;

      const { resources, total, page, limit } = await resourceService.getResourcesByScope(userId, 'platform_wide', {
        filters
      });

      res.json({
        success: true,
        data: { 
          resources,
          pagination: { total, page, limit }
        }
      });
    } catch (error) {
      console.error('Get platform resources error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve platform resources'
      });
    }
  }
);

/**
 * GET /api/resources/course/:courseId
 * Get course-specific resources for a specific course
 */
router.get(
  '/course/:courseId',
  requirePermission('course:view'),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user.userId;
      const filters = req.query;

      const { resources, total, page, limit } = await resourceService.getResourcesByScope(userId, 'course_specific', {
        courseId: parseInt(courseId),
        filters
      });

      res.json({
        success: true,
        data: { 
          resources,
          pagination: { total, page, limit }
        }
      });
    } catch (error) {
      console.error('Get course resources error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve course resources'
      });
    }
  }
);

/**
 * GET /api/resources/:id
 * Get single resource with inline viewing capability
 */
router.get(
  '/:id',
  resourceLibraryController.getResource
);

/**
 * POST /api/resources/:id/notes
 * Create note with section anchoring (REQUIREMENT: Anchor notes to sections)
 */
router.post(
  '/:id/notes',
  resourceLibraryController.createNote
);

/**
 * GET /api/resources/:id/notes
 * Get resource notes (personal and shared)
 */
router.get(
  '/:id/notes',
  resourceLibraryController.getNotes
);

/**
 * GET /api/resources/:id/summary
 * Generate AI summary (REQUIREMENT: < 250 words, 98% relevance)
 */
router.get(
  '/:id/summary',
  resourceLibraryController.generateSummary
);

/**
 * GET /api/resources/:id/export
 * Export resource content (REQUIREMENT: Export notes/summaries)
 */
router.get(
  '/:id/export',
  resourceLibraryController.exportResource
);

/**
 * POST /api/resources/:id/share
 * Share resource with chapter (REQUIREMENT: Share with chapter members)
 */
router.post(
  '/:id/share',
  resourceLibraryController.shareResource
);

/**
 * POST /api/resources/notes/:noteId/share
 * Share note with chapter (REQUIREMENT: Share notes with chapter members)
 * NOTE: Must come before /:id routes to avoid route conflict
 */
router.post(
  '/notes/:noteId/share',
  resourceLibraryController.shareNote
);

/**
 * POST /api/resources/summaries/:summaryId/validate
 * Admin validate summary relevance (REQUIREMENT: 98% relevance per admin validation)
 */
router.post(
  '/summaries/:summaryId/validate',
  requirePermission('admin:moderate'),
  resourceLibraryController.validateSummaryRelevance
);

/**
 * GET /api/resources/lesson/:lessonId
 * Get all resources associated with a specific lesson
 * Accessible by: students (enrolled), teachers (course owner), admins
 */
router.get(
  '/lesson/:lessonId',
  requirePermission('lesson:view'),
  async (req, res) => {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;
      
      const resources = await require('../models/Resource').findByLesson(lessonId, userId);
      
      res.json({
        success: true,
        data: { resources }
      });
    } catch (error) {
      console.error('Get lesson resources error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve lesson resources'
      });
    }
  }
);

/**
 * POST /api/resources/attach-to-lesson
 * Attach an existing resource to a lesson
 * Accessible by: teachers (course owner), admins
 */
router.post(
  '/attach-to-lesson',
  requirePermission('content:manage'),
  async (req, res) => {
    try {
      const { resourceId, lessonId } = req.body;
      
      if (!resourceId || !lessonId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID and Lesson ID are required'
        });
      }
      
      const updated = await require('../models/Resource').attachToLesson(resourceId, lessonId);
      
      res.json({
        success: true,
        data: { resource: updated }
      });
    } catch (error) {
      console.error('Attach resource to lesson error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to attach resource to lesson'
      });
    }
  }
);

/**
 * POST /api/resources/detach-from-lesson
 * Detach a resource from a lesson
 * Accessible by: teachers (course owner), admins
 */
router.post(
  '/detach-from-lesson',
  requirePermission('content:manage'),
  async (req, res) => {
    try {
      const { resourceId } = req.body;
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID is required'
        });
      }
      
      const updated = await require('../models/Resource').detachFromLesson(resourceId);
      
      res.json({
        success: true,
        data: { resource: updated }
      });
    } catch (error) {
      console.error('Detach resource from lesson error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to detach resource from lesson'
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

/**
 * PUT /api/resources/:id
 * Update resource metadata
 */
router.put(
  '/:id',
  requirePermission('content:manage'),
  resourceLibraryController.updateResource
);

/**
 * DELETE /api/resources/:id
 * Delete a resource
 */
router.delete(
  '/:id',
  requirePermission('content:manage'),
  resourceLibraryController.deleteResource
);

module.exports = router;
