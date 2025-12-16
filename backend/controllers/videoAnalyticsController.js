const db = require('../config/database');
const videoAnalyticsService = require('../services/videoAnalyticsService');

/**
 * GET /api/video-analytics/lessons/:lessonId/heatmap
 * Returns watch heatmap data for a lesson
 */
exports.getLessonHeatmap = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { segments = 100 } = req.query;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Verify lesson exists and belongs to requesting teacher (unless admin)
    const lesson = await db('lessons')
      .join('courses', 'lessons.course_id', 'courses.id')
      .where('lessons.id', lessonId)
      .select('lessons.id', 'courses.created_by as teacher_id')
      .first();

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    if (userRole !== 'admin' && lesson.teacher_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this heatmap'
      });
    }

    const heatmap = await videoAnalyticsService.getLessonHeatmap(
      parseInt(lessonId, 10),
      {
        segments: segments ? parseInt(segments, 10) : 100
      }
    );

    return res.json({
      success: true,
      data: heatmap
    });
  } catch (error) {
    console.error('Get lesson heatmap error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch heatmap data',
      error: error.message
    });
  }
};

