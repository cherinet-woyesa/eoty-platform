import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Trash2, Reply, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { communityPostsApi } from '../../../services/api/communityPosts';
import { useAuth } from '../../../context/AuthContext';
import { brandColors } from '@/theme/brand';

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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const normalizeId = (id: string | number | null | undefined) => (id != null ? String(id) : '');

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

  const handleAddReply = async (parentCommentId: string | number) => {
    const parentId = normalizeId(parentCommentId);
    if (!replyContent.trim() || !user) return;

    try {
      setSubmitting(true);
      const response = await communityPostsApi.addComment(postId, {
        content: replyContent.trim(),
        parentCommentId: parentId // Ensure this matches the backend expectation
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

  const handleStartEdit = (commentId: string | number, content: string) => {
    setEditingCommentId(normalizeId(commentId));
    setEditContent(content);
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId || !editContent.trim() || !user) return;
    try {
      setSubmitting(true);
      const response = await communityPostsApi.updateComment(editingCommentId, { content: editContent.trim() });
      if (response.success) {
        await loadComments();
        setEditingCommentId(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
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

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = ({ comment, isReply = false }) => {
    const commentId = normalizeId(comment.id);
    const isMyComment = user && normalizeId(comment.author_id) === normalizeId(user.id);
    const isEditing = editingCommentId === commentId;
    const isReplying = replyingTo === commentId;

    return (
    <div className={`${isReply ? 'ml-8 mt-3' : 'mb-4'} flex space-x-3`}>
      <div className="flex-shrink-0">
        {comment.author_avatar ? (
          <img
            src={comment.author_avatar}
            alt={comment.author_name}
            className="w-8 h-8 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
            style={{ background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
          >
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
              {isMyComment && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(comment.id, comment.content)}
                    className="text-gray-400 hover:text-[color:#1e1b4b] transition-colors"
                    aria-label="Edit comment"
                    title="Edit comment"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Delete comment"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[color:#1e1b4b]"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateComment}
                  disabled={!editContent.trim() || submitting}
                  className="px-3 py-1 text-white text-xs rounded-md disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditContent('');
                  }}
                  className="px-3 py-1 text-xs rounded-md border border-gray-200 text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}
        </div>

        {!isReply && (
          <div className="flex items-center space-x-4 mt-1 ml-3">
            <button
              type="button"
              onClick={() => setReplyingTo(isReplying ? null : commentId)}
              className="text-xs text-gray-500 hover:text-[color:#1e1b4b] transition-colors flex items-center space-x-1"
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>
          </div>
        )}

        {/* Reply form */}
        {isReplying && (
          <div className="mt-3 ml-3 pl-3 border-l-2 border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${comment.author_name}...`}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[color:#1e1b4b] focus:bg-white transition-all"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddReply(comment.id);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleAddReply(comment.id)}
                disabled={!replyContent.trim() || submitting}
                className="p-2 text-white rounded-full hover:bg-[color:#312e81] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                style={{ backgroundColor: brandColors.primaryHex }}
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
  };

  return (
    <div className="border-t border-gray-100 pt-4">
      {/* Comments toggle */}
      <button
        type="button"
        onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-[color:#1e1b4b] transition-colors mb-3"
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
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                style={{ background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
              >
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
              className="w-full pl-4 pr-12 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[color:#1e1b4b] focus:bg-white transition-all"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!newComment.trim() || submitting}
              className="absolute right-1 top-1 p-1.5 text-white rounded-full hover:bg-[color:#312e81] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              style={{ backgroundColor: brandColors.primaryHex }}
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
              <div
                className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto"
                style={{ borderColor: brandColors.primaryHex, borderBottomColor: 'transparent' }}
              ></div>
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
