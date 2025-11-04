const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/betterAuthMiddleware');

router.use(requireAuth);

// GET /api/onboarding/progress
router.get('/progress', (req, res) => {
  // Return structure expected by the frontend
  res.json({
    success: true,
    data: {
      has_onboarding: false,
      flow: null,
      progress: null,
      is_completed: true,
      message: 'Onboarding completed'
    }
  });
});

// POST /api/onboarding/complete-step
router.post('/complete-step', (req, res) => {
  const { stepName } = req.body;
  
  res.json({
    success: true,
    message: `Step ${stepName} completed`,
    completed: true
  });
});

module.exports = router;