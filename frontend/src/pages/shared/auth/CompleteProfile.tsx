import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { chaptersApi } from '@/services/api/chapters';
import { authApi } from '@/services/api';
import { MapPin, ArrowRight, BookOpen, GraduationCap, Check } from 'lucide-react';
import LoadingButton from '@/components/shared/auth/LoadingButton';

const CompleteProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [chapters, setChapters] = useState<{id: number, name: string, location: string}[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [formData, setFormData] = useState({
    role: user?.role || 'user',
    chapter: user?.chapter || ''
  });

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await chaptersApi.getChapters();
        if (response.success) {
          setChapters(response.data.chapters);
        }
      } catch (err) {
        console.error('Failed to fetch chapters:', err);
        // Fallback
        setChapters([
          { id: 1, name: 'addis-ababa', location: 'Addis Ababa, Ethiopia' },
          { id: 2, name: 'toronto', location: 'Toronto, Canada' },
        ]);
      } finally {
        setLoadingChapters(false);
      }
    };

    fetchChapters();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.chapter) return;

    setIsLoading(true);
    try {
      // Update user profile
      await authApi.updateProfile({
        role: formData.role,
        chapterId: parseInt(formData.chapter as string)
      });

      // Refresh user context
      await refreshUser();

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Complete your profile
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please select your role and local chapter to continue
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Role Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                I want to join as
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    formData.role === 'user'
                      ? 'border-[#27AE60] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <BookOpen className={`h-5 w-5 mr-2 ${formData.role === 'user' ? 'text-[#27AE60]' : 'text-gray-500'}`} />
                      <span className="font-semibold text-sm text-gray-900">Student</span>
                    </div>
                    {formData.role === 'user' && <Check className="h-4 w-4 text-[#27AE60]" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'teacher' }))}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    formData.role === 'teacher'
                      ? 'border-[#27AE60] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <GraduationCap className={`h-5 w-5 mr-2 ${formData.role === 'teacher' ? 'text-[#27AE60]' : 'text-gray-500'}`} />
                      <span className="font-semibold text-sm text-gray-900">Teacher</span>
                    </div>
                    {formData.role === 'teacher' && <Check className="h-4 w-4 text-[#27AE60]" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Chapter Selection */}
            <div>
              <label htmlFor="chapter" className="block text-sm font-medium text-gray-700">
                Local Chapter
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="chapter"
                  name="chapter"
                  required
                  className="focus:ring-[#27AE60] focus:border-[#27AE60] block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3"
                  value={formData.chapter}
                  onChange={(e) => setFormData(prev => ({ ...prev, chapter: e.target.value }))}
                  disabled={loadingChapters}
                >
                  <option value="">Select your chapter</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name} - {chapter.location}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <LoadingButton
                type="submit"
                isLoading={isLoading}
                loadingText="Saving..."
                disabled={!formData.chapter}
                icon={<ArrowRight className="ml-2 h-4 w-4" />}
              >
                Continue to Dashboard
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
