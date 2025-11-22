const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { contentUpload, handleGCSUpload } = require('../middleware/gcs-upload');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/rbac');

// All admin routes require authentication and admin privileges
router.use(authenticateToken, requireAdmin());

// User Management
// Requires admin role (already enforced by router.use above)
router.post('/users', requirePermission('user:create'), adminController.createUser);
router.get('/users', requirePermission('user:view'), adminController.getUsers);
router.put('/users', requirePermission('user:manage'), adminController.updateUser);
router.put('/users/role', requirePermission('user:manage'), adminController.updateUserRole);
router.put('/users/status', requirePermission('user:manage'), adminController.updateUserStatus);

// Content Upload Management
router.get('/uploads', requirePermission('content:view'), adminController.getUploadQueue);
router.post('/uploads', requirePermission('content:create'), contentUpload.single('file'), handleGCSUpload('edu-platform-videos'), adminController.uploadContent);
router.post('/uploads/:uploadId/review', requirePermission('content:moderate'), adminController.approveContent);
// FR5: Upload Management Enhancements
router.get('/uploads/:uploadId/preview', requirePermission('content:view'), adminController.getUploadPreview);
router.post('/uploads/:uploadId/retry', requirePermission('content:create'), adminController.retryUpload);

// Content Moderation
router.get('/moderation/flagged', requirePermission('content:moderate'), adminController.getFlaggedContent);
router.post('/moderation/flagged/:flagId/review', requirePermission('content:moderate'), adminController.reviewFlaggedContent);

// Forum Moderation
router.get('/forum-reports', requirePermission('content:moderate'), adminController.getForumReports);
router.post('/forum-reports/:reportId/moderate', requirePermission('content:moderate'), adminController.moderateForumReport);
// FR5: Moderation Tools Enhancements
router.post('/users/:userId/ban', requirePermission('user:manage'), adminController.banUser);
router.post('/users/:userId/unban', requirePermission('user:manage'), adminController.unbanUser);
router.post('/posts/:postId/ban', requirePermission('content:moderate'), adminController.banPost);
router.post('/posts/:postId/unban', requirePermission('content:moderate'), adminController.unbanPost);
router.put('/content/:contentType/:contentId/edit', requirePermission('content:manage'), adminController.editContent);

// AI Content Moderation
router.get('/moderation/ai/pending', requirePermission('content:moderate'), adminController.getPendingAIModeration);
router.post('/moderation/ai/:itemId/review', requirePermission('content:moderate'), adminController.reviewAIModeration);
router.get('/moderation/ai/stats', requirePermission('content:view'), adminController.getModerationStats);

// Moderation escalation routes (REQUIREMENT: Moderator workflow)
router.get('/moderation/escalations', requirePermission('content:moderate'), adminController.getModerationEscalations);
router.post('/moderation/escalations/:escalationId/resolve', requirePermission('content:moderate'), adminController.resolveEscalation);
router.get('/moderation/notifications', requirePermission('content:view'), adminController.getModeratorNotifications);

// Analytics Dashboard
router.get('/analytics', requirePermission('analytics:view'), adminController.getAnalytics);
// FR5: Analytics Enhancements
router.get('/analytics/retention', requirePermission('analytics:view'), adminController.getRetentionMetrics);
router.post('/analytics/snapshots/:snapshotId/verify', requirePermission('analytics:view'), adminController.verifyDashboardAccuracy);
router.get('/analytics/export', requirePermission('data:export'), adminController.exportUsageData);

// Admin Statistics
router.get('/stats', requirePermission('analytics:view'), adminController.getStats);

// Content Tagging
router.get('/tags', requirePermission('content:view'), adminController.getTags);
router.post('/tags', requirePermission('content:manage'), adminController.createTag);
router.post('/tags/content', requirePermission('content:manage'), adminController.tagContent);

// Audit Logs
router.get('/audit', requirePermission('audit:view'), adminController.getAuditLogs);
// FR5: Audit & Anomaly Detection
router.get('/anomalies', requirePermission('audit:view'), adminController.getAnomalies);

// Data Export
router.get('/export', requirePermission('data:export'), adminController.exportData);

// Teacher Applications
router.get('/teacher-applications', requirePermission('user:view'), adminController.getTeacherApplications);
router.get('/teacher-applications/:applicationId', requirePermission('user:view'), adminController.getTeacherApplication);
router.post('/teacher-applications/:applicationId/approve', requirePermission('user:manage'), adminController.approveTeacherApplication);
router.post('/teacher-applications/:applicationId/reject', requirePermission('user:manage'), adminController.rejectTeacherApplication);

// Roles & Permissions Management
router.get('/permissions', requirePermission('system:admin'), adminController.getPermissions);
router.get('/role-permissions', requirePermission('system:admin'), adminController.getRolePermissions);
router.post('/role-permissions', requirePermission('system:admin'), adminController.addRolePermission);
router.delete('/role-permissions', requirePermission('system:admin'), adminController.removeRolePermission);

module.exports = router;