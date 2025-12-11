const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const linkedAccountsController = require('../controllers/linkedAccountsController');

// Get linked accounts for current user
router.get('/', authenticateToken, linkedAccountsController.listLinkedAccounts);

// Connect a linked account (placeholder; expects provider + externalId/token)
router.post('/connect', authenticateToken, linkedAccountsController.connectAccount);

// Disconnect a linked account
router.post('/disconnect', authenticateToken, linkedAccountsController.disconnectAccount);

module.exports = router;

