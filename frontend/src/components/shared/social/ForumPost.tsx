import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, Flag, Reply, MoreHorizontal, Shield } from 'lucide-react';
import type { ForumPost } from '@/types/community';

interface ForumPostProps {
  post: ForumPost;
  onLike: (postId: number) => void;
  onReply: (postId: number) => void;
  onReport: (postId: number) => void;
  currentUser: { id: number; role: string };
}

const ForumPost: React.FC<ForumPostProps> = ({ 
  post, 
  onLike, 
  onReply, 
  onReport,
  currentUser
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleReportSubmit = () => {
    if (reportReason) {
      onReport(post.id);
      setShowReportModal(false);
      setReportReason('');
      setReportDetails('');
    }
  };

  const isOwnPost = post.author_id === currentUser.id;
  const canModerate = currentUser.role === 'admin' || currentUser.role === 'chapter_admin';

  return (
    <div className="border-b border-gray-200 last:border-b-0 p-6 hover:bg-gray-50">
      <div className="flex space-x-4">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-700 font-medium">
              {post.first_name?.charAt(0)}{post.last_name?.charAt(0)}
            </span>
          </div>
        </div>
        
        {/* Post Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {post.first_name} {post.last_name}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
            
            {/* Post Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-full hover:bg-gray-200"
              >
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                  <button
                    onClick={() => {
                      setShowReportModal(true);
                      setMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </button>
                  
                  {canModerate && (
                    <>
                      <button className="flex items-center w-full px-4 py-2 text-sm text-yellow-600 hover:bg-gray-100">
                        <Shield className="h-4 w-4 mr-2" />
                        Moderate
                      </button>
                      <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Post Content */}
          <div className="mt-2 text-gray-700">
            {post.content}
          </div>
          
          {/* Post Stats and Actions */}
          <div className="mt-4 flex items-center space-x-6">
            <button
              onClick={() => onLike(post.id)}
              className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="text-sm">{post.like_count}</span>
            </button>
            
            <button
              onClick={() => onReply(post.id)}
              className="flex items-center space-x-1 text-gray-500 hover:text-green-600"
            >
              <Reply className="h-4 w-4" />
              <span className="text-sm">Reply</span>
            </button>
            
            <button
              onClick={() => {
                setShowReportModal(true);
              }}
              className="flex items-center space-x-1 text-gray-500 hover:text-red-600"
            >
              <Flag className="h-4 w-4" />
              <span className="text-sm">Report</span>
            </button>
          </div>
          
          {/* Replies */}
          {post.replies && post.replies.length > 0 && (
            <div className="mt-6 space-y-4 ml-8">
              {post.replies.map((reply) => (
                <div key={reply.id} className="border-l-2 border-gray-200 pl-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium text-gray-900">
                      {reply.first_name} {reply.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(reply.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-1 text-gray-700 text-sm">
                    {reply.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Report Post</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reporting
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a reason</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="spam">Spam or advertising</option>
                <option value="harassment">Harassment or bullying</option>
                <option value="offensive">Offensive language</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide any additional context..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={!reportReason}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  reportReason 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumPost;