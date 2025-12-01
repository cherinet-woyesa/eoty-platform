/**
 * FR7: Localization API
 * REQUIREMENT: City/country-based content filters, UI translations
 */

import { apiClient } from './apiClient';

export interface LocalizationSettings {
  id: number;
  user_id: number;
  locale: string;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  content_filters: {
    country?: string;
    city?: string;
    region?: string;
    chapterId?: number;
  };
}

export const localizationApi = {
  /**
   * Get user's localization settings
   */
  getLocalization: async () => {
    const response = await apiClient.get('/localization');
    return response.data;
  },

  /**
   * Update localization settings
   */
  updateLocalization: async (settings: Partial<LocalizationSettings>) => {
    const response = await apiClient.put('/localization', settings);
    return response.data;
  },

  /**
   * Get available locales
   */
  getAvailableLocales: async () => {
    const response = await apiClient.get('/localization/locales');
    return response.data;
  },

  /**
   * Get available timezones
   */
  getAvailableTimezones: async () => {
    const response = await apiClient.get('/localization/timezones');
    return response.data;
  }
};

