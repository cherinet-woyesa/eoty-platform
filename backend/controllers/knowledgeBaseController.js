const knowledgeBaseService = require('../services/knowledgeBaseService');
const knowledgeProcessingService = require('../services/knowledgeProcessingService');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for documents
  }
});

const knowledgeBaseController = {
  uploadMiddleware: upload.single('file'),

  async uploadDocument(req, res) {
    try {
      const userId = req.user.userId;
      const { title, description, category } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      const document = await knowledgeBaseService.uploadDocument(
        req.file.buffer,
        req.file.originalname,
        {
          title,
          description,
          category,
          mimetype: req.file.mimetype
        },
        userId
      );

      // Trigger async processing
      knowledgeProcessingService.processDocument(document.id).catch(err => {
        console.error(`Background processing failed for document ${document.id}:`, err);
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully. Processing started.',
        data: document
      });
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload document'
      });
    }
  },

  async getDocuments(req, res) {
    try {
      const { category, status } = req.query;
      const documents = await knowledgeBaseService.getAllDocuments({ category, status });

      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve documents'
      });
    }
  },

  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      await knowledgeBaseService.deleteDocument(id);

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete document'
      });
    }
  }
};

module.exports = knowledgeBaseController;
