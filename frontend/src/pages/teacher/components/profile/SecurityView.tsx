import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, ArrowLeft, Clock, Check, Settings, AlertCircle, User
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import teacherApi from '@/services/api/teacherApi';
import type { TeacherProfile as TeacherProfileType } from '@/services/api/teacherApi';
import { brandColors } from '@/theme/brand';

type TeacherProfileData = TeacherProfileType;

interface SecurityViewProps {
  profile: TeacherProfileData;
  onBack: () => void;
}

const SecurityView: React.FC<SecurityViewProps> = ({ profile, onBack }) => {
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
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('teacher_security.title', 'Account Security')}</h1>
            <p className="text-gray-600 text-lg">{t('teacher_security.subtitle', 'Manage your password and account security settings')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Change Password */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              {t('teacher_security.change_password_title', 'Change Password')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t('teacher_security.change_password_description', 'Regularly update your password to keep your account secure')}
            </p>
          </div>
          <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('teacher_security.current_password_label', 'Current Password')} *
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                placeholder={t('teacher_security.current_password_placeholder', 'Enter your current password')}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('teacher_security.new_password_label', 'New Password')} *
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  placeholder={t('teacher_security.new_password_placeholder', 'Enter new password')}
                  minLength={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('teacher_security.password_length_hint', 'Must be at least 8 characters long')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('teacher_security.confirm_password_label', 'Confirm New Password')} *
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
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
                className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
                style={{ backgroundColor: brandColors.primaryHex }}
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              {t('teacher_security.security_settings_title', 'Security Settings')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t('teacher_security.security_settings_description', 'Additional security options for your account')}
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{t('teacher_security.two_factor_auth_title', 'Two-Factor Authentication')}</h4>
                <p className="text-sm text-gray-600">{t('teacher_security.two_factor_auth_description', 'Add an extra layer of security to your account')}</p>
              </div>
              <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                {t('teacher_security.coming_soon', 'Coming Soon')}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{t('teacher_security.login_notifications_title', 'Login Notifications')}</h4>
                <p className="text-sm text-gray-600">{t('teacher_security.login_notifications_description', 'Get notified of new logins to your account')}</p>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-5 bg-gray-300 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5 transition-transform"></div>
                </div>
                <span className="ml-2 text-sm text-gray-600">{t('teacher_security.coming_soon', 'Coming Soon')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{t('teacher_security.session_management_title', 'Session Management')}</h4>
                <p className="text-sm text-gray-600">{t('teacher_security.session_management_description', 'View and manage your active sessions')}</p>
              </div>
              <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4" style={{ color: brandColors.primaryHex }} />
              {t('teacher_security.account_info_title', 'Account Information')}
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('teacher_security.account_created', 'Account Created')}</span>
              <span className="font-medium text-gray-900">
                {new Date().toLocaleDateString()} {/* Placeholder - should come from user data */}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('teacher_security.last_login', 'Last Login')}</span>
              <span className="font-medium text-gray-900">
                {t('teacher_security.today', 'Today')} {/* Placeholder */}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('teacher_security.account_status', 'Account Status')}</span>
              <span className="font-medium text-green-600">{t('teacher_security.status_active', 'Active')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityView;
