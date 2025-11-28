const express = require('express');
const router = express.Router();
const landingController = require('../controllers/landingController');
const landingPageController = require('../controllers/landingPageController');
const { authenticateToken } = require('../middleware/auth');

// Custom admin middleware for landing page (fixed version)
const requireLandingAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  console.log('🔐 Checking landing admin access for user:', {
    userId: req.user.userId,
    role: req.user.role,
    email: req.user.email
  });

  // Allow admin-level roles: admin, chapter_admin, regional_coordinator
  const adminRoles = ['admin', 'chapter_admin', 'regional_coordinator'];
  if (adminRoles.includes(req.user.role)) {
    console.log('✅ User has admin role:', req.user.role);
    return next();
  }

  console.log('❌ User role not allowed:', req.user.role, '- Allowed roles:', adminRoles);
  return res.status(403).json({
    success: false,
    message: 'Admin access required for landing page management'
  });
};

// Public routes - no authentication required
router.get('/stats', landingController.getStats);
router.get('/featured-courses', landingController.getFeaturedCourses);
router.get('/testimonials', landingController.getTestimonials);

// Landing page content management (public read, admin write)
router.get('/content', landingPageController.getContent);
router.get('/page-testimonials', landingPageController.getTestimonials);

// Admin routes for content management
router.put('/content', authenticateToken, requireLandingAdmin, landingPageController.updateContent);
router.post('/upload-video', authenticateToken, requireLandingAdmin, landingPageController.uploadVideo);
router.post('/page-testimonials', authenticateToken, requireLandingAdmin, landingPageController.saveTestimonial);
router.put('/page-testimonials/:id', authenticateToken, requireLandingAdmin, landingPageController.saveTestimonial);
router.delete('/page-testimonials/:id', authenticateToken, requireLandingAdmin, landingPageController.deleteTestimonial);

module.exports = router;

