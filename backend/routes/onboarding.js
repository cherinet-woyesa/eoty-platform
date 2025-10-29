const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/onboarding/progress
router.get('/progress', (req, res) => {
  // For now, return completed onboarding
  res.json({
    success: true,
    progress: [],
    completed: true,
    currentStep: null
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