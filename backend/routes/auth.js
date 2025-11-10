const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);

// Protected routes
router.get('/me', authenticateToken, authController.getCurrentUser);
router.get('/permissions', authenticateToken, authController.getUserPermissions);
router.get('/validate-token', authenticateToken, (req, res) => {
  res.status(200).json({ success: true, message: 'Token is valid' });
});

module.exports = router;