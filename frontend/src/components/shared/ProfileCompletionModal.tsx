import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chaptersApi } from '@/services/api/chapters';
import { authApi } from '@/services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileCompletionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [role, setRole] = useState<'user' | 'teacher'>(user?.role === 'teacher' ? 'teacher' : 'user');
  const [chapterId, setChapterId] = useState<number | ''>(user?.chapter_id ?? '');
  const [chapters, setChapters] = useState<Array<{ id: number; name: string; location: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchChapters = async () => {
      try {
        const res = await chaptersApi.getChapters();
        if (res.success) setChapters(res.data.chapters);
      } catch (e) {
        setChapters([
          { id: 1, name: 'addis-ababa', location: 'Addis Ababa, Ethiopia' },
          { id: 2, name: 'toronto', location: 'Toronto, Canada' },
          { id: 3, name: 'washington-dc', location: 'Washington DC, USA' },
          { id: 4, name: 'london', location: 'London, UK' },
        ]);
      }
    };
    fetchChapters();
  }, [isOpen]);

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
            <select
              id="chapter"
              className="mt-2 w-full border rounded-lg p-2"
              value={chapterId}
              onChange={(e) => setChapterId(Number(e.target.value))}
            >
              <option value="">Select your chapter</option>
              {chapters.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.location}</option>
              ))}
            </select>
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