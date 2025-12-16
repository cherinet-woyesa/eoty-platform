/**
 * Achievements Routes
 * Badge management and awarding system
 */

const express = require('express');
const router = express.Router();
const achievementsController = require('../controllers/achievementsController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/achievements/badges
 * Get user's earned badges
 */
router.get('/badges', requirePermission('achievements:view'), achievementsController.getUserBadges);

/**
 * GET /api/achievements/badges/available
 * Get all available badges
 */
router.get('/badges/available', requirePermission('achievements:view'), achievementsController.getAvailableBadges);

/**
 * GET /api/achievements/badges/featured
 * Get featured badges
 */
router.get('/badges/featured', requirePermission('achievements:view'), achievementsController.getFeaturedBadges);

/**
 * GET /api/achievements/badges/:badgeId/eligibility
 * Check if user is eligible for a specific badge
 */
router.get('/badges/:badgeId/eligibility', requirePermission('achievements:view'), achievementsController.checkBadgeEligibility);

/**
 * GET /api/achievements/stats
 * Get user's badge statistics
 */
router.get('/stats', requirePermission('achievements:view'), achievementsController.getBadgeStats);

/**
 * POST /api/achievements/award
 * Award a badge to a user (manual awarding by teachers/admins)
 */
router.post('/award', requirePermission('achievements:award'), achievementsController.awardBadge);

module.exports = router;