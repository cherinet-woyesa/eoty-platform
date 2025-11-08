/**
 * Video Analytics Routes
 * Endpoints for video analytics data (Mux + Platform combined)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const videoAnalyticsService = require('../services/videoAnalyticsService');
const db = require('../config/database');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/video-analytics/lessons/:lessonId
 * Get analytics for a specific lesson
 */
router.get('/lessons/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { timeframe = '7:days', forceRefresh = 'false' } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check permission
    const lesson = await db('lessons')
      .join('courses', 'lessons.course_id', 'courses.id')
      .where('lessons.id', lessonId)
      .select('lessons.*', 'courses.created_by as teacher_id')
      .first();

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Only teacher who owns the course or admin can view analytics
    if (userRole !== 'admin' && lesson.teacher_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view analytics for this lesson'
      });
    }

    const analytics = await videoAnalyticsService.syncLessonAnalytics(
      parseInt(lessonId),
      {
        timeframe,
        forceRefresh: forceRefresh === 'true'
      }
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get lesson analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lesson analytics',
      error: error.message
    });
  }
});

/**
 * GET /api/video-analytics/courses/:courseId
 * Get aggregated analytics for all lessons in a course
 */
router.get('/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { timeframe = '7:days' } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check permission
    const course = await db('courses')
      .where('id', courseId)
      .select('*')
      .first();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Only teacher who owns the course or admin can view analytics
    if (userRole !== 'admin' && course.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view analytics for this course'
      });
    }

    const analytics = await videoAnalyticsService.getCourseAnalytics(
      parseInt(courseId),
      { timeframe }
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get course analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course analytics',
      error: error.message
    });
  }
});

/**
 * GET /api/video-analytics/teacher/dashboard
 * Get teacher dashboard analytics (all courses)
 */
router.get('/teacher/dashboard', requirePermission('course:create'), async (req, res) => {
  try {
    const { timeframe = '7:days', limit = 10 } = req.query;
    const userId = req.user.userId;

    const analytics = await videoAnalyticsService.getTeacherDashboardAnalytics(
      userId,
      { timeframe, limit: parseInt(limit) }
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get teacher dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher dashboard analytics',
      error: error.message
    });
  }
});

/**
 * POST /api/video-analytics/lessons/bulk
 * Get analytics for multiple lessons
 */
router.post('/lessons/bulk', async (req, res) => {
  try {
    const { lessonIds, timeframe = '7:days' } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'lessonIds array is required'
      });
    }

    // Check permission for all lessons
    const lessons = await db('lessons')
      .join('courses', 'lessons.course_id', 'courses.id')
      .whereIn('lessons.id', lessonIds)
      .select('lessons.id', 'courses.created_by as teacher_id');

    // Verify user has permission for all lessons
    if (userRole !== 'admin') {
      const unauthorized = lessons.some(l => l.teacher_id !== userId);
      if (unauthorized) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view analytics for some of these lessons'
        });
      }
    }

    const analytics = await videoAnalyticsService.getBulkLessonAnalytics(
      lessonIds.map(id => parseInt(id)),
      { timeframe }
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get bulk lesson analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bulk lesson analytics',
      error: error.message
    });
  }
});

module.exports = router;
