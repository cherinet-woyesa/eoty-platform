const express = require('express');
const router = express.Router();
const landingController = require('../controllers/landingController');

// Public routes - no authentication required
router.get('/stats', landingController.getStats);
router.get('/featured-courses', landingController.getFeaturedCourses);
router.get('/testimonials', landingController.getTestimonials);

module.exports = router;

