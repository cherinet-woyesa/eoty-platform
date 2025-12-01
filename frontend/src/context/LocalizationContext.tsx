/**
 * FR7: Localization Context
 * REQUIREMENT: City/country-based content filters, UI translations
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { localizationApi, type LocalizationSettings } from '@/services/api/localization';
import { useAuth } from './AuthContext';

interface LocalizationContextType {
  settings: LocalizationSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<LocalizationSettings>) => Promise<void>;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  getContentFilters: () => LocalizationSettings['content_filters'];
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<LocalizationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await localizationApi.getLocalization();
      
      if (response.success) {
        setSettings(response.data.settings);
      }
    } catch (err: any) {
      console.error('Failed to fetch localization settings:', err);
      setError(err.message || 'Failed to load localization settings');
      // Set defaults
      setSettings({
        id: 0,
        user_id: 0,
        locale: 'en',
        timezone: 'UTC',
        date_format: 'YYYY-MM-DD',
        time_format: '24h',
        content_filters: {}
      } as LocalizationSettings);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<LocalizationSettings>) => {
    try {
      setError(null);
      const response = await localizationApi.updateLocalization(newSettings);
      
      if (response.success) {
        setSettings(response.data.settings);
      } else {
        throw new Error(response.message || 'Failed to update settings');
      }
    } catch (err: any) {
      console.error('Failed to update localization settings:', err);
      setError(err.message || 'Failed to update settings');
      throw err;
    }
  };

  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const locale = settings?.locale || 'en';
    
    // In production, use a library like date-fns with locale support
    return dateObj.toLocaleDateString(locale);
  };

  const formatTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const locale = settings?.locale || 'en';
    const timeFormat = settings?.time_format || '24h';
    
    if (timeFormat === '12h') {
      return dateObj.toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return dateObj.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  };

  const getContentFilters = (): LocalizationSettings['content_filters'] => {
    return settings?.content_filters || {};
  };

  return (
    <LocalizationContext.Provider
      value={{
        settings,
        isLoading,
        error,
        updateSettings,
        formatDate,
        formatTime,
        getContentFilters
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

