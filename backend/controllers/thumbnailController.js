const muxService = require('../services/muxService');
const db = require('../config/database');

const thumbnailController = {
  /**
   * Generate thumbnail options for a lesson
   * GET /api/lessons/:lessonId/thumbnails
   */
  async generateThumbnails(req, res) {
    try {
      const { lessonId } = req.params;
      const { count = 9, width = 640, height = 360 } = req.query; // Default: 9 thumbnails

      // Get lesson with Mux info
      const lesson = await db('lessons')
        .where({ id: parseInt(lessonId) })
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found.'
        });
      }

      // Check if lesson has Mux video
      if (!lesson.mux_playback_id || lesson.mux_status !== 'ready') {
        return res.status(400).json({
          success: false,
          message: 'Video is not ready for thumbnail generation.'
        });
      }

      // Get video duration (if available)
      const duration = lesson.duration || 0;
      const thumbnailCount = Math.min(parseInt(count), 20); // Max 20 thumbnails

      // Generate thumbnail URLs at evenly spaced intervals
      const thumbnails = [];
      const interval = duration > 0 ? duration / (thumbnailCount + 1) : 10; // Default 10s intervals

      for (let i = 1; i <= thumbnailCount; i++) {
        const timestamp = Math.floor(interval * i);
        const thumbnailUrl = `https://image.mux.com/${lesson.mux_playback_id}/thumbnail.jpg?width=${width}&height=${height}&time=${timestamp}`;
        
        thumbnails.push({
          id: `thumb_${i}`,
          url: thumbnailUrl,
          timestamp,
          width: parseInt(width),
          height: parseInt(height)
        });
      }

      res.json({
        success: true,
        data: {
          thumbnails,
          playbackId: lesson.mux_playback_id,
          duration
        }
      });
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate thumbnails.'
      });
    }
  },

  /**
   * Update lesson thumbnail
   * PUT /api/lessons/:lessonId/thumbnail
   */
  async updateThumbnail(req, res) {
    try {
      const { lessonId } = req.params;
      const { thumbnailUrl } = req.body;
      const userId = req.user.userId;

      if (!thumbnailUrl) {
        return res.status(400).json({
          success: false,
          message: 'Thumbnail URL is required.'
        });
      }

      // Verify user has permission (teacher or admin)
      const lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('l.id', parseInt(lessonId))
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
          message: 'You do not have permission to update this lesson thumbnail.'
        });
      }

      // Update thumbnail URL
      await db('lessons')
        .where({ id: parseInt(lessonId) })
        .update({
          thumbnail_url: thumbnailUrl,
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Thumbnail updated successfully.',
        data: { thumbnailUrl }
      });
    } catch (error) {
      console.error('Error updating thumbnail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update thumbnail.'
      });
    }
  }
};

module.exports = thumbnailController;

