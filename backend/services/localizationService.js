/**
 * FR7: Localization Service
 * REQUIREMENT: City/country-based content filters, UI translations
 */

const db = require('../config/database');

class LocalizationService {
  /**
   * Get user's localization settings
   * @param {number} userId - User ID
   */
  async getUserLocalization(userId) {
    let settings = await db('localization_settings')
      .where('user_id', userId)
      .first();

    if (!settings) {
      // Create default settings
      const user = await db('users')
        .where('id', userId)
        .select('locale', 'timezone')
        .first();

      settings = await this.createLocalizationSettings(userId, {
        locale: user?.locale || 'en',
        timezone: user?.timezone || 'UTC'
      });
    }

    return settings;
  }

  /**
   * Create or update localization settings
   * @param {number} userId - User ID
   * @param {Object} settings - Localization settings
   */
  async createLocalizationSettings(userId, settings = {}) {
    const {
      locale = 'en',
      timezone = 'UTC',
      dateFormat = 'YYYY-MM-DD',
      timeFormat = '24h',
      currency = 'USD',
      contentFilters = {}
    } = settings;

    const existing = await db('localization_settings')
      .where('user_id', userId)
      .first();

    if (existing) {
      // Update existing
      const [updated] = await db('localization_settings')
        .where('user_id', userId)
        .update({
          locale,
          timezone,
          date_format: dateFormat,
          time_format: timeFormat,
          currency,
          content_filters: JSON.stringify(contentFilters),
          updated_at: new Date()
        })
        .returning('*');

      return updated;
    } else {
      // Create new
      const [created] = await db('localization_settings').insert({
        user_id: userId,
        locale,
        timezone,
        date_format: dateFormat,
        time_format: timeFormat,
        currency,
        content_filters: JSON.stringify(contentFilters),
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      return created;
    }
  }

  /**
   * Get content filters for user (REQUIREMENT: City/country-based content filters)
   * @param {number} userId - User ID
   */
  async getContentFilters(userId) {
    const settings = await this.getUserLocalization(userId);
    const contentFilters = settings.content_filters 
      ? (typeof settings.content_filters === 'string' 
          ? JSON.parse(settings.content_filters) 
          : settings.content_filters)
      : {};

    // Get user's primary chapter for location-based filtering
    const chapterService = require('./chapterService');
    const primaryChapter = await chapterService.getUserPrimaryChapter(userId);

    if (primaryChapter) {
      // Add chapter-based filters
      contentFilters.country = primaryChapter.country || contentFilters.country;
      contentFilters.city = primaryChapter.city || contentFilters.city;
      contentFilters.region = primaryChapter.region || contentFilters.region;
      contentFilters.chapterId = primaryChapter.chapter_id;
    }

    return contentFilters;
  }

  /**
   * Filter content by location (REQUIREMENT: City/country-based content filters)
   * @param {Array} content - Content array
   * @param {Object} filters - Filter criteria
   */
  async filterContentByLocation(content, filters) {
    if (!filters || (!filters.country && !filters.city && !filters.chapterId)) {
      return content; // No filters, return all
    }

    return content.filter(item => {
      // If content has chapter_id, match it
      if (filters.chapterId && item.chapter_id) {
        return item.chapter_id === filters.chapterId;
      }

      // If content has country, match it
      if (filters.country && item.country) {
        if (item.country !== filters.country) {
          return false;
        }
      }

      // If content has city, match it
      if (filters.city && item.city) {
        if (item.city !== filters.city) {
          return false;
        }
      }

      // If content has region, match it
      if (filters.region && item.region) {
        if (item.region !== filters.region) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get available locales
   */
  getAvailableLocales() {
    return [
      { code: 'en', name: 'English', flag: '🇺🇸', description: 'Global / diaspora' },
      { code: 'am', name: 'አማርኛ', flag: '🇪🇹', description: 'Amharic' },
      { code: 'ti', name: 'ትግርኛ', flag: '🇪🇷', description: 'Tigrinya' },
      { code: 'om', name: 'Afaan Oromoo', flag: '🇪🇹', description: 'Oromo' },
      { code: 'so', name: 'Soomaali', flag: '🇸🇴', description: 'Somali' }
    ];
  }

  /**
   * Get available timezones
   */
  getAvailableTimezones() {
    return [
      { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
      { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
      { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
      { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
      { value: 'Europe/London', label: 'London' },
      { value: 'Europe/Paris', label: 'Paris' },
      { value: 'Europe/Berlin', label: 'Berlin' },
      { value: 'Asia/Tokyo', label: 'Tokyo' },
      { value: 'Asia/Shanghai', label: 'Shanghai' },
      { value: 'Asia/Dubai', label: 'Dubai' },
      { value: 'Australia/Sydney', label: 'Sydney' }
    ];
  }

  /**
   * Format date according to user's locale and preferences
   * @param {Date} date - Date to format
   * @param {number} userId - User ID
   */
  async formatDate(date, userId) {
    const settings = await this.getUserLocalization(userId);
    // In production, use a library like date-fns or moment.js with locale support
    // For now, return basic formatting
    return date.toLocaleDateString(settings.locale || 'en');
  }

  /**
   * Format time according to user's preferences
   * @param {Date} date - Date to format
   * @param {number} userId - User ID
   */
  async formatTime(date, userId) {
    const settings = await this.getUserLocalization(userId);
    
    if (settings.time_format === '12h') {
      return date.toLocaleTimeString(settings.locale || 'en', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleTimeString(settings.locale || 'en', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  }

  /**
   * Format currency according to user's preferences
   * @param {number} amount - Amount to format
   * @param {number} userId - User ID
   */
  async formatCurrency(amount, userId) {
    const settings = await this.getUserLocalization(userId);
    
    return new Intl.NumberFormat(settings.locale || 'en', {
      style: 'currency',
      currency: settings.currency || 'USD'
    }).format(amount);
  }
}

module.exports = new LocalizationService();

