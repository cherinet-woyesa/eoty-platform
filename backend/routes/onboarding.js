/**
 * FR6: Onboarding Routes
 * REQUIREMENT: Step-by-step guide, milestone-based, auto-resume, reminders
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const onboardingController = require('../controllers/onboardingController');

router.use(authenticateToken);

// GET /api/onboarding/progress - Get user's onboarding progress (REQUIREMENT: Auto-resume)
router.get('/progress', onboardingController.getOnboardingProgress);

// POST /api/onboarding/steps/complete - Complete a step (REQUIREMENT: Prevents progress when prerequisites unmet)
router.post('/steps/complete', onboardingController.completeStep);

// POST /api/onboarding/steps/skip - Skip a step (REQUIREMENT: Triggers follow-up reminders)
router.post('/steps/skip', onboardingController.skipStep);

// POST /api/onboarding/dismiss - Dismiss onboarding (REQUIREMENT: Triggers follow-up reminders)
router.post('/dismiss', onboardingController.dismissOnboarding);

// POST /api/onboarding/restart - Restart onboarding
router.post('/restart', onboardingController.restartOnboarding);

// GET /api/onboarding/milestones - Get milestones (REQUIREMENT: Milestone-based)
router.get('/milestones', onboardingController.getMilestones);

// GET /api/onboarding/help - Get contextual help (REQUIREMENT: Contextual help, FAQ)
router.get('/help', onboardingController.getHelp);

// POST /api/onboarding/help/track - Track help interaction
router.post('/help/track', onboardingController.trackHelpInteraction);

// GET /api/onboarding/help/popular - Get popular help topics
router.get('/help/popular', onboardingController.getPopularHelp);

// GET /api/onboarding/stats - Get completion statistics (REQUIREMENT: 95% completion within 7 days)
router.get('/stats', onboardingController.getCompletionStats);

// GET /api/onboarding/reminders - Get user's active reminders (REQUIREMENT: Follow-up reminders)
router.get('/reminders', onboardingController.getReminders);

// GET /api/onboarding/rewards - Get user's completion rewards (REQUIREMENT: Completion rewards)
router.get('/rewards', onboardingController.getCompletionRewards);

module.exports = router;