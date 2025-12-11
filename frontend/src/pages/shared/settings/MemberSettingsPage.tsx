import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { brandColors } from '@/theme/brand';
import { Bell, Eye, EyeOff, Globe, Link as LinkIcon, Lock, MapPin, Mail, Settings, User } from 'lucide-react';

type Tab = 'profile' | 'social' | 'location' | 'notifications' | 'security';

const MemberSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isPublic, setIsPublic] = useState<boolean>(user?.isPublic !== false);
  const [notificationPreferences, setNotificationPreferences] = useState<any>(user?.notificationPreferences || { email: true, push: true, sms: false });
  const [saving, setSaving] = useState(false);

  const nav = useMemo(() => [
    { id: 'profile', icon: <User className="h-4 w-4" />, label: t('member_profile.title') },
    { id: 'social', icon: <LinkIcon className="h-4 w-4" />, label: t('common.social', 'Social') },
    { id: 'location', icon: <MapPin className="h-4 w-4" />, label: t('common.location', 'Location') },
    { id: 'notifications', icon: <Bell className="h-4 w-4" />, label: t('common.notifications') },
    { id: 'security', icon: <Lock className="h-4 w-4" />, label: t('common.security', 'Security') },
  ], [t]);

  const handleVisibilityToggle = () => {
    const next = !isPublic;
    setIsPublic(next);
  };

  const updateNotificationPref = (key: 'email' | 'push' | 'sms', value: boolean) => {
    setNotificationPreferences((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateUserProfile({
        isPublic,
        notificationPreferences
      });
      await refreshUser();
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => {
    if (activeTab === 'notifications') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-stone-200 rounded-lg p-4">
            <div>
              <p className="text-sm font-semibold text-stone-900">{t('member_profile.privacy_visibility_label')}</p>
              <p className="text-xs text-stone-600">{t('member_profile.privacy_visibility_hint')}</p>
            </div>
            <button
              type="button"
              onClick={handleVisibilityToggle}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {isPublic ? t('member_profile.visibility_make_private') : t('member_profile.visibility_make_public')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['email', 'push', 'sms'] as const).map(key => (
              <div key={key} className="border border-stone-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[color:#1e1b4b]" />
                    <p className="text-sm font-semibold text-stone-900">{t(`member_profile.notifications.${key}`)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateNotificationPref(key, !(notificationPreferences?.[key]))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[color:#1e1b4b] focus:ring-offset-2 ${
                      notificationPreferences?.[key] ? 'bg-[color:#1e1b4b]' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={notificationPreferences?.[key]}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notificationPreferences?.[key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-stone-600 mt-2">
                  {t(`member_profile.notifications.${key}_desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'profile') {
      return (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <p className="text-sm text-stone-600">{t('member_profile.subtitle')}</p>
          </div>
        </div>
      );
    }

    if (activeTab === 'social') {
      return (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[color:#1e1b4b]" />
              <div>
                <p className="text-sm font-semibold text-stone-900">{t('common.linked_accounts', 'Linked accounts')}</p>
                <p className="text-xs text-stone-600">{t('common.sso_hint', 'Connect Google or Apple for faster sign-in.')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-2 text-sm font-semibold rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50">
                Google
              </button>
              <button className="px-3 py-2 text-sm font-semibold rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50">
                Apple
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'location') {
      return (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[color:#1e1b4b]" />
              <p className="text-sm font-semibold text-stone-900">{t('common.location', 'Location')}</p>
            </div>
            <p className="text-xs text-stone-600 mt-2">{t('common.location_hint', 'Set your city/region to personalize content.')}</p>
          </div>
        </div>
      );
    }

    if (activeTab === 'security') {
      return (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4 flex items-center gap-3">
            <Shield className="h-4 w-4 text-[color:#1e1b4b]" />
            <div>
              <p className="text-sm font-semibold text-stone-900">{t('common.security', 'Security')}</p>
              <p className="text-xs text-stone-600">{t('common.security_hint', 'Manage 2FA and account safety from your profile page.')}</p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row overflow-hidden">
        <aside className="md:w-56 border-b md:border-b-0 md:border-r border-stone-200 bg-stone-50/70">
          <div className="px-4 py-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-[color:#1e1b4b]" />
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">{t('common.settings')}</p>
              <p className="text-sm font-semibold text-stone-900">{t('member_profile.title')}</p>
            </div>
          </div>
          <nav className="flex md:flex-col">
            {nav.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`flex-1 md:flex-none text-left px-4 py-3 flex items-center gap-2 text-sm font-semibold border-b md:border-b-0 md:border-l-4 transition-colors ${
                  activeTab === item.id
                    ? 'bg-white md:bg-[color:rgba(30,27,75,0.06)] border-[color:#1e1b4b] text-[color:#1e1b4b]'
                    : 'border-transparent text-stone-700 hover:bg-stone-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6 space-y-6">
          {renderContent()}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              <SaveIcon />
              {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

const SaveIcon = () => <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17 3a2 2 0 00-2-2H5a2 2 0 00-2 2v14l7-3 7 3V3z" /></svg>;

export default MemberSettingsPage;



