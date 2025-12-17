import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import teacherApi from '@/services/api/teacherApi';
import { authApi } from '@/services/api';
import type { TeacherProfile as TeacherProfileType, TeacherStats } from '@/services/api/teacherApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Shield, CreditCard, FileText,
  HelpCircle, Upload, Clock, Check, BookOpen, ArrowLeft,
  BarChart3, TrendingUp, TrendingDown, Users, Play, Award,
  Calendar, DollarSign, Target, Activity, Star, Trash2,
  AlertCircle, Settings, User, Camera, MessageSquare, LayoutDashboard, Bell, Lock, Mail
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { brandColors } from '@/theme/brand';

// --- Types ---

type TeacherProfileData = TeacherProfileType;

// --- Constants ---

const PAYOUT_REGIONS = [
  { code: 'US', labelKey: 'teacher_profile.payout_setup.country_united_states', defaultLabel: 'United States' },
  { code: 'UK', labelKey: 'teacher_profile.payout_setup.country_united_kingdom', defaultLabel: 'United Kingdom' },
  { code: 'CA', labelKey: 'teacher_profile.payout_setup.country_canada', defaultLabel: 'Canada' },
  { code: 'ET', labelKey: 'teacher_profile.payout_setup.country_ethiopia', defaultLabel: 'Ethiopia' },
];

// --- Components ---

// Inline simple editors to avoid placeholders
const SubjectEditor: React.FC<{ initial: string[]; onSave: (subjects: string[]) => void }> = ({ initial, onSave }) => {
  const [items, setItems] = useState<string[]>(initial);
  const [newItem, setNewItem] = useState('');
  useEffect(() => setItems(initial), [initial]);
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder={t('teacher_profile.subjects.placeholder', 'Add a subject (e.g. Liturgy, Bible Study, Church History)')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItem.trim() && items.length < 5 && newItem.trim().length <= 50) {
              const updated = [...items, newItem.trim()].filter(Boolean); setItems(updated); onSave(updated);
            }
          }}
        />
        <button
          className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-colors font-medium"
          style={{ backgroundColor: brandColors.primaryHex }}
          disabled={!newItem.trim() || items.length >= 5 || newItem.trim().length > 50}
          onClick={() => { const updated = [...items, newItem.trim()].filter(Boolean); setItems(updated); setNewItem(''); onSave(updated); }}
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border group transition-colors"
               style={{ backgroundColor: '#eef2ff', borderColor: brandColors.primaryHex }}>
            <span className="text-sm font-medium" style={{ color: brandColors.primaryHex }}>{s}</span>
            <button
              className="text-slate-400 hover:text-red-600 transition-colors p-0.5 rounded-full hover:bg-red-50"
              onClick={() => { const updated = items.filter((_, i) => i !== idx); setItems(updated); onSave(updated); }}
              aria-label={`Remove ${s}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-500 italic w-full">{t('teacher_profile.subjects.no_subjects', 'No subjects added yet.')}</p>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2">{t('teacher_profile.subjects.max_subjects', 'Maximum 5 subjects.')}</p>
    </div>
  );
};

const AvailabilityEditor: React.FC<{ initial: Record<string, string[]>; onSave: (availability: Record<string, string[]>) => void }> = ({ initial, onSave }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [slots, setSlots] = useState<Record<string, string[]>>(initial || {});
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [newTimeStart, setNewTimeStart] = useState('');
  const [newTimeEnd, setNewTimeEnd] = useState('');

  const { t } = useTranslation();
  const { showNotification } = useNotification();

  useEffect(() => setSlots(initial || {}), [initial]);

  const handleAddSlot = (day: string) => {
    if (!newTimeStart || !newTimeEnd) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.time_required', 'Please select both start and end times'), type: 'warning' });
      return;
    }

    const time = `${newTimeStart}-${newTimeEnd}`;

    // Validate time
    if (newTimeStart >= newTimeEnd) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.invalid_time_range', 'End time must be after start time'), type: 'warning' });
      return;
    }

    // Check for duplicates
    if ((slots[day] || []).includes(time)) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.time_slot_exists', 'This time slot already exists'), type: 'warning' });
      return;
    }

    const updated = { ...slots, [day]: [...(slots[day] || []), time] };
    setSlots(updated);
    onSave(updated);

    // Reset form
    setNewTimeStart('');
    setNewTimeEnd('');
    setActiveDay(null);
  };

  const removeSlot = (day: string, idx: number) => {
    const updated = { ...slots, [day]: (slots[day] || []).filter((_, i) => i !== idx) };
    setSlots(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      {days.map(day => (
        <div key={day} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-slate-800">{t(`teacher_profile.availability.days.${day}`, day)}</span>
            {activeDay !== day && (
              <button
                className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium transition-colors"
                onClick={() => {
                  setActiveDay(day);
                  setNewTimeStart('');
                  setNewTimeEnd('');
                }}
              >
                {t('teacher_profile.availability.add_slot', 'Add Slot')}
              </button>
            )}
          </div>

          {activeDay === day && (
            <div className="mb-4 p-3 bg-white rounded-lg border border-blue-100 shadow-sm animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="time"
                  className="px-2 py-1 border rounded text-sm"
                  value={newTimeStart}
                  onChange={e => setNewTimeStart(e.target.value)}
                />
                <span className="text-slate-400">-</span>
                <input
                  type="time"
                  className="px-2 py-1 border rounded text-sm"
                  value={newTimeEnd}
                  onChange={e => setNewTimeEnd(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddSlot(day)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {t('teacher_profile.availability.save', 'Save')}
                </button>
                <button
                  onClick={() => setActiveDay(null)}
                  className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                >
                  {t('teacher_profile.availability.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {(slots[day] || []).length === 0 && activeDay !== day && (
              <li className="text-xs text-slate-400 italic">{t('teacher_profile.availability.no_availability', 'No availability set')}</li>
            )}
            {(slots[day] || []).map((s, idx) => (
              <li key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-100">
                <span className="text-sm text-slate-700 font-medium">{s}</span>
                <button
                  className="text-xs text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                  onClick={() => removeSlot(day, idx)}
                  aria-label="Remove slot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const DashboardView: React.FC<{
  user: any;
  profile: TeacherProfileData;
  onNavigate: (view: 'dashboard' | 'payout' | 'verification' | 'statistics' | 'security' | 'notifications') => void;
  onUpdate: (data: Partial<TeacherProfileType>) => Promise<void>;
  onAvatarUpdated?: () => Promise<void>;
}> = ({ user, profile, onNavigate, onUpdate, onAvatarUpdated }) => {
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

      const result = await onUpdate(payload);
      // Optimistically merge into cache so values persist immediately
      queryClient.setQueryData(['teacher-profile'], (prev: any) => ({
        ...(prev || {}),
        ...((result && typeof result === 'object') ? result : {}),
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
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Award className="h-48 w-48 text-blue-600 transform translate-x-12 -translate-y-12" />
          </div>
          <div className="relative z-10 flex items-start gap-6">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex-shrink-0">
                {(previewAvatar || profile.profile_picture || user?.avatar) ? (
                  <img src={previewAvatar || profile.profile_picture || user?.avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-600 text-2xl font-bold">
                    {user?.name?.charAt(0) || 'T'}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Camera className="h-4 w-4 text-slate-600" />
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
              <h1 className="text-3xl font-bold font-display text-slate-900">
                {t('teacher_profile.welcome_back', 'Welcome back, {{name}}!', { name: user?.name?.split(' ')[0] })}
              </h1>
              <p className="text-slate-600 mt-1 text-lg">
                {t('teacher_profile.dashboard_subtitle', 'Manage your teaching profile and settings.')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="p-3 rounded-full mb-3" style={{ backgroundColor: '#eef2ff' }}>
                <stat.icon className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono mb-1">{stat.value}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Profile Settings Section */}
        <div id="bio-section" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100 p-6 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              {t('teacher_profile.profile_details', 'Profile Details')}
            </h3>
          </div>

          <div className="p-6 space-y-8">
            {/* Bio */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">{t('teacher_profile.bio_label', 'Professional Bio')}</label>
              <textarea
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[120px]"
                placeholder={t('teacher_profile.bio_placeholder', 'Tell students about your teaching experience and methodology...')}
                value={formData.bio}
                onChange={(e) => updateField('bio', e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-2 text-right">
                {t('teacher_profile.bio_hint', 'Min 50 characters recommended.')}
              </p>
            </div>

            {/* Subjects */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">{t('teacher_profile.subjects_label', 'Subjects')}</label>
              <SubjectEditor
                initial={formData.subjects}
                onSave={(subjects) => updateField('subjects', subjects)}
              />
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">{t('teacher_profile.social.linkedin', 'LinkedIn Profile')}</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 px-3 py-2 border border-slate-300 border-r-0 rounded-l-lg text-slate-500 text-sm">linkedin.com/in/</span>
                  <input
                    type="text"
                    value={formData.linkedin_url.replace('linkedin.com/in/', '')}
                    onChange={(e) => updateField('linkedin_url', `linkedin.com/in/${e.target.value}`)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">{t('teacher_profile.social.website', 'Website')}</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 px-3 py-2 border border-slate-300 border-r-0 rounded-l-lg text-slate-500 text-sm">https://</span>
                  <input
                    type="text"
                    value={formData.website_url.replace('https://', '')}
                    onChange={(e) => updateField('website_url', `https://${e.target.value}`)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50">
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
        < div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" >
          <h3 className="font-bold text-slate-900 mb-4">{t('teacher_profile.setup_progress', 'Setup Progress')}</h3>
          <div className="space-y-4">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${item.isComplete ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                  {item.isComplete ? <Check className="h-4 w-4" /> : <div className="h-2 w-2 bg-current rounded-full" />}
                </div>
                <div className="flex-1 text-sm font-medium text-slate-700">{item.label}</div>
                {!item.isComplete && (
                  <button
                    onClick={item.action}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Start
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold text-slate-600">Completion</span>
              <span className="font-bold text-blue-600">{Math.round((checklist.filter(i => i.isComplete).length / checklist.length) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                style={{ width: `${(checklist.filter(i => i.isComplete).length / checklist.length) * 100}%` }}
              />
            </div>
          </div>
        </div >

        {/* Regional Resources */}
        < div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-xl shadow-md p-6 text-white relative overflow-hidden" >
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-2">{t('teacher_profile.regional_resources.title', 'Regional Resources')}</h3>
            <p className="text-blue-100 text-sm mb-4">{t('teacher_profile.regional_resources.description', 'Access guides and tools specific to your teaching region.')}</p>
            <button className="w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg text-sm font-semibold transition-colors">
              {t('teacher_profile.regional_resources.view_btn', 'View Resources')}
            </button>
          </div>
        </div >
      </div >
    </div >
  );
};

const PayoutView: React.FC<{
  profile: TeacherProfileData;
  onUpdate: (data: Partial<TeacherProfileType>) => Promise<void>;
  onCancel: () => void;
}> = ({ profile, onUpdate, onCancel }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const [formData, setFormData] = useState({
    payout_method: profile.payout_method || 'bank',
    payout_region: profile.payout_region || 'US',
    mobile_provider: (profile as any)?.payout_details?.mobile_provider || '',
    account_holder: profile.payout_details?.account_holder || '',
    account_number: profile.payout_details?.account_number || '',
    routing_number: profile.payout_details?.routing_number || '',
    address: profile.payout_details?.address || '',
    dob: profile.payout_details?.dob || '',
    tax_id: profile.payout_details?.tax_id || '',
    tax_agreed: false
  });

  // Payout update mutation
  const updatePayoutMutation = useMutation({
    mutationFn: onUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      showNotification({ title: t('common.success', 'Success'), message: t('teacher_profile.payout_updated', 'Payout settings updated successfully'), type: 'success' });
    },
    onError: (error) => {
      console.error('Failed to update payout settings:', error);
      showNotification({ title: t('common.error', 'Error'), message: t('teacher_profile.payout_update_failed', 'Failed to update payout settings. Please try again.'), type: 'error' });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.payout_method !== 'stripe' && !formData.account_holder.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_account_holder_required', 'Account holder name is required'), type: 'warning' });
      return;
    }

    if (formData.payout_method !== 'stripe' && !formData.account_number.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_account_number_required', 'Account number is required'), type: 'warning' });
      return;
    }

    if (formData.payout_method === 'bank' && !formData.routing_number.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_routing_required', 'Routing number is required for bank transfers'), type: 'warning' });
      return;
    }

    if (formData.payout_method === 'mobile_money' && !formData.mobile_provider) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.mobile_money_provider_required', 'Please select a mobile money provider'), type: 'warning' });
      return;
    }

    if (!formData.address.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_address_required', 'Billing address is required'), type: 'warning' });
      return;
    }

    if (!formData.dob) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_dob_required', 'Date of birth is required'), type: 'warning' });
      return;
    }

    if (!formData.tax_id.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_tax_id_required', 'Tax ID is required'), type: 'warning' });
      return;
    }

    if (!formData.tax_agreed) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_tax_agreement_required', 'Please agree to the tax information terms'), type: 'warning' });
      return;
    }

    // Age validation (must be 18+)
    const dob = new Date(formData.dob);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 18) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_age_requirement', 'You must be at least 18 years old'), type: 'warning' });
      return;
    }

    await updatePayoutMutation.mutateAsync({
      payout_method: formData.payout_method,
      payout_region: formData.payout_region,
      payout_details: {
        account_holder: formData.payout_method === 'stripe' ? undefined : formData.account_holder.trim(),
        account_number: formData.payout_method === 'stripe' ? undefined : formData.account_number.trim(),
        routing_number: formData.payout_method === 'bank' ? formData.routing_number.trim() : undefined,
        mobile_provider: formData.payout_method === 'mobile_money' ? formData.mobile_provider : undefined,
        address: formData.address.trim(),
        dob: formData.dob,
        tax_id: formData.tax_id.trim()
      },
      tax_status: formData.tax_agreed ? 'AGREED' : undefined
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Main Form */}
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <section>
            <div className="flex items-center gap-4 mb-2">
              <button
                type="button"
                onClick={onCancel}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-slate-900">{t('teacher_profile.payout_setup.main_title')}</h2>
                <p className="text-slate-600 text-lg">{t('teacher_profile.payout_setup.subtitle')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Region Selector */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  {t('teacher_profile.payout_setup.region_label')}
                </label>
                <select
                  value={formData.payout_region}
                  onChange={e => setFormData({ ...formData, payout_region: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50"
                  disabled={updatePayoutMutation.isPending}
                >
                  {PAYOUT_REGIONS.map(region => (
                    <option key={region.code} value={region.code}>
                      {t(region.labelKey, region.defaultLabel)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payout Method */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  {t('teacher_profile.payout_setup.method_label')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payout_method: 'bank' })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.payout_method === 'bank'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <div className={`p-2 rounded-full ${formData.payout_method === 'bank' ? 'bg-white' : 'bg-slate-100'}`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{t('teacher_profile.payout_setup.bank_transfer_method')}</div>
                      <div className="text-xs opacity-80">{t('teacher_profile.payout_setup.bank_transfer_desc')}</div>
                    </div>
                    {formData.payout_method === 'bank' && <Check className="ml-auto h-5 w-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payout_method: 'stripe' })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.payout_method === 'stripe'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <div className={`p-2 rounded-full ${formData.payout_method === 'stripe' ? 'bg-white' : 'bg-slate-100'}`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{t('teacher_profile.payout_setup.stripe_method', 'Stripe')}</div>
                      <div className="text-xs opacity-80">{t('teacher_profile.payout_setup.stripe_desc', 'Fast, secure payouts via Stripe')}</div>
                    </div>
                    {formData.payout_method === 'stripe' && <Check className="ml-auto h-5 w-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payout_method: 'mobile_money' })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.payout_method === 'mobile_money'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <div className={`p-2 rounded-full ${formData.payout_method === 'mobile_money' ? 'bg-white' : 'bg-slate-100'}`}>
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{t('teacher_profile.payout_setup.mobile_money_method')}</div>
                      <div className="text-xs opacity-80">{t('teacher_profile.payout_setup.mobile_money_desc')}</div>
                    </div>
                    {formData.payout_method === 'mobile_money' && <Check className="ml-auto h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Account / Phone Details */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 pt-4 border-t border-slate-100">
                  <CreditCard className="h-4 w-4" />
                  {t('teacher_profile.payout_setup.account_details_title')}
                </h3>

                {formData.payout_method !== 'stripe' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                      {t('teacher_profile.payout_setup.account_holder_label')}
                    </label>
                    <input
                      type="text"
                      value={formData.account_holder}
                      onChange={e => setFormData({ ...formData, account_holder: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={t('teacher_profile.payout_setup.account_holder_placeholder', 'e.g. John Doe')}
                    />
                  </div>
                  {formData.payout_method === 'bank' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                        {t('teacher_profile.payout_setup.routing_number_label')}
                      </label>
                      <input
                        type="text"
                        value={formData.routing_number}
                        onChange={e => setFormData({ ...formData, routing_number: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder={t('teacher_profile.payout_setup.routing_number_placeholder', 'Routing / Sort Code')}
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                      {formData.payout_method === 'bank' ? t('teacher_profile.payout_setup.account_number_label') : t('teacher_profile.payout_setup.phone_number_label')}
                    </label>
                    <input
                      type="text"
                      value={formData.account_number}
                      onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={formData.payout_method === 'bank' 
                        ? t('teacher_profile.payout_setup.account_number_placeholder', 'Account Number / IBAN') 
                        : t('teacher_profile.payout_setup.phone_number_placeholder', '+251...')}
                    />
                  </div>
                </div>
                )}

                {formData.payout_method === 'mobile_money' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                        {t('teacher_profile.payout_setup.mobile_money_provider_label', 'Mobile Money Provider')}
                      </label>
                      <select
                        value={formData.mobile_provider}
                        onChange={e => setFormData({ ...formData, mobile_provider: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50"
                      >
                        <option value="">{t('teacher_profile.payout_setup.select_provider', 'Select provider')}</option>
                        <option value="cbe_birr">{t('teacher_profile.payout_setup.provider_cbe_birr', 'CBE Birr')}</option>
                        <option value="tele_birr">{t('teacher_profile.payout_setup.provider_tele_birr', 'Tele Birr')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Tax Details */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 pt-4 border-t border-slate-100">
                  <FileText className="h-4 w-4" />
                  {t('teacher_profile.payout_setup.tax_information_title')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                      {t('teacher_profile.payout_setup.tax_id_label')}
                    </label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={t('teacher_profile.payout_setup.tax_id_placeholder', 'SSN / TIN / National ID')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                      {t('teacher_profile.payout_setup.dob_label')}
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={e => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                      {t('teacher_profile.payout_setup.billing_address_label')}
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={t('teacher_profile.payout_setup.address_placeholder', 'Full street address, City, State, Zip')}
                    />
                  </div>
                </div>
              </div>

              {/* Agreement */}
              <div className="md:col-span-2 pt-4 border-t border-slate-100">
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="tax_agree"
                    checked={formData.tax_agreed}
                    onChange={e => setFormData({ ...formData, tax_agreed: e.target.checked })}
                    className="mt-1 h-4 w-4 text-[#1e1b4b] border-slate-300 rounded focus:ring-[#1e1b4b]"
                  />
                  <label htmlFor="tax_agree" className="text-sm text-slate-600">
                    <span dangerouslySetInnerHTML={{ __html: t('teacher_profile.payout_setup.tax_agree_label') }} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
            >
              {t('teacher_profile.payout_setup.cancel_btn')}
            </button>
            <button
              type="submit"
              disabled={updatePayoutMutation.isPending || !formData.tax_agreed}
              className="px-6 py-2 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {updatePayoutMutation.isPending ? t('teacher_profile.payout_setup.saving_btn') : t('teacher_profile.payout_setup.confirm_details_btn')}
            </button>
          </div>
        </form>
      </div>

      {/* Summary Panel */}
      <div className="space-y-6">
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4">{t('teacher_profile.payout_setup.payout_summary_title')}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">{t('teacher_profile.payout_setup.method_label')}</span>
              <span className="font-medium text-slate-900 capitalize">
                {formData.payout_method === 'bank' 
                  ? t('teacher_profile.payout_setup.bank_transfer_method') 
                  : formData.payout_method === 'stripe' 
                    ? t('teacher_profile.payout_setup.stripe_method', 'Stripe') 
                    : t('teacher_profile.payout_setup.mobile_money_method')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t('teacher_profile.payout_setup.region_label')}</span>
              <span className="font-medium text-slate-900">
                {(PAYOUT_REGIONS.find(r => r.code === formData.payout_region) || PAYOUT_REGIONS[0]).defaultLabel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t('teacher_profile.payout_setup.currency_label')}</span>
              <span className="font-medium text-slate-900">
                {formData.payout_region === 'ET' ? t('teacher_profile.payout_setup.currency_etb') : t('teacher_profile.payout_setup.currency_usd')}
              </span>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2">{t('teacher_profile.payout_setup.transactional_terms_title')}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('teacher_profile.payout_setup.transactional_terms_description')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-2">{t('teacher_profile.payout_setup.next_steps_title')}</h3>
          <p className="text-sm text-slate-600 mb-4">
            {t('teacher_profile.payout_setup.next_steps_description')}
          </p>
          <button
            onClick={onCancel}
            className="w-full py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            {t('teacher_profile.payout_setup.proceed_to_documents_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

const VerificationView: React.FC<{
  profile: TeacherProfileData;
  onUpdate: (data: Partial<TeacherProfileType>) => Promise<void>;
  onBack: () => void;
}> = ({ profile, onUpdate, onBack }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});

  // Fetch uploaded documents to get URLs
  const { data: uploadedDocuments } = useQuery({
    queryKey: ['teacher-documents'],
    queryFn: async () => {
      try {
        const res = await teacherApi.getDocuments();
        return res.data?.documents || [];
      } catch (e) {
        console.error('Failed to fetch documents', e);
        return [];
      }
    }
  });

  // Document upload mutation
  const uploadDocMutation = useMutation({
    mutationFn: async ({ key, file }: { key: string; file: File }) => {
      try {
        // Upload the document to the backend
        const response = await teacherApi.uploadDocument(file, key);
        
        if (!response.data?.documentUrl) {
          throw new Error('Upload failed: No document URL returned');
        }

        // Update the profile verification status
        const currentDocs = profile.verification_docs || {};
        return await onUpdate({
          verification_docs: {
            ...currentDocs,
            [key]: 'PENDING'
          }
        });
      } catch (error) {
        console.error('Document upload error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-documents'] }); // Refresh documents list
      showNotification({
        title: t('common.success', 'Success'),
        message: t('teacher_profile.document_upload_success', 'Document uploaded successfully. Status: Pending Review.'),
        type: 'success'
      });
      setActiveDoc(null);
    },
    onError: (error) => {
      console.error('Failed to upload document:', error);
      showNotification({
        title: t('common.error', 'Error'),
        message: t('teacher_profile.document_upload_failed', 'Failed to upload document. Please try again.'),
        type: 'error'
      });
    }
  });

  const handleFileSelect = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setActiveDoc(file ? key : null);
    setSelectedFiles(prev => ({ ...prev, [key]: file }));
  };

  const handleSaveUpload = (key: string) => {
    const file = selectedFiles[key];
    if (file) {
      uploadDocMutation.mutate({ key, file });
    }
  };

  const docs = [
    {
      key: 'national_id',
      title: 'National ID / Passport',
      description: 'Government-issued ID for identity verification.',
      icon: <User className="h-6 w-6 text-blue-600" />
    },
    {
      key: 'teaching_cert',
      title: 'Teaching Certification',
      description: 'Valid teaching license or degree certificate.',
      icon: <Award className="h-6 w-6 text-purple-600" />
    },
    {
      key: 'tax_form',
      title: 'Tax Residency Form',
      description: 'Proof of tax residency for payout compliance.',
      icon: <FileText className="h-6 w-6 text-orange-600" />
    }
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'VERIFIED': return t('teacher_documents.status.verified', 'Verified');
      case 'PENDING': return t('teacher_documents.status.pending', 'Pending Review');
      case 'REJECTED': return t('teacher_documents.status.rejected', 'Rejected');
      default: return t('teacher_documents.status.not_submitted', 'Not Submitted');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">{t('teacher_documents.title', 'Verification Documents')}</h1>
          <p className="text-slate-600 mt-1 text-lg">{t('teacher_documents.subtitle', 'Upload required documents to verify your teacher status and unlock all platform features.')}</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-100">
            {Object.values(profile.verification_docs || {}).filter(s => s === 'VERIFIED').length} / {docs.length} {t('teacher_documents.status.verified', 'Verified')}
          </span>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {docs.map((doc) => {
          const status = profile.verification_docs?.[doc.key];
          const isUploading = uploadDocMutation.isPending && activeDoc === doc.key;
          const uploadedDoc = uploadedDocuments?.find((d: any) => d.document_type === doc.key);

          return (
            <div key={doc.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-slate-50">
                    {doc.icon}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{t(`teacher_documents.doc_types.${doc.key}.title`, doc.title)}</h3>
                <p className="text-sm text-slate-600">{t(`teacher_documents.doc_types.${doc.key}.description`, doc.description)}</p>
                
                {/* View Link */}
                {uploadedDoc && (
                  <div className="mt-3">
                    <a 
                      href={uploadedDoc.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      {t('common.view', 'View Document')}
                    </a>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                {status === 'VERIFIED' ? (
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <Check className="h-4 w-4 mr-2" />
                    {t('teacher_documents.verification_complete', 'Verification Complete')}
                  </div>
                ) : (
                  <div className="w-full flex items-center gap-3">
                    <label className="flex items-center justify-center px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                      {uploadDocMutation.isPending ? (
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {status === 'PENDING'
                        ? t('teacher_documents.upload_new_btn', 'Upload New Version')
                        : t('teacher_documents.upload_btn', 'Upload Document')}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileSelect(doc.key, e)}
                        disabled={uploadDocMutation.isPending}
                      />
                    </label>
                    <button
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-600"
                      onClick={() => handleSaveUpload(doc.key)}
                      disabled={uploadDocMutation.isPending || !selectedFiles[doc.key]}
                    >
                      {t('common.save_changes', 'Save Changes')}
                    </button>
                    {status === 'REJECTED' && (
                      <p className="text-xs text-red-600 mt-2">{t('teacher_documents.rejected_msg', 'Previous document was rejected. Please try again.')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ / Help */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 flex items-start gap-4">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <HelpCircle className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900">{t('teacher_documents.help_title', 'Need help with verification?')}</h3>
          <p className="text-blue-700 text-sm mt-1 mb-3">
            {t('teacher_documents.help_desc', 'Check our detailed guide on acceptable document formats and typical verification timelines.')}
          </p>
          <a href="#" className="text-sm font-semibold text-blue-800 hover:underline">
            {t('teacher_documents.help_link', 'Read Verification Guidelines')}
          </a>
        </div>
      </div>
    </div>
  );
};

const StatisticsView: React.FC<{
  profile: TeacherProfileData;
  onBack: () => void;
}> = ({ profile, onBack }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch teacher statistics
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-statistics'],
    queryFn: async () => {
      const res = await teacherApi.getTeacherStats();
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t('teacher_stats.loading_title', 'Performance Statistics')}</h1>
              <p className="text-slate-600 text-lg">{t('teacher_stats.loading_subtitle', 'Loading your teaching analytics...')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t('teacher_stats.title', 'Performance Statistics')}</h1>
              <p className="text-slate-600 text-lg">{t('teacher_stats.subtitle', 'View your teaching performance and student engagement')}</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <div className="text-red-600 mb-4">
              <BarChart3 className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">{t('teacher_stats.error_title', 'Failed to Load Statistics')}</h3>
            <p className="text-red-700 mb-4">{t('teacher_stats.error_desc', 'Unable to fetch your teaching analytics at this time.')}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {t('teacher_stats.retry', 'Try Again')}
            </button>
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
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('teacher_stats.title', 'Performance Statistics')}</h1>
            <p className="text-slate-600 text-lg">{t('teacher_stats.subtitle', 'Comprehensive view of your teaching impact and student engagement')}</p>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="lg:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div className={`flex items-center text-sm font-medium ${(stats?.overview?.enrollmentGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {(stats?.overview?.enrollmentGrowth ?? 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(stats?.overview?.enrollmentGrowth ?? 0)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatNumber(stats?.overview?.totalStudents ?? 0)}
            </div>
            <div className="text-sm text-slate-600">{t('teacher_stats.total_students', 'Total Students')}</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats?.overview?.recentEnrollments ?? 0} {t('teacher_stats.new_this_month', 'new this month')}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center text-sm font-medium text-green-600">
                <Activity className="h-4 w-4 mr-1" />
                {t('teacher_stats.active_label', 'Active')}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatNumber(stats?.engagement?.activeStudents ?? 0)}
            </div>
            <div className="text-sm text-slate-600">{t('teacher_stats.active_students', 'Active Students')}</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats?.engagement?.weeklyEngagement ?? 0} {t('teacher_stats.engaged_this_week', 'engaged this week')}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div className={`flex items-center text-sm font-medium ${(stats?.overview?.completionGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {(stats?.overview?.completionGrowth ?? 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(stats?.overview?.completionGrowth ?? 0)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {stats?.overview?.averageCompletionRate ?? 0}%
            </div>
            <div className="text-sm text-slate-600">{t('teacher_stats.avg_completion', 'Avg. Completion')}</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats?.overview?.totalEnrollments ?? 0} {t('teacher_stats.completed_courses', 'completed courses')}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              {stats?.overview?.averageRating && (
                <div className="flex items-center text-sm font-medium text-yellow-600">
                  <Star className="h-4 w-4 mr-1 fill-current" />
                  {stats?.overview?.averageRating}
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {stats?.overview?.averageRating || 'N/A'}
            </div>
            <div className="text-sm text-slate-600">{t('teacher_stats.avg_rating', 'Average Rating')}</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats?.overview?.totalRatings ?? 0} {t('teacher_stats.total_reviews', 'total reviews')}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="lg:col-span-2 space-y-6">
        {/* Top Performing Courses */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              {t('teacher_stats.top_courses.title', 'Top Performing Courses')}
            </h3>
          </div>
          <div className="p-6">
            {(stats?.trends?.topCourses?.length ?? 0) > 0 ? (
              <div className="space-y-4">
                {stats?.trends?.topCourses?.map((course: TeacherStats['trends']['topCourses'][0], index: number) => (
                  <div key={course.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{course.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{course.studentCount} {t('teacher_stats.top_courses.students', 'students')}</span>
                          <span>{course.avgCompletion}% {t('teacher_stats.top_courses.completion', 'completion')}</span>
                          {course.avgRating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span>{course.avgRating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )) ?? []}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>{t('teacher_stats.top_courses.no_data_desc', 'No courses yet. Create your first course to see performance metrics!')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              {t('teacher_stats.recent_activity.title', 'Recent Activity (30 days)')}
            </h3>
          </div>
          <div className="p-6">
            {(stats?.recentActivity?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {stats?.recentActivity?.slice(0, 8).map((activity: TeacherStats['recentActivity'][0], index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'enrollment' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                      {activity.type === 'enrollment' ? (
                        <Users className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {activity.description} {activity.type === 'enrollment' ? t('teacher_stats.recent_activity.enrolled_in', 'enrolled in') : t('teacher_stats.recent_activity.completed', 'completed')} {activity.courseTitle}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )) ?? []}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>{t('teacher_stats.recent_activity.no_data_desc', 'No recent activity. Student enrollments and completions will appear here.')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Stats */}
      <div className="space-y-6">
        {/* Engagement Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Play className="h-4 w-4 text-purple-600" />
              {t('teacher_stats.engagement.title', 'Engagement')}
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{t('teacher_stats.engagement.watch_time', 'Watch Time')}</span>
                <span className="font-semibold text-slate-900">{formatTime(stats?.engagement?.totalWatchTime ?? 0)}</span>
              </div>
              <div className="text-xs text-slate-500">{t('teacher_stats.engagement.watch_time_desc', 'Total time students spent watching')}</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{t('teacher_stats.engagement.lesson_completion', 'Lesson Completion')}</span>
                <span className="font-semibold text-slate-900">{stats?.engagement?.averageLessonCompletion ?? 0}%</span>
              </div>
              <div className="text-xs text-slate-500">{t('teacher_stats.engagement.lesson_completion_desc', 'Average progress per lesson')}</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{t('teacher_stats.engagement.completed_lessons', 'Completed Lessons')}</span>
                <span className="font-semibold text-slate-900">{formatNumber(stats?.engagement?.completedLessons ?? 0)}</span>
              </div>
              <div className="text-xs text-slate-500">{t('teacher_stats.engagement.completed_lessons_desc', 'Total lessons finished')}</div>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              {t('teacher_stats.earnings.title', 'Earnings')}
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{t('teacher_stats.earnings.total', 'Total Earnings')}</span>
                <span className="font-semibold text-slate-900">${(stats?.earnings?.totalEarnings ?? 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-500">{t('teacher_stats.earnings.total_desc', 'All-time earnings')}</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{t('teacher_stats.earnings.this_month', 'This Month')}</span>
                <span className="font-semibold text-slate-900">${(stats?.earnings?.monthlyEarnings ?? 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-500">{t('teacher_stats.earnings.this_month_desc', 'Current month earnings')}</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{t('teacher_stats.earnings.pending', 'Pending')}</span>
                <span className="font-semibold text-slate-900">${(stats?.earnings?.pendingPayments ?? 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-500">{t('teacher_stats.earnings.pending_desc', 'Awaiting payout')}</div>
            </div>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              {t('teacher_stats.trends.title', 'Monthly Trends')}
            </h3>
          </div>
          <div className="p-4">
            {(stats?.trends?.monthlyActivity?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {stats?.trends?.monthlyActivity?.slice(0, 3).map((month: TeacherStats['trends']['monthlyActivity'][0], index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">
                      {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">{month.enrollments} {t('teacher_stats.trends.enrollments', 'enrollments')}</div>
                      <div className="text-xs text-green-600">{month.completions} {t('teacher_stats.trends.completed', 'completed')}</div>
                    </div>
                  </div>
                )) ?? []}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 text-sm">
                {t('teacher_stats.trends.no_data', 'No enrollment data yet')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SecurityView: React.FC<{
  profile: TeacherProfileData;
  onBack: () => void;
}> = ({ profile, onBack }) => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      // Use API client with correct backend route
      const res = await teacherApi.changePassword(data);
      if (!res.success) throw new Error(res.message || 'Failed to change password');
      return res;
    },
    onSuccess: () => {
      showNotification({ title: t('common.success', 'Success'), message: t('teacher_security.password_changed', 'Password changed successfully'), type: 'success' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      showNotification({ title: t('common.error', 'Error'), message: error.message || t('teacher_security.password_change_failed', 'Failed to change password'), type: 'error' });
    }
  });

  // Account deletion mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await teacherApi.deleteAccount();
      if (!res.success) throw new Error(res.message || 'Failed to delete account');
      return res;
    },
    onSuccess: () => {
      showNotification({ title: t('common.success', 'Success'), message: t('teacher_security.account_deleted', 'Account deleted successfully'), type: 'success' });
      logout();
    },
    onError: (error) => {
      showNotification({ title: t('common.error', 'Error'), message: error.message || t('teacher_security.account_deletion_failed', 'Failed to delete account'), type: 'error' });
    }
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!passwordForm.currentPassword) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_security.current_password_required', 'Current password is required'), type: 'warning' });
      return;
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_security.password_too_short', 'New password must be at least 8 characters'), type: 'warning' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_security.passwords_dont_match', 'Passwords do not match'), type: 'warning' });
      return;
    }

    changePasswordMutation.mutate(passwordForm);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmation !== 'DELETE') {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_security.confirmation_required', 'Please type DELETE to confirm'), type: 'warning' });
      return;
    }

    deleteAccountMutation.mutate();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="lg:col-span-3">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('teacher_security.title', 'Account Security')}</h1>
            <p className="text-slate-600 text-lg">{t('teacher_security.subtitle', 'Manage your password and account security settings')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Change Password */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              {t('teacher_security.change_password_title', 'Change Password')}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {t('teacher_security.change_password_description', 'Regularly update your password to keep your account secure')}
            </p>
          </div>
          <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('teacher_security.current_password_label', 'Current Password')} *
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={t('teacher_security.current_password_placeholder', 'Enter your current password')}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('teacher_security.new_password_label', 'New Password')} *
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={t('teacher_security.new_password_placeholder', 'Enter new password')}
                  minLength={8}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  {t('teacher_security.password_length_hint', 'Must be at least 8 characters long')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('teacher_security.confirm_password_label', 'Confirm New Password')} *
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={t('teacher_security.confirm_password_placeholder', 'Confirm new password')}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    {t('teacher_security.changing_password_btn', 'Changing Password...')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t('teacher_security.change_password_btn', 'Change Password')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              {t('teacher_security.security_settings_title', 'Security Settings')}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {t('teacher_security.security_settings_description', 'Additional security options for your account')}
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-900">{t('teacher_security.two_factor_auth_title', 'Two-Factor Authentication')}</h4>
                <p className="text-sm text-slate-600">{t('teacher_security.two_factor_auth_description', 'Add an extra layer of security to your account')}</p>
              </div>
              <button className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                {t('teacher_security.coming_soon', 'Coming Soon')}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-900">{t('teacher_security.login_notifications_title', 'Login Notifications')}</h4>
                <p className="text-sm text-slate-600">{t('teacher_security.login_notifications_description', 'Get notified of new logins to your account')}</p>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-5 bg-slate-300 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5 transition-transform"></div>
                </div>
                <span className="ml-2 text-sm text-slate-600">{t('teacher_security.coming_soon', 'Coming Soon')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-900">{t('teacher_security.session_management_title', 'Session Management')}</h4>
                <p className="text-sm text-slate-600">{t('teacher_security.session_management_description', 'View and manage your active sessions')}</p>
              </div>
              <button className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                {t('teacher_security.view_sessions_btn', 'View Sessions')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Account Deletion */}
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl shadow-sm">
          <div className="p-6 border-b border-red-100">
            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {t('teacher_security.danger_zone', 'Danger Zone')}
            </h3>
            <p className="text-sm text-red-700 mt-1">
              {t('teacher_security.danger_desc', 'Irreversible and destructive actions')}
            </p>
          </div>

          <div className="p-6">
            {!showDeleteConfirm ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-900">{t('teacher_security.delete_account_title', 'Delete Account')}</h4>
                  <p className="text-sm text-red-700 mt-1">
                    {t('teacher_security.delete_account_desc', 'Permanently delete your account and all associated data. This action cannot be undone.')}
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  {t('teacher_security.delete_account_btn', 'Delete Account')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-red-100 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">{t('teacher_security.confirm_delete_title', 'Confirm Account Deletion')}</h4>
                  <p className="text-sm text-red-800 mb-3" dangerouslySetInnerHTML={{
                    __html: t('teacher_security.confirm_delete_desc', 'This will permanently delete your account, all your courses, lessons, and data. Type <strong>DELETE</strong> to confirm.')
                  }} />
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={t('teacher_security.confirm_delete_placeholder', 'Type DELETE to confirm')}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmation('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    {t('teacher_security.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending || deleteConfirmation !== 'DELETE'}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {deleteAccountMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        {t('teacher_security.deleting', 'Deleting...')}
                      </>
                    ) : (
                      t('teacher_security.confirm_delete_btn', 'Confirm Delete')
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              {t('teacher_security.account_info_title', 'Account Information')}
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t('teacher_security.account_created', 'Account Created')}</span>
              <span className="font-medium text-slate-900">
                {new Date().toLocaleDateString()} {/* Placeholder - should come from user data */}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t('teacher_security.last_login', 'Last Login')}</span>
              <span className="font-medium text-slate-900">
                {t('teacher_security.today', 'Today')} {/* Placeholder */}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t('teacher_security.account_status', 'Account Status')}</span>
              <span className="font-medium text-green-600">{t('teacher_security.status_active', 'Active')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationsView: React.FC<{
  profile: TeacherProfileData;
  onBack: () => void;
}> = ({ profile, onBack }) => {
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
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Notification Preferences</h1>
              <p className="text-slate-600 text-lg">Loading your preferences...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
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
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('notifications.title', 'Notification Preferences')}</h1>
            <p className="text-slate-600 text-lg">{t('notifications.subtitle', 'Customize how and when you receive notifications')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Email Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              {t('notifications.email.title', 'Email Notifications')}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
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
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-slate-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor={option.key} className="font-medium text-slate-700">
                    {option.label}
                  </label>
                  <p className="text-slate-500">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-600" />
              {t('notifications.push.title', 'Push Notifications')}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
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
                    className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-slate-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor={option.key} className="font-medium text-slate-700">
                    {option.label}
                  </label>
                  <p className="text-slate-500">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar - Privacy */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              {t('notifications.privacy.title', 'Communication & Privacy')}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
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
                <label htmlFor={option.key} className="text-sm font-medium text-slate-700">
                  {option.label}
                </label>
                <div className="flex items-center h-5">
                  <input
                    id={option.key}
                    name={option.key}
                    type="checkbox"
                    checked={preferences[option.key as keyof typeof preferences]}
                    onChange={(e) => handlePreferenceChange(option.key, e.target.checked)}
                    className="focus:ring-green-500 h-4 w-4 text-green-600 border-slate-300 rounded"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={handleSaveAll}
              disabled={updatePreferencesMutation.isPending}
              className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {updatePreferencesMutation.isPending ? t('common.saving', 'Saving...') : t('notifications.save_changes', 'Save Changes')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.try_again', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Horizontal Navigation Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeView === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
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
