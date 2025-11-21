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

  if (req.user.role === 'admin') {
    return next();
  }

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

