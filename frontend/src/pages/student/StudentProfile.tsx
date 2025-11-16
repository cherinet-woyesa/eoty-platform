import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/api';
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Save, Camera, Edit3, CheckCircle, 
  AlertCircle, Loader2, X, BookOpen, Target, Heart
} from 'lucide-react';

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
}

const StudentProfile: React.FC = () => {
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
    profilePicture: '',
    interests: [],
    learningGoals: '',
    dateOfBirth: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newInterest, setNewInterest] = useState('');
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
      console.log('Loading user profile data:', user);
      setProfileData(prev => ({
        firstName: user.firstName || prev.firstName || '',
        lastName: user.lastName || prev.lastName || '',
        email: user.email || prev.email || '',
        bio: user.bio || prev.bio || '',
        phone: user.phone || prev.phone || '',
        location: user.location || prev.location || '',
        profilePicture: user.profilePicture || prev.profilePicture || '',
        interests: Array.isArray(user.interests) ? user.interests : (prev.interests || []),
        learningGoals: user.learningGoals || prev.learningGoals || '',
        dateOfBirth: user.dateOfBirth || prev.dateOfBirth || ''
      }));
      setLoading(false);
    } else if (!user) {
      // If no user, still set loading to false after a delay
      const timer = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

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
        profilePicture: profileData.profilePicture,
        interests: profileData.interests,
        learningGoals: profileData.learningGoals,
        dateOfBirth: profileData.dateOfBirth
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
          profilePicture: updatedUser.profilePicture || prev.profilePicture,
          interests: Array.isArray(updatedUser.interests) ? updatedUser.interests : (prev.interests || []),
          learningGoals: updatedUser.learningGoals || prev.learningGoals || '',
          dateOfBirth: updatedUser.dateOfBirth || prev.dateOfBirth || ''
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
      <div className="flex items-center justify-center min-h-96 bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#FFD700] mx-auto mb-4" />
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FFD700]/20 via-[#FFC107]/20 to-[#FFA500]/20 rounded-xl p-6 border border-[#FFD700]/30 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#FFD700]/30 rounded-lg blur-md"></div>
              <div className="relative p-3 bg-gradient-to-br from-[#FFD700]/20 to-[#FFC107]/20 rounded-lg border border-[#FFD700]/30">
                <User className="h-6 w-6 text-[#FFD700]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Student Profile</h1>
              <p className="text-slate-600 mt-1">Manage your profile information</p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-slate-200">
          {error && (
            <div className="mx-6 mt-6 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mx-6 mt-6 bg-gradient-to-r from-[#FFD700]/10 to-[#FFC107]/10 border border-[#FFD700]/30 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-[#FFD700]" />
                <span className="text-slate-700 font-medium">Profile updated successfully!</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
            {/* Profile Picture Section */}
            <div className="bg-slate-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-[#FFD700]" />
                Profile Picture
              </h2>
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
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFC107] flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow">
                      {profileData.firstName?.charAt(0)}{profileData.lastName?.charAt(0)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleProfilePictureClick}
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md hover:bg-slate-50 transition-colors"
                    aria-label="Change profile picture"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 text-slate-600 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Upload a photo to personalize your profile</p>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleProfilePictureClick}
                      className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    {profileData.profilePicture && (
                      <button
                        type="button"
                        onClick={handleRemoveProfilePicture}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
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
            <div className="bg-slate-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-[#FFD700]" />
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent bg-slate-50"
                      required
                      disabled
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={profileData.location}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700 mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={profileData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Learning Information */}
            <div className="bg-slate-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#FFD700]" />
                Learning Information
              </h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    value={profileData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself, your interests, and what you're passionate about learning..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="learningGoals" className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#FFD700]" />
                    Learning Goals
                  </label>
                  <textarea
                    id="learningGoals"
                    name="learningGoals"
                    rows={3}
                    value={profileData.learningGoals}
                    onChange={handleInputChange}
                    placeholder="What do you hope to achieve through your learning journey? (e.g., deepen my faith, understand church history, prepare for ministry...)"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-[#FFD700]" />
                    Interests
                  </label>
                  <div className="flex space-x-2 mb-3">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Add an interest (e.g., Biblical Studies, Church History, Theology)"
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                    />
                    <button
                      type="button"
                      onClick={handleAddInterest}
                      className="px-4 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFC107] text-white rounded-lg hover:from-[#FFC107] hover:to-[#FFB300] transition-colors font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profileData.interests?.map((interest, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-[#FFD700]/20 to-[#FFC107]/20 text-slate-800 rounded-full text-sm border border-[#FFD700]/30"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(interest)}
                          className="ml-2 text-slate-600 hover:text-slate-800"
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
            <div className="flex justify-end pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-[#FFD700] to-[#FFC107] hover:from-[#FFC107] hover:to-[#FFB300] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#FFD700]/25"
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

export default StudentProfile;
export { StudentProfile };

