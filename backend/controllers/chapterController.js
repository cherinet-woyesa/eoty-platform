/**
 * FR7: Chapter Controller
 * REQUIREMENT: Multi-city/chapter membership, location/topic based
 */

const db = require('../config/database');
const chapterService = require('../services/chapterService');

const chapterController = {
  // Get all active chapters (REQUIREMENT: Location/topic based)
  async getAllChapters(req, res) {
    try {
      const { country, city, region, topic } = req.query;
      
      const chapters = await chapterService.getChapters({
        country,
        city,
        region,
        topic
      });

      res.json({
        success: true,
        data: { chapters }
      });
    } catch (error) {
      console.error('Get chapters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chapters'
      });
    }
  },

  // Get chapter by ID
  async getChapterById(req, res) {
    try {
      const { id } = req.params;
      const chapter = await db('chapters')
        .where({ id, is_active: true })
        .first();

      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found'
        });
      }

      res.json({
        success: true,
        data: { chapter }
      });
    } catch (error) {
      console.error('Get chapter error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chapter'
      });
    }
  },

  // Get user's chapters (REQUIREMENT: Multi-chapter membership)
  async getUserChapters(req, res) {
    try {
      const userId = req.user.userId;
      const chapters = await chapterService.getUserChapters(userId);

      res.json({
        success: true,
        data: { chapters }
      });
    } catch (error) {
      console.error('Get user chapters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user chapters'
      });
    }
  },

  // Join a chapter (REQUIREMENT: Multi-chapter membership)
  async joinChapter(req, res) {
    try {
      const userId = req.user.userId;
      const { chapter_id, role = 'member', set_as_primary = false } = req.body;

      if (!chapter_id) {
        return res.status(400).json({
          success: false,
          message: 'Chapter ID is required'
        });
      }

      const userChapter = await chapterService.joinChapter(
        userId,
        chapter_id,
        role,
        set_as_primary
      );

      res.json({
        success: true,
        data: { userChapter },
        message: 'Successfully joined chapter'
      });
    } catch (error) {
      console.error('Join chapter error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to join chapter'
      });
    }
  },

  // Leave a chapter
  async leaveChapter(req, res) {
    try {
      const userId = req.user.userId;
      const { chapter_id } = req.body;

      if (!chapter_id) {
        return res.status(400).json({
          success: false,
          message: 'Chapter ID is required'
        });
      }

      await chapterService.leaveChapter(userId, chapter_id);

      res.json({
        success: true,
        message: 'Successfully left chapter'
      });
    } catch (error) {
      console.error('Leave chapter error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to leave chapter'
      });
    }
  },

  // Set primary chapter
  async setPrimaryChapter(req, res) {
    try {
      const userId = req.user.userId;
      const { chapter_id } = req.body;

      if (!chapter_id) {
        return res.status(400).json({
          success: false,
          message: 'Chapter ID is required'
        });
      }

      await chapterService.setPrimaryChapter(userId, chapter_id);

      res.json({
        success: true,
        message: 'Primary chapter updated'
      });
    } catch (error) {
      console.error('Set primary chapter error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to set primary chapter'
      });
    }
  },

  // Search chapters (REQUIREMENT: Location/topic based)
  async searchChapters(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search term is required'
        });
      }

      const chapters = await chapterService.searchChapters(q);

      res.json({
        success: true,
        data: { chapters }
      });
    } catch (error) {
      console.error('Search chapters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search chapters'
      });
    }
  }
};

module.exports = chapterController;