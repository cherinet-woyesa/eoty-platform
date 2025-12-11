/**
 * FR6: Reminder Notification Component
 * Displays onboarding reminders to users who skipped/aborted onboarding
 * REQUIREMENT: Follow-up reminders
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, X, ArrowRight } from 'lucide-react';
import { onboardingApi } from '@/services/api/onboarding';
import { useOnboarding } from '@/context/OnboardingContext';

interface ReminderNotificationProps {
  onDismiss?: (reminderId: number) => void;
  onResume?: () => void;
}

const ReminderNotification: React.FC<ReminderNotificationProps> = ({ 
  onDismiss, 
  onResume 
}) => {
  const { t } = useTranslation();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasOnboarding, restartOnboarding } = useOnboarding();

  useEffect(() => {
    fetchReminders();
    // Refresh reminders every 5 minutes
    const interval = setInterval(fetchReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await onboardingApi.getReminders();
      if (response.success) {
        setReminders(response.data.reminders || []);
      }
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (reminderId: number) => {
    // In a full implementation, this would call an API to dismiss the reminder
    setReminders(prev => prev.filter(r => r.id !== reminderId));
    onDismiss?.(reminderId);
  };

  const handleResume = async () => {
    if (hasOnboarding) {
      await restartOnboarding();
      onResume?.();
    }
  };

  if (loading || reminders.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-6 z-50 space-y-3 max-w-sm w-full">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="bg-white border-l-4 border-[#27AE60] rounded-r-xl shadow-xl p-4 animate-in slide-in-from-right duration-500 flex items-start gap-3 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#27AE60]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="bg-[#27AE60]/10 p-2 rounded-full flex-shrink-0">
            <Bell className="h-5 w-5 text-[#27AE60] animate-pulse" />
          </div>
          
          <div className="flex-1 min-w-0 relative z-10">
            <h4 className="font-bold text-gray-900 text-sm mb-1">
              {t('onboarding.reminder.title')}
            </h4>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              {reminder.reminder_type === 'skipped'
                ? t('onboarding.reminder.skipped')
                : reminder.reminder_type === 'aborted'
                ? t('onboarding.reminder.aborted')
                : t('onboarding.reminder.generic')}
            </p>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleResume}
                className="inline-flex items-center px-3 py-1.5 bg-[#27AE60] hover:bg-[#219150] text-white text-xs font-semibold rounded-lg transition-all shadow-sm hover:shadow transform hover:-translate-y-0.5"
              >
                {t('onboarding.reminder.resume')}
                <ArrowRight className="h-3 w-3 ml-1" />
              </button>
              <button
                onClick={() => handleDismiss(reminder.id)}
                className="inline-flex items-center px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xs font-medium rounded-lg transition-colors"
              >
                {t('common.dismiss')}
              </button>
            </div>
          </div>

          <button
            onClick={() => handleDismiss(reminder.id)}
            className="text-gray-300 hover:text-gray-500 transition-colors p-1"
            aria-label="Close reminder"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ReminderNotification;


