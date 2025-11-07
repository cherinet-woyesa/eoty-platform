const subtitleService = require('../services/subtitleService');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const subtitleController = {
  // Multer middleware for file upload
  uploadMiddleware: upload.single('file'),

  /**
   * GET /api/courses/lessons/:lessonId/subtitles
   * Get all subtitles for a lesson
   */
  async getSubtitles(req, res) {
    try {
      const { lessonId } = req.params;

      const subtitles = await subtitleService.getSubtitles(parseInt(lessonId));

      res.json({
        success: true,
        data: { subtitles }
      });
    } catch (error) {
      console.error('Get subtitles error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve subtitles'
      });
    }
  },

  /**
   * POST /api/courses/lessons/:lessonId/subtitles
   * Upload a subtitle file (instructor only)
   */
  async uploadSubtitle(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;
      const { language, languageCode } = req.body;

      // Validate required fields
      if (!language || !languageCode) {
        return res.status(400).json({
          success: false,
          message: 'Language and language code are required'
        });
      }

      // Validate language code format
      if (!subtitleService.validateLanguageCode(languageCode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid language code. Must be ISO 639-1 format (e.g., "en", "es")'
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No subtitle file provided'
        });
      }

      const result = await subtitleService.uploadSubtitle(
        req.file.buffer,
        req.file.originalname,
        parseInt(lessonId),
        languageCode.toLowerCase(),
        language,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Subtitle uploaded successfully',
        data: result
      });
    } catch (error) {
      console.error('Upload subtitle error:', error);
      
      // Handle specific error cases
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload subtitle'
      });
    }
  },

  /**
   * DELETE /api/courses/lessons/:lessonId/subtitles/:subtitleId
   * Delete a subtitle (instructor only)
   */
  async deleteSubtitle(req, res) {
    try {
      const { subtitleId } = req.params;
      const userId = req.user.userId;

      const result = await subtitleService.deleteSubtitle(
        parseInt(subtitleId),
        userId
      );

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete subtitle error:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete subtitle'
      });
    }
  }
};

module.exports = subtitleController;
