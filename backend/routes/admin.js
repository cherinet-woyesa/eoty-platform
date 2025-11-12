const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/rbac');

// All admin routes require authentication and admin privileges
router.use(authenticateToken, requireAdmin());

// User Management
// Requires admin role (already enforced by router.use above)
router.post('/users', requirePermission('user:create'), adminController.createUser);
router.get('/users', requirePermission('user:view'), adminController.getUsers);
router.put('/users/role', requirePermission('user:manage'), adminController.updateUserRole);
router.put('/users/status', requirePermission('user:manage'), adminController.updateUserStatus);

// Content Upload Management
router.get('/uploads', requirePermission('content:view'), adminController.getUploadQueue);
router.post('/uploads', requirePermission('content:create'), upload.single('file'), adminController.uploadContent);
router.post('/uploads/:uploadId/review', requirePermission('content:moderate'), adminController.approveContent);

// Content Moderation
router.get('/moderation/flagged', requirePermission('content:moderate'), adminController.getFlaggedContent);
router.post('/moderation/flagged/:flagId/review', requirePermission('content:moderate'), adminController.reviewFlaggedContent);

// AI Content Moderation
router.get('/moderation/ai/pending', requirePermission('content:moderate'), adminController.getPendingAIModeration);
router.post('/moderation/ai/:itemId/review', requirePermission('content:moderate'), adminController.reviewAIModeration);
router.get('/moderation/ai/stats', requirePermission('content:view'), adminController.getModerationStats);

// Analytics Dashboard
router.get('/analytics', requirePermission('analytics:view'), adminController.getAnalytics);

// Admin Statistics
router.get('/stats', requirePermission('analytics:view'), adminController.getStats);

// Content Tagging
router.get('/tags', requirePermission('content:view'), adminController.getTags);
router.post('/tags', requirePermission('content:manage'), adminController.createTag);
router.post('/tags/content', requirePermission('content:manage'), adminController.tagContent);

// Audit Logs
router.get('/audit', requirePermission('audit:view'), adminController.getAuditLogs);

// Data Export
router.get('/export', requirePermission('data:export'), adminController.exportData);

// Teacher Applications
router.get('/teacher-applications', requirePermission('user:view'), adminController.getTeacherApplications);
router.get('/teacher-applications/:applicationId', requirePermission('user:view'), adminController.getTeacherApplication);
router.post('/teacher-applications/:applicationId/approve', requirePermission('user:manage'), adminController.approveTeacherApplication);
router.post('/teacher-applications/:applicationId/reject', requirePermission('user:manage'), adminController.rejectTeacherApplication);

module.exports = router;