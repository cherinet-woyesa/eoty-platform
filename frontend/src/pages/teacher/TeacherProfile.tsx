import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import teacherApi from '@/services/api/teacherApi';
import { authApi } from '@/services/api';
import type { TeacherProfile as TeacherProfileType, TeacherStats } from '@/services/api/teacherApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Shield, CreditCard,
  BarChart3,
  AlertCircle, LayoutDashboard, Bell, Lock
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { brandColors } from '@/theme/brand';
import SubjectEditor from './components/profile/SubjectEditor';
import AvailabilityEditor from './components/profile/AvailabilityEditor';
import DashboardView from './components/profile/DashboardView';
import PayoutView from './components/profile/PayoutView';
import VerificationView from './components/profile/VerificationView';
import StatisticsView from './components/profile/StatisticsView';
import SecurityView from './components/profile/SecurityView';
import NotificationsView from './components/profile/NotificationsView';

// --- Types ---

type TeacherProfileData = TeacherProfileType;



// --- Components ---

// --- Main Container ---

const TeacherProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();
  const { refreshUser: refreshAuthUser } = useAuth(); // Get refreshUser from AuthContext
  const { showNotification } = useNotification();

  // Initialize active view from session storage or default to dashboard
  const [activeView, setActiveView] = useState<'dashboard' | 'payout' | 'verification' | 'statistics' | 'security' | 'notifications'>(
    () => (localStorage.getItem('teacher_profile_active_view') as any) || 'dashboard'
  );

  const queryClient = useQueryClient();

  // Persist active view to session storage
  useEffect(() => {
    localStorage.setItem('teacher_profile_active_view', activeView);
  }, [activeView]);

  // Fetch profile data
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError
  } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: async () => {
      const res = await teacherApi.getProfile();
      return res?.data?.teacherProfile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: teacherApi.updateProfile,
    onSuccess: async (res) => {
      if (res?.success) {
        // Invalidate and refetch profile data
        await queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
        // Refresh user context AND auth context
        await Promise.all([refreshUser(), refreshAuthUser()]);
        showNotification({ title: t('common.success', 'Success'), message: t('teacher_profile.profile_updated', 'Profile updated successfully'), type: 'success' });
      }
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      showNotification({ title: t('common.error', 'Error'), message: t('teacher_profile.profile_update_failed', 'Failed to update profile. Please try again.'), type: 'error' });
    }
  });

  const profile = profileData;
  const loading = profileLoading || (!profile && !profileError);
  const error = profileError;

  const handleUpdateProfile = async (data: Partial<TeacherProfileType>) => {
    const res = await updateProfileMutation.mutateAsync(data);
    return res?.data?.teacherProfile || null;
  };

  const tabs = [
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'payout', label: t('teacher_profile.tabs.payout', 'Payout'), icon: CreditCard },
    { id: 'verification', label: t('teacher_profile.tabs.documents', 'Documents'), icon: Shield },
    { id: 'statistics', label: t('teacher_profile.tabs.statistics', 'Statistics'), icon: BarChart3 },
    { id: 'security', label: t('teacher_profile.tabs.security', 'Security'), icon: Lock },
    { id: 'notifications', label: t('teacher_profile.tabs.notifications', 'Notifications'), icon: Bell },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text={t('common.loading_dashboard')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('common.error_loading_data', 'Failed to load profile')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('common.try_again_description', 'Please try again or contact support if the problem persists.')}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['teacher-profile'] })}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            {t('common.try_again', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Horizontal Navigation Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 flex overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeView === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive
                  ? 'shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                style={isActive ? { 
                  backgroundColor: `${brandColors.primaryHex}10`, 
                  color: brandColors.primaryHex 
                } : {}}
              >
                <Icon className={`h-4 w-4 ${isActive ? '' : 'text-gray-400'}`} 
                      style={isActive ? { color: brandColors.primaryHex } : {}}
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* View Content */}
        <div className="min-h-[500px]">
          {activeView === 'dashboard' && (
            <DashboardView
              user={user}
              profile={profile}
              onNavigate={setActiveView}
              onUpdate={handleUpdateProfile}
              onAvatarUpdated={async () => {
                // Update both user contexts so header and other UI reflect the new picture
                await Promise.all([refreshUser(), refreshAuthUser()]);
              }}
            />
          )}
          {activeView === 'payout' && (
            <PayoutView
              profile={profile}
              onUpdate={handleUpdateProfile}
              onCancel={() => setActiveView('dashboard')}
            />
          )}
          {activeView === 'verification' && (
            <VerificationView
              profile={profile}
              onUpdate={handleUpdateProfile}
              onBack={() => setActiveView('dashboard')}
            />
          )}
          {activeView === 'statistics' && (
            <StatisticsView
              profile={profile}
              onBack={() => setActiveView('dashboard')}
            />
          )}
          {activeView === 'security' && (
            <SecurityView
              profile={profile}
              onBack={() => setActiveView('dashboard')}
            />
          )}
          {activeView === 'notifications' && (
            <NotificationsView
              profile={profile}
              onBack={() => setActiveView('dashboard')}
            />
          )}
        </div>

      </div>
    </div>
  );
};


export default TeacherProfile;
