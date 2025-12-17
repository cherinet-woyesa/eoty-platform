import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import teacherApi from '@/services/api/teacherApi';
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
          placeholder={t('teacher_profile.subjects.placeholder', 'Add a subject (e.g. Mathematics)')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItem.trim() && items.length < 5 && newItem.trim().length <= 50) {
              const updated = [...items, newItem.trim()].filter(Boolean); setItems(updated); onSave(updated);
            }
          }}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors font-medium"
          disabled={!newItem.trim() || items.length >= 5 || newItem.trim().length > 50}
          onClick={() => { const updated = [...items, newItem.trim()].filter(Boolean); setItems(updated); setNewItem(''); onSave(updated); }}
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 group hover:border-blue-200 transition-colors">
            <span className="text-slate-700 text-sm font-medium">{s}</span>
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
          <p className="text-sm text-slate-500 italic w-full">No subjects added yet.</p>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2">Maximum 5 subjects.</p>
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
            <span className="font-semibold text-slate-800">{day}</span>
            {activeDay !== day && (
              <button
                className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium transition-colors"
                onClick={() => {
                  setActiveDay(day);
                  setNewTimeStart('');
                  setNewTimeEnd('');
                }}
              >
                Add Slot
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
                  Save
                </button>
                <button
                  onClick={() => setActiveDay(null)}
                  className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {(slots[day] || []).length === 0 && activeDay !== day && (
              <li className="text-xs text-slate-400 italic">No availability set</li>
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
}> = ({ user, profile, onNavigate, onUpdate }) => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
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
        subjects: profile.subjects || profile.specializations || [],
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
        // Map local 'subjects' to backend 'specializations' if that's the preferred field
        specializations: formData.subjects,
        linkedin_url: formData.linkedin_url,
        website_url: formData.website_url
      };

      await onUpdate(payload);
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
    { label: t('teacher_profile.dashboard.total_students', 'Total Students'), value: profile.stats?.total_students || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('teacher_profile.dashboard.total_earnings', 'Total Earnings'), value: `$${profile.stats?.total_earnings || 0}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: t('teacher_profile.dashboard.rating', 'Rating'), value: profile.stats?.rating || 4.8, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: t('teacher_profile.dashboard.reviews', 'Reviews'), value: profile.stats?.reviews_count || 0, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' }
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

      // Simulate upload
      // const formData = new FormData();
      // formData.append('avatar', file);
      // await onUpdate({ avatar: 'new-url' });
      showNotification({
        title: t('common.success', 'Success'),
        message: t('teacher_profile.avatar_updated', 'Profile picture updated'),
        type: 'success'
      });
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
              <div className={`p-3 rounded-full mb-3 ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono mb-1">{stat.value}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Profile Settings Section */}
        <div id="bio-section" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              {t('teacher_profile.profile_details', 'Profile Details')}
            </h3>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${hasChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
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
                <label className="block text-sm font-semibold text-slate-900 mb-2">LinkedIn Profile</label>
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
                <label className="block text-sm font-semibold text-slate-900 mb-2">Website</label>
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
            <h3 className="font-bold text-lg mb-2">Regional Resources</h3>
            <p className="text-blue-100 text-sm mb-4">Access guides and tools specific to your teaching region.</p>
            <button className="w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg text-sm font-semibold transition-colors">
              View Resources
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
    if (!formData.account_holder.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_account_holder_required', 'Account holder name is required'), type: 'warning' });
      return;
    }

    if (!formData.account_number.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_account_number_required', 'Account number is required'), type: 'warning' });
      return;
    }

    if (formData.payout_method === 'bank' && !formData.routing_number.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_routing_required', 'Routing number is required for bank transfers'), type: 'warning' });
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
        account_holder: formData.account_holder.trim(),
        account_number: formData.account_number.trim(),
        routing_number: formData.routing_number.trim(),
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {/* Bank Details */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 pt-4 border-t border-slate-100">
                  <CreditCard className="h-4 w-4" />
                  {t('teacher_profile.payout_setup.account_details_title')}
                </h3>

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
                      placeholder="e.g. John Doe"
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
                        placeholder="Routing / Sort Code"
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
                      placeholder={formData.payout_method === 'bank' ? "Account Number / IBAN" : "+251..."}
                    />
                  </div>
                </div>
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
                      placeholder="SSN / TIN / National ID"
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
                      placeholder="Full street address, City, State, Zip"
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
                {formData.payout_method === 'bank' ? t('teacher_profile.payout_setup.bank_transfer_method') : t('teacher_profile.payout_setup.mobile_money_method')}
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

  // Document upload mutation
  const uploadDocMutation = useMutation({
    mutationFn: async ({ key, file }: { key: string; file: File }) => {
      // In a real app, you'd use formData to upload the file to an endpoint.
      // For this demo/refactor, we simulate the upload and update the profile status.
      // const formData = new FormData();
      // formData.append('document', file);
      // await api.post(`/teacher/documents/${key}`, formData);

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const currentDocs = profile.verification_docs || {};
      return await onUpdate({
        verification_docs: {
          ...currentDocs,
          [key]: 'PENDING'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
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

  const handleFileUpload = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      key: 'police_check',
      title: 'Background Check',
      description: 'Recent criminal record check or police clearance.',
      icon: <Shield className="h-6 w-6 text-green-600" />
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
      case 'VERIFIED': return 'Verified';
      case 'PENDING': return 'Pending Review';
      case 'REJECTED': return 'Rejected';
      default: return 'Not Submitted';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Verification Documents</h1>
          <p className="text-slate-600 mt-1 text-lg">Upload required documents to verify your teacher status and unlock all platform features.</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-100">
            {Object.values(profile.verification_docs || {}).filter(s => s === 'VERIFIED').length} / {docs.length} Verified
          </span>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {docs.map((doc) => {
          const status = profile.verification_docs?.[doc.key];
          const isUploading = uploadDocMutation.isPending && activeDoc === doc.key;

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
                <h3 className="text-lg font-bold text-slate-900 mb-1">{doc.title}</h3>
                <p className="text-sm text-slate-600">{doc.description}</p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                {status === 'VERIFIED' ? (
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <Check className="h-4 w-4 mr-2" />
                    Verification Complete
                  </div>
                ) : (
                  <div className="w-full">
                    <label className="flex items-center justify-center w-full px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                      {uploadDocMutation.isPending ? (
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {status === 'PENDING' ? 'Upload New Version' : 'Upload Document'}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(doc.key, e)}
                        disabled={uploadDocMutation.isPending}
                      />
                    </label>
                    {status === 'REJECTED' && (
                      <p className="text-xs text-red-600 mt-2 text-center">Previous document was rejected. Please try again.</p>
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
          <h3 className="font-bold text-blue-900">Need help with verification?</h3>
          <p className="text-blue-700 text-sm mt-1 mb-3">
            Check our detailed guide on acceptable document formats and typical verification timelines.
          </p>
          <a href="#" className="text-sm font-semibold text-blue-800 hover:underline">
            Read Verification Guidelines
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
              <h1 className="text-3xl font-bold text-slate-900">Performance Statistics</h1>
              <p className="text-slate-600 text-lg">Loading your teaching analytics...</p>
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
              <h1 className="text-3xl font-bold text-slate-900">Performance Statistics</h1>
              <p className="text-slate-600 text-lg">View your teaching performance and student engagement</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <div className="text-red-600 mb-4">
              <BarChart3 className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Statistics</h3>
            <p className="text-red-700 mb-4">Unable to fetch your teaching analytics at this time.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
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
            <h1 className="text-3xl font-bold text-slate-900">Performance Statistics</h1>
            <p className="text-slate-600 text-lg">Comprehensive view of your teaching impact and student engagement</p>
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
            <div className="text-sm text-slate-600">Total Students</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats?.overview?.recentEnrollments ?? 0} new this month
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center text-sm font-medium text-green-600">
                <Activity className="h-4 w-4 mr-1" />
                Active
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatNumber(stats?.engagement?.activeStudents ?? 0)}
            </div>
            <div className="text-sm text-slate-600">Active Students</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats?.engagement?.weeklyEngagement ?? 0} engaged this week
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
            <div className="text-sm text-slate-600">Avg. Completion</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats?.overview?.totalEnrollments ?? 0} completed courses
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
            <div className="text-sm text-slate-600">Average Rating</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats?.overview?.totalRatings ?? 0} total reviews
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
              Top Performing Courses
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
                          <span>{course.studentCount} students</span>
                          <span>{course.avgCompletion}% completion</span>
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
                <p>No courses yet. Create your first course to see performance metrics!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Recent Activity (30 days)
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
                        {activity.description} {activity.type === 'enrollment' ? 'enrolled in' : 'completed'} {activity.courseTitle}
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
                <p>No recent activity. Student enrollments and completions will appear here.</p>
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
              Engagement
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Watch Time</span>
                <span className="font-semibold text-slate-900">{formatTime(stats?.engagement?.totalWatchTime ?? 0)}</span>
              </div>
              <div className="text-xs text-slate-500">Total time students spent watching</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Lesson Completion</span>
                <span className="font-semibold text-slate-900">{stats?.engagement?.averageLessonCompletion ?? 0}%</span>
              </div>
              <div className="text-xs text-slate-500">Average progress per lesson</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Completed Lessons</span>
                <span className="font-semibold text-slate-900">{formatNumber(stats?.engagement?.completedLessons ?? 0)}</span>
              </div>
              <div className="text-xs text-slate-500">Total lessons finished</div>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Earnings
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Total Earnings</span>
                <span className="font-semibold text-slate-900">${(stats?.earnings?.totalEarnings ?? 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-500">All-time earnings</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">This Month</span>
                <span className="font-semibold text-slate-900">${(stats?.earnings?.monthlyEarnings ?? 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-500">Current month earnings</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Pending</span>
                <span className="font-semibold text-slate-900">${(stats?.earnings?.pendingPayments ?? 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-500">Awaiting payout</div>
            </div>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Monthly Trends
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
                      <div className="text-sm font-semibold text-slate-900">{month.enrollments} enrollments</div>
                      <div className="text-xs text-green-600">{month.completions} completed</div>
                    </div>
                  </div>
                )) ?? []}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 text-sm">
                No enrollment data yet
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
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      return result;
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
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      return result;
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
            <h1 className="text-3xl font-bold text-slate-900">Account Security</h1>
            <p className="text-slate-600 text-lg">Manage your password and account security settings</p>
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
              Change Password
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Regularly update your password to keep your account secure
            </p>
          </div>
          <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your current password"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter new password"
                  minLength={8}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Confirm new password"
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
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Change Password
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
              Security Settings
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Additional security options for your account
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-900">Two-Factor Authentication</h4>
                <p className="text-sm text-slate-600">Add an extra layer of security to your account</p>
              </div>
              <button className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                Coming Soon
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-900">Login Notifications</h4>
                <p className="text-sm text-slate-600">Get notified of new logins to your account</p>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-5 bg-slate-300 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5 transition-transform"></div>
                </div>
                <span className="ml-2 text-sm text-slate-600">Coming Soon</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-900">Session Management</h4>
                <p className="text-sm text-slate-600">View and manage your active sessions</p>
              </div>
              <button className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                View Sessions
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
              Danger Zone
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Irreversible and destructive actions
            </p>
          </div>

          <div className="p-6">
            {!showDeleteConfirm ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-900">Delete Account</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-red-100 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Confirm Account Deletion</h4>
                  <p className="text-sm text-red-800 mb-3">
                    This will permanently delete your account, all your courses, lessons, and data.
                    Type <strong>DELETE</strong> to confirm.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Type DELETE to confirm"
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
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending || deleteConfirmation !== 'DELETE'}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {deleteAccountMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Confirm Delete'
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
              Account Information
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Account Created</span>
              <span className="font-medium text-slate-900">
                {new Date().toLocaleDateString()} {/* Placeholder - should come from user data */}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Last Login</span>
              <span className="font-medium text-slate-900">
                Today {/* Placeholder */}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Account Status</span>
              <span className="font-medium text-green-600">Active</span>
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
            <h1 className="text-3xl font-bold text-slate-900">Notification Preferences</h1>
            <p className="text-slate-600 text-lg">Customize how and when you receive notifications</p>
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
              Email Notifications
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Choose which emails you'd like to receive
            </p>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                key: 'email_course_updates',
                label: 'Course Updates',
                description: 'Notifications about your course performance and student activity'
              },
              {
                key: 'email_student_messages',
                label: 'Student Messages',
                description: 'Direct messages from students enrolled in your courses'
              },
              {
                key: 'email_forum_replies',
                label: 'Forum Replies',
                description: 'Replies to your forum posts and discussions'
              },
              {
                key: 'email_weekly_digest',
                label: 'Weekly Digest',
                description: 'Weekly summary of your teaching activity and platform updates'
              },
              {
                key: 'email_marketing',
                label: 'Marketing & Promotions',
                description: 'Special offers, platform updates, and promotional content'
              }
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{label}</h4>
                  <p className="text-sm text-slate-600 mt-1">{description}</p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => handlePreferenceChange(key, !preferences[key as keyof typeof preferences])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences[key as keyof typeof preferences] ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences[key as keyof typeof preferences] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-600" />
              Push Notifications
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Browser notifications for important updates
            </p>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                key: 'push_course_activity',
                label: 'Course Activity',
                description: 'New enrollments and student progress updates'
              },
              {
                key: 'push_student_engagement',
                label: 'Student Engagement',
                description: 'Comments, questions, and interactions from students'
              },
              {
                key: 'push_forum_activity',
                label: 'Forum Activity',
                description: 'New replies and mentions in forum discussions'
              },
              {
                key: 'push_system_updates',
                label: 'System Updates',
                description: 'Platform maintenance, new features, and important announcements'
              }
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{label}</h4>
                  <p className="text-sm text-slate-600 mt-1">{description}</p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => handlePreferenceChange(key, !preferences[key as keyof typeof preferences])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences[key as keyof typeof preferences] ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences[key as keyof typeof preferences] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar - Communication Preferences */}
      <div className="space-y-6">
        {/* Communication Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Communication
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {[
              {
                key: 'allow_student_messages',
                label: 'Student Messages',
                description: 'Allow students to send you direct messages'
              },
              {
                key: 'allow_course_invitations',
                label: 'Course Invitations',
                description: 'Receive invitations to join other courses'
              },
              {
                key: 'public_profile_visible',
                label: 'Public Profile',
                description: 'Make your profile visible to other teachers'
              },
              {
                key: 'show_online_status',
                label: 'Online Status',
                description: 'Show when you are online to students'
              },
              {
                key: 'allow_analytics_tracking',
                label: 'Analytics Tracking',
                description: 'Help improve the platform with usage analytics'
              }
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-900">{label}</h4>
                  <p className="text-xs text-slate-600 mt-1">{description}</p>
                </div>
                <button
                  onClick={() => handlePreferenceChange(key, !preferences[key as keyof typeof preferences])}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ml-3 ${preferences[key as keyof typeof preferences] ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${preferences[key as keyof typeof preferences] ? 'translate-x-5' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Notification Summary</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Email notifications: {Object.entries(preferences).filter(([k, v]) => k.startsWith('email_') && v).length} enabled</p>
            <p>• Push notifications: {Object.entries(preferences).filter(([k, v]) => k.startsWith('push_') && v).length} enabled</p>
            <p>• Communication: {Object.entries(preferences).filter(([k, v]) => !k.startsWith('email_') && !k.startsWith('push_') && v).length} features enabled</p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveAll}
          disabled={updatePreferencesMutation.isPending}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          {updatePreferencesMutation.isPending ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save All Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// --- Main Container ---

const TeacherProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();
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
      return res?.data?.teacherProfile || {};
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: teacherApi.updateProfile,
    onSuccess: (res) => {
      if (res?.success) {
        // Invalidate and refetch profile data
        queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
        // Refresh user context
        refreshUser();
        showNotification({ title: t('common.success', 'Success'), message: t('teacher_profile.profile_updated', 'Profile updated successfully'), type: 'success' });
      }
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      showNotification({ title: t('common.error', 'Error'), message: t('teacher_profile.profile_update_failed', 'Failed to update profile. Please try again.'), type: 'error' });
    }
  });

  const profile = profileData || ({} as TeacherProfileType);
  const loading = profileLoading;
  const error = profileError;

  const handleUpdateProfile = async (data: Partial<TeacherProfileType>) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'payout', label: 'Payout', icon: CreditCard },
    { id: 'verification', label: 'Documents', icon: Shield },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
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
