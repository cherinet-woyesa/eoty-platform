const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/ask', aiController.askQuestion);
router.get('/conversation', aiController.getConversationHistory);
router.post('/conversation/clear', aiController.clearConversation);

module.exports = router;