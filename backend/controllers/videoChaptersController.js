const videoChaptersService = require('../services/videoChaptersService');
const db = require('../config/database');

const videoChaptersController = {
  /**
   * Get all chapters for a lesson
   * GET /api/lessons/:lessonId/chapters
   */
  async getChapters(req, res) {
    try {
      const { lessonId } = req.params;
      const chapters = await videoChaptersService.getChaptersByLesson(parseInt(lessonId));
      
      res.json({
        success: true,
        data: { chapters }
      });
    } catch (error) {
      console.error('Error getting chapters:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chapters.'
      });
    }
  },

  /**
   * Create a new chapter
   * POST /api/lessons/:lessonId/chapters
   */
  async createChapter(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;
      
      // Verify user has permission (teacher or admin)
      const lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('l.id', lessonId)
        .select('c.created_by')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found.'
        });
      }

      // Check if user is the course creator or admin
      if (lesson.created_by !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create chapters for this lesson.'
        });
      }

      const chapter = await videoChaptersService.createChapter(parseInt(lessonId), req.body);
      
      res.status(201).json({
        success: true,
        message: 'Chapter created successfully.',
        data: { chapter }
      });
    } catch (error) {
      console.error('Error creating chapter:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create chapter.'
      });
    }
  },

  /**
   * Update a chapter
   * PUT /api/chapters/:chapterId
   */
  async updateChapter(req, res) {
    try {
      const { chapterId } = req.params;
      const userId = req.user.userId;

      // Verify user has permission
      const chapter = await videoChaptersService.getChapterById(parseInt(chapterId));
      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found.'
        });
      }

      const lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('l.id', chapter.lesson_id)
        .select('c.created_by')
        .first();

      if (lesson.created_by !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this chapter.'
        });
      }

      const updatedChapter = await videoChaptersService.updateChapter(parseInt(chapterId), req.body);
      
      res.json({
        success: true,
        message: 'Chapter updated successfully.',
        data: { chapter: updatedChapter }
      });
    } catch (error) {
      console.error('Error updating chapter:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update chapter.'
      });
    }
  },

  /**
   * Delete a chapter
   * DELETE /api/chapters/:chapterId
   */
  async deleteChapter(req, res) {
    try {
      const { chapterId } = req.params;
      const userId = req.user.userId;

      // Verify user has permission
      const chapter = await videoChaptersService.getChapterById(parseInt(chapterId));
      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found.'
        });
      }

      const lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('l.id', chapter.lesson_id)
        .select('c.created_by')
        .first();

      if (lesson.created_by !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this chapter.'
        });
      }

      await videoChaptersService.deleteChapter(parseInt(chapterId));
      
      res.json({
        success: true,
        message: 'Chapter deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting chapter:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete chapter.'
      });
    }
  },

  /**
   * Reorder chapters
   * POST /api/lessons/:lessonId/chapters/reorder
   */
  async reorderChapters(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;
      const { chapterIds } = req.body;

      if (!Array.isArray(chapterIds)) {
        return res.status(400).json({
          success: false,
          message: 'chapterIds must be an array.'
        });
      }

      // Verify user has permission
      const lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('l.id', lessonId)
        .select('c.created_by')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found.'
        });
      }

      if (lesson.created_by !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to reorder chapters for this lesson.'
        });
      }

      await videoChaptersService.reorderChapters(parseInt(lessonId), chapterIds);
      
      res.json({
        success: true,
        message: 'Chapters reordered successfully.'
      });
    } catch (error) {
      console.error('Error reordering chapters:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder chapters.'
      });
    }
  }
};

module.exports = videoChaptersController;


