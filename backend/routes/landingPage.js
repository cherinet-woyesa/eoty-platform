const express = require('express');
const router = express.Router();
const landingPageController = require('../controllers/landingPageController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleAuth');

// Public routes
router.get('/content', landingPageController.getContent);
router.get('/testimonials', landingPageController.getTestimonials);

// Admin routes
router.put('/content', authenticateToken, requireAdmin, landingPageController.updateContent);
router.post('/testimonials', authenticateToken, requireAdmin, landingPageController.saveTestimonial);
router.put('/testimonials/:id', authenticateToken, requireAdmin, landingPageController.saveTestimonial);
router.delete('/testimonials/:id', authenticateToken, requireAdmin, landingPageController.deleteTestimonial);

module.exports = router;

