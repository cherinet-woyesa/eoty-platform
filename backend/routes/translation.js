// backend/routes/translation.js - NEW FILE
const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translationController');
const { requireAuth } = require('../middleware/betterAuthMiddleware');

// Public routes (no authentication required for basic translation)
router.post('/detect', translationController.detectLanguage);
router.get('/languages', translationController.getSupportedLanguages);
router.get('/faith-terms/:language', translationController.getFaithTerms);

// Protected routes (require authentication for translation to prevent abuse)
router.use(requireAuth);
router.post('/translate', translationController.translateText);

module.exports = router;