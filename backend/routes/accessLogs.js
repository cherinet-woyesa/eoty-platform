const express = require('express');
const router = express.Router();
const accessLogController = require('../controllers/accessLogController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin());

// Get access logs with filtering
router.get('/', accessLogController.getAccessLogs);

// Get access denial statistics
router.get('/stats', accessLogController.getAccessDenialStats);

// Get suspicious access patterns
router.get('/suspicious', accessLogController.getSuspiciousPatterns);

// Clean up old logs
router.delete('/cleanup', accessLogController.cleanupOldLogs);

module.exports = router;
