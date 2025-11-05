const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All analytics routes require authentication
router.use(authenticateToken);

// Student analytics endpoints
router.get(
  '/courses/:courseId/students',
  requirePermission('course:view'),
  analyticsController.getEnrolledStudents
);

router.get(
  '/courses/:courseId/students/:studentId/progress',
  requirePermission('course:view'),
  analyticsController.getStudentProgress
);

// Engagement analytics
router.get(
  '/courses/:courseId/analytics/engagement',
  requirePermission('course:view'),
  analyticsController.getEngagementAnalytics
);

// Export analytics
router.get(
  '/courses/:courseId/analytics/export',
  requirePermission('course:view'),
  analyticsController.exportAnalytics
);

module.exports = router;
