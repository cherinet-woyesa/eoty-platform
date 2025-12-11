import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chaptersApi } from '@/services/api/chapters';
import { authApi } from '@/services/api';
import { brandColors } from '@/theme/brand';

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
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchChapters = async () => {
      setIsFetchingChapters(true);
      try {
        const res = await chaptersApi.getChapters();
        if (res.success && res.data?.chapters?.length) {
          setChapters(res.data.chapters);
          if (!chapterId) {
            setChapterId(res.data.chapters[0].id);
          }
        }
      } catch (e) {
        // Fallback if API fails
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
  }, [isOpen, chapterId]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100" style={{ backgroundColor: brandColors.primaryHex }}>
          <h2 className="text-xl font-bold text-white mb-1">Complete your profile</h2>
          <p className="text-sm text-white/80">Choose a role and local chapter to personalize your experience.</p>
        </div>
        
        <div className="p-6 space-y-6">
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
              <select
                id="chapter"
                className="mt-2 w-full border rounded-lg p-2"
                value={chapterId}
                onChange={(e) => setChapterId(Number(e.target.value))}
                disabled={isFetchingChapters}
              >
                <option value="">Select your chapter</option>
                {chapters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.location}
                  </option>
                ))}
              </select>
              {isFetchingChapters && <p className="text-xs text-gray-500 mt-1">Loading chapters…</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors font-medium"
              disabled={loading}
            >
              Not now
            </button>
            <button
              onClick={save}
              disabled={loading || !chapterId}
              className="px-6 py-2 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;