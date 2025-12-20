import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Mail, Bell, Shield
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import teacherApi from '@/services/api/teacherApi';
import type { TeacherProfile as TeacherProfileType } from '@/services/api/teacherApi';
import { brandColors } from '@/theme/brand';

type TeacherProfileData = TeacherProfileType;

interface NotificationsViewProps {
  profile: TeacherProfileData;
  onBack: () => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ profile, onBack }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  // Notification preferences state
  const [preferences, setPreferences] = useState({
    // Email notifications
    email_course_updates: true,
    email_student_messages: true,
    email_forum_replies: true,
    email_weekly_digest: true,
    email_marketing: false,

    // Push notifications
    push_course_activity: true,
    push_student_engagement: true,
    push_forum_activity: false,
    push_system_updates: true,

    // Communication preferences
    allow_student_messages: true,
    allow_course_invitations: true,
    public_profile_visible: true,
    show_online_status: true,
    allow_analytics_tracking: true
  });

  // Fetch current preferences
  const { data: currentPreferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await teacherApi.getNotificationPreferences();
      return res.data || preferences;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync preferences with fetched data
  useEffect(() => {
    if (currentPreferences) {
      setPreferences(prev => ({ ...prev, ...currentPreferences }));
    }
  }, [currentPreferences]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: teacherApi.updateNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      showNotification({ title: t('common.success', 'Success'), message: t('notifications.preferences_updated', 'Notification preferences updated successfully'), type: 'success' });
    },
    onError: (error) => {
      showNotification({ title: t('common.error', 'Error'), message: error.message || t('notifications.preferences_update_failed', 'Failed to update preferences'), type: 'error' });
    }
  });

  const handlePreferenceChange = (key: string, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    updatePreferencesMutation.mutate(newPreferences);
  };

  const handleSaveAll = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
              <p className="text-gray-600 text-lg">Loading your preferences...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="lg:col-span-3">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('notifications.title', 'Notification Preferences')}</h1>
            <p className="text-gray-600 text-lg">{t('notifications.subtitle', 'Customize how and when you receive notifications')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Email Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              {t('notifications.email.title', 'Email Notifications')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t('notifications.email.subtitle', 'Choose which emails you\'d like to receive')}
            </p>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                key: 'email_course_updates',
                label: t('notifications.email.types.course_updates.label', 'Course Updates'),
                description: t('notifications.email.types.course_updates.description', 'Notifications about your course performance and student activity')
              },
              {
                key: 'email_student_messages',
                label: t('notifications.email.types.student_messages.label', 'Student Messages'),
                description: t('notifications.email.types.student_messages.description', 'Direct messages from students enrolled in your courses')
              },
              {
                key: 'email_forum_replies',
                label: t('notifications.email.types.forum_replies.label', 'Forum Replies'),
                description: t('notifications.email.types.forum_replies.description', 'Replies to your forum posts and discussions')
              },
              {
                key: 'email_weekly_digest',
                label: t('notifications.email.types.weekly_digest.label', 'Weekly Digest'),
                description: t('notifications.email.types.weekly_digest.description', 'Weekly summary of your teaching activity and platform updates')
              },
              {
                key: 'email_marketing',
                label: t('notifications.email.types.marketing.label', 'Marketing & Promotions'),
                description: t('notifications.email.types.marketing.description', 'Special offers, platform updates, and promotional content')
              }
            ].map((option) => (
              <div key={option.key} className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id={option.key}
                    name={option.key}
                    type="checkbox"
                    checked={preferences[option.key as keyof typeof preferences]}
                    onChange={(e) => handlePreferenceChange(option.key, e.target.checked)}
                    className="h-4 w-4 border-gray-300 rounded focus:ring-opacity-50"
                    style={{ accentColor: brandColors.primaryHex }}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor={option.key} className="font-medium text-gray-700">
                    {option.label}
                  </label>
                  <p className="text-gray-500">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              {t('notifications.push.title', 'Push Notifications')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t('notifications.push.subtitle', 'Receive real-time updates while using the platform')}
            </p>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                key: 'push_course_activity',
                label: t('notifications.push.types.course_activity.label', 'Course Activity'),
                description: t('notifications.push.types.course_activity.description', 'New enrollments, reviews, and course completions')
              },
              {
                key: 'push_student_engagement',
                label: t('notifications.push.types.student_engagement.label', 'Student Engagement'),
                description: t('notifications.push.types.student_engagement.description', 'Comments, questions, and discussion participation')
              },
              {
                key: 'push_forum_activity',
                label: t('notifications.push.types.forum_activity.label', 'Forum Activity'),
                description: t('notifications.push.types.forum_activity.description', 'New topics and replies in followed discussions')
              },
              {
                key: 'push_system_updates',
                label: t('notifications.push.types.system_updates.label', 'System Updates'),
                description: t('notifications.push.types.system_updates.description', 'Important platform announcements and maintenance alerts')
              }
            ].map((option) => (
              <div key={option.key} className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id={option.key}
                    name={option.key}
                    type="checkbox"
                    checked={preferences[option.key as keyof typeof preferences]}
                    onChange={(e) => handlePreferenceChange(option.key, e.target.checked)}
                    className="h-4 w-4 border-gray-300 rounded focus:ring-opacity-50"
                    style={{ accentColor: brandColors.primaryHex }}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor={option.key} className="font-medium text-gray-700">
                    {option.label}
                  </label>
                  <p className="text-gray-500">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar - Privacy */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              {t('notifications.privacy.title', 'Communication & Privacy')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t('notifications.privacy.subtitle', 'Manage how others interact with you')}
            </p>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                key: 'allow_student_messages',
                label: t('notifications.privacy.types.student_messages', 'Allow students to message me')
              },
              {
                key: 'allow_course_invitations',
                label: t('notifications.privacy.types.course_invitations', 'Allow course invitations')
              },
              {
                key: 'public_profile_visible',
                label: t('notifications.privacy.types.public_profile', 'Public Profile visibility')
              },
              {
                key: 'show_online_status',
                label: t('notifications.privacy.types.online_status', 'Show online status')
              },
              {
                key: 'allow_analytics_tracking',
                label: t('notifications.privacy.types.analytics', 'Allow analytics tracking')
              }
            ].map((option) => (
              <div key={option.key} className="flex items-center justify-between">
                <label htmlFor={option.key} className="text-sm font-medium text-gray-700">
                  {option.label}
                </label>
                <div className="flex items-center h-5">
                  <input
                    id={option.key}
                    name={option.key}
                    type="checkbox"
                    checked={preferences[option.key as keyof typeof preferences]}
                    onChange={(e) => handlePreferenceChange(option.key, e.target.checked)}
                    className="h-4 w-4 border-gray-300 rounded focus:ring-opacity-50"
                    style={{ accentColor: brandColors.primaryHex }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <button
              onClick={handleSaveAll}
              disabled={updatePreferencesMutation.isPending}
              className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {updatePreferencesMutation.isPending ? t('common.saving', 'Saving...') : t('notifications.save_changes', 'Save Changes')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
