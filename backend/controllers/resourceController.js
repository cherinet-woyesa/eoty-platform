const { Resource, UserNote, AISummary } = require('../models/Resource');
const db = require('../config/database');
const aiService = require('../services/aiService');

const resourceController = {
  // Get all resources with filtering
  async getResources(req, res) {
    try {
      const { category, language, tags, search, page = 1, limit = 20 } = req.query;
      const userId = req.user.userId;
      
      // Get user's chapter
      const user = await db('users').where({ id: userId }).select('chapter_id').first();
      
      const filters = {
        category,
        language,
        tags: tags ? tags.split(',') : [],
        search
      };

      const resources = await Resource.findByChapter(user.chapter_id, filters);
      
      // Check permissions for each resource
      const accessibleResources = [];
      for (const resource of resources) {
        const hasAccess = await Resource.checkPermission(resource.id, userId, 'view');
        if (hasAccess) {
          accessibleResources.push(resource);
        }
      }

      res.json({
        success: true,
        data: {
          resources: accessibleResources,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: accessibleResources.length
          }
        }
      });
    } catch (error) {
      console.error('Get resources error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resources'
      });
    }
  },

  // Get resource by ID
  async getResource(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const hasAccess = await Resource.checkPermission(id, userId, 'view');
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      const resource = await Resource.findById(id);
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Track view
      await db('resource_usage').insert({
        user_id: userId,
        resource_id: id,
        action: 'view',
        metadata: { timestamp: new Date() }
      });

      res.json({
        success: true,
        data: { resource }
      });
    } catch (error) {
      console.error('Get resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resource'
      });
    }
  },

  // Create note
  async createNote(req, res) {
    try {
      const { resourceId, content, anchorPoint, isPublic = false, metadata = {} } = req.body;
      const userId = req.user.userId;

      const hasAccess = await Resource.checkPermission(resourceId, userId, 'view');
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      const note = await UserNote.create({
        user_id: userId,
        resource_id: resourceId,
        content,
        anchor_point: anchorPoint,
        is_public: isPublic,
        metadata
      });

      // Track note creation
      await db('resource_usage').insert({
        user_id: userId,
        resource_id: resourceId,
        action: 'note',
        metadata: { note_id: note.id }
      });

      res.status(201).json({
        success: true,
        message: 'Note created successfully',
        data: { note }
      });
    } catch (error) {
      console.error('Create note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create note'
      });
    }
  },

  // Get AI summary
  async getSummary(req, res) {
    try {
      const { id } = req.params;
      const { type = 'brief' } = req.query;
      const userId = req.user.userId;

      const hasAccess = await Resource.checkPermission(id, userId, 'view');
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      // Check if summary already exists
      let summary = await AISummary.findByResource(id, type);
      
      if (!summary) {
        // Generate new summary
        const resource = await Resource.findById(id);
        
        try {
          const aiSummary = await aiService.generateResourceSummary(resource, type);
          summary = await AISummary.createOrUpdate({
            resource_id: id,
            summary: aiSummary.summary,
            key_points: JSON.stringify(aiSummary.keyPoints),
            spiritual_insights: aiSummary.spiritualInsights,
            summary_type: type,
            word_count: aiSummary.wordCount,
            relevance_score: aiSummary.relevanceScore,
            model_used: aiSummary.modelUsed
          });
        } catch (aiError) {
          console.error('AI summary generation failed:', aiError);
          return res.status(503).json({
            success: false,
            message: 'AI summary service temporarily unavailable'
          });
        }
      }

      // Track summary usage
      await db('resource_usage').insert({
        user_id: userId,
        resource_id: id,
        action: 'summary',
        metadata: { summary_type: type, summary_id: summary.id }
      });

      res.json({
        success: true,
        data: { 
          summary: {
            ...summary,
            key_points: summary.key_points ? JSON.parse(summary.key_points) : []
          }
        }
      });
    } catch (error) {
      console.error('Get summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate summary'
      });
    }
  },

  // Get resource notes
  async getNotes(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const hasAccess = await Resource.checkPermission(id, userId, 'view');
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      const userNotes = await UserNote.findByResourceAndUser(id, userId);
      const publicNotes = await UserNote.findPublicByResource(id);

      res.json({
        success: true,
        data: {
          user_notes: userNotes,
          public_notes: publicNotes
        }
      });
    } catch (error) {
      console.error('Get notes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notes'
      });
    }
  },

  // Get filters metadata
  async getFilters(req, res) {
    try {
      const categories = await Resource.getCategories();
      const tags = await Resource.getTags();

      res.json({
        success: true,
        data: {
          categories,
          tags,
          languages: ['amharic', 'english', 'tigrigna', 'oromo'] // Supported languages
        }
      });
    } catch (error) {
      console.error('Get filters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch filter options'
      });
    }
  },

  // Export notes and summaries
  async exportContent(req, res) {
    try {
      const { id } = req.params;
      const { format = 'pdf' } = req.query;
      const userId = req.user.userId;

      const hasAccess = await Resource.checkPermission(id, userId, 'view');
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      const resource = await Resource.findById(id);
      const userNotes = await UserNote.findByResourceAndUser(id, userId);
      const summary = await AISummary.findByResource(id, 'brief');

      // Track export
      await db('resource_usage').insert({
        user_id: userId,
        resource_id: id,
        action: 'export',
        metadata: { format }
      });

      // For now, return JSON. In production, generate PDF/Word doc
      res.json({
        success: true,
        data: {
          resource: {
            title: resource.title,
            author: resource.author,
            category: resource.category
          },
          user_notes: userNotes,
          ai_summary: summary
        },
        message: `Export in ${format} format would be generated here`
      });
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export content'
      });
    }
  },

  // Create resource (admin only)
  async createResource(req, res) {
    try {
      const { title, description, category, language, tags, author, isPublic = false } = req.body;
      const userId = req.user.userId;

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'File is required'
        });
      }

      // Create resource record
      const resourceId = await Resource.create({
        title,
        description,
        category,
        language,
        tags: tags ? JSON.stringify(tags) : null,
        author,
        file_path: req.file.path,
        file_name: req.file.filename,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        uploaded_by: userId,
        is_public: isPublic,
        chapter_id: req.user.chapter_id
      });

      const resource = await Resource.findById(resourceId);

      // Track resource creation
      await db('resource_usage').insert({
        user_id: userId,
        resource_id: resourceId,
        action: 'create',
        metadata: { timestamp: new Date() }
      });

      res.status(201).json({
        success: true,
        message: 'Resource created successfully',
        data: { resource }
      });
    } catch (error) {
      console.error('Create resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create resource'
      });
    }
  },

  // Update resource (admin only)
  async updateResource(req, res) {
    try {
      const { id } = req.params;
      const { title, description, category, language, tags, author, isPublic } = req.body;
      const userId = req.user.userId;

      // Check if resource exists and user has permission
      const existingResource = await Resource.findById(id);
      if (!existingResource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Update resource
      await Resource.update(id, {
        title,
        description,
        category,
        language,
        tags: tags ? JSON.stringify(tags) : null,
        author,
        is_public: isPublic,
        updated_by: userId,
        updated_at: new Date()
      });

      const updatedResource = await Resource.findById(id);

      // Track resource update
      await db('resource_usage').insert({
        user_id: userId,
        resource_id: id,
        action: 'update',
        metadata: { timestamp: new Date() }
      });

      res.json({
        success: true,
        message: 'Resource updated successfully',
        data: { resource: updatedResource }
      });
    } catch (error) {
      console.error('Update resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update resource'
      });
    }
  },

  // Delete resource (admin only)
  async deleteResource(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Check if resource exists
      const existingResource = await Resource.findById(id);
      if (!existingResource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Delete resource
      await Resource.delete(id);

      // Track resource deletion
      await db('resource_usage').insert({
        user_id: userId,
        resource_id: id,
        action: 'delete',
        metadata: { timestamp: new Date() }
      });

      res.json({
        success: true,
        message: 'Resource deleted successfully'
      });
    } catch (error) {
      console.error('Delete resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete resource'
      });
    }
  }
};

module.exports = resourceController;