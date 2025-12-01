/**
 * FR5: Ban Post Modal
 * Component for banning/unbanning forum posts
 * REQUIREMENT: Ban/unban posts
 */

import React, { useState } from 'react';
import { X, FileX, FileCheck, AlertTriangle } from 'lucide-react';

interface BanPostModalProps {
  isOpen: boolean;
  postId: number;
  postContent: string;
  isBanned: boolean;
  onClose: () => void;
  onBan: (reason: string) => Promise<void>;
  onUnban: () => Promise<void>;
}

const BanPostModal: React.FC<BanPostModalProps> = ({
  isOpen,
  postId,
  postContent,
  isBanned,
  onClose,
  onBan,
  onUnban
}) => {
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleBan = async () => {
    if (!reason.trim()) {
      alert('Please provide a ban reason');
      return;
    }

    setIsProcessing(true);
    try {
      await onBan(reason);
      setReason('');
      onClose();
    } catch (error) {
      console.error('Failed to ban post:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnban = async () => {
    if (!confirm('Are you sure you want to unban this post?')) {
      return;
    }

    setIsProcessing(true);
    try {
      await onUnban();
      onClose();
    } catch (error) {
      console.error('Failed to unban post:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isBanned ? 'Unban Post' : 'Ban Post'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Post ID: <span className="font-semibold text-gray-900">{postId}</span>
            </p>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700 line-clamp-4">
                {postContent || 'No content preview available'}
              </p>
            </div>
          </div>

          {isBanned ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Post is currently banned</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Unbanning will restore the post's visibility.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleUnban}
                disabled={isProcessing}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Unbanning...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Unban Post
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ban Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter the reason for banning this post..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Warning</p>
                    <p className="text-xs text-red-700 mt-1">
                      Banning a post will hide it from all users.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBan}
                  disabled={isProcessing || !reason.trim()}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Banning...
                    </>
                  ) : (
                    <>
                      <FileX className="h-4 w-4 mr-2" />
                      Ban Post
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BanPostModal;


