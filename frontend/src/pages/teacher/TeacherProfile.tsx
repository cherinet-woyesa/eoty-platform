import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/api';
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Save, Camera, Edit3, CheckCircle, 
  AlertCircle, Loader2, X
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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

const TeacherProfile: React.FC = () => {
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
        
        // Refresh user data in both contexts
        await Promise.all([refreshUser(), refreshAuthUser()]);
        
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
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <LoadingSpinner size="lg" text="Loading profile..." variant="logo" />
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
              <h1 className="text-3xl font-bold text-[#2c1810] tracking-tight font-serif">Teacher Profile</h1>
              <p className="text-[#5d4037] mt-2 text-lg">Manage your personal information and teaching credentials</p>
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
              <span className="text-[#1b5e20] font-medium">Profile updated successfully!</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="p-8 space-y-8">
          {/* Profile Picture Section */}
          <div className="bg-[#fdfbf7] rounded-lg p-6 border border-[#d4af37]/20">
            <h2 className="text-xl font-semibold text-[#2c1810] mb-4 font-serif border-b border-[#d4af37]/20 pb-2">Profile Picture</h2>
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
                <p className="text-sm text-[#5d4037] mb-3">Upload a photo to personalize your teaching profile.</p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleProfilePictureClick}
                    className="px-5 py-2.5 bg-white border border-[#d4af37]/50 rounded-lg text-sm font-medium text-[#5d4037] hover:bg-[#fdfbf7] hover:border-[#d4af37] transition-all shadow-sm disabled:opacity-50"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  {profileData.profilePicture && (
                    <button
                      type="button"
                      onClick={handleRemoveProfilePicture}
                      className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors shadow-sm"
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
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-[#fdfbf7] rounded-lg p-6 border border-[#d4af37]/20">
            <h2 className="text-xl font-semibold text-[#2c1810] mb-6 font-serif border-b border-[#d4af37]/20 pb-2">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-[#5d4037] mb-2">
                  First Name
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
                  Last Name
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
                  Email Address
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
                <p className="text-xs text-[#8b0000]/70 mt-1 italic">Email cannot be changed</p>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-[#5d4037] mb-2">
                  Phone Number
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
                  Location
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
            <h2 className="text-xl font-semibold text-[#2c1810] mb-6 font-serif border-b border-[#d4af37]/20 pb-2">Professional Information</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-[#5d4037] mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={profileData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself, your teaching experience, and what you're passionate about..."
                  className="w-full px-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label htmlFor="education" className="block text-sm font-medium text-[#5d4037] mb-2">
                  Theological Education / Seminary
                </label>
                <input
                  type="text"
                  id="education"
                  name="education"
                  value={profileData.education}
                  onChange={handleInputChange}
                  placeholder="e.g., St. Paul's Theological College, Sunday School Certificate"
                  className="w-full px-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label htmlFor="teachingExperience" className="block text-sm font-medium text-[#5d4037] mb-2">
                  Service Years (Teaching)
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
                  Church Service Areas
                </label>
                <div className="flex space-x-2 mb-3">
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="e.g., Bible Study, Ge'ez Language, Hymns (Zema)"
                    className="flex-1 px-4 py-2.5 bg-white border border-[#d4af37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-transparent transition-shadow"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
                  />
                  <button
                    type="button"
                    onClick={handleAddSpecialty}
                    className="px-5 py-2.5 bg-[#d4af37] text-white rounded-lg hover:bg-[#c5a028] transition-colors shadow-sm font-medium"
                  >
                    Add
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
      </div>
    </div>
  );
};

export default TeacherProfile;
export { TeacherProfile };