const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const passport = require('passport');

// Configure multer for file uploads
// Use memory storage for Cloud Run compatibility (files processed in memory then uploaded to GCS)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-2fa', authController.verify2FA);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  authController.googleCallback
);
router.post('/google/callback', (req, res, next) => {
  console.log('Received POST /google/callback', req.body);
  next();
}, authController.googleCallback);

// Facebook OAuth routes
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login', session: false }),
  authController.facebookCallback
);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-reset-token', authController.verifyResetToken);

// Email verification routes
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);

// Protected routes
router.get('/me', authenticateToken, authController.getCurrentUser);
router.get('/permissions', authenticateToken, authController.getUserPermissions);
router.put('/profile', authenticateToken, authController.updateUserProfile);
router.post('/upload-profile-image', authenticateToken, upload.single('profileImage'), authController.uploadProfileImage);

// Security routes
router.post('/change-password', authenticateToken, authController.changePassword);
router.delete('/delete-account', authenticateToken, authController.deleteAccount);

// Notification preferences
router.get('/notification-preferences', authenticateToken, authController.getNotificationPreferences);
router.put('/notification-preferences', authenticateToken, authController.updateNotificationPreferences);
router.post('/logout', authenticateToken, authController.logout);
router.get('/activity-logs', authenticateToken, authController.getActivityLogs);
router.get('/abnormal-activity-alerts', authenticateToken, authController.getAbnormalActivityAlerts);
router.get('/validate-token', authenticateToken, (req, res) => {
  res.status(200).json({ success: true, message: 'Token is valid' });
});

module.exports = router;
