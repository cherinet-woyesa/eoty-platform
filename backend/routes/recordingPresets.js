const express = require('express');
const router = express.Router();
const recordingPresetsController = require('../controllers/recordingPresetsController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticateToken);

// GET /api/recording-presets - Get all presets for current user
router.get('/', requirePermission('lesson:create'), recordingPresetsController.getPresets);

// GET /api/recording-presets/default - Get default preset
router.get('/default', requirePermission('lesson:create'), recordingPresetsController.getDefaultPreset);

// GET /api/recording-presets/:presetId - Get a specific preset
router.get('/:presetId', requirePermission('lesson:create'), recordingPresetsController.getPreset);

// POST /api/recording-presets - Create a new preset
router.post('/', requirePermission('lesson:create'), recordingPresetsController.createPreset);

// PUT /api/recording-presets/:presetId - Update a preset
router.put('/:presetId', requirePermission('lesson:create'), recordingPresetsController.updatePreset);

// DELETE /api/recording-presets/:presetId - Delete a preset
router.delete('/:presetId', requirePermission('lesson:create'), recordingPresetsController.deletePreset);

module.exports = router;

