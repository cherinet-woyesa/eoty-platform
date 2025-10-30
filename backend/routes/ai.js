const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/ask', aiController.askQuestion);
router.get('/conversation', aiController.getConversationHistory);
router.post('/conversation/clear', aiController.clearConversation);

// NEW: Moderation report, telemetry, and summary endpoints
router.post('/report', aiController.reportQuestion);
router.post('/telemetry', aiController.telemetry);
router.post('/summary', aiController.summary);

module.exports = router;