import React, { useState } from 'react';
import { X, Globe2, Lock, Users } from 'lucide-react';
import { forumApi } from '@/services/api/forums';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { brandColors } from '@/theme/brand';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateForumModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await forumApi.createForum({
        title,
        description,
        chapter_id: user?.chapter_id ? String(user.chapter_id) : '1', // Fallback or handle error
        is_public: isPublic
      });
      showNotification({ type: 'success', title: 'Success', message: 'Forum created successfully' });
      onSuccess();
      onClose();
      setTitle('');
      setDescription('');
      setIsPublic(true);
    } catch (error: any) {
      console.error('Failed to create forum:', error);
      showNotification({ type: 'error', title: 'Error', message: error.message || 'Failed to create forum' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Create New Forum</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Forum Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
              placeholder="e.g. General Discussion"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent h-24 resize-none"
              placeholder="What is this forum about?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  isPublic
                    ? 'border-[#1e1b4b] bg-[#1e1b4b]/5 ring-1 ring-[#1e1b4b]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-full ${isPublic ? 'bg-[#1e1b4b] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Globe2 className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-medium ${isPublic ? 'text-[#1e1b4b]' : 'text-slate-700'}`}>Public</div>
                  <div className="text-xs text-slate-500">Visible to everyone</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  !isPublic
                    ? 'border-[#1e1b4b] bg-[#1e1b4b]/5 ring-1 ring-[#1e1b4b]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-full ${!isPublic ? 'bg-[#1e1b4b] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-medium ${!isPublic ? 'text-[#1e1b4b]' : 'text-slate-700'}`}>Chapter Only</div>
                  <div className="text-xs text-slate-500">Visible to chapter members</div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-6 py-2 text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Forum'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateForumModal;
