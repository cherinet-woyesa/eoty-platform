import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/api';
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Save, Camera, Edit3, CheckCircle, 
  AlertCircle, Loader2, X
} from 'lucide-react';

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
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#39FF14] mx-auto mb-4" />
          <p className="text-stone-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#39FF14]/20 via-[#00FFC6]/20 to-[#00FFFF]/20 rounded-xl p-6 border border-[#39FF14]/30 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#39FF14]/30 rounded-lg blur-md"></div>
              <div className="relative p-3 bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 rounded-lg border border-[#39FF14]/30">
                <User className="h-6 w-6 text-[#39FF14]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-stone-800">Teacher Profile</h1>
              <p className="text-stone-600 mt-1">Manage your public profile information</p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200">
          {error && (
            <div className="mx-6 mt-6 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-6 bg-gradient-to-r from-[#39FF14]/10 to-[#00FFC6]/10 border border-[#39FF14]/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-[#39FF14]" />
              <span className="text-stone-700 font-medium">Profile updated successfully!</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
          {/* Profile Picture Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h2>
            <div className="flex items-center space-x-6">
              <div className="relative">
                {profileData.profilePicture ? (
                  <>
                    <img 
                      key={profileData.profilePicture}
                      src={profileData.profilePicture} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow"
                      onError={(e) => {
                        console.error('Failed to load profile picture:', profileData.profilePicture);
                        // Fallback to initials if image fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveProfilePicture}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                      aria-label="Remove profile picture"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow">
                    {profileData.firstName?.charAt(0)}{profileData.lastName?.charAt(0)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleProfilePictureClick}
                  className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors"
                  aria-label="Change profile picture"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Upload a photo to make your profile more personal</p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleProfilePictureClick}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  {profileData.profilePicture && (
                    <button
                      type="button"
                      onClick={handleRemoveProfilePicture}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={profileData.location}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={profileData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself, your teaching experience, and what you're passionate about..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-2">
                  Education
                </label>
                <input
                  type="text"
                  id="education"
                  name="education"
                  value={profileData.education}
                  onChange={handleInputChange}
                  placeholder="Your highest degree or relevant certifications"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="teachingExperience" className="block text-sm font-medium text-gray-700 mb-2">
                  Teaching Experience (Years)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="teachingExperience"
                    name="teachingExperience"
                    value={profileData.teachingExperience}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialties
                </label>
                <div className="flex space-x-2 mb-3">
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Add a specialty (e.g., Biblical Studies, Church History)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
                  />
                  <button
                    type="button"
                    onClick={handleAddSpecialty}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileData.specialties?.map((specialty, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialty(specialty)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
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