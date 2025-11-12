// backend/controllers/videoNotesController.js
const videoNotesService = require('../services/videoNotesService');

const videoNotesController = {
  /**
   * POST /api/lessons/:lessonId/notes
   * Create a new note or bookmark
   */
  async createNote(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;
      const { content, timestamp, type, color, title, visibility } = req.body;

      // Validate required fields
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Note content is required'
        });
      }

      if (timestamp === undefined || timestamp === null || timestamp < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid timestamp is required'
        });
      }

      const note = await videoNotesService.createNote(
        userId,
        parseInt(lessonId),
        content,
        parseFloat(timestamp),
        type || 'note',
        color || 'default',
        title || null,
        visibility || 'private'
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

  /**
   * GET /api/lessons/:lessonId/notes
   * Get all notes for a lesson (user's notes + public notes)
   */
  async getNotes(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;

      const notes = await videoNotesService.getNotes(userId, parseInt(lessonId));

      res.json({
        success: true,
        data: { notes }
      });
    } catch (error) {
      console.error('Get notes error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve notes'
      });
    }
  },

  /**
   * GET /api/lessons/:lessonId/notes/my
   * Get user's own notes for a lesson
   */
  async getUserNotes(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;

      const notes = await videoNotesService.getUserNotes(userId, parseInt(lessonId));

      res.json({
        success: true,
        data: { notes }
      });
    } catch (error) {
      console.error('Get user notes error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve notes'
      });
    }
  },

  /**
   * PUT /api/lessons/:lessonId/notes/:noteId
   * Update a note
   */
  async updateNote(req, res) {
    try {
      const { lessonId, noteId } = req.params;
      const userId = req.user.userId;
      const updates = req.body;

      const note = await videoNotesService.updateNote(
        parseInt(noteId),
        userId,
        updates
      );

      res.json({
        success: true,
        message: 'Note updated successfully',
        data: { note }
      });
    } catch (error) {
      console.error('Update note error:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update note'
      });
    }
  },

  /**
   * DELETE /api/lessons/:lessonId/notes/:noteId
   * Delete a note
   */
  async deleteNote(req, res) {
    try {
      const { lessonId, noteId } = req.params;
      const userId = req.user.userId;

      await videoNotesService.deleteNote(parseInt(noteId), userId);

      res.json({
        success: true,
        message: 'Note deleted successfully'
      });
    } catch (error) {
      console.error('Delete note error:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete note'
      });
    }
  },

  /**
   * GET /api/lessons/:lessonId/notes/statistics
   * Get note statistics for a lesson
   */
  async getStatistics(req, res) {
    try {
      const { lessonId } = req.params;

      const stats = await videoNotesService.getNoteStatistics(parseInt(lessonId));

      res.json({
        success: true,
        data: { statistics: stats }
      });
    } catch (error) {
      console.error('Get note statistics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve statistics'
      });
    }
  }
};

module.exports = videoNotesController;


