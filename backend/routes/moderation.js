// backend/routes/moderation.js - NEW FILE
const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// All routes require moderator or admin role
router.use(authenticateToken);
router.use(requireRole(['moderator', 'admin']));

// Escalation management
router.get('/escalations/pending', moderationController.getPendingEscalations);
router.post('/escalations/:escalationId/resolve', moderationController.resolveEscalation);
router.post('/escalations/bulk-resolve', moderationController.bulkResolveEscalations);

// Analytics and history
router.get('/stats', moderationController.getModerationStats);
router.get('/users/:userId/history', moderationController.getUserModerationHistory);
router.get('/auto-moderation-logs', moderationController.getAutoModerationLogs);

// Settings
router.post('/settings', moderationController.updateModerationSettings);

module.exports = router;