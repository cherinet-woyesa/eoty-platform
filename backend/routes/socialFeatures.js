// backend/routes/socialFeatures.js
// Social Features Routes - REQUIREMENT: FR4

const express = require('express');
const router = express.Router();
const socialFeaturesController = require('../controllers/socialFeaturesController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Public endpoint for forum uptime
router.get('/forum-uptime', socialFeaturesController.getForumUptimeStatus);

// Admin-only endpoints
router.post('/auto-archive', authenticateToken, requireRole(['admin']), socialFeaturesController.triggerAutoArchive);

module.exports = router;


