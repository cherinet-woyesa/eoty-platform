const express = require('express');
const router = express.Router();
const landingController = require('../controllers/landingController');
const landingPageController = require('../controllers/landingPageController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// Public routes - no authentication required
router.get('/stats', landingController.getStats);
router.get('/featured-courses', landingController.getFeaturedCourses);
router.get('/testimonials', landingController.getTestimonials);

// Landing page content management (public read, admin write)
router.get('/content', landingPageController.getContent);
router.get('/page-testimonials', landingPageController.getTestimonials);

// Admin routes for content management
router.put('/content', authenticateToken, requireAdmin, landingPageController.updateContent);
router.post('/page-testimonials', authenticateToken, requireAdmin, landingPageController.saveTestimonial);
router.put('/page-testimonials/:id', authenticateToken, requireAdmin, landingPageController.saveTestimonial);
router.delete('/page-testimonials/:id', authenticateToken, requireAdmin, landingPageController.deleteTestimonial);

module.exports = router;

