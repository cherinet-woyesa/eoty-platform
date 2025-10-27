const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Badge routes
router.get('/badges', achievementController.getUserBadges);
router.get('/badges/available', achievementController.getAvailableBadges);
router.get('/badges/:badgeId/eligibility', achievementController.checkEligibility);

// Leaderboard routes
router.get('/leaderboard', achievementController.getLeaderboard);
router.put('/anonymity', achievementController.updateAnonymity);

module.exports = router;