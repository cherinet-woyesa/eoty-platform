import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Award, Camera, User, Check, Users, DollarSign, Star, MessageSquare
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { authApi } from '@/services/api';
import type { TeacherProfile as TeacherProfileType } from '@/services/api/teacherApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { brandColors } from '@/theme/brand';
import SubjectEditor from './SubjectEditor';

interface DashboardViewProps {
  user: any;
  profile: TeacherProfileType;
  onNavigate: (view: 'dashboard' | 'payout' | 'verification' | 'statistics' | 'security' | 'notifications') => void;
  onUpdate: (data: Partial<TeacherProfileType>) => Promise<void>;
  onAvatarUpdated?: () => Promise<void>;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, profile, onNavigate, onUpdate, onAvatarUpdated }) => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for form data to prevent frozen inputs and support manual save
  const [formData, setFormData] = useState({
    bio: profile.bio || '',
    subjects: profile.subjects || [],
    linkedin_url: profile.linkedin_url || '',
    website_url: profile.website_url || ''
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when profile prop changes (only on initial load)
  useEffect(() => {
    if (profile && !hasChanges) {
      setFormData({
        bio: profile.bio || '',
        subjects: profile.subjects || [],
        linkedin_url: profile.linkedin_url || '',
        website_url: profile.website_url || ''
      });
    }
  }, [profile, hasChanges]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Construct payload handling nested structures
      const payload: Partial<TeacherProfileType> = {
        bio: formData.bio,
        subjects: formData.subjects,
        linkedin_url: formData.linkedin_url,
        website_url: formData.website_url
      };

      await onUpdate(payload);
      // Optimistically merge into cache so values persist immediately
      queryClient.setQueryData(['teacher-profile'], (prev: any) => ({
        ...(prev || {}),
        ...payload
      }));
      setHasChanges(false);
      showNotification({
        title: t('common.success', 'Success'),
        message: t('teacher_profile.profile_updated', 'Profile updated successfully'),
        type: 'success'
      });
    } catch (error) {
      console.error('Save failed:', error);
      showNotification({
        title: t('common.error', 'Error'),
        message: t('teacher_profile.save_failed', 'Failed to save profile'),
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const stats = [
    { label: t('teacher_profile.dashboard.total_students', 'Total Students'), value: profile.stats?.total_students || 0, icon: Users },
    { label: t('teacher_profile.dashboard.total_earnings', 'Total Earnings'), value: `$${profile.stats?.total_earnings || 0}`, icon: DollarSign },
    { label: t('teacher_profile.dashboard.rating', 'Rating'), value: profile.stats?.rating || 4.8, icon: Star },
    { label: t('teacher_profile.dashboard.reviews', 'Reviews'), value: profile.stats?.reviews_count || 0, icon: MessageSquare }
  ];

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification({
          title: t('common.error', 'Error'),
          message: t('teacher_profile.avatar_size_error', 'Image size should be less than 5MB'),
          type: 'error'
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);

      try {
        // Prefer the same API the student profile uses for consistency
        const response = await authApi.uploadProfileImage(file);
        const newUrl: string | undefined = response?.data?.profilePicture
          || response?.profilePicture
          // Fallbacks if backend returns a different shape
          || response?.data?.documentUrl
          || response?.documentUrl
          || response?.file_url
          || response?.fileUrl
          || response?.url
          || response?.path;

        if (newUrl) {
          // Update teacher profile record as well to keep it in sync
          await onUpdate({ profile_picture: newUrl });
          setPreviewAvatar(newUrl);

          // Refresh global user contexts so header/profile menu updates immediately
          if (onAvatarUpdated) {
            try {
              await onAvatarUpdated();
            } catch (e) {
              console.warn('Avatar updated, but failed to refresh user contexts:', e);
            }
          }

          showNotification({
            title: t('common.success', 'Success'),
            message: t('teacher_profile.avatar_updated', 'Profile picture updated'),
            type: 'success'
          });
        } else {
          throw new Error('No image URL returned');
        }
      } catch (error) {
        console.error('Failed to upload avatar:', error);
        setPreviewAvatar(null); // Revert preview on error
        showNotification({
          title: t('common.error', 'Error'),
          message: t('teacher_profile.avatar_upload_failed', 'Failed to upload profile picture'),
          type: 'error'
        });
      }
    }
  };

  const checklist = [
    {
      id: 'profile_complete',
      label: t('teacher_dashboard.checklist_complete_profile', 'Complete Profile'),
      isComplete: !!(profile.bio && profile.subjects?.length && profile.availability),
      action: () => document.getElementById('bio-section')?.scrollIntoView({ behavior: 'smooth' })
    },
    {
      id: 'payout_setup',
      label: t('teacher_dashboard.checklist_setup_payout', 'Setup Payout'),
      isComplete: !!profile.payout_method,
      action: () => onNavigate('payout')
    },
    {
      id: 'verification',
      label: t('teacher_dashboard.checklist_verify_identity', 'Verify Documents'),
      isComplete: Object.values(profile.verification_docs || {}).some(s => s !== 'REJECTED'),
      action: () => onNavigate('verification')
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Left Column - Main Info */}
      <div className="lg:col-span-2 space-y-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Award className="h-48 w-48 transform translate-x-12 -translate-y-12" style={{ color: brandColors.primaryHex }} />
          </div>
          <div className="relative z-10 flex items-start gap-6">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden flex-shrink-0">
                {(previewAvatar || profile.profile_picture || user?.avatar) ? (
                  <img src={previewAvatar || profile.profile_picture || user?.avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100 text-2xl font-bold" style={{ color: brandColors.primaryHex }}>
                    {user?.name?.charAt(0) || 'T'}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Camera className="h-4 w-4 text-gray-600" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="pt-2">
              <h1 className="text-3xl font-bold font-display text-gray-900">
                {t('teacher_profile.welcome_back', 'Welcome back, {{name}}!', { name: user?.name?.split(' ')[0] })}
              </h1>
              <p className="text-gray-600 mt-1 text-lg">
                {t('teacher_profile.dashboard_subtitle', 'Manage your teaching profile and settings.')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="p-3 rounded-full mb-3 bg-gray-50">
                <stat.icon className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
              </div>
              <div className="text-2xl font-bold text-gray-900 font-mono mb-1">{stat.value}</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Profile Settings Section */}
        <div id="bio-section" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 p-6 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              {t('teacher_profile.profile_details', 'Profile Details')}
            </h3>
          </div>

          <div className="p-6 space-y-8">
            {/* Bio */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">{t('teacher_profile.bio_label', 'Professional Bio')}</label>
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all min-h-[120px]"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                placeholder={t('teacher_profile.bio_placeholder', 'Tell students about your teaching experience and methodology...')}
                value={formData.bio}
                onChange={(e) => updateField('bio', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-2 text-right">
                {t('teacher_profile.bio_hint', 'Min 50 characters recommended.')}
              </p>
            </div>

            {/* Subjects */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">{t('teacher_profile.subjects_label', 'Subjects')}</label>
              <SubjectEditor
                initial={formData.subjects}
                onSave={(subjects) => updateField('subjects', subjects)}
              />
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">{t('teacher_profile.social.linkedin', 'LinkedIn Profile')}</label>
                <div className="flex items-center">
                  <span className="bg-gray-100 px-3 py-2 border border-gray-300 border-r-0 rounded-l-lg text-gray-500 text-sm">linkedin.com/in/</span>
                  <input
                    type="text"
                    value={formData.linkedin_url.replace('linkedin.com/in/', '')}
                    onChange={(e) => updateField('linkedin_url', `linkedin.com/in/${e.target.value}`)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">{t('teacher_profile.social.website', 'Website')}</label>
                <div className="flex items-center">
                  <span className="bg-gray-100 px-3 py-2 border border-gray-300 border-r-0 rounded-l-lg text-gray-500 text-sm">https://</span>
                  <input
                    type="text"
                    value={formData.website_url.replace('https://', '')}
                    onChange={(e) => updateField('website_url', `https://${e.target.value}`)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-white shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>{t('teacher_profile.payout_setup.saving_btn', 'Saving...')}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{t('common.save_changes', 'Save Changes')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column - Sidebar Widgets */}
      < div className="space-y-6" >
        {/* Onboarding Checklist */}
        < div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6" >
          <h3 className="font-bold text-gray-900 mb-4">{t('teacher_profile.setup_progress', 'Setup Progress')}</h3>
          <div className="space-y-4">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${item.isComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {item.isComplete ? <Check className="h-4 w-4" /> : <div className="h-2 w-2 bg-current rounded-full" />}
                </div>
                <div className="flex-1 text-sm font-medium text-gray-700">{item.label}</div>
                {!item.isComplete && (
                  <button
                    onClick={item.action}
                    className="text-xs font-semibold hover:opacity-80"
                    style={{ color: brandColors.primaryHex }}
                  >
                    Start
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold text-gray-600">Completion</span>
              <span className="font-bold" style={{ color: brandColors.primaryHex }}>{Math.round((checklist.filter(i => i.isComplete).length / checklist.length) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${(checklist.filter(i => i.isComplete).length / checklist.length) * 100}%`, backgroundColor: brandColors.primaryHex }}
              />
            </div>
          </div>
        </div >

        {/* Regional Resources */}
        < div className="rounded-xl shadow-md p-6 text-white relative overflow-hidden" style={{ backgroundColor: brandColors.primaryHex }}>
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-2">{t('teacher_profile.regional_resources.title', 'Regional Resources')}</h3>
            <p className="text-white/80 text-sm mb-4">{t('teacher_profile.regional_resources.description', 'Access guides and tools specific to your teaching region.')}</p>
            <button className="w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg text-sm font-semibold transition-colors">
              {t('teacher_profile.regional_resources.view_btn', 'View Resources')}
            </button>
          </div>
        </div >
      </div >
    </div >
  );
};

export default DashboardView;