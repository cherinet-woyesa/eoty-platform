import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chaptersApi } from '@/services/api/chapters';
import { authApi } from '@/services/api';
import { Compass } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileCompletionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [role, setRole] = useState<'user' | 'teacher'>(user?.role === 'teacher' ? 'teacher' : 'user');
  const [chapterId, setChapterId] = useState<number | ''>(user?.chapter_id ?? '');
  const [chapters, setChapters] = useState<Array<{ id: number; name: string; location: string; distance?: number | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [useNearby, setUseNearby] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
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
      } catch (e) {
        setChapters([
          { id: 1, name: 'addis-ababa', location: 'Addis Ababa, Ethiopia' },
          { id: 2, name: 'toronto', location: 'Toronto, Canada' },
          { id: 3, name: 'washington-dc', location: 'Washington DC, USA' },
          { id: 4, name: 'london', location: 'London, UK' },
        ]);
        if (!chapterId) {
          setChapterId(1);
        }
      } finally {
        setIsFetchingChapters(false);
      }
    };

    fetchChapters();
  }, [isOpen, useNearby, coords, chapterId]);

  const save = async () => {
    if (!chapterId) return;
    setLoading(true);
    try {
      await authApi.updateUserProfile({ role, chapterId: Number(chapterId) });
      await refreshUser();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
        <h2 className="text-lg font-semibold mb-2">Complete your profile</h2>
        <p className="text-sm text-gray-600 mb-4">Choose a role and local chapter to personalize your experience.</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Role</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`border rounded-lg p-3 ${role === 'user' ? 'border-[#27AE60] bg-[#27AE60]/10' : 'border-gray-200'}`}
                onClick={() => setRole('user')}
              >
                Student
              </button>
              <button
                type="button"
                className={`border rounded-lg p-3 ${role === 'teacher' ? 'border-[#16A085] bg-[#16A085]/10' : 'border-gray-200'}`}
                onClick={() => setRole('teacher')}
              >
                Teacher
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="chapter" className="text-sm font-medium">Local Chapter</label>
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
                  Use nearest
                </span>
              </label>
              {locError && <span className="text-amber-700">{locError}</span>}
            </div>

            <select
              id="chapter"
              className="mt-3 w-full border rounded-lg p-2"
              value={chapterId}
              onChange={(e) => setChapterId(Number(e.target.value))}
              disabled={isFetchingChapters}
            >
              <option value="">Select your chapter</option>
              {chapters.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.location}
                  {typeof c.distance === 'number' ? ` (${c.distance.toFixed(1)} km)` : ''}
                </option>
              ))}
            </select>
            {isFetchingChapters && <p className="text-xs text-gray-500 mt-1">Loading chapters…</p>}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 border rounded-lg" onClick={onClose} disabled={loading}>Not now</button>
          <button className="px-4 py-2 rounded-lg bg-[#27AE60] text-white" onClick={save} disabled={loading || !chapterId}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;