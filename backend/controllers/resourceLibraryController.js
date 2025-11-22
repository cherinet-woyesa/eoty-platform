// backend/controllers/resourceLibraryController.js
// Resource Library Controller - REQUIREMENT: FR3

const resourceLibraryService = require('../services/resourceLibraryService');
const { Resource, UserNote, AISummary } = require('../models/Resource');
const db = require('../config/database');

const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

const resourceLibraryController = {
  // Multer middleware for file upload
  uploadMiddleware: upload.single('file'),
  // Enhanced search with all filters (REQUIREMENT: Tag, type, topic, author, date)
  async searchResources(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const user = await db('users').where({ id: userId }).select('chapter_id').first();

      const filters = {
        search: req.query.search,
        tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : req.query.tags.split(',')) : undefined,
        type: req.query.type,
        topic: req.query.topic,
        author: req.query.author,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        category: req.query.category,
        language: req.query.language,
        userId,
        userRole,
        chapterId: user?.chapter_id,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      console.log('🔍 Backend search filters:', JSON.stringify(filters, null, 2));

      const resources = await resourceLibraryService.searchResources(filters);

      res.json({
        success: true,
        data: {
          resources,
          count: resources.length,
          filters: filters
        }
      });
    } catch (error) {
      console.error('Search resources error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to search resources'
      });
    }
  },

  // Get enhanced filter options (REQUIREMENT: Tag, type, topic, author, date)
  async getFilterOptions(req, res) {
    try {
      const options = await resourceLibraryService.getFilterOptions();

      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      console.error('Get filter options error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get filter options'
      });
    }
  },

  // Get single resource with inline viewing capability
  async getResource(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const resource = await Resource.findById(id);
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check permission (REQUIREMENT: Prevents unauthorized access)
      const hasPermission = await Resource.checkPermission(id, userId, 'view');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      // Check if can view inline (REQUIREMENT: Inline viewing)
      const canViewInline = resourceLibraryService.canViewInline(resource.file_type);

      // Check if unsupported (REQUIREMENT: Error notification)
      const isUnsupported = resourceLibraryService.isUnsupportedType(resource.file_type);

      // Track usage
      await db('resource_usage').insert({
        user_id: userId,
        resource_id: id,
        action: 'view',
        metadata: { can_view_inline: canViewInline },
        created_at: new Date()
      });

      res.json({
        success: true,
        data: {
          resource,
          canViewInline,
          isUnsupported,
          errorMessage: isUnsupported ? `File type "${resource.file_type}" is not supported for viewing. Please download the file instead.` : null
        }
      });
    } catch (error) {
      console.error('Get resource error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get resource'
      });
    }
  },

  // Create note with section anchoring (REQUIREMENT: Anchor notes to sections)
  async createNote(req, res) {
    try {
      const { id } = req.params; // resourceId from URL
      const { content, isPublic = false, sectionAnchor, sectionText, sectionPosition, anchorPoint } = req.body;
      const userId = req.user.userId;

      // Support both sectionAnchor and anchorPoint (legacy)
      const finalSectionAnchor = sectionAnchor || anchorPoint;

      // Verify resource access
      const hasPermission = await Resource.checkPermission(id, userId, 'view');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      const note = await resourceLibraryService.createNote(
        userId,
        id,
        content,
        isPublic,
        finalSectionAnchor,
        sectionText,
        sectionPosition
      );

      res.status(201).json({
        success: true,
        message: 'Note created successfully',
        data: { note }
      });
    } catch (error) {
      console.error('Create note error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create note'
      });
    }
  },

  // Get resource notes (personal and shared) (REQUIREMENT: Personal or shared)
  async getNotes(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Get user's personal notes
      const userNotes = await UserNote.findByResourceAndUser(id, userId);

      // Get public notes
      const publicNotes = await UserNote.findPublicByResource(id);

      // Get shared notes from chapter (REQUIREMENT: Share notes with chapter members)
      const user = await db('users').where({ id: userId }).select('chapter_id').first();
      let sharedNotes = [];

      // Check if shared_resource_notes table exists
      const hasSharedNotesTable = await db.schema.hasTable('shared_resource_notes');

      if (user?.chapter_id && hasSharedNotesTable) {
        sharedNotes = await db('shared_resource_notes')
          .join('user_notes', 'shared_resource_notes.note_id', 'user_notes.id')
          .join('users', 'user_notes.user_id', 'users.id')
          .where('shared_resource_notes.chapter_id', user.chapter_id)
          .where('shared_resource_notes.is_approved', true)
          .where('user_notes.resource_id', id)
          .select(
            'user_notes.*',
            'users.first_name',
            'users.last_name',
            'shared_resource_notes.shared_by'
          )
          .orderBy('user_notes.created_at', 'desc');
      }

      res.json({
        success: true,
        data: {
          user_notes: userNotes,
          public_notes: publicNotes,
          shared_notes: sharedNotes
        }
      });
    } catch (error) {
      console.error('Get notes error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get notes'
      });
    }
  },

  // Generate AI summary (REQUIREMENT: < 250 words, 98% relevance)
  async generateSummary(req, res) {
    try {
      const { id } = req.params;
      const { type = 'brief' } = req.query;
      const userId = req.user.userId;

      // Verify resource access
      const hasPermission = await Resource.checkPermission(id, userId, 'view');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      // Generate summary (REQUIREMENT: < 250 words, 98% relevance)
      const summary = await resourceLibraryService.generateAISummary(id, type);

      // Track usage
      await db('resource_usage').insert({
        user_id: userId,
        resource_id: id,
        action: 'ai_summary_generated',
        metadata: { 
          summary_type: type, 
          word_count: summary.word_count || summary.wordCount, 
          relevance_score: summary.relevance_score || summary.relevanceScore,
          meets_word_limit: summary.meetsWordLimit,
          meets_relevance_requirement: summary.meetsRelevanceRequirement
        },
        created_at: new Date()
      });

      // Parse key_points if it's a string
      const keyPoints = typeof summary.key_points === 'string' 
        ? JSON.parse(summary.key_points) 
        : summary.keyPoints || summary.key_points || [];
      
      const spiritualInsights = summary.spiritual_insights 
        ? summary.spiritual_insights.split('\n').filter(i => i.trim())
        : summary.spiritualInsights || [];

      res.json({
        success: true,
        data: {
          summary: {
            ...summary,
            keyPoints,
            spiritualInsights
          },
          meetsWordLimit: summary.meetsWordLimit || summary.meets_word_limit,
          meetsRelevanceRequirement: summary.meetsRelevanceRequirement || (summary.relevance_score || summary.relevanceScore) >= 0.98
        }
      });
    } catch (error) {
      console.error('Generate summary error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate summary'
      });
    }
  },

  // Export resource content (REQUIREMENT: Export notes/summaries)
  async exportResource(req, res) {
    try {
      const { id } = req.params;
      const { type = 'combined', format = 'pdf' } = req.query;
      const userId = req.user.userId;

      // Verify resource access
      const hasPermission = await Resource.checkPermission(id, userId, 'view');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      const exportData = await resourceLibraryService.exportResource(userId, id, type, format);

      res.json({
        success: true,
        message: 'Export prepared successfully',
        data: exportData
      });
    } catch (error) {
      console.error('Export resource error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export resource'
      });
    }
  },

  // Share resource with chapter (REQUIREMENT: Share with chapter members)
  async shareResource(req, res) {
    try {
      const { id } = req.params;
      const { shareType = 'view', message = null } = req.body;
      const userId = req.user.userId;

      const user = await db('users').where({ id: userId }).select('chapter_id').first();
      if (!user?.chapter_id) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to a chapter to share resources'
        });
      }

      const share = await resourceLibraryService.shareResourceWithChapter(
        id,
        userId,
        user.chapter_id,
        shareType,
        message
      );

      res.json({
        success: true,
        message: 'Resource shared with chapter members',
        data: share
      });
    } catch (error) {
      console.error('Share resource error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to share resource'
      });
    }
  },

  // Share note with chapter (REQUIREMENT: Share notes with chapter members)
  async shareNote(req, res) {
    try {
      const { noteId } = req.body;
      const userId = req.user.userId;

      const user = await db('users').where({ id: userId }).select('chapter_id').first();
      if (!user?.chapter_id) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to a chapter to share notes'
        });
      }

      const share = await resourceLibraryService.shareNoteWithChapter(noteId, userId, user.chapter_id);

      res.json({
        success: true,
        message: 'Note shared with chapter members',
        data: share
      });
    } catch (error) {
      console.error('Share note error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to share note'
      });
    }
  },

  // Get coverage statistics (REQUIREMENT: 80%+ coverage)
  async getCoverageStatistics(req, res) {
    try {
      const stats = await resourceLibraryService.getCoverageStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get coverage statistics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get coverage statistics'
      });
    }
  },

  // Admin validate summary relevance (REQUIREMENT: 98% relevance per admin validation)
  async validateSummaryRelevance(req, res) {
    try {
      const { summaryId } = req.params;
      const { relevanceScore, validationNotes } = req.body;
      const adminId = req.user.userId;

      // Check admin permission
      const user = await db('users').where({ id: adminId }).select('role').first();
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can validate summaries'
        });
      }

      if (relevanceScore < 0.98) {
        return res.status(400).json({
          success: false,
          message: 'Relevance score must be at least 0.98 (98%)'
        });
      }

      const result = await resourceLibraryService.validateSummaryRelevance(
        summaryId,
        adminId,
        relevanceScore,
        validationNotes
      );

      res.json({
        success: true,
        message: 'Summary validated successfully',
        data: result
      });
    } catch (error) {
      console.error('Validate summary relevance error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to validate summary'
      });
    }
  },

  // Upload resource to library (for teachers)
  async uploadResource(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Only teachers and admins can upload
      if (userRole !== 'teacher' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only teachers and admins can upload resources'
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      const { title, description, category, tags, language, topic, author_id } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }

      const result = await resourceLibraryService.uploadResource(
        req.file.buffer,
        req.file.originalname,
        userId,
        { title, description, category, tags, language, topic, author_id: author_id || userId }
      );

      res.status(201).json({
        success: true,
        message: 'Resource uploaded successfully',
        data: { resource: result }
      });
    } catch (error) {
      console.error('Upload resource error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload resource'
      });
    }
  }
};

module.exports = resourceLibraryController;

