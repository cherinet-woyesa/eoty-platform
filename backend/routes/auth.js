const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}-${file.originalname}`);
  }
});

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
router.post('/google-login', authController.googleLogin);
router.post('/facebook-login', authController.facebookLogin); // FR7: Facebook OAuth

// Protected routes
router.get('/me', authenticateToken, authController.getCurrentUser);
router.get('/permissions', authenticateToken, authController.getUserPermissions);
router.put('/profile', authenticateToken, authController.updateUserProfile);
router.post('/upload-profile-image', authenticateToken, upload.single('profileImage'), authController.uploadProfileImage);
router.post('/logout', authenticateToken, authController.logout);
router.get('/activity-logs', authenticateToken, authController.getActivityLogs);
router.get('/abnormal-activity-alerts', authenticateToken, authController.getAbnormalActivityAlerts);
router.get('/validate-token', authenticateToken, (req, res) => {
  res.status(200).json({ success: true, message: 'Token is valid' });
});

module.exports = router;