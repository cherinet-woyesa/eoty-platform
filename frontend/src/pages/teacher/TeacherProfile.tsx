import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { authApi, teacherApi } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Save, Camera, Edit3, CheckCircle, 
  AlertCircle, Loader2, X, Shield, FileText, ListChecks, Globe, CreditCard
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { brandColors } from '@/theme/brand';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  phone?: string;
  location?: string;
  profilePicture?: string;
  specialties?: string[];
  teachingExperience?: number;
  education?: string;
}

type DocStatus = 'ACTION_REQUIRED' | 'PENDING' | 'VERIFIED';

const docBadge = (status: DocStatus, label: string) => {
  const color =
    status === 'VERIFIED'
      ? 'text-green-700 bg-green-50 border-green-200'
      : status === 'PENDING'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-red-700 bg-red-50 border-red-200';
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${color}`}>
      {label}
    </span>
  );
};

const TeacherProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();
  const { refreshUser: refreshAuthUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    phone: '',
    location: '',
    profilePicture: '',
    specialties: [],
    teachingExperience: 0,
    education: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUpdatingProfilePictureRef = useRef(false);
  const [teacherProfile, setTeacherProfile] = useState<any>({});
  const [loadingProfileExtras, setLoadingProfileExtras] = useState<boolean>(true);

  // Load user profile data
  useEffect(() => {
    if (user && !isUpdatingProfilePictureRef.current) {
      setProfileData(prev => ({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
        // Use user's profilePicture if available, otherwise keep existing
        profilePicture: user.profilePicture || prev.profilePicture || '',
        specialties: user.specialties || [],
        teachingExperience: user.teachingExperience || 0,
        education: user.education || ''
      }));
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const loadExtras = async () => {
      try {
        const res = await teacherApi.getProfile();
        if (res?.success) {
          setTeacherProfile(res.data.teacherProfile || {});
        }
      } catch (err) {
        console.warn('Failed to load teacher profile extras', err);
      } finally {
        setLoadingProfileExtras(false);
      }
    };
    loadExtras();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !profileData.specialties?.includes(newSpecialty.trim())) {
      setProfileData(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []), newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setProfileData(prev => ({
      ...prev,
      specialties: (prev.specialties || []).filter(s => s !== specialty)
    }));
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError(t('teacher_profile.errors.invalid_file_type'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('teacher_profile.errors.file_too_large'));
      return;
    }

    setIsUploading(true);
    setError(null);
    isUpdatingProfilePictureRef.current = true;

    try {
      // Upload profile image to backend
      const response = await authApi.uploadProfileImage(file);
      
      if (response.success && response.data?.profilePicture) {
        const newProfilePictureUrl = response.data.profilePicture;
        
        // Update profile picture in state immediately with the URL from backend
        setProfileData(prev => ({
          ...prev,
          profilePicture: newProfilePictureUrl
        }));
        
        // Refresh user data in both contexts to get updated profile picture
        await Promise.all([refreshUser(), refreshAuthUser()]);
        
        // Small delay to ensure contexts are updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Ensure the profile picture is set after refresh
        setProfileData(prev => ({
          ...prev,
          profilePicture: newProfilePictureUrl
        }));
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Failed to upload profile picture:', err);
      setError(err.response?.data?.message || err.message || t('teacher_profile.errors.upload_failed'));
    } finally {
      setIsUploading(false);
      isUpdatingProfilePictureRef.current = false;
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      // Update profile with empty profilePicture
      const updatedProfileData = {
        ...profileData,
        profilePicture: ''
      };
      
      // Update the user profile via API
      const response = await authApi.updateUserProfile(updatedProfileData);
      
      if (response.success) {
        // Update local state
        setProfileData(prev => ({
          ...prev,
          profilePicture: ''
        }));
        
        // Refresh user data in both contexts
        await Promise.all([refreshUser(), refreshAuthUser()]);
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(response.message || 'Failed to remove profile picture');
      }
    } catch (err: any) {
      console.error('Failed to remove profile picture:', err);
      setError(err.response?.data?.message || err.message || t('teacher_profile.errors.remove_failed'));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Prepare profile data for submission
      const profileToUpdate = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        bio: profileData.bio,
        phone: profileData.phone,
        location: profileData.location,
        profilePicture: profileData.profilePicture,
        specialties: profileData.specialties,
        teachingExperience: profileData.teachingExperience,
        education: profileData.education
      };

      // Update user profile via API
      const response = await authApi.updateUserProfile(profileToUpdate);
      
      if (response.success && response.data?.user) {
        // Update local state directly from response to avoid session issues
        const updatedUser = response.data.user;
        setProfileData(prev => ({
          ...prev,
          firstName: updatedUser.firstName || prev.firstName,
          lastName: updatedUser.lastName || prev.lastName,
          bio: updatedUser.bio || prev.bio,
          phone: updatedUser.phone || prev.phone,
          location: updatedUser.location || prev.location,
          profilePicture: updatedUser.profilePicture || prev.profilePicture,
          specialties: updatedUser.specialties || prev.specialties,
          teachingExperience: updatedUser.teachingExperience || prev.teachingExperience,
          education: updatedUser.education || prev.education
        }));
        
        // Refresh user contexts in background (non-blocking)
        // Use try-catch to prevent errors from affecting the UI
        Promise.all([
          refreshUser().catch(err => console.warn('Failed to refresh UserContext:', err)),
          refreshAuthUser().catch(err => console.warn('Failed to refresh AuthContext:', err))
        ]).catch(() => {
          // Silently handle any errors - user data is already updated locally
        });
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(t('teacher_profile.errors.save_failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <LoadingSpinner size="lg" text={t('teacher_profile.loading')} variant="logo" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] p-4 sm:p-6 lg:p-8 font-serif">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl p-8 border border-[#d4af37]/30 shadow-sm relative overflow-hidden">
          {/* EOTC Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#d4af37] via-[#8b0000] to-[#d4af37]"></div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#d4af37]/5 rounded-full blur-3xl"></div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-[#d4af37]/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300"></div>
              <div className="relative p-4 bg-white rounded-full border-2 border-[#d4af37]/40 shadow-sm">
                <User className="h-8 w-8 text-[#8b0000]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#2c1810] tracking-tight font-serif">{t('teacher_profile.title')}</h1>
              <p className="text-[#5d4037] mt-2 text-lg">{t('teacher_profile.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Onboarding + Verification + Payout */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/80 p-6 space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-[color:#1e1b4b]" />
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">{t('teacher_profile.welcome_label')}</p>
                <h2 className="text-xl font-semibold text-stone-900">{t('teacher_profile.welcome_title', { name: user?.firstName || '' })}</h2>
                <p className="text-sm text-stone-600">{t('teacher_profile.welcome_subtitle')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 border border-stone-200 rounded-lg bg-stone-50/60">
                <div className="flex items-center gap-2 mb-2">
                  <ListChecks className="h-5 w-5 text-[color:#1e1b4b]" />
                  <p className="text-sm font-semibold text-stone-900">{t('teacher_profile.checklist.title')}</p>
                </div>
                <ul className="space-y-2 text-sm text-stone-700">
                  {(teacherProfile.onboarding_status?.steps || [
                    { key: 'identity', label: t('teacher_profile.checklist.identity'), done: false },
                    { key: 'docs', label: t('teacher_profile.checklist.docs'), done: false },
                    { key: 'payout', label: t('teacher_profile.checklist.payout'), done: false }
                  ]).map((step: any) => (
                    <li key={step.key} className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${step.done ? 'bg-green-500' : 'bg-amber-400'}`} />
                      <span className={step.done ? 'text-stone-500 line-through' : ''}>{step.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 border border-stone-200 rounded-lg bg-stone-50/60">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-[color:#1e1b4b]" />
                  <p className="text-sm font-semibold text-stone-900">{t('teacher_profile.verification.title')}</p>
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'national_id', label: t('teacher_profile.verification.national_id'), status: teacherProfile.verification_docs?.national_id || 'ACTION_REQUIRED' },
                    { key: 'ordination', label: t('teacher_profile.verification.ordination'), status: teacherProfile.verification_docs?.ordination || 'PENDING' },
                    { key: 'teaching_license', label: t('teacher_profile.verification.license'), status: teacherProfile.verification_docs?.teaching_license || 'VERIFIED' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between text-sm">
                      <span className="text-stone-700">{item.label}</span>
                      {docBadge(item.status, t(`teacher_profile.verification.status.${item.status.toLowerCase()}`))}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center justify-center px-3 py-2 text-sm font-semibold text-white rounded-lg"
                  style={{ backgroundColor: brandColors.primaryHex }}
                  onClick={() => document.getElementById('verification-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('teacher_profile.verification.cta')}
                </button>
              </div>
              <div className="p-4 border border-stone-200 rounded-lg bg-stone-50/60">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-[color:#1e1b4b]" />
                  <p className="text-sm font-semibold text-stone-900">{t('teacher_profile.payout.title')}</p>
                </div>
                <p className="text-sm text-stone-700 mb-2">{t('teacher_profile.payout.subtitle')}</p>
                <div className="flex items-center gap-2 text-sm text-stone-700">
                  <Globe className="h-4 w-4 text-stone-500" />
                  <span>{teacherProfile.payout_region || t('teacher_profile.payout.region_placeholder')}</span>
                </div>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center justify-center px-3 py-2 text-sm font-semibold text-white rounded-lg"
                  style={{ backgroundColor: brandColors.primaryHex }}
                  onClick={() => document.getElementById('payout-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('teacher_profile.payout.cta')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#e0e0e0]">
          {error && (
            <div className="mx-8 mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mx-8 mt-8 bg-green-50 border-l-4 border-[#2e7d32] p-4 rounded-r-md">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-[#2e7d32]" />
              <span className="text-[#1b5e20] font-medium">{t('teacher_profile.success_update')}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="p-8 space-y-8">
          {/* Verification & Documents */}
          <div id="verification-section" className="bg-[#f8fafc] rounded-lg p-6 border border-stone-200">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-[color:#1e1b4b]" />
              <h2 className="text-xl font-semibold text-stone-900">{t('teacher_profile.verification.section_title')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'national_id', label: t('teacher_profile.verification.national_id') },
                { key: 'ordination', label: t('teacher_profile.verification.ordination') },
                { key: 'teaching_license', label: t('teacher_profile.verification.license') },
              ].map(item => {
                const status = teacherProfile.verification_docs?.[item.key] || 'ACTION_REQUIRED';
                return (
                  <div key={item.key} className="p-4 bg-white rounded-lg border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-800">{item.label}</p>
                      {docBadge(status, t(`teacher_profile.verification.status.${status.toLowerCase()}`))}
                    </div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-white rounded-lg px-3 py-2"
                      style={{ backgroundColor: brandColors.primaryHex }}
                      onClick={async () => {
                        const nextStatus: DocStatus = status === 'ACTION_REQUIRED' ? 'PENDING' : status === 'PENDING' ? 'VERIFIED' : 'VERIFIED';
                        const next = {
                          ...teacherProfile.verification_docs,
                          [item.key]: nextStatus
                        };
                        setTeacherProfile((prev: any) => ({ ...prev, verification_docs: next }));
                        await teacherApi.updateProfile({ verificationDocs: next });
                      }}
                    >
                      {status === 'VERIFIED' ? t('teacher_profile.verification.reupload') : t('teacher_profile.verification.upload')}
                    </button>
                    <p className="text-xs text-stone-500">{t('teacher_profile.verification.hint')}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payout Setup */}
          <div id="payout-section" className="bg-white rounded-lg p-6 border border-stone-200 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[color:#1e1b4b]" />
              <h2 className="text-xl font-semibold text-stone-900">{t('teacher_profile.payout.section_title')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t('teacher_profile.payout.region')}</label>
                <select
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:#1e1b4b] focus:border-[color:#1e1b4b]"
                  value={teacherProfile.payout_region || ''}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setTeacherProfile((prev: any) => ({ ...prev, payout_region: val }));
                    await teacherApi.updateProfile({ payoutRegion: val });
                  }}
                >
                  <option value="">{t('teacher_profile.payout.region_placeholder')}</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="ET">Ethiopia</option>
                  <option value="CA">Canada</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t('teacher_profile.payout.method')}</label>
                <select
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:#1e1b4b] focus:border-[color:#1e1b4b]"
                  value={teacherProfile.payout_method || ''}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setTeacherProfile((prev: any) => ({ ...prev, payout_method: val }));
                    await teacherApi.updateProfile({ payoutMethod: val });
                  }}
                >
                  <option value="">{t('teacher_profile.payout.method_placeholder')}</option>
                  <option value="bank">{t('teacher_profile.payout.bank_transfer')}</option>
                  <option value="stripe">Stripe Connect</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t('teacher_profile.payout.status')}</label>
                <div className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 bg-stone-50/60">
                  {teacherProfile.payout_method ? t('teacher_profile.payout.in_progress') : t('teacher_profile.payout.not_started')}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Picture Section */}
          <div className="bg-[#fdfbf7] rounded-lg p-6 border border-[#d4af37]/20">
            <h2 className="text-xl font-semibold text-[#2c1810] mb-4 font-serif border-b border-[#d4af37]/20 pb-2">{t('teacher_profile.profile_picture.title')}</h2>
            <div className="flex items-center space-x-8">
              <div className="relative group">
                {profileData.profilePicture ? (
                  <>
                    <div className="relative">
                      <img 
                        key={profileData.profilePicture}
                        src={profileData.profilePicture} 
                        alt="Profile" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-[#d4af37]/30"
                        onError={(e) => {
                          console.error('Failed to load profile picture:', profileData.profilePicture);
                          // Fallback to initials if image fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveProfilePicture}
                      className="absolute -top-2 -right-2 bg-[#8b0000] rounded-full p-1.5 shadow-md hover:bg-[#a00000] transition-colors z-10"
                      aria-label="Remove profile picture"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#d4af37] to-[#8b0000] flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md ring-2 ring-[#d4af37]/30">
                    {profileData.firstName?.charAt(0)}{profileData.lastName?.charAt(0)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleProfilePictureClick}
                  className="absolute bottom-0 right-0 bg-white rounded-full p-2.5 shadow-md hover:bg-[#fdfbf7] transition-colors border border-[#d4af37]/30"
                  aria-label="Change profile picture"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 text-[#d4af37] animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-[#5d4037]" />
                  )}
                </button>
              </div>
              <div>
                <p className="text-sm text-[#5d4037] mb-3">{t('teacher_profile.profile_picture.description')}</p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleProfilePictureClick}
                    className="px-5 py-2.5 bg-white border border-[#d4af37]/50 rounded-lg text-sm font-medium text-[#5d4037] hover:bg-[#fdfbf7] hover:border-[#d4af37] transition-all shadow-sm disabled:opacity-50"
                    disabled={isUploading}
                  >
                    {isUploading ? t('teacher_profile.profile_picture.uploading') : t('teacher_profile.profile_picture.upload_btn')}
                  </button>
                  {profileData.profilePicture && (
                    <button
                      type="button"
                      onClick={handleRemoveProfilePicture}
                      className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors shadow-sm"
                    >
                      {t('teacher_profile.profile_picture.remove_btn')}
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePictureChange}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-[#fdfbf7] rounded-lg p-6 border border-[#d4af37]/20">
            <h2 className="text-xl font-semibold text-[#2c1810] mb-6 font-serif border-b border-[#d4af37]/20 pb-2">{t('teacher_profile.basic_info.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-[#5d4037] mb-2">
                  {t('teacher_profile.basic_info.first_name')}
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-[#5d4037] mb-2">
                  {t('teacher_profile.basic_info.last_name')}
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-[#5d4037] mb-2">
                  {t('teacher_profile.basic_info.email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-[#d4af37]" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-[#d4af37]/20 rounded-lg text-gray-500 cursor-not-allowed"
                    required
                    disabled
                  />
                </div>
                <p className="text-xs text-[#8b0000]/70 mt-1 italic">{t('teacher_profile.basic_info.email_note')}</p>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-[#5d4037] mb-2">
                  {t('teacher_profile.basic_info.phone')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-[#d4af37]" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-[#5d4037] mb-2">
                  {t('teacher_profile.basic_info.location')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-[#d4af37]" />
                  </div>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={profileData.location}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-[#fdfbf7] rounded-lg p-6 border border-[#d4af37]/20">
            <h2 className="text-xl font-semibold text-[#2c1810] mb-6 font-serif border-b border-[#d4af37]/20 pb-2">{t('teacher_profile.professional_info.title')}</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-[#5d4037] mb-2">
                  {t('teacher_profile.professional_info.bio')}
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={profileData.bio}
                  onChange={handleInputChange}
                  placeholder={t('teacher_profile.professional_info.bio_placeholder')}
                  className="w-full px-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label htmlFor="education" className="block text-sm font-medium text-[#5d4037] mb-2">
                  {t('teacher_profile.professional_info.education')}
                </label>
                <input
                  type="text"
                  id="education"
                  name="education"
                  value={profileData.education}
                  onChange={handleInputChange}
                  placeholder={t('teacher_profile.professional_info.education_placeholder')}
                  className="w-full px-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label htmlFor="teachingExperience" className="block text-sm font-medium text-[#5d4037] mb-2">
                  {t('teacher_profile.professional_info.experience')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-[#d4af37]" />
                  </div>
                  <input
                    type="number"
                    id="teachingExperience"
                    name="teachingExperience"
                    value={profileData.teachingExperience}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5d4037] mb-2">
                  {t('teacher_profile.professional_info.service_areas')}
                </label>
                <div className="flex space-x-2 mb-3">
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder={t('teacher_profile.professional_info.service_areas_placeholder')}
                    className="flex-1 px-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
                  />
                  <button
                    type="button"
                    onClick={handleAddSpecialty}
                    className="px-5 py-2.5 bg-[#d4af37] text-white rounded-lg hover:bg-[#c5a028] transition-colors shadow-sm font-medium"
                  >
                    {t('teacher_profile.professional_info.add_btn')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileData.specialties?.map((specialty, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 bg-[#fdfbf7] text-[#5d4037] border border-[#d4af37]/30 rounded-full text-sm shadow-sm"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialty(specialty)}
                        className="ml-2 text-[#8b0000] hover:text-red-700 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-[#d4af37]/20">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#c5a028] hover:to-[#a67c00] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#d4af37]/20"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('teacher_profile.saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  {t('teacher_profile.save_btn')}
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
export { TeacherProfile };