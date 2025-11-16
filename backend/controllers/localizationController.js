/**
 * FR7: Localization Controller
 * REQUIREMENT: City/country-based content filters, UI translations
 */

const localizationService = require('../services/localizationService');

const localizationController = {
  /**
   * Get user's localization settings
   */
  async getLocalization(req, res) {
    try {
      const userId = req.user.userId;
      const settings = await localizationService.getUserLocalization(userId);

      res.json({
        success: true,
        data: { settings }
      });
    } catch (error) {
      console.error('Get localization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch localization settings'
      });
    }
  },

  /**
   * Update localization settings
   */
  async updateLocalization(req, res) {
    try {
      const userId = req.user.userId;
      const settings = await localizationService.createLocalizationSettings(userId, req.body);

      res.json({
        success: true,
        data: { settings },
        message: 'Localization settings updated'
      });
    } catch (error) {
      console.error('Update localization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update localization settings'
      });
    }
  },

  /**
   * Get available locales
   */
  async getAvailableLocales(req, res) {
    try {
      const locales = localizationService.getAvailableLocales();

      res.json({
        success: true,
        data: { locales }
      });
    } catch (error) {
      console.error('Get locales error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available locales'
      });
    }
  },

  /**
   * Get available timezones
   */
  async getAvailableTimezones(req, res) {
    try {
      const timezones = localizationService.getAvailableTimezones();

      res.json({
        success: true,
        data: { timezones }
      });
    } catch (error) {
      console.error('Get timezones error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available timezones'
      });
    }
  },

  /**
   * Get content filters for user (REQUIREMENT: City/country-based content filters)
   */
  async getContentFilters(req, res) {
    try {
      const userId = req.user.userId;
      const filters = await localizationService.getContentFilters(userId);

      res.json({
        success: true,
        data: { filters }
      });
    } catch (error) {
      console.error('Get content filters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch content filters'
      });
    }
  }
};

module.exports = localizationController;

