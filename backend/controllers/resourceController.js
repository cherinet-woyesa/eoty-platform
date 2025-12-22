const resourceService = require('../services/resourceService');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

const resourceController = {
  // Multer middleware for file upload
  uploadMiddleware: upload.single('file'),

  /**
   * GET /api/courses/lessons/:lessonId/resources
   * Get all resources for a lesson
   */
  async getResources(req, res) {
    try {
      const { lessonId } = req.params;

      const resources = await resourceService.getResources(parseInt(lessonId));

      res.json({
        success: true,
        data: { resources }
      });
    } catch (error) {
      console.error('Get resources error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve resources'
      });
    }
  },

  /**
   * POST /api/courses/lessons/:lessonId/resources/attach
   * Attach an existing library resource to a lesson
   */
  async attachResource(req, res) {
    try {
      const { lessonId } = req.params;
      const { resourceId } = req.body;
      const userId = req.user.userId;
      const db = require('../config/database');

      // Check if resource exists in library
      const resource = await db('resources').where({ id: resourceId }).first();
      
      if (!resource) {
        return res.status(404).json({ success: false, message: 'Resource not found' });
      }

      // Create entry in lesson_resources
      const [newResource] = await db('lesson_resources').insert({
        lesson_id: lessonId,
        filename: resource.file_name || resource.filename || resource.title,
        original_filename: resource.original_filename || resource.title,
        file_type: resource.file_type,
        file_size: resource.file_size,
        file_url: resource.file_url || resource.url,
        description: resource.description,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      res.json({
        success: true,
        data: newResource
      });
    } catch (error) {
      console.error('Attach resource error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/courses/lessons/:lessonId/resources
   * Upload a resource file (instructor only)
   */
  async uploadResource(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;
      const { description } = req.body;

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No resource file provided'
        });
      }

      const result = await resourceService.uploadResource(
        req.file.buffer,
        req.file.originalname,
        parseInt(lessonId),
        description,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Resource uploaded successfully',
        data: result
      });
    } catch (error) {
      console.error('Upload resource error:', error);
      
      // Handle specific error cases
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('exceeds maximum') || error.message.includes('Unsupported file type')) {
        // REQUIREMENT: Manages unsupported file types with error notification
        const resourceLibraryService = require('../services/resourceLibraryService');
        resourceLibraryService.logUnsupportedFileAttempt(
          userId,
          req.file?.originalname || 'unknown',
          req.file?.originalname?.split('.').pop()?.toLowerCase() || 'unknown',
          req.file?.mimetype,
          req.file?.size,
          error.message
        ).catch(console.error);
        
        return res.status(400).json({
          success: false,
          message: error.message,
          errorType: 'UNSUPPORTED_FILE_TYPE',
          allowedTypes: require('../services/resourceService').allowedFileTypes
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload resource'
      });
    }
  },

  /**
   * GET /api/courses/lessons/:lessonId/resources/:resourceId/download
   * Generate download URL for a resource
   */
  async downloadResource(req, res) {
    try {
      const { resourceId } = req.params;
      const userId = req.user.userId;

      const result = await resourceService.generateDownloadUrl(
        parseInt(resourceId),
        userId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Download resource error:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate download URL'
      });
    }
  },

  /**
   * DELETE /api/courses/lessons/:lessonId/resources/:resourceId
   * Delete a resource (instructor only)
   */
  async deleteResource(req, res) {
    try {
      const { resourceId } = req.params;
      const userId = req.user.userId;

      const result = await resourceService.deleteResource(
        parseInt(resourceId),
        userId
      );

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete resource error:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete resource'
      });
    }
  }
};

module.exports = resourceController;
