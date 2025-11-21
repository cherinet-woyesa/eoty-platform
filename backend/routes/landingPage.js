const express = require('express');
const router = express.Router();
const landingPageController = require('../controllers/landingPageController');
const { authenticateToken } = require('../middleware/auth');

// Global logging middleware for this route
router.use((req, res, next) => {
  console.log(`🌐 LANDING PAGE ROUTE: ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
  console.log('Body:', req.method !== 'GET' ? JSON.stringify(req.body) : 'N/A');
  next();
});

// Custom admin middleware for landing page
const requireLandingAdmin = (req, res, next) => {
  console.log('🔒 MIDDLEWARE: requireLandingAdmin called');
  console.log('User in request:', req.user ? {
    userId: req.user.userId,
    email: req.user.email,
    role: req.user.role
  } : 'NO USER IN REQUEST');

  if (!req.user) {
    console.log('❌ MIDDLEWARE: No user found in request');
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role === 'admin') {
    console.log('✅ MIDDLEWARE: Admin role verified, proceeding to controller');
    return next();
  }

  console.log('❌ MIDDLEWARE: User is not admin, role:', req.user.role);
  return res.status(403).json({
    success: false,
    message: 'Admin access required for landing page management'
  });
};

// Public routes
router.get('/content', landingPageController.getContent);
router.get('/testimonials', landingPageController.getTestimonials);

// Admin routes
router.put('/content', authenticateToken, requireLandingAdmin, landingPageController.updateContent);
router.post('/testimonials', authenticateToken, requireLandingAdmin, landingPageController.saveTestimonial);
router.put('/testimonials/:id', authenticateToken, requireLandingAdmin, landingPageController.saveTestimonial);
router.delete('/testimonials/:id', authenticateToken, requireLandingAdmin, landingPageController.deleteTestimonial);

module.exports = router;

