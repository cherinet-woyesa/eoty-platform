import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/api';
import { 
  User, Mail, Phone, MapPin, Edit3, CheckCircle, 
  AlertCircle, Loader2, X, Shield, Camera, Save
} from 'lucide-react';
import { brandColors } from '@/theme/brand';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  phone?: string;
  location?: string;
  profilePicture?: string;
}

const AdminProfile: React.FC = () => {
  const { user: userFromUserContext, refreshUser } = useUser();
  const { user: userFromAuth, refreshUser: refreshAuthUser } = useAuth();
  // Use user from AuthContext as it has more complete data
  const user = userFromAuth || userFromUserContext;
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    phone: '',
    location: '',
    profilePicture: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUpdatingProfilePictureRef = useRef(false);

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
      setProfileData(prev => ({
        firstName: user.firstName || prev.firstName || '',
        lastName: user.lastName || prev.lastName || '',
        email: user.email || prev.email || '',
        bio: user.bio || prev.bio || '',
        phone: user.phone || prev.phone || '',
        location: user.location || prev.location || '',
        profilePicture: user.profilePicture || prev.profilePicture || ''
      }));
      setLoading(false);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
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

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const response = await authApi.updateProfilePicture(formData);
      if (response.success && response.data.profilePicture) {
        setProfileData(prev => ({
          ...prev,
          profilePicture: response.data.profilePicture
        }));
        // Refresh auth user to update global state
        await refreshAuthUser();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error('Failed to upload profile picture:', err);
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      isUpdatingProfilePictureRef.current = false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await authApi.updateUserProfile(profileData);
      if (response.success) {
        // Refresh both contexts
        await refreshAuthUser();
        await refreshUser();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-96 bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED]'>
        <Loader2 className='h-8 w-8 animate-spin text-indigo-600' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8'>
      <div className='max-w-4xl mx-auto space-y-8'>
        {/* Header */}
        <div className='bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 opacity-80' />
          <div className='absolute -right-10 -top-10 w-48 h-48 bg-indigo-100 rounded-full blur-3xl' />
          <div className='absolute -left-10 bottom-0 w-40 h-40 bg-indigo-200 rounded-full blur-3xl opacity-60' />
          
          <div className='flex items-center justify-between relative z-10'>
            <div className='flex items-center gap-6'>
              <div className='p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm'>
                <Shield className='h-8 w-8 text-indigo-700' />
              </div>
              <div>
                <h1 className='text-3xl font-bold text-slate-900 tracking-tight'>
                  {user?.role === 'chapter_admin' ? 'Chapter Admin Profile' : 'Admin Profile'}
                </h1>
                <p className='text-slate-600 mt-2 text-lg'>Manage your administrative account information</p>
              </div>
            </div>
            <div className='hidden sm:flex items-center space-x-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100'>
              <Shield className='h-4 w-4 text-indigo-600' />
              <span className='text-sm font-semibold text-indigo-700'>
                {user?.role === 'chapter_admin' ? 'Chapter Administrator' : 'Administrator'}
              </span>
            </div>
          </div>
        </div>

        {/* Status messages */}
        {success && (
          <div className='p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-2 shadow-sm'>
            <CheckCircle className='h-5 w-5 text-green-600' />
            <span className='text-green-800 font-medium'>Profile updated successfully!</span>
          </div>
        )}

        {error && (
          <div className='p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between shadow-sm'>
            <div className='flex items-center space-x-2'>
              <AlertCircle className='h-5 w-5 text-red-600' />
              <span className='text-red-800 font-medium'>{error}</span>
            </div>
            <button onClick={() => setError(null)}>
              <X className='h-4 w-4 text-red-600' />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Profile Picture Section */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>Profile Picture</h2>
            <div className='flex items-center space-x-6'>
              <div className='relative group'>
                {profileData.profilePicture ? (
                  <img
                    src={profileData.profilePicture}
                    alt='Profile'
                    className='w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-sm'
                  />
                ) : (
                  <div className='w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center border-4 border-gray-100 shadow-sm'>
                    <span className='text-white text-3xl font-bold'>
                      {profileData.firstName?.charAt(0)}{profileData.lastName?.charAt(0)}
                    </span>
                  </div>
                )}
                <button
                  type='button'
                  onClick={handleImageClick}
                  disabled={isUploading}
                  className='absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md'
                >
                  {isUploading ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Camera className='h-4 w-4' />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  onChange={handleImageChange}
                  className='hidden'
                />
              </div>
              <div className='flex-1'>
                <p className='text-sm text-gray-600 mb-2'>
                  Click the camera icon to upload a new profile picture
                </p>
                <p className='text-xs text-gray-500'>
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>Basic Information</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label htmlFor='firstName' className='block text-sm font-medium text-gray-700 mb-2'>
                  <User className='inline h-4 w-4 mr-1 text-gray-400' />
                  First Name
                </label>
                <input
                  type='text'
                  id='firstName'
                  name='firstName'
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all'
                  required
                />
              </div>
              <div>
                <label htmlFor='lastName' className='block text-sm font-medium text-gray-700 mb-2'>
                  <User className='inline h-4 w-4 mr-1 text-gray-400' />
                  Last Name
                </label>
                <input
                  type='text'
                  id='lastName'
                  name='lastName'
                  value={profileData.lastName}
                  onChange={handleInputChange}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all'
                  required
                />
              </div>
              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-2'>
                  <Mail className='inline h-4 w-4 mr-1 text-gray-400' />
                  Email
                </label>
                <input
                  type='email'
                  id='email'
                  name='email'
                  value={profileData.email}
                  onChange={handleInputChange}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500'
                  disabled
                />
              </div>
              <div>
                <label htmlFor='phone' className='block text-sm font-medium text-gray-700 mb-2'>
                  <Phone className='inline h-4 w-4 mr-1 text-gray-400' />
                  Phone
                </label>
                <input
                  type='tel'
                  id='phone'
                  name='phone'
                  value={profileData.phone}
                  onChange={handleInputChange}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all'
                />
              </div>
              <div className='md:col-span-2'>
                <label htmlFor='location' className='block text-sm font-medium text-gray-700 mb-2'>
                  <MapPin className='inline h-4 w-4 mr-1 text-gray-400' />
                  Location
                </label>
                <input
                  type='text'
                  id='location'
                  name='location'
                  value={profileData.location}
                  onChange={handleInputChange}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all'
                  placeholder='City, Country'
                />
              </div>
              <div className='md:col-span-2'>
                <label htmlFor='bio' className='block text-sm font-medium text-gray-700 mb-2'>
                  <Edit3 className='inline h-4 w-4 mr-1 text-gray-400' />
                  Bio
                </label>
                <textarea
                  id='bio'
                  name='bio'
                  value={profileData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all'
                  placeholder='Tell us about yourself...'
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className='flex justify-end'>
            <button
              type='submit'
              disabled={saving}
              className='flex items-center space-x-2 px-8 py-3 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {saving ? (
                <>
                  <Loader2 className='h-5 w-5 animate-spin' />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className='h-5 w-5' />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminProfile;
