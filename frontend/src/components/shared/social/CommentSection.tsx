import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Trash2, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import { communityPostsApi } from '../../../services/api/communityPosts';
import { useAuth } from '../../../context/AuthContext';

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  parent_comment_id?: string;
  likes: number;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
  commentCount: number;
  onCommentCountChange: (newCount: number) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  commentCount,
  onCommentCountChange
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await communityPostsApi.fetchComments(postId);
      if (response.success) {
        setComments(response.data.comments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showComments && comments.length === 0) {
      loadComments();
    }
  }, [showComments]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      setSubmitting(true);
      const response = await communityPostsApi.addComment(postId, {
        content: newComment.trim()
      });

      if (response.success) {
        setNewComment('');
        await loadComments();
        onCommentCountChange(commentCount + 1);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !user) return;

    try {
      setSubmitting(true);
      const response = await communityPostsApi.addComment(postId, {
        content: replyContent.trim(),
        parentCommentId: parentCommentId // Ensure this matches the backend expectation
      });

      if (response.success) {
        setReplyContent('');
        setReplyingTo(null);
        await loadComments();
        onCommentCountChange(commentCount + 1);
      }
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await communityPostsApi.deleteComment(commentId);
      if (response.success) {
        await loadComments();
        // Comment count will be updated by the backend decrement
        onCommentCountChange(commentCount - 1);
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = ({ comment, isReply = false }) => (
    <div className={`${isReply ? 'ml-8 mt-3' : 'mb-4'} flex space-x-3`}>
      <div className="flex-shrink-0">
        {comment.author_avatar ? (
          <img
            src={comment.author_avatar}
            alt={comment.author_name}
            className="w-8 h-8 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#27AE60] to-[#16A085] flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {comment.author_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-gray-900">
              {comment.author_name}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {formatDate(comment.created_at)}
              </span>
              {user && comment.author_id === user.id && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>

        {!isReply && (
          <div className="flex items-center space-x-4 mt-1 ml-3">
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="text-xs text-gray-500 hover:text-[#27AE60] transition-colors flex items-center space-x-1"
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>
          </div>
        )}

        {/* Reply form */}
        {replyingTo === comment.id && (
          <div className="mt-3 ml-3 pl-3 border-l-2 border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${comment.author_name}...`}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:bg-white transition-all"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddReply(comment.id);
                  }
                }}
              />
              <button
                onClick={() => handleAddReply(comment.id)}
                disabled={!replyContent.trim() || submitting}
                className="p-2 bg-[#27AE60] text-white rounded-full hover:bg-[#219150] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="border-t border-gray-100 pt-4">
      {/* Comments toggle */}
      <button
        onClick={() => setShowComments(!showComments)}
        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-[#27AE60] transition-colors mb-3"
      >
        <MessageCircle className="w-4 h-4" />
        <span>{commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}</span>
        {showComments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Add comment form */}
      {user && (
        <div className="flex space-x-3 mb-6">
          <div className="flex-shrink-0">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.firstName}
                className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#27AE60] to-[#16A085] flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-bold">
                  {user.firstName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full pl-4 pr-12 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:bg-white transition-all"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || submitting}
              className="absolute right-1 top-1 p-1.5 bg-[#27AE60] text-white rounded-full hover:bg-[#219150] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {showComments && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#27AE60] mx-auto"></div>
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
