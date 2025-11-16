/**
 * FR6: Reminder Notification Component
 * Displays onboarding reminders to users who skipped/aborted onboarding
 * REQUIREMENT: Follow-up reminders
 */

import React, { useState, useEffect } from 'react';
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
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 animate-slide-in"
        >
          <div className="flex items-start">
            <Bell className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">
                Complete Your Onboarding
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                {reminder.reminder_type === 'skipped'
                  ? 'You skipped some onboarding steps. Complete them to unlock all features!'
                  : reminder.reminder_type === 'aborted'
                  ? 'You dismissed the onboarding. Would you like to continue?'
                  : 'Your onboarding is incomplete. Finish it to get started!'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResume}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Resume Onboarding
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
                <button
                  onClick={() => handleDismiss(reminder.id)}
                  className="inline-flex items-center px-3 py-1.5 text-blue-700 hover:bg-blue-100 text-sm font-medium rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(reminder.id)}
              className="text-blue-400 hover:text-blue-600 ml-2 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReminderNotification;


