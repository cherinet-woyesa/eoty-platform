import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { authApi, activityApi } from '@/services/api';
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Save, Camera, CheckCircle, 
  AlertCircle, Loader2, X, BookOpen, Target, Heart, Lock, Shield, Eye, EyeOff, Bell, Link as LinkIcon, Globe2, MapPin as MapPinIcon, ExternalLink,
  LayoutDashboard, Settings, Award, Clock, TrendingUp, BarChart3, Check, Trash2, Smartphone, Map
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { brandColors } from '@/theme/brand';
import type { ActivityLog } from '@/services/api/activity';
import { useNotification } from '@/context/NotificationContext';

// --- Types ---

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  phone?: string;
  location?: string;
  profilePicture?: string;
  interests?: string[];
  learningGoals?: string;
  dateOfBirth?: string;
  isPublic?: boolean;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  notificationPreferences?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  is2FAEnabled?: boolean;
  profileVisibility?: 'public' | 'friends' | 'private';
  linksPublicDefault?: boolean;
  allowLinkedProfiles?: boolean;
  shareLocation?: boolean;
  preferredPublicLocation?: string;
  timeZone?: string;
  socialLinks?: { label?: string; url: string; visible?: boolean }[];
  recentMedia?: { url: string; title?: string; visible?: boolean }[];
  linkedAccounts?: { provider: string; connected: boolean }[];
  locationConsent?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  website?: string;
  linkedin?: string;
  twitter?: string;
}

// --- Components ---

const InterestEditor: React.FC<{ initial: string[]; onSave: (interests: string[]) => void }> = ({ initial, onSave }) => {
  const [items, setItems] = useState<string[]>(initial || []);
  const [newItem, setNewItem] = useState('');
  const { t } = useTranslation();

  useEffect(() => setItems(initial || []), [initial]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
          style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder={t('student_profile.interests.placeholder', 'Add an interest (e.g. Bible Study, History)')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItem.trim() && items.length < 10) {
              const updated = [...items, newItem.trim()].filter(Boolean); setItems(updated); onSave(updated); setNewItem('');
            }
          }}
        />
        <button
          className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-colors font-medium"
          style={{ backgroundColor: brandColors.primaryHex }}
          disabled={!newItem.trim() || items.length >= 10}
          onClick={() => { const updated = [...items, newItem.trim()].filter(Boolean); setItems(updated); setNewItem(''); onSave(updated); }}
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border group transition-colors bg-gray-50"
               style={{ borderColor: brandColors.primaryHex }}>
            <span className="text-sm font-medium" style={{ color: brandColors.primaryHex }}>{s}</span>
            <button
              className="text-gray-400 hover:text-red-600 transition-colors p-0.5 rounded-full hover:bg-red-50"
              onClick={() => { const updated = items.filter((_, i) => i !== idx); setItems(updated); onSave(updated); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500 italic w-full">{t('student_profile.interests.no_interests', 'No interests added yet.')}</p>
        )}
      </div>
    </div>
  );
};

const DashboardView: React.FC<{
  user: any;
  profile: ProfileData;
  activityLogs: ActivityLog[];
  onNavigate: (view: string) => void;
  onUpdate: (data: Partial<ProfileData>) => Promise<void>;
  onAvatarUpdated?: () => Promise<void>;
}> = ({ user, profile, activityLogs, onNavigate, onUpdate, onAvatarUpdated }) => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState(profile);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification({ title: 'Error', message: 'Image size should be less than 5MB', type: 'error' });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => setPreviewAvatar(reader.result as string);
      reader.readAsDataURL(file);

      try {
        const response = await authApi.uploadProfileImage(file);
        if (response.success && response.data?.profilePicture) {
          await onUpdate({ profilePicture: response.data.profilePicture });
          if (onAvatarUpdated) await onAvatarUpdated();
          showNotification({ title: 'Success', message: 'Profile picture updated', type: 'success' });
        }
      } catch (error) {
        console.error('Failed to upload avatar:', error);
        setPreviewAvatar(null);
        showNotification({ title: 'Error', message: 'Failed to upload profile picture', type: 'error' });
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(formData);
      showNotification({ title: 'Success', message: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      showNotification({ title: 'Error', message: 'Failed to save profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const stats = [
    { label: t('student_profile.stats.courses', 'Courses'), value: 0, icon: BookOpen },
    { label: t('student_profile.stats.completed', 'Completed'), value: 0, icon: CheckCircle },
    { label: t('student_profile.stats.certificates', 'Certificates'), value: 0, icon: Award },
    { label: t('student_profile.stats.hours', 'Learning Hours'), value: 0, icon: Clock }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {/* Left Column - Main Info */}
      <div className="lg:col-span-2 space-y-6">
        {/* Welcome Section & Stats Combined */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Target className="h-48 w-48 transform translate-x-12 -translate-y-12" style={{ color: brandColors.primaryHex }} />
            </div>
            <div className="relative z-10 flex items-start gap-6">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden flex-shrink-0">
                  {(previewAvatar || profile.profilePicture || user?.avatar) ? (
                    <img src={previewAvatar || profile.profilePicture || user?.avatar} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gray-100 text-2xl font-bold" style={{ color: brandColors.primaryHex }}>
                      {user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'S'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Camera className="h-4 w-4 text-gray-600" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </div>
              <div className="pt-2">
                <h1 className="text-3xl font-bold font-display text-gray-900">
                  {t('student_profile.welcome_back', 'Welcome back, {{name}}!', { name: profile.firstName || user?.name?.split(' ')[0] })}
                </h1>
                <p className="text-gray-600 mt-1 text-lg">
                  {t('student_profile.subtitle', 'Track your learning journey and manage your profile.')}
                </p>
              </div>
            </div>
          </div>
          
          {/* Integrated Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-gray-100 bg-gray-50/50 divide-x divide-gray-100">
            {stats.map((stat, idx) => (
              <div key={idx} className="p-4 flex flex-col items-center text-center hover:bg-gray-50 transition-colors">
                <div className="text-2xl font-bold text-gray-900 font-mono mb-1">{stat.value}</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <stat.icon className="h-3 w-3" style={{ color: brandColors.primaryHex }} />
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-white/95 backdrop-blur border-b border-gray-100 p-6 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              {t('student_profile.details_title', 'Profile Details')}
            </h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.first_name', 'First Name')}</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.last_name', 'Last Name')}</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.bio', 'Bio')}</label>
              <textarea
                value={formData.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent min-h-[100px]"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                placeholder={t('student_profile.bio_placeholder', 'Tell us about yourself...')}
              />
            </div>

            {/* Contact Info */}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.email', 'Email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.phone', 'Phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.dob', 'Date of Birth')}</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth ? formData.dateOfBirth.slice(0, 10) : ''}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.website', 'Website')}</label>
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                Location
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.address', 'Address')}</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.city', 'City')}</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.state', 'State/Region')}</label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.country', 'Country')}</label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => updateField('country', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.zip', 'Zip/Postal Code')}</label>
                  <input
                    type="text"
                    value={formData.zipCode || ''}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-gray-500" />
                Social Profiles
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">LinkedIn</label>
                  <input
                    type="url"
                    value={formData.linkedin || ''}
                    onChange={(e) => updateField('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Twitter / X</label>
                  <input
                    type="url"
                    value={formData.twitter || ''}
                    onChange={(e) => updateField('twitter', e.target.value)}
                    placeholder="https://twitter.com/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>

            {/* Interests & Goals */}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Heart className="h-4 w-4 text-gray-500" />
                Interests & Goals
              </h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.interests', 'Interests')}</label>
                  <InterestEditor
                    initial={formData.interests || []}
                    onSave={(interests) => updateField('interests', interests)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t('student_profile.learning_goals', 'Learning Goals')}</label>
                  <textarea
                    value={formData.learningGoals}
                    onChange={(e) => updateField('learningGoals', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent min-h-[80px]"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                    placeholder={t('student_profile.goals_placeholder', 'What do you hope to achieve?')}
                  />
                </div>
              </div>
            </div>
          </div>

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
                  <span>{t('common.saving', 'Saving...')}</span>
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

      {/* Right Column - Sidebar */}
      <div className="space-y-6">
        {/* Activity Log */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            {t('student_profile.recent_activity', 'Recent Activity')}
          </h3>
          <div className="space-y-4">
            {activityLogs.length === 0 ? (
              <p className="text-sm text-gray-500 italic">{t('student_profile.no_activity', 'No recent activity')}</p>
            ) : (
              activityLogs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="mt-1 h-2 w-2 rounded-full bg-gray-300 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800">{log.description}</p>
                    <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-xl shadow-md p-6 text-white relative overflow-hidden" style={{ backgroundColor: brandColors.primaryHex }}>
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-2">{t('student_profile.explore.title', 'Explore Courses')}</h3>
            <p className="text-white/80 text-sm mb-4">{t('student_profile.explore.desc', 'Discover new courses to expand your knowledge.')}</p>
            <button 
              onClick={() => onNavigate('courses')}
              className="w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg text-sm font-semibold transition-colors"
            >
              {t('student_profile.explore.btn', 'Browse Catalog')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountSettingsView: React.FC<{
  profile: ProfileData;
  onUpdate: (data: Partial<ProfileData>) => Promise<void>;
}> = ({ profile, onUpdate }) => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(profile);
  const [is2FA, setIs2FA] = useState(profile.is2FAEnabled);

  useEffect(() => {
    setFormData(profile);
    setIs2FA(profile.is2FAEnabled);
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(formData);
      showNotification({ title: 'Success', message: 'Settings updated successfully', type: 'success' });
    } catch (error) {
      showNotification({ title: 'Error', message: 'Failed to save settings', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggle2FA = async () => {
    try {
      const newVal = !is2FA;
      setIs2FA(newVal);
      await onUpdate({ is2FAEnabled: newVal });
      showNotification({ title: 'Success', message: `2FA ${newVal ? 'enabled' : 'disabled'}`, type: 'success' });
    } catch (error) {
      setIs2FA(!is2FA);
      showNotification({ title: 'Error', message: 'Failed to update 2FA settings', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            {t('student_profile.notifications', 'Notifications')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Manage how you receive notifications.</p>
        </div>
        <div className="p-6 space-y-4">
          {['email', 'push', 'sms'].map((type) => (
            <div key={type} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 capitalize">{type} Notifications</p>
                <p className="text-sm text-gray-500">Receive updates via {type}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={(formData.notificationPreferences as any)?.[type]}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    notificationPreferences: { ...prev.notificationPreferences, [type]: e.target.checked }
                  }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" style={{ backgroundColor: (formData.notificationPreferences as any)?.[type] ? brandColors.primaryHex : undefined }}></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            {t('student_profile.privacy', 'Privacy')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Control who can see your profile.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Profile Visibility</p>
              <p className="text-sm text-gray-500">Who can view your profile details</p>
            </div>
            <select 
              value={formData.profileVisibility}
              onChange={(e) => setFormData(prev => ({ ...prev, profileVisibility: e.target.value as any }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Share Location</p>
              <p className="text-sm text-gray-500">Allow others to see your general location</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={formData.shareLocation} onChange={e => setFormData(prev => ({ ...prev, shareLocation: e.target.checked }))} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" style={{ backgroundColor: formData.shareLocation ? brandColors.primaryHex : undefined }}></div>
            </label>
          </div>
        </div>
      </div>

      {/* Security (Merged) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Lock className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            {t('student_profile.security', 'Security')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Manage your account security.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={is2FA} onChange={toggle2FA} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" style={{ backgroundColor: is2FA ? brandColors.primaryHex : undefined }}></div>
            </label>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h4 className="font-medium text-gray-900 mb-4">Linked Accounts</h4>
            <div className="space-y-3">
              {['Google', 'Apple'].map((provider) => {
                const isConnected = profile.linkedAccounts?.some(a => a.provider.toLowerCase() === provider.toLowerCase() && a.connected);
                return (
                  <div key={provider} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                        {provider[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{provider}</p>
                        <p className="text-xs text-gray-500">{isConnected ? 'Connected' : 'Not connected'}</p>
                      </div>
                    </div>
                    <button 
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        isConnected 
                          ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                          : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                      }`}
                      onClick={() => showNotification({ title: 'Info', message: 'Linked account management coming soon', type: 'info' })}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: brandColors.primaryHex }}
        >
          {isSaving ? (
            <>
              <LoadingSpinner size="sm" color="white" />
              <span>{t('common.saving', 'Saving...')}</span>
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
  );
};

const StudentProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user: userFromUserContext } = useUser();
  const { user: userFromAuth, refreshUser: refreshAuthUser } = useAuth();
  const user = userFromAuth || userFromUserContext;
  
  const [activeView, setActiveView] = useState('dashboard');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await refreshAuthUser();
        // Load activity logs
        const logsRes = await activityApi.getActivityLogs({ limit: 10 });
        if (logsRes?.success) setActivityLogs(logsRes.data.logs || []);
      } catch (err) {
        console.warn('Failed to load profile data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      // Parse social links from backend format
      const socialLinks = (user as any).socialLinks || [];
      const getLink = (platform: string) => {
        if (Array.isArray(socialLinks)) {
          return socialLinks.find((l: any) => l.platform === platform)?.url || '';
        }
        return '';
      };

      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        bio: (user as any).bio || '',
        profilePicture: (user as any).profilePicture || '',
        interests: (user as any).interests || [],
        learningGoals: (user as any).learningGoals || '',
        phone: (user as any).phone || '',
        location: (user as any).location || '',
        dateOfBirth: (user as any).dateOfBirth || '',
        address: (user as any).address || '',
        city: (user as any).city || '',
        state: (user as any).state || '',
        country: (user as any).country || '',
        zipCode: (user as any).zipCode || '',
        // Map social links
        website: getLink('website'),
        linkedin: getLink('linkedin'),
        twitter: getLink('twitter'),
        notificationPreferences: (user as any).notificationPreferences || { email: true, push: true, sms: false },
        is2FAEnabled: (user as any).is2FAEnabled || false,
        profileVisibility: (user as any).profileVisibility || 'public',
        shareLocation: (user as any).shareLocation || false,
        linkedAccounts: (user as any).linkedAccounts || [],
      } as ProfileData);
    }
  }, [user]);

  const handleUpdateProfile = async (data: Partial<ProfileData>) => {
    try {
      // Transform social links if any are present
      const updatedData: any = { ...data };
      
      // Check if we need to update social links
      if ('website' in data || 'linkedin' in data || 'twitter' in data) {
        const newSocialLinks = [];
        
        // Reconstruct from data + current profileData
        const website = 'website' in data ? data.website : profileData?.website;
        const linkedin = 'linkedin' in data ? data.linkedin : profileData?.linkedin;
        const twitter = 'twitter' in data ? data.twitter : profileData?.twitter;

        if (website) newSocialLinks.push({ platform: 'website', url: website });
        if (linkedin) newSocialLinks.push({ platform: 'linkedin', url: linkedin });
        if (twitter) newSocialLinks.push({ platform: 'twitter', url: twitter });

        updatedData.socialLinks = newSocialLinks;
        
        // Clean up individual fields so they don't confuse the backend
        delete updatedData.website;
        delete updatedData.linkedin;
        delete updatedData.twitter;
      }

      await authApi.updateUserProfile(updatedData);
      await refreshAuthUser();
    } catch (err) {
      console.error('Failed to update profile', err);
      throw err;
    }
  };

  if (loading || !profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: t('student_profile.menu.dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'settings', label: t('student_profile.menu.settings', 'Account Settings'), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">{t('student_profile.title', 'My Profile')}</h1>
              </div>
              <nav className="hidden sm:ml-8 sm:flex sm:space-x-8">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      activeView === item.id
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                    style={activeView === item.id ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex } : {}}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'dashboard' && (
          <DashboardView 
            user={user} 
            profile={profileData} 
            activityLogs={activityLogs}
            onNavigate={setActiveView}
            onUpdate={handleUpdateProfile}
            onAvatarUpdated={refreshAuthUser}
          />
        )}
        {activeView === 'settings' && (
          <AccountSettingsView profile={profileData} onUpdate={handleUpdateProfile} />
        )}
      </main>
    </div>
  );
};

export default StudentProfile;