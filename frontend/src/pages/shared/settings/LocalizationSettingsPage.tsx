

import React, { useState, useEffect } from 'react';
import { Globe, MapPin, Calendar, DollarSign, Save, Check, Clock } from 'lucide-react';
import { useLocalization } from '@/context/LocalizationContext';
import { localizationApi } from '@/services/api/localization';
import { useAuth } from '@/context/AuthContext';

const LocalizationSettingsPage: React.FC = () => {
  const { settings, updateSettings, formatDate, formatTime, isLoading } = useLocalization();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    locale: 'en',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h' as '12h' | '24h'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [availableLocales, setAvailableLocales] = useState<any[]>([]);
  const [availableTimezones, setAvailableTimezones] = useState<any[]>([]);

  useEffect(() => {
    if (settings) {
      setFormData({
        locale: settings.locale || 'en',
        timezone: settings.timezone || 'UTC',
        dateFormat: settings.date_format || 'YYYY-MM-DD',
        timeFormat: settings.time_format || '24h'
      });
    }

    // Fetch available options
    const fetchOptions = async () => {
      try {
        const [localesRes, timezonesRes] = await Promise.all([
          localizationApi.getAvailableLocales(),
          localizationApi.getAvailableTimezones()
        ]);

        if (localesRes.success) {
          setAvailableLocales(localesRes.data.locales || []);
        }
        if (timezonesRes.success) {
          setAvailableTimezones(timezonesRes.data.timezones || []);
        }
      } catch (err) {
        console.error('Failed to fetch localization options:', err);
      }
    };

    fetchOptions();
  }, [settings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      
      await updateSettings({
        locale: formData.locale,
        timezone: formData.timezone,
        date_format: formData.dateFormat,
        time_format: formData.timeFormat
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 flex items-center justify-center">
        <div className="text-center text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Localization Settings</h1>
              <p className="text-gray-600 mt-1">
                Customize your language, timezone, and regional preferences
              </p>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Language/Locale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="h-4 w-4 inline mr-2" />
              Language
            </label>
            <select
              value={formData.locale}
              onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableLocales.length > 0 ? (
                availableLocales.map((locale: any) => (
                  <option key={locale.code} value={locale.code}>
                    {locale.flag} {locale.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="en">🇺🇸 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="ar">🇸🇦 العربية</option>
                  <option value="zh">🇨🇳 中文</option>
                </>
              )}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-2" />
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableTimezones.length > 0 ? (
                availableTimezones.map((tz: any) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))
              ) : (
                <>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </>
              )}
            </select>
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Date Format
            </label>
            <select
              value={formData.dateFormat}
              onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-15)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (01/15/2024)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (15/01/2024)</option>
              <option value="DD-MM-YYYY">DD-MM-YYYY (15-01-2024)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Preview: {formatDate(new Date())}
            </p>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              Time Format
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="24h"
                  checked={formData.timeFormat === '24h'}
                  onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value as '12h' | '24h' })}
                  className="mr-2"
                />
                <span>24-hour (14:30)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="12h"
                  checked={formData.timeFormat === '12h'}
                  onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value as '12h' | '24h' })}
                  className="mr-2"
                />
                <span>12-hour (2:30 PM)</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Preview: {formatTime(new Date())}
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                saveSuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saveSuccess ? (
                <>
                  <Check className="h-5 w-5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Filtering Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Content Filtering
          </h2>
          <p className="text-blue-800 text-sm">
            Your content will be filtered based on your primary chapter's location (city/country).
            This ensures you see relevant, localized content. Change your primary chapter in the Chapters page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocalizationSettingsPage;

