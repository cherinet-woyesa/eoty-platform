const express = require('express');
const router = express.Router();
const subtitleController = require('../controllers/subtitleController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const {
  validateSubtitleUpload,
  validateSubtitleDelete,
  validateSubtitleGet
} = require('../middleware/subtitleValidation');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/courses/lessons/:lessonId/subtitles
 * Get all subtitles for a lesson
 * Accessible by: students (enrolled), teachers (course owner), admins
 */
router.get(
  '/lessons/:lessonId/subtitles',
  requirePermission('lesson:view'),
  validateSubtitleGet,
  subtitleController.getSubtitles
);

/**
 * POST /api/courses/lessons/:lessonId/subtitles
 * Upload a subtitle file for a lesson
 * Accessible by: teachers (course owner), admins
 */
router.post(
  '/lessons/:lessonId/subtitles',
  requirePermission('lesson:edit'),
  subtitleController.uploadMiddleware,
  validateSubtitleUpload,
  subtitleController.uploadSubtitle
);

/**
 * DELETE /api/courses/lessons/:lessonId/subtitles/:subtitleId
 * Delete a subtitle
 * Accessible by: teachers (course owner), admins
 */
router.delete(
  '/lessons/:lessonId/subtitles/:subtitleId',
  requirePermission('lesson:delete'),
  validateSubtitleDelete,
  subtitleController.deleteSubtitle
);

/**
 * GET /api/courses/lessons/:lessonId/subtitles/verify
 * Verify subtitle language support (REQUIREMENT: Verify all required languages)
 * Accessible by: teachers (course owner), admins
 */
router.get(
  '/lessons/:lessonId/subtitles/verify',
  requirePermission('lesson:view'),
  subtitleController.verifyLanguageSupport
);

/**
 * GET /api/subtitles/supported-languages
 * Get list of supported languages (REQUIREMENT: Verify all required languages)
 * Accessible by: all authenticated users
 */
router.get(
  '/supported-languages',
  subtitleController.getSupportedLanguages
);

module.exports = router;
