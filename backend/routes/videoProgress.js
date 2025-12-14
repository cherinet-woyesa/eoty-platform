const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const db = require('../config/database');

/**
 * Get video progress for a specific lesson
 * GET /api/video-progress/:lessonId
 */
router.get('/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    const progress = await db('video_progress')
      .where({ user_id: userId, lesson_id: lessonId })
      .first();

    if (!progress) {
      return res.json({
        success: true,
        data: { progress: null }
      });
    }

    res.json({
      success: true,
      data: { progress }
    });
  } catch (error) {
    console.error('Get video progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video progress'
    });
  }
});

/**
 * Update or create video progress
 * POST /api/video-progress/:lessonId
 */
router.post('/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    const { current_time, duration, completion_percentage, completed } = req.body;

    // Validate input
    if (typeof current_time !== 'number' || typeof duration !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Invalid progress data'
      });
    }

    const existingProgress = await db('video_progress')
      .where({ user_id: userId, lesson_id: lessonId })
      .first();

    let progress;
    if (existingProgress) {
      // Update existing progress
      await db('video_progress')
        .where({ user_id: userId, lesson_id: lessonId })
        .update({
          current_time,
          duration,
          completion_percentage: completion_percentage || (current_time / duration) * 100,
          completed: completed !== undefined ? completed : (current_time / duration) >= 0.9,
          watch_count: db.raw('watch_count + 1'),
          last_watched_at: db.fn.now(),
          updated_at: db.fn.now()
        });

      progress = await db('video_progress')
        .where({ user_id: userId, lesson_id: lessonId })
        .first();
    } else {
      // Create new progress
      const [newProgress] = await db('video_progress')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          current_time,
          duration,
          completion_percentage: completion_percentage || (current_time / duration) * 100,
          completed: completed !== undefined ? completed : (current_time / duration) >= 0.9,
          watch_count: 1,
          last_watched_at: db.fn.now()
        })
        .returning('*');

      progress = newProgress;
    }

    res.json({
      success: true,
      data: { progress }
    });
  } catch (error) {
    console.error('Update video progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video progress'
    });
  }
});

/**
 * Mark video as completed
 * POST /api/video-progress/:lessonId/complete
 */
router.post('/:lessonId/complete', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    const existingProgress = await db('video_progress')
      .where({ user_id: userId, lesson_id: lessonId })
      .first();

    if (existingProgress) {
      await db('video_progress')
        .where({ user_id: userId, lesson_id: lessonId })
        .update({
          completion_percentage: 100,
          completed: true,
          updated_at: db.fn.now()
        });
    } else {
      await db('video_progress').insert({
        user_id: userId,
        lesson_id: lessonId,
        current_time: 0,
        duration: 0,
        completion_percentage: 100,
        completed: true,
        watch_count: 1,
        last_watched_at: db.fn.now()
      });
    }

    const progress = await db('video_progress')
      .where({ user_id: userId, lesson_id: lessonId })
      .first();

    res.json({
      success: true,
      data: { progress }
    });
  } catch (error) {
    console.error('Mark video completed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark video as completed'
    });
  }
});

/**
 * Get user video preferences
 * GET /api/video-progress/preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    let preferences = await db('user_video_preferences')
      .where({ user_id: userId })
      .first();

    // Create default preferences if none exist
    if (!preferences) {
      const [newPreferences] = await db('user_video_preferences')
        .insert({
          user_id: userId,
          playback_speed: 1.0,
          preferred_quality: 'auto',
          auto_play_next: true,
          show_captions: false,
          caption_language: 'en'
        })
        .returning('*');

      preferences = newPreferences;
    }

    res.json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    console.error('Get video preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video preferences'
    });
  }
});

/**
 * Update user video preferences
 * PUT /api/video-progress/preferences
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { playback_speed, preferred_quality, auto_play_next, show_captions, caption_language } = req.body;

    const updateData = {};
    if (playback_speed !== undefined) updateData.playback_speed = playback_speed;
    if (preferred_quality !== undefined) updateData.preferred_quality = preferred_quality;
    if (auto_play_next !== undefined) updateData.auto_play_next = auto_play_next;
    if (show_captions !== undefined) updateData.show_captions = show_captions;
    if (caption_language !== undefined) updateData.caption_language = caption_language;
    updateData.updated_at = db.fn.now();

    const existingPreferences = await db('user_video_preferences')
      .where({ user_id: userId })
      .first();

    if (existingPreferences) {
      await db('user_video_preferences')
        .where({ user_id: userId })
        .update(updateData);
    } else {
      await db('user_video_preferences').insert({
        user_id: userId,
        ...updateData
      });
    }

    const preferences = await db('user_video_preferences')
      .where({ user_id: userId })
      .first();

    res.json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    console.error('Update video preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video preferences'
    });
  }
});

/**
 * Get video chapters for a lesson
 * GET /api/video-progress/:lessonId/chapters
 */
router.get('/:lessonId/chapters', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;

    const chapters = await db('video_chapters')
      .where({ lesson_id: lessonId })
      .orderBy('order_index', 'asc');

    res.json({
      success: true,
      data: { chapters }
    });
  } catch (error) {
    console.error('Get video chapters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video chapters'
    });
  }
});

/**
 * Create video chapter (teachers only)
 * POST /api/video-progress/:lessonId/chapters
 */
router.post('/:lessonId/chapters', authenticateToken, requirePermission('content:manage'), async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, description, start_time, end_time, order_index } = req.body;

    if (!title || typeof start_time !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Title and start_time are required'
      });
    }

    // Determine order_index if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined) {
      const maxOrder = await db('video_chapters')
        .where({ lesson_id: lessonId })
        .max('order_index as max')
        .first();
      finalOrderIndex = (maxOrder.max || 0) + 1;
    }

    const [chapter] = await db('video_chapters')
      .insert({
        lesson_id: lessonId,
        title,
        description,
        start_time,
        end_time,
        order_index: finalOrderIndex
      })
      .returning('*');

    res.json({
      success: true,
      data: { chapter }
    });
  } catch (error) {
    console.error('Create video chapter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create video chapter'
    });
  }
});

/**
 * Delete video chapter (teachers only)
 * DELETE /api/video-progress/:lessonId/chapters/:chapterId
 */
router.delete('/:lessonId/chapters/:chapterId', authenticateToken, requirePermission('content:manage'), async (req, res) => {
  try {
    const { lessonId, chapterId } = req.params;

    const deleted = await db('video_chapters')
      .where({ id: chapterId, lesson_id: lessonId })
      .del();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    res.json({
      success: true,
      message: 'Chapter deleted successfully'
    });
  } catch (error) {
    console.error('Delete video chapter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video chapter'
    });
  }
});

module.exports = router;
