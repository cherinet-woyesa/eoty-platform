const express = require('express');
const router = express.Router();
const systemConfigController = require('../controllers/systemConfigController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const {
  validateCategory,
  validateLevel,
  validateDuration,
  validateTag,
  validateChapter,
  validateBulkAction,
  validateReorder,
  validateMergeTags,
  ensureActiveLevelExists
} = require('../middleware/systemConfigValidation');
const { bulkOperationLimiter } = require('../middleware/rateLimiter');

// ============================================================================
// PUBLIC / AUTHENTICATED ROUTES (Read-only)
// ============================================================================

// Allow any authenticated user (teachers/students) to read configuration
router.get('/categories', authenticateToken, systemConfigController.getCategories);
router.get('/levels', authenticateToken, systemConfigController.getLevels);
router.get('/durations', authenticateToken, systemConfigController.getDurations);
router.get('/tags', authenticateToken, systemConfigController.getTags);
router.get('/chapters', authenticateToken, systemConfigController.getChapters);
router.get('/languages', authenticateToken, systemConfigController.getLanguages);

// ============================================================================
// ADMIN ONLY ROUTES (Mutations & Metrics)
// ============================================================================

// All subsequent routes require admin authentication
router.use(authenticateToken, requireAdmin());

// ============================================================================
// DASHBOARD & METRICS
// ============================================================================

router.get('/metrics', systemConfigController.getMetrics);

// ============================================================================
// CATEGORIES
// ============================================================================

// router.get('/categories', systemConfigController.getCategories); // Moved up
router.post('/categories', validateCategory, systemConfigController.createCategory);
router.put('/categories/:id', validateCategory, systemConfigController.updateCategory);
router.delete('/categories/:id', systemConfigController.deleteCategory);
router.post('/categories/bulk', bulkOperationLimiter, validateBulkAction, systemConfigController.bulkActionCategories);
router.post('/categories/reorder', validateReorder, systemConfigController.reorderCategories);

// ============================================================================
// LEVELS
// ============================================================================

// router.get('/levels', systemConfigController.getLevels); // Moved up
router.post('/levels', validateLevel, systemConfigController.createLevel);
router.put('/levels/:id', validateLevel, ensureActiveLevelExists, systemConfigController.updateLevel);
router.delete('/levels/:id', systemConfigController.deleteLevel);
router.post('/levels/bulk', bulkOperationLimiter, validateBulkAction, systemConfigController.bulkActionLevels);
router.post('/levels/reorder', validateReorder, systemConfigController.reorderLevels);

// ============================================================================
// DURATIONS
// ============================================================================

// router.get('/durations', systemConfigController.getDurations); // Moved up
router.post('/durations', validateDuration, systemConfigController.createDuration);
router.put('/durations/:id', validateDuration, systemConfigController.updateDuration);
router.delete('/durations/:id', systemConfigController.deleteDuration);
router.post('/durations/bulk', bulkOperationLimiter, validateBulkAction, systemConfigController.bulkActionDurations);

// ============================================================================
// TAGS (Enhanced)
// ============================================================================

// router.get('/tags', systemConfigController.getTags); // Moved up
router.post('/tags', validateTag, systemConfigController.createTag);
router.put('/tags/:id', validateTag, systemConfigController.updateTag);
router.delete('/tags/:id', systemConfigController.deleteTag);
router.post('/tags/bulk', bulkOperationLimiter, validateBulkAction, systemConfigController.bulkActionTags);
router.post('/tags/merge', validateMergeTags, systemConfigController.mergeTags);

// ============================================================================
// CHAPTERS (Enhanced)
// ============================================================================

// router.get('/chapters', systemConfigController.getChapters); // Moved up
router.post('/chapters', validateChapter, systemConfigController.createChapter);
router.put('/chapters/:id', validateChapter, systemConfigController.updateChapter);
router.delete('/chapters/:id', systemConfigController.deleteChapter);
router.post('/chapters/bulk', bulkOperationLimiter, validateBulkAction, systemConfigController.bulkActionChapters);

// ============================================================================
// AUDIT LOGS
// ============================================================================

router.get('/audit', systemConfigController.getAuditLogs);

// ============================================================================
// USAGE ANALYTICS
// ============================================================================

router.get('/:entityType/:id/usage', systemConfigController.getUsageDetails);

module.exports = router;
