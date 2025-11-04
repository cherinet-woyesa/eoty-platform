const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/betterAuthMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);

// Protected routes
router.get('/me', requireAuth, authController.getCurrentUser);
router.get('/permissions', requireAuth, authController.getUserPermissions);

module.exports = router;