const express = require('express');
const router = express.Router();
const uptimeController = require('../controllers/uptimeController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Public health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Protected uptime monitoring endpoints (admin only)
router.use(authenticateToken);
router.use(requireRole(['admin', 'chapter_admin']));

router.get('/stats', uptimeController.getUptimeStats);
router.post('/health-check', uptimeController.performHealthCheck);
router.get('/alerts', uptimeController.getActiveAlerts);
router.post('/alerts/:alertId/resolve', uptimeController.resolveAlert);

module.exports = router;
