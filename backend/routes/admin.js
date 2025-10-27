const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// All admin routes require authentication and admin privileges
router.use(authenticateToken, requireAdmin());

// User Management
router.post('/users', adminController.createUser);
router.get('/users', adminController.getUsers);
router.put('/users/role', adminController.updateUserRole);

// Content Upload Management
router.get('/uploads', adminController.getUploadQueue);
router.post('/uploads', adminController.uploadContent);
router.post('/uploads/:uploadId/review', adminController.approveContent);

// Content Moderation
router.get('/moderation/flagged', adminController.getFlaggedContent);
router.post('/moderation/flagged/:flagId/review', adminController.reviewFlaggedContent);

// AI Content Moderation
router.get('/moderation/ai/pending', adminController.getPendingAIModeration);
router.post('/moderation/ai/:itemId/review', adminController.reviewAIModeration);
router.get('/moderation/ai/stats', adminController.getModerationStats);

// Analytics Dashboard
router.get('/analytics', adminController.getAnalytics);

// Content Tagging
router.get('/tags', adminController.getTags);
router.post('/tags', adminController.createTag);
router.post('/tags/content', adminController.tagContent);

// Audit Logs
router.get('/audit', adminController.getAuditLogs);

// Data Export
router.get('/export', adminController.exportData);

module.exports = router;