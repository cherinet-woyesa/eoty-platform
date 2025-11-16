// backend/routes/journeys.js

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const journeyController = require('../controllers/journeyController');

// All journey routes require authentication
router.use(authenticateToken);

// Public to all authenticated users (filtered by audience/chapters)
router.get('/', journeyController.listJourneys);
router.get('/:id', journeyController.getJourney);

// Admin/Teacher routes for managing journeys
router.post('/', journeyController.createJourney);
router.put('/:id', journeyController.updateJourney);
router.delete('/:id', journeyController.deleteJourney);

module.exports = router;


