// backend/routes/journeys.js

const express = require('express');
const router = express.Router();
const journeyController = require('../controllers/journeyController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Public/User routes
router.get('/', journeyController.getJourneys);
router.get('/my-journeys', journeyController.getUserJourneys);
router.get('/:id', journeyController.getJourneyById);
router.post('/:id/enroll', journeyController.enrollUser);
router.get('/progress/:id', journeyController.getUserJourneyDetails);
router.post('/progress/:userJourneyId/milestone/:milestoneId/complete', journeyController.completeMilestone);

// Admin routes (TODO: Add role check middleware)
router.post('/', journeyController.createJourney);

module.exports = router;


