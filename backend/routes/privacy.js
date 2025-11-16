// backend/routes/privacy.js
// Privacy Compliance Routes - REQUIREMENT: No sensitive data retention

const express = require('express');
const router = express.Router();
const privacyController = require('../controllers/privacyController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/retention-status', privacyController.getRetentionStatus);
router.post('/anonymize/:userId', privacyController.anonymizeUserData);
router.post('/delete-expired', privacyController.deleteExpiredData);

module.exports = router;


