import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { authApi, activityApi } from '@/services/api';
import * as systemConfigApi from '@/services/api/systemConfig';
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Save, Camera, CheckCircle, 
  AlertCircle, Loader2, X, BookOpen, Target, Heart, Lock, Shield, Eye, EyeOff, Bell, Link as LinkIcon, Globe2, MapPin as MapPinIcon, ExternalLink
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { brandColors } from '@/theme/brand';
import type { ActivityLog } from '@/services/api/activity';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNotification } from '@/context/NotificationContext';

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

const StudentProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user: userFromUserContext, refreshUser } = useUser();
  const { user: userFromAuth, refreshUser: refreshAuthUser } = useAuth();
  const { showNotification } = useNotification();
  // Use user from AuthContext as it has more complete data
  const user = userFromAuth || userFromUserContext;
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    phone: '',
    location: '',
    profilePicture: '',
    interests: [],
    learningGoals: '',
    dateOfBirth: '',
    isPublic: true,
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    notificationPreferences: {
      email: true,
      push: true,
      sms: false
    },
    profileVisibility: 'public',
    linksPublicDefault: true,
    allowLinkedProfiles: true,
    shareLocation: false,
    preferredPublicLocation: '',
    timeZone: '',
    socialLinks: [],
    recentMedia: [],
    linkedAccounts: [],
    locationConsent: false,
    latitude: null,
    longitude: null,
    website: '',
    linkedin: '',
    twitter: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newInterest, setNewInterest] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUpdatingProfilePictureRef = useRef(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState<boolean>(true);
  const { coords, requestLocation, error: geoError, isLoading: geoLoading } = useGeolocation({ timeoutMs: 8000, maximumAgeMs: 60000, highAccuracy: true });
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Load user profile data - refresh on mount to get latest data
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        // Force refresh user data to get latest profile information
        await refreshAuthUser();
      } catch (err) {
        console.warn('Failed to refresh user data:', err);
      }
    };

    loadProfileData();
  }, []); // Only run on mount

  // Update profile data when user changes
  useEffect(() => {
    if (user && !isUpdatingProfilePictureRef.current) {
      console.log('Loading user profile data:', user);
      const profileSource = user as any;
      setProfileData(prev => ({
        firstName: profileSource.firstName || prev.firstName || '',
        lastName: profileSource.lastName || prev.lastName || '',
        email: profileSource.email || prev.email || '',
        bio: profileSource.bio || prev.bio || '',
        phone: profileSource.phone || prev.phone || '',
        location: profileSource.location || prev.location || '',
        profilePicture: profileSource.profilePicture || prev.profilePicture || '',
        interests: Array.isArray(profileSource.interests) ? profileSource.interests : (prev.interests || []),
        learningGoals: profileSource.learningGoals || prev.learningGoals || '',
        dateOfBirth: profileSource.dateOfBirth ? String(profileSource.dateOfBirth).slice(0, 10) : prev.dateOfBirth || '',
        isPublic: typeof profileSource.isPublic === 'boolean' ? profileSource.isPublic : (prev.isPublic ?? true),
        address: profileSource.address || prev.address || '',
        city: profileSource.city || prev.city || '',
        state: profileSource.state || prev.state || '',
        country: profileSource.country || prev.country || '',
        zipCode: profileSource.zipCode || prev.zipCode || '',
        notificationPreferences: profileSource.notificationPreferences || prev.notificationPreferences || { email: true, push: true, sms: false },
        is2FAEnabled: typeof profileSource.is2FAEnabled === 'boolean' ? profileSource.is2FAEnabled : prev.is2FAEnabled,
        profileVisibility: profileSource.profileVisibility || prev.profileVisibility || 'public',
        linksPublicDefault: typeof profileSource.linksPublicDefault === 'boolean' ? profileSource.linksPublicDefault : (prev.linksPublicDefault ?? true),
        allowLinkedProfiles: typeof profileSource.allowLinkedProfiles === 'boolean' ? profileSource.allowLinkedProfiles : (prev.allowLinkedProfiles ?? true),
        shareLocation: typeof profileSource.shareLocation === 'boolean' ? profileSource.shareLocation : (prev.shareLocation ?? false),
        preferredPublicLocation: profileSource.preferredPublicLocation || prev.preferredPublicLocation || '',
        timeZone: profileSource.timeZone || prev.timeZone || '',
        socialLinks: Array.isArray(profileSource.socialLinks) ? profileSource.socialLinks : (prev.socialLinks || []),
        recentMedia: Array.isArray(profileSource.recentMedia) ? profileSource.recentMedia : (prev.recentMedia || []),
        linkedAccounts: Array.isArray(profileSource.linkedAccounts) ? profileSource.linkedAccounts : (prev.linkedAccounts || []),
        locationConsent: typeof profileSource.locationConsent === 'boolean' ? profileSource.locationConsent : (prev.locationConsent ?? false),
        latitude: profileSource.latitude ?? prev.latitude ?? null,
        longitude: profileSource.longitude ?? prev.longitude ?? null,
        website: profileSource.website || prev.website || '',
        linkedin: profileSource.linkedin || prev.linkedin || '',
        twitter: profileSource.twitter || prev.twitter || ''
      }));
      setLoading(false);
    } else if (!user) {
      // If no user, still set loading to false after a delay
      const timer = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Apply browser geolocation coords if available
  useEffect(() => {
    if (coords) {
      setProfileData(prev => ({
        ...prev,
        latitude: coords.lat,
        longitude: coords.lng
      }));
    }
  }, [coords]);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setLoadingActivity(true);
        const res = await activityApi.getActivityLogs({ limit: 10 });
        if (res?.success) {
          setActivityLogs(res.data.logs || []);
        }
      } catch (err) {
        console.warn('Failed to load activity logs', err);
      } finally {
        setLoadingActivity(false);
      }
    };
    if (user?.id) {
      loadActivity();
    }
  }, [user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !profileData.interests?.includes(newInterest.trim())) {
      setProfileData(prev => ({
        ...prev,
        interests: [...(prev.interests || []), newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setProfileData(prev => ({
      ...prev,
      interests: (prev.interests || []).filter(i => i !== interest)
    }));
  };

  const completenessPercent = (() => {
    const fields = [
      profileData.profilePicture,
      profileData.bio && profileData.bio.trim(),
      profileData.location && profileData.location.trim(),
      (profileData.interests || []).length > 0
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  })();

  const handleVisibilityToggle = async () => {
    const next = !profileData.isPublic;
    setProfileData(prev => ({ ...prev, isPublic: next }));
    try {
      await authApi.updateUserProfile({ ...profileData, isPublic: next });
      await refreshAuthUser();
    } catch (err) {
      console.error('Failed to update visibility', err);
      setProfileData(prev => ({ ...prev, isPublic: !next }));
    }
  };


  const updateNotificationPref = async (key: 'email' | 'push' | 'sms', value: boolean) => {
    const nextPrefs = { ...(profileData.notificationPreferences || {}), [key]: value };
    setProfileData(prev => ({ ...prev, notificationPreferences: nextPrefs }));
    try {
      await authApi.updateUserProfile({ ...profileData, notificationPreferences: nextPrefs });
    } catch (err) {
      console.error('Failed to update notification prefs', err);
    }
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
      setError('Please upload a JPG, PNG, WebP, or GIF image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
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
        
        // Refresh user contexts in background (non-blocking)
        Promise.all([
          refreshUser().catch(err => console.warn('Failed to refresh UserContext:', err)),
          refreshAuthUser().catch(err => console.warn('Failed to refresh AuthContext:', err))
        ]).catch(() => {
          // Silently handle any errors - profile picture is already updated locally
        });
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Failed to upload profile picture:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload profile picture. Please try again.');
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
        
        // Refresh user contexts in background (non-blocking)
        Promise.all([
          refreshUser().catch(err => console.warn('Failed to refresh UserContext:', err)),
          refreshAuthUser().catch(err => console.warn('Failed to refresh AuthContext:', err))
        ]).catch(() => {
          // Silently handle any errors - profile picture is already updated locally
        });
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(response.message || 'Failed to remove profile picture');
      }
    } catch (err: any) {
      console.error('Failed to remove profile picture:', err);
      setError(err.response?.data?.message || err.message || 'Failed to remove profile picture. Please try again.');
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
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        country: profileData.country,
        zipCode: profileData.zipCode,
        profilePicture: profileData.profilePicture,
        interests: profileData.interests,
        learningGoals: profileData.learningGoals,
        dateOfBirth: profileData.dateOfBirth ? profileData.dateOfBirth.slice(0, 10) : null,
        is2FAEnabled: profileData.is2FAEnabled,
        isPublic: profileData.isPublic,
        notificationPreferences: profileData.notificationPreferences,
        profileVisibility: profileData.profileVisibility,
        linksPublicDefault: profileData.linksPublicDefault,
        allowLinkedProfiles: profileData.allowLinkedProfiles,
        shareLocation: profileData.shareLocation,
        preferredPublicLocation: profileData.preferredPublicLocation,
        timeZone: profileData.timeZone,
        socialLinks: profileData.socialLinks,
        recentMedia: profileData.recentMedia,
        linkedAccounts: profileData.linkedAccounts,
        locationConsent: profileData.locationConsent,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        website: profileData.website,
        linkedin: profileData.linkedin,
        twitter: profileData.twitter
      };

      // Update user profile via API
      const response = await authApi.updateUserProfile(profileToUpdate);
      
      if (response.success && response.data?.user) {
        // Update local state directly from response to avoid session issues
        const updatedUser = response.data.user;
        console.log('Profile updated, new user data:', updatedUser);
        setProfileData(prev => ({
          ...prev,
          firstName: updatedUser.firstName || prev.firstName,
          lastName: updatedUser.lastName || prev.lastName,
          bio: updatedUser.bio || prev.bio,
          phone: updatedUser.phone || prev.phone,
          location: updatedUser.location || prev.location,
          address: (updatedUser as any).address || prev.address,
          city: (updatedUser as any).city || prev.city,
          state: (updatedUser as any).state || prev.state,
          country: (updatedUser as any).country || prev.country,
          zipCode: (updatedUser as any).zipCode || prev.zipCode,
          profilePicture: updatedUser.profilePicture || prev.profilePicture,
          interests: Array.isArray(updatedUser.interests) ? updatedUser.interests : (prev.interests || []),
          learningGoals: updatedUser.learningGoals || prev.learningGoals || '',
          dateOfBirth: updatedUser.dateOfBirth ? String(updatedUser.dateOfBirth).slice(0, 10) : prev.dateOfBirth || '',
          is2FAEnabled: updatedUser.is2FAEnabled !== undefined ? updatedUser.is2FAEnabled : prev.is2FAEnabled,
          isPublic: typeof updatedUser.isPublic === 'boolean' ? updatedUser.isPublic : prev.isPublic,
          notificationPreferences: updatedUser.notificationPreferences || prev.notificationPreferences,
          profileVisibility: (updatedUser as any).profileVisibility || prev.profileVisibility,
          linksPublicDefault: (updatedUser as any).linksPublicDefault ?? prev.linksPublicDefault,
          allowLinkedProfiles: (updatedUser as any).allowLinkedProfiles ?? prev.allowLinkedProfiles,
          shareLocation: (updatedUser as any).shareLocation ?? prev.shareLocation,
          preferredPublicLocation: (updatedUser as any).preferredPublicLocation || prev.preferredPublicLocation,
          timeZone: (updatedUser as any).timeZone || prev.timeZone,
          socialLinks: Array.isArray((updatedUser as any).socialLinks) ? (updatedUser as any).socialLinks : prev.socialLinks,
          recentMedia: Array.isArray((updatedUser as any).recentMedia) ? (updatedUser as any).recentMedia : prev.recentMedia,
          linkedAccounts: Array.isArray((updatedUser as any).linkedAccounts) ? (updatedUser as any).linkedAccounts : prev.linkedAccounts,
          locationConsent: (updatedUser as any).locationConsent ?? prev.locationConsent,
          latitude: (updatedUser as any).latitude ?? prev.latitude,
          longitude: (updatedUser as any).longitude ?? prev.longitude,
          website: (updatedUser as any).website || prev.website,
          linkedin: (updatedUser as any).linkedin || prev.linkedin,
          twitter: (updatedUser as any).twitter || prev.twitter
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
        showNotification({
          type: 'success',
          title: 'Profile updated',
          message: 'Your profile changes have been saved.'
        });
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const runGeocodePreview = async () => {
    setGeocodeError(null);
    setGeocodeLoading(true);
    try {
      const data = await systemConfigApi.geocodePreview({
        address: profileData.address,
        city: profileData.city,
        country: profileData.country,
        region: profileData.state
      });
      if (!data?.latitude && !data?.longitude && !data?.location) {
        setGeocodeError('No geocode result. Add more address detail.');
      } else {
        setProfileData(prev => ({
          ...prev,
          latitude: data.latitude ?? prev.latitude,
          longitude: data.longitude ?? prev.longitude,
          preferredPublicLocation: data.location || prev.preferredPublicLocation
        }));
      }
    } catch (err: any) {
      setGeocodeError(err?.message || 'Geocode lookup failed');
    } finally {
      setGeocodeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96 bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED]">
        <LoadingSpinner size="lg" text="Loading profile..." variant="logo" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 opacity-80" />
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-indigo-100 rounded-full blur-3xl" />
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-indigo-200 rounded-full blur-3xl opacity-60" />
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm">
              <User className="h-8 w-8 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('member_profile.title')}</h1>
              <p className="text-slate-600 mt-2 text-lg">{t('member_profile.subtitle')}</p>
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
            <div className="mx-8 mt-8 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">Profile updated successfully.</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="text-xs text-green-700 hover:text-green-900 font-semibold"
              >
                Close
              </button>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="p-8 space-y-8">
            {/* Overview / completeness */}
            <div className="bg-[#f8fafc] rounded-lg p-5 border border-stone-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-500">{t('member_profile.setup_label')}</p>
                  <h3 className="text-lg font-semibold text-stone-900">{t('member_profile.setup_title')}</h3>
                  <p className="text-sm text-stone-600">{t('member_profile.setup_subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-stone-700 bg-white border border-stone-200 rounded-full px-3 py-1.5 flex items-center gap-2">
                    {profileData.isPublic ? <Eye className="h-4 w-4 text-[color:#1e1b4b]" /> : <EyeOff className="h-4 w-4 text-stone-500" />}
                    <span>{profileData.isPublic ? t('member_profile.visibility_public') : t('member_profile.visibility_private')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleVisibilityToggle}
                    className="px-3 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: brandColors.primaryHex }}
                  >
                    {profileData.isPublic ? t('member_profile.visibility_make_private') : t('member_profile.visibility_make_public')}
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-stone-700 mb-2">
                  <span>{t('member_profile.completeness')}</span>
                  <span className="font-semibold">{completenessPercent}%</span>
                </div>
                <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${completenessPercent}%`, backgroundColor: brandColors.primaryHex }} />
                </div>
                <div className="mt-2 text-xs text-stone-500">
                  {t('member_profile.completeness_hint')}
                </div>
              </div>
            </div>

            {/* Profile Picture Section */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-3 flex items-center gap-2">
                <Camera className="h-5 w-5 text-indigo-600" />
                Profile picture
              </h2>
              <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                <div className="relative group">
                  {profileData.profilePicture ? (
                    <>
                      <div className="relative">
                        <img 
                          key={profileData.profilePicture}
                          src={profileData.profilePicture} 
                          alt="Profile" 
                          className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-indigo-100"
                          onError={(e) => {
                            console.error('Failed to load profile picture:', profileData.profilePicture);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveProfilePicture}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors z-10"
                        aria-label="Remove profile picture"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 text-3xl font-bold border-4 border-white shadow-md ring-2 ring-indigo-100">
                      {profileData.firstName?.charAt(0)}{profileData.lastName?.charAt(0)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleProfilePictureClick}
                    className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2.5 shadow-lg hover:bg-indigo-700 transition-colors border-2 border-white"
                    aria-label="Change profile picture"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </button>
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-slate-600 font-medium">Upload a photo to personalize your profile</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleProfilePictureClick}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Upload photo'}
                    </button>
                    {profileData.profilePicture && (
                      <button
                        type="button"
                        onClick={handleRemoveProfilePicture}
                        className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        Remove
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
                  <p className="text-xs text-slate-500">JPG, PNG, WebP, or GIF up to 5MB.</p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                Basic information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-slate-700 mb-2">
                    First name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-slate-700 mb-2">
                    Last name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-indigo-600" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none bg-slate-50 text-slate-500"
                      required
                      disabled
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 italic">Email cannot be changed</p>
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-slate-700 mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                    value={profileData.dateOfBirth ? profileData.dateOfBirth.slice(0, 10) : ''}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & links */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-3 flex items-center gap-2">
                <Phone className="h-5 w-5 text-indigo-600" />
                Contact & links
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-indigo-600" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-semibold text-slate-700 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-indigo-600" />
                    </div>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={profileData.location}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="website" className="block text-sm font-semibold text-slate-700 mb-2">
                    Website / Portfolio
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={(profileData as any).website || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value } as any))}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:col-span-2">
                  <div>
                    <label htmlFor="linkedin" className="block text-sm font-semibold text-slate-700 mb-2">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      id="linkedin"
                      name="linkedin"
                      value={(profileData as any).linkedin || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, linkedin: e.target.value } as any))}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="twitter" className="block text-sm font-semibold text-slate-700 mb-2">
                      Twitter / X
                    </label>
                    <input
                      type="url"
                      id="twitter"
                      name="twitter"
                      value={(profileData as any).twitter || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, twitter: e.target.value } as any))}
                      placeholder="https://twitter.com/username"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Learning Information */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-3 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                Learning information
              </h2>
              <div className="space-y-5">
                <div>
                  <label htmlFor="bio" className="block text-sm font-semibold text-slate-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    maxLength={500}
                    value={profileData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself, your interests, and what you're passionate about learning..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                  />
                  <div className="text-xs text-slate-500 mt-1 text-right">{(profileData.bio?.length || 0)}/500</div>
                </div>
                <div>
                  <label htmlFor="learningGoals" className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-indigo-600" />
                    Learning goals
                  </label>
                  <textarea
                    id="learningGoals"
                    name="learningGoals"
                    rows={3}
                    value={profileData.learningGoals}
                    onChange={handleInputChange}
                    placeholder="What do you hope to achieve through your learning journey? (e.g., deepen my faith, understand church history, prepare for ministry...)"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-indigo-600" />
                    Interests
                  </label>
                  <div className="flex flex-col sm:flex-row sm:space-x-2 gap-2 mb-3">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Add an interest (e.g., Biblical Studies, Church History, Theology)"
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                    />
                    <button
                      type="button"
                      onClick={handleAddInterest}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-sm"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profileData.interests?.map((interest, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-800 rounded-full text-sm border border-indigo-100 shadow-sm"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(interest)}
                          className="ml-2 text-indigo-500 hover:text-indigo-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Location & map */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Location</h2>
                </div>
                <button
                  type="button"
                  onClick={() => requestLocation()}
                  className="text-sm text-indigo-700 hover:text-indigo-900 font-semibold"
                  disabled={geoLoading}
                >
                  {geoLoading ? 'Detecting…' : 'Detect location'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred public location</label>
                  <input
                    type="text"
                    value={profileData.preferredPublicLocation || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, preferredPublicLocation: e.target.value }))}
                    placeholder="City, Country"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Time zone</label>
                  <input
                    type="text"
                    value={profileData.timeZone || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, timeZone: e.target.value }))}
                    placeholder="e.g., Africa/Addis_Ababa"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Address details for geocoding */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={profileData.address || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Example St"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                  <input
                    type="text"
                    value={profileData.city || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Addis Ababa"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Region / State</label>
                  <input
                    type="text"
                    value={profileData.state || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="Oromia / Amhara / Tigray..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={profileData.country || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="Ethiopia"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <label className="flex items-center justify-between text-sm text-slate-900 font-semibold">
                    <span>Share my location for community features</span>
                    <button
                      type="button"
                      onClick={() => setProfileData(prev => ({ ...prev, shareLocation: !prev.shareLocation }))}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 ${
                        profileData.shareLocation ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={profileData.shareLocation}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          profileData.shareLocation ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between text-sm text-slate-900 font-semibold">
                    <span>Location sharing consent</span>
                    <button
                      type="button"
                      onClick={() => setProfileData(prev => ({ ...prev, locationConsent: !prev.locationConsent }))}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 ${
                        profileData.locationConsent ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={profileData.locationConsent}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          profileData.locationConsent ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </label>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">Coordinates</p>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Latitude: {profileData.latitude ?? '—'}</p>
                    <p>Longitude: {profileData.longitude ?? '—'}</p>
                    {geoError && <p className="text-red-600">Geo error: {geoError}</p>}
                    {geocodeError && <p className="text-red-600">Geocode: {geocodeError}</p>}
                    {(!profileData.address && !profileData.city && !profileData.country && !profileData.state) && (
                      <p className="text-amber-700">Add address/city/region/country before geocoding.</p>
                    )}
                    <button
                      type="button"
                      onClick={runGeocodePreview}
                      disabled={geocodeLoading || (!profileData.address && !profileData.city && !profileData.country && !profileData.state)}
                      className={`text-xs font-semibold ${geocodeLoading ? 'text-slate-500' : 'text-indigo-700 hover:text-indigo-900'} ${(!profileData.address && !profileData.city && !profileData.country && !profileData.state) ? 'cursor-not-allowed' : ''}`}
                    >
                      {geocodeLoading ? 'Geocoding…' : 'Geocode from address'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Map preview */}
              {(() => {
                const latNum = profileData.latitude !== null ? Number(profileData.latitude) : null;
                const lngNum = profileData.longitude !== null ? Number(profileData.longitude) : null;
                const hasCoords = latNum !== null && !Number.isNaN(latNum) && lngNum !== null && !Number.isNaN(lngNum);
                return hasCoords;
              })() && (
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <iframe
                    title="Location map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(profileData.longitude!) - 0.02}%2C${Number(profileData.latitude!) - 0.02}%2C${Number(profileData.longitude!) + 0.02}%2C${Number(profileData.latitude!) + 0.02}&layer=mapnik&marker=${Number(profileData.latitude!)}%2C${Number(profileData.longitude!)}`}
                    className="w-full h-64"
                  />
                </div>
              )}
            </div>

            {/* Privacy & notifications */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-semibold text-slate-900">{t('member_profile.privacy_title')}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-sm text-slate-900 font-semibold mb-1">{t('member_profile.privacy_visibility_label')}</p>
                  <p className="text-xs text-slate-600 mb-3">{t('member_profile.privacy_visibility_hint')}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {(['public', 'friends', 'private'] as const).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setProfileData(prev => ({ ...prev, profileVisibility: option }))}
                        className={`px-3 py-2 rounded-lg border text-center ${
                          profileData.profileVisibility === option
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {option === 'public' ? 'Public' : option === 'friends' ? 'Friends only' : 'Private'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <label className="flex items-center justify-between text-sm text-slate-900 font-semibold">
                    <span>Make new links public by default</span>
                    <button
                      type="button"
                      onClick={() => setProfileData(prev => ({ ...prev, linksPublicDefault: !prev.linksPublicDefault }))}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 ${
                        profileData.linksPublicDefault ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={profileData.linksPublicDefault}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          profileData.linksPublicDefault ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between text-sm text-slate-900 font-semibold">
                    <span>Allow others to see linked profiles</span>
                    <button
                      type="button"
                      onClick={() => setProfileData(prev => ({ ...prev, allowLinkedProfiles: !prev.allowLinkedProfiles }))}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 ${
                        profileData.allowLinkedProfiles ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={profileData.allowLinkedProfiles}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          profileData.allowLinkedProfiles ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['email', 'push', 'sms'] as const).map(key => (
                  <div key={key} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-indigo-600" />
                        <p className="text-sm font-semibold text-slate-900">{t(`member_profile.notifications.${key}`)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateNotificationPref(key, !(profileData.notificationPreferences?.[key]))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 ${
                          profileData.notificationPreferences?.[key] ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={profileData.notificationPreferences?.[key]}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            profileData.notificationPreferences?.[key] ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      {t(`member_profile.notifications.${key}_desc`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600" />
                Security
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-slate-900">Two-Factor Authentication</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Add an extra layer of security to your account by enabling 2FA.
                  </p>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setProfileData(prev => ({ ...prev, is2FAEnabled: !prev.is2FAEnabled }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 ${
                      profileData.is2FAEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={profileData.is2FAEnabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        profileData.is2FAEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="ml-3 text-sm font-medium text-slate-900">
                    {profileData.is2FAEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Social links & recent media */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-semibold text-slate-900">Social links</h2>
              </div>
              <div className="space-y-3">
                {profileData.socialLinks?.map((link, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-200 rounded-lg p-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{link.label || 'Link'}</p>
                      <div className="flex items-center gap-2 text-sm text-indigo-700">
                        <ExternalLink className="h-4 w-4" />
                        <a href={link.url} target="_blank" rel="noreferrer" className="underline break-all">{link.url}</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600">Visible</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(profileData.socialLinks || [])];
                          updated[idx] = { ...updated[idx], visible: !updated[idx].visible };
                          setProfileData(prev => ({ ...prev, socialLinks: updated }));
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 ${
                          link.visible !== false ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={link.visible !== false}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            link.visible !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Label</label>
                    <input
                      type="text"
                      value={(profileData as any).newLinkLabel || ''}
                      onChange={(e) => setProfileData(prev => ({ ...(prev as any), newLinkLabel: e.target.value }))}
                      placeholder="e.g., Personal site"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">URL</label>
                    <input
                      type="url"
                      value={(profileData as any).newLinkUrl || ''}
                      onChange={(e) => setProfileData(prev => ({ ...(prev as any), newLinkUrl: e.target.value }))}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white text-slate-900"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const label = (profileData as any).newLinkLabel;
                    const url = (profileData as any).newLinkUrl;
                    if (!url) return;
                    const next = [...(profileData.socialLinks || []), { label: label || 'Link', url, visible: profileData.linksPublicDefault !== false }];
                    setProfileData(prev => ({ ...prev, socialLinks: next, newLinkLabel: '', newLinkUrl: '' } as any));
                  }}
                  className="text-sm text-indigo-700 font-semibold"
                >
                  Add link
                </button>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <Globe2 className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-semibold text-slate-900">Recent media</h2>
              </div>
              <div className="space-y-3">
                {profileData.recentMedia?.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-200 rounded-lg p-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.title || 'Media'}</p>
                      <div className="flex items-center gap-2 text-sm text-indigo-700">
                        <ExternalLink className="h-4 w-4" />
                        <a href={item.url} target="_blank" rel="noreferrer" className="underline break-all">{item.url}</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600">Visible</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(profileData.recentMedia || [])];
                          updated[idx] = { ...updated[idx], visible: !updated[idx].visible };
                          setProfileData(prev => ({ ...prev, recentMedia: updated }));
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 ${
                          item.visible !== false ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={item.visible !== false}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            item.visible !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked accounts */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-semibold text-slate-900">Linked accounts</h2>
              </div>
              <div className="space-y-3">
                {['google', 'apple'].map((provider) => {
                  const existing = profileData.linkedAccounts?.find(a => a.provider === provider);
                  const connected = existing?.connected;
                  return (
                    <div key={provider} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 capitalize">{provider} account</p>
                        <p className="text-xs text-slate-600">{connected ? 'Connected' : 'Not connected'}</p>
                      </div>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                          connected ? 'text-red-600 border border-red-200 hover:bg-red-50' : 'text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
                        }`}
                        onClick={async () => {
                          try {
                            if (connected) {
                              await authApi.disconnectLinkedAccount(provider);
                            } else {
                              await authApi.connectLinkedAccount(provider);
                            }
                            // Refresh linked accounts from API
                            const list = await authApi.listLinkedAccounts();
                            const accounts = list?.data?.accounts || [];
                            setProfileData(prev => ({ ...prev, linkedAccounts: accounts }));
                          } catch (err) {
                            console.error('Linked account toggle failed', err);
                          }
                        }}
                      >
                        {connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all transform hover:scale-[1.01] font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">{t('member_profile.activity.title')}</h3>
            </div>
            <span className="text-xs text-slate-600">
              {loadingActivity ? t('member_profile.activity.loading') : t('member_profile.activity.count', { count: activityLogs.length })}
            </span>
          </div>
          {loadingActivity ? (
            <div className="text-sm text-slate-600">{t('member_profile.activity.loading')}</div>
          ) : activityLogs.length === 0 ? (
            <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-4">
              {t('member_profile.activity.empty')}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {activityLogs.map(log => (
                <li key={log.id} className="py-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 capitalize">{(log.activity_type || '').replace(/_/g, ' ')}</p>
                    {log.metadata?.courseTitle && (
                      <p className="text-xs text-slate-600">{log.metadata.courseTitle}</p>
                    )}
                    <p className="text-xs text-slate-600">
                      {t('member_profile.activity.at', { value: new Date(log.created_at) })}
                    </p>
                  </div>
                  {log.success === false && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                      {t('member_profile.activity.failed')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
export { StudentProfile };

