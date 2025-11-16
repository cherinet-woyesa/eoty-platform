/**
 * FR7: Localization Routes
 * REQUIREMENT: City/country-based content filters, UI translations
 */

const express = require('express');
const router = express.Router();
const localizationController = require('../controllers/localizationController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

router.get('/', localizationController.getLocalization);
router.put('/', localizationController.updateLocalization);
router.get('/locales', localizationController.getAvailableLocales);
router.get('/timezones', localizationController.getAvailableTimezones);
router.get('/content-filters', localizationController.getContentFilters);

module.exports = router;

