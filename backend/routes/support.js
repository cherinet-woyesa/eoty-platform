const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/support/contact
// Allow both authenticated and unauthenticated users (optional, but good for login issues)
// For now, we'll use authenticateToken but make it optional if needed, 
// or just require it as per the frontend implementation which seems to be from a logged-in dashboard.
router.post('/contact', authenticateToken, supportController.contactSupport);

// GET /api/support/tickets
// Only admins should access this
router.get('/tickets', authenticateToken, supportController.getTickets);

// POST /api/support/tickets/:ticketId/reply
// Only admins should access this
router.post('/tickets/:ticketId/reply', authenticateToken, supportController.replyToTicket);

module.exports = router;
