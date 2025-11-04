const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { requireAuth } = require('../middleware/betterAuthMiddleware');

router.use(requireAuth);

router.post('/ask', aiController.askQuestion);
router.get('/conversation', aiController.getConversationHistory);
router.post('/conversation/clear', aiController.clearConversation);

// NEW: Moderation report, telemetry, and summary endpoints
router.post('/report', aiController.reportQuestion);
router.post('/telemetry', aiController.telemetry);
router.post('/summary', aiController.summary);

module.exports = router;