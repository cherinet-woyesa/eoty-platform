import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, User, Globe, Send, MessageCircle } from 'lucide-react';
import { chaptersApi } from '../../../services/api/chapters';
import { communityPostsApi } from '../../../services/api/communityPosts';
import { useAuth } from '../../../context/AuthContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postContent: string;
  onShareSuccess?: () => void;
}

interface Chapter {
  id: number;
  name: string;
  description?: string;
  location?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  postId,
  postContent,
  onShareSuccess
}) => {
  const { user } = useAuth();
  const [shareType, setShareType] = useState<'user' | 'chapter' | 'public'>('chapter');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mock data for users - in a real app, this would come from an API
  const mockUsers = [
    { id: 'user1', name: 'Sarah Johnson', email: 'sarah@example.com' },
    { id: 'user2', name: 'Michael Chen', email: 'michael@example.com' },
    { id: 'user3', name: 'Emma Davis', email: 'emma@example.com' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadChapters();
      // Reset form
      setShareType('chapter');
      setSelectedChapter(null);
      setSelectedUser('');
      setMessage('');
      setError('');
    }
  }, [isOpen]);

  const loadChapters = async () => {
    try {
      const response = await chaptersApi.getChapters();
      if (response.success) {
        setChapters(response.data.chapters);
        
        // Set default chapter to user's chapter if available
        if (user?.chapter) {
          // user.chapter might be a string ID or number ID depending on interface
          const userChapterId = typeof user.chapter === 'string' ? parseInt(user.chapter) : user.chapter;
          // Verify the chapter exists in the list
          const chapterExists = response.data.chapters.some((c: Chapter) => c.id === userChapterId);
          if (chapterExists) {
            setSelectedChapter(userChapterId as number);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load chapters:', error);
      setError('Failed to load chapters');
    }
  };

  const handleShare = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      let shareData: any = {
        shareType,
        message: message.trim() || undefined
      };

      if (shareType === 'chapter' && selectedChapter) {
        shareData.chapterId = selectedChapter;
      } else if (shareType === 'user' && selectedUser) {
        shareData.sharedWith = selectedUser;
      }

      const response = await communityPostsApi.sharePost(postId, shareData);

      if (response.success) {
        onShareSuccess?.();
        onClose();
      } else {
        setError(response.message || 'Failed to share post');
      }
    } catch (error: any) {
      console.error('Share error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to share post';
      
      if (errorMessage.toLowerCase().includes('already shared')) {
        setError('You have already shared this post with this destination.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Share Post</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Post Preview */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#1e1b4b] to-[#312e81] flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">Sharing this post</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 line-clamp-3">{postContent}</p>
          </div>

          {/* Share Options */}
          <div className="space-y-4 mb-4">
            <h3 className="font-medium text-gray-900 text-sm">Share with</h3>

            {/* Share Type Options */}
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setShareType('chapter')}
                className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                  shareType === 'chapter'
                    ? 'border-[#27AE60] bg-[#27AE60]/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Users className="h-5 w-5 text-[#27AE60]" />
                <div className="text-left">
                  <p className="font-medium text-sm text-gray-900">Chapter Members</p>
                  <p className="text-xs text-gray-500">Share with your chapter</p>
                </div>
              </button>

              <button
                onClick={() => setShareType('user')}
                className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                  shareType === 'user'
                    ? 'border-[#27AE60] bg-[#27AE60]/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <User className="h-5 w-5 text-[#2980B9]" />
                <div className="text-left">
                  <p className="font-medium text-sm text-gray-900">Specific Person</p>
                  <p className="text-xs text-gray-500">Share with one person</p>
                </div>
              </button>

              <button
                onClick={() => setShareType('public')}
                className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                  shareType === 'public'
                    ? 'border-[#27AE60] bg-[#27AE60]/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Globe className="h-5 w-5 text-[#16A085]" />
                <div className="text-left">
                  <p className="font-medium text-sm text-gray-900">Public</p>
                  <p className="text-xs text-gray-500">Share with everyone</p>
                </div>
              </button>
            </div>

            {/* Chapter Selection */}
            {shareType === 'chapter' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Chapter
                </label>
                <select
                  value={selectedChapter || ''}
                  onChange={(e) => setSelectedChapter(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                >
                  <option value="">Choose a chapter...</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Selection */}
            {shareType === 'user' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Person
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                >
                  <option value="">Choose a person...</option>
                  {mockUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-[#1e1b4b] resize-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white text-[#1e1b4b] border border-[#1e1b4b]/20 hover:border-[#1e1b4b]/40 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={loading || (shareType === 'chapter' && !selectedChapter) || (shareType === 'user' && !selectedUser)}
              className="flex-1 px-4 py-2 bg-[#1e1b4b] text-white border border-[#1e1b4b] hover:bg-[#312e81] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Share
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ShareModal;
