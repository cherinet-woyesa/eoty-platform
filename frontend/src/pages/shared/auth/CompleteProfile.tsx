import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { chaptersApi } from '@/services/api/chapters';
import { authApi } from '@/services/api';
import { MapPin, ArrowRight, BookOpen, GraduationCap, Check, Compass, AlertTriangle, RefreshCw } from 'lucide-react';
import LoadingButton from '@/components/shared/auth/LoadingButton';

const CompleteProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);
  const [chapters, setChapters] = useState<Array<{ id: number; name: string; location: string; distance?: number | null }>>([]);
  const [role, setRole] = useState<'user' | 'teacher'>(user?.role === 'teacher' ? 'teacher' : 'user');
  const [chapterId, setChapterId] = useState<number | ''>(user?.chapter || user?.chapter_id || '');
  const [useNearby, setUseNearby] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const hasChapters = chapters.length > 0;

  const fetchChapters = async () => {
    setIsFetchingChapters(true);
    try {
      if (useNearby && coords) {
        const res = await chaptersApi.getNearby({ lat: coords.lat, lng: coords.lng, radiusKm: 50, limit: 50 });
        if (res.success && res.data?.chapters?.length) {
          setChapters(res.data.chapters);
          setChapterId(res.data.chapters[0].id);
          return;
        }
      }
      const res = await chaptersApi.getChapters();
      if (res.success && res.data?.chapters?.length) {
        setChapters(res.data.chapters);
        if (!chapterId) {
          setChapterId(res.data.chapters[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch chapters:', err);
      const fallback = [
        { id: 7, name: 'Main Headquarters', location: 'Addis Ababa, Ethiopia' },
        { id: 8, name: 'Addis Ababa Chapter', location: 'Addis Ababa, Ethiopia' },
        { id: 9, name: 'Bahir Dar Chapter', location: 'Bahir Dar, Ethiopia' },
      ];
      setChapters(fallback);
      if (!chapterId) setChapterId(fallback[0].id);
    } finally {
      setIsFetchingChapters(false);
    }
  };

  useEffect(() => {
    fetchChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (useNearby && coords) {
      fetchChapters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useNearby, coords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterId) return;
    setIsLoading(true);
    try {
      await authApi.updateUserProfile({
        role,
        chapterId: Number(chapterId),
      });
      await refreshUser();
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
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-green-100">
            <MapPin className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 mt-4">
          <span className="text-xs uppercase tracking-wide text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
            Step 1 of 1
          </span>
          <h2 className="text-center text-2xl font-extrabold text-gray-900">
            Complete your profile
          </h2>
          <p className="text-center text-sm text-gray-600">
            Pick your role and nearest chapter to tailor your experience.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Your Role</label>
                <span className="text-xs text-gray-500">Required</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {['user', 'teacher'].map((roleOption) => (
                  <button
                    key={roleOption}
                    type="button"
                    onClick={() => setRole(roleOption as 'user' | 'teacher')}
                    className={`border rounded-lg p-3 flex items-center justify-between ${
                      role === roleOption
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {roleOption === 'user' ? (
                        <BookOpen className="h-5 w-5 text-green-600" />
                      ) : (
                        <GraduationCap className="h-5 w-5 text-green-600" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {roleOption === 'user' ? 'Student' : 'Teacher'}
                      </span>
                    </div>
                    {role === roleOption && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chapter Selection */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="chapter" className="block text-sm font-medium text-gray-700">
                  Local Chapter
                </label>
                <span className="text-xs text-gray-500">Required</span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useNearby}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (!navigator.geolocation) {
                          setLocError('Geolocation not supported by this browser.');
                          setUseNearby(false);
                          return;
                        }
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                            setUseNearby(true);
                            setLocError(null);
                          },
                          () => {
                            setLocError('Unable to get location. Please allow location access.');
                            setUseNearby(false);
                          },
                          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
                        );
                      } else {
                        setUseNearby(false);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="inline-flex items-center gap-1">
                    <Compass className="h-4 w-4 text-blue-600" />
                    Use nearest chapter
                  </span>
                </label>
                {locError && <span className="text-amber-700">{locError}</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                We’ll try to auto-select the closest chapter if location is allowed.
              </p>

              <div className="mt-3">
                <select
                  id="chapter"
                  name="chapter"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                  value={chapterId}
                  onChange={(e) => setChapterId(Number(e.target.value))}
                  disabled={isFetchingChapters}
                >
                  <option value="">Select your chapter</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name} - {chapter.location}
                      {typeof chapter.distance === 'number' ? ` (${chapter.distance.toFixed(1)} km)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {isFetchingChapters && (
                <p className="text-sm text-gray-500 mt-2">Loading chapters...</p>
              )}
              {!isFetchingChapters && !hasChapters && (
                <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>No chapters found. Try refreshing.</span>
                  <button
                    type="button"
                    onClick={fetchChapters}
                    className="ml-auto inline-flex items-center gap-1 text-amber-800 underline"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </button>
                </div>
              )}
            </div>

            <div>
              <LoadingButton
                type="submit"
                isLoading={isLoading}
                disabled={isLoading || !chapterId}
                loadingText="Saving your profile..."
                icon={<ArrowRight className="w-4 h-4 ml-2" />}
                className="w-full"
              >
                Save and continue
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;

