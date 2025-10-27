const db = require('../config/database');

const chapterController = {
  // Get all active chapters
  async getAllChapters(req, res) {
    try {
      const chapters = await db('chapters')
        .where('is_active', true)
        .select('id', 'name', 'location', 'description')
        .orderBy('name');

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
        .select('id', 'name', 'location', 'description')
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
  }
};

module.exports = chapterController;