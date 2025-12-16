import React, { useState, useEffect } from 'react';
import { Trash2, Edit3 } from 'lucide-react';
import { communityPostsApi } from '../../../services/api/communityPosts';
import { useAuth } from '../../../context/AuthContext';
import { brandColors } from '@/theme/brand';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  parent_comment_id?: string;
  root_parent_id?: string;
  likes: number;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
  liked_by_user?: boolean;
}

interface CommentSectionProps {
  postId: string;
  commentCount: number;
  onCommentCountChange: (newCount: number) => void;
  isFullWidth?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

const normalizeId = (id: string | number | null | undefined) => (id != null ? String(id) : '');

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  user: any;
  editingCommentId: string | null;
  replyingTo: string | null;
  editDraft: string;
  replyDraftById: Record<string, string>;
  onLike: (id: string) => void;
  onReplyClick: (id: string) => void;
  onEditStart: (id: string, content: string) => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onEditDraftChange: (val: string) => void;
  onReplyDraftChange: (rootId: string, val: string) => void;
  onReplySubmit: (id: string, rootId: string) => void;
  onDelete: (id: string, isReply: boolean) => void;
  onCancelReply: () => void;
  formatDate: (d: string) => string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isReply = false,
  user,
  editingCommentId,
  replyingTo,
  editDraft,
  replyDraftById,
  onLike,
  onReplyClick,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditDraftChange,
  onReplyDraftChange,
  onReplySubmit,
  onDelete,
  onCancelReply,
  formatDate
}) => {
  const commentId = normalizeId(comment.id);
  const rootParentId = normalizeId(comment.root_parent_id ?? comment.id);
  const isMyComment = user && normalizeId(comment.author_id) === normalizeId(user.id);
  const isEditing = editingCommentId === commentId;
  const isReplying = replyingTo === commentId;
  const replyDraft = replyDraftById[rootParentId] ?? '';

  return (
    <div className={`${isReply ? 'ml-8 mt-2 pl-3 border-l-2 border-slate-100' : 'mb-3'} group`}>
      <div className="flex items-start gap-2.5">
        {!isReply && (
          <div className="flex-shrink-0 mt-0.5">
            {comment.author_avatar ? (
              <img
                src={comment.author_avatar}
                alt={comment.author_name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-black/5"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-black/5"
                style={{ background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
              >
                <span className="text-white text-xs font-bold">
                  {comment.author_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="">
              <textarea
                value={editDraft}
                onChange={(e) => onEditDraftChange(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-2xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none overflow-hidden"
                rows={2}
                autoFocus
                spellCheck={false}
              />
              <div className="flex gap-2 mt-1 justify-end">
                <button
                  onClick={onEditCancel}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onEditSave}
                  className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full font-bold transition-colors shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="inline-block relative">
              <div className="bg-[#f0f2f5] rounded-2xl px-3.5 py-2.5 inline-block text-[15px]">
                <a href="#" className="font-bold text-gray-900 block text-[13px] hover:underline mb-0.5 leading-tight">
                  {comment.author_name}
                </a>
                <span className="text-gray-900 whitespace-pre-wrap break-words leading-snug">{comment.content}</span>
              </div>

              {/* Comment Actions */}
              <div className="flex items-center gap-3 mt-1 ml-3.5 text-[12px] font-semibold text-slate-500 select-none">
                <span className="font-normal text-slate-400">{formatDate(comment.created_at)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike(commentId);
                  }}
                  className={`hover:underline cursor-pointer transition-colors ${comment.liked_by_user ? 'text-blue-600 font-bold' : ''}`}
                >
                  Like
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReplyClick(commentId);
                  }}
                  className="hover:underline cursor-pointer transition-colors"
                >
                  Reply
                </button>
                {comment.likes > 0 && (
                  <div className="flex items-center gap-1 bg-white rounded-full px-1 shadow-sm border border-gray-100 ml-auto mr-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-2 h-2 text-white fill-current" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                    </div>
                    <span className="text-[11px] font-normal text-gray-600 px-0.5">{comment.likes}</span>
                  </div>
                )}

                {isMyComment && (
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditStart(commentId, comment.content);
                      }}
                      className="hover:text-gray-800 transition-colors p-1 rounded-full hover:bg-gray-100"
                      title="Edit"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(commentId, isReply);
                      }}
                      className="hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline Reply Form */}
      {isReplying && (
        <div className="mt-2 ml-11 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {user?.avatar_url || user?.profilePicture ? (
            <img src={user.avatar_url || user.profilePicture} className="w-6 h-6 rounded-full object-cover mt-1" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-200 mt-1" />
          )}
          <div className="flex-1">
            <input
              type="text"
              value={replyDraft}
              onChange={(e) => onReplyDraftChange(rootParentId, e.target.value)}
              placeholder={`Reply to ${comment.author_name}...`}
              className="w-full bg-[#f0f2f5] rounded-2xl px-3 py-2 text-sm border-none focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-500 text-gray-900 transition-all"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onReplySubmit(commentId, rootParentId);
                }
                if (e.key === 'Escape') {
                  onCancelReply();
                }
              }}
            />
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 pl-2">
              <span>Press Esc to cancel</span>
            </div>
          </div>
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply={true}
              user={user}
              editingCommentId={editingCommentId}
              replyingTo={replyingTo}
              editDraft={editDraft}
              replyDraftById={replyDraftById}
              onLike={onLike}
              onReplyClick={onReplyClick}
              onEditStart={onEditStart}
              onEditCancel={onEditCancel}
              onEditSave={onEditSave}
              onEditDraftChange={onEditDraftChange}
              onReplyDraftChange={onReplyDraftChange}
              onReplySubmit={onReplySubmit}
              onDelete={onDelete}
              onCancelReply={onCancelReply}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  commentCount,
  onCommentCountChange,
  isFullWidth = false,
  isOpen,
  onToggle
}) => {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();

  /* State */
  const [comments, setComments] = useState<Comment[]>([]);
  const [internalShowComments, setInternalShowComments] = useState(false);
  const showComments = isOpen !== undefined ? isOpen : internalShowComments;
  const toggleComments = onToggle || (() => setInternalShowComments(prev => !prev));

  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraftById, setReplyDraftById] = useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await communityPostsApi.fetchComments(postId);
      if (response.success) {
        const attachRoot = (items: Comment[], rootId?: string): Comment[] =>
          items.map((c) => {
            const currentRoot = rootId ?? String(c.id);
            return {
              ...c,
              root_parent_id: currentRoot,
              replies: c.replies ? attachRoot(c.replies, currentRoot) : c.replies,
            };
          });
        setComments(attachRoot(response.data.comments));
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
        if (!showComments) toggleComments();
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (parentCommentId: string | number, rootParentId?: string | number) => {
    const parentId = normalizeId(rootParentId ?? parentCommentId);
    const draft = (replyDraftById[parentId] ?? '').trim();
    if (!draft || !user) return;

    try {
      setSubmitting(true);
      const response = await communityPostsApi.addComment(postId, {
        content: draft,
        parentCommentId: Number(parentId)
      });

      if (response.success) {
        setReplyDraftById((prev) => ({ ...prev, [parentId]: '' }));
        setReplyingTo(null);
        await loadComments();
        // Do not increment top-level comment count for replies
      }
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (commentId: string | number, content: string) => {
    const id = normalizeId(commentId);
    setEditingCommentId(id);
    setEditDraft(content ?? '');
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId || !user) return;
    const draft = editDraft.trim();
    if (!draft) return;
    try {
      setSubmitting(true);
      const response = await communityPostsApi.updateComment(editingCommentId, { content: draft });
      if (response.success) {
        await loadComments();
        setEditingCommentId(null);
        setEditDraft('');
      }
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string | number) => {
    try {
      const id = normalizeId(commentId);
      // Optimistic update
      setComments(prevComments => {
        const updateLike = (list: Comment[]): Comment[] => {
          return list.map(c => {
            if (normalizeId(c.id) === id) {
              const isLiked = !!c.liked_by_user;
              return {
                ...c,
                liked_by_user: !isLiked,
                likes: isLiked ? Math.max(0, c.likes - 1) : c.likes + 1
              };
            }
            if (c.replies) {
              return { ...c, replies: updateLike(c.replies) };
            }
            return c;
          });
        };
        return updateLike(prevComments);
      });

      await communityPostsApi.toggleCommentLike(id);
    } catch (error) {
      console.error('Failed to like comment:', error);
      // Revert on error (could implement full revert logic, but keeping simple for now)
      await loadComments();
    }
  };

  const handleDeleteComment = async (commentId: string | number, isReply: boolean = false) => {
    if (!user) return;

    const ok = await confirm({
      title: 'Delete comment?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      const idStr = String(commentId);
      const response = await communityPostsApi.deleteComment(idStr);
      if (response.success) {
        // Optimistically remove from state
        setComments(prev => {
          const remove = (list: Comment[]): Comment[] => {
            return list.filter(c => String(c.id) !== idStr).map(c => ({
              ...c,
              replies: c.replies ? remove(c.replies) : c.replies
            }));
          };
          return remove(prev);
        });

        if (!isReply) {
          onCommentCountChange(Math.max(0, commentCount - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      await loadComments(); // Reload to sync state
    }
  };

  /* Helper Functions */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`${isFullWidth ? '' : 'border-t border-gray-100 pt-3'} mb-1`}>
      {commentCount > 0 && (
        <button
          type="button"
          onClick={toggleComments}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors mb-2 cursor-pointer font-medium"
        >
          {showComments ? 'Hide comments' : `View all ${commentCount} comments`}
        </button>
      )}

      {/* Simplified Comments List */}
      {showComments && (
        <div className="space-y-4 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="py-2 text-center text-xs text-gray-400">Loading comments...</div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                user={user}
                editingCommentId={editingCommentId}
                replyingTo={replyingTo}
                editDraft={editDraft}
                replyDraftById={replyDraftById}
                onLike={(id) => handleLikeComment(id)}
                onReplyClick={(id) => setReplyingTo(replyingTo === id ? null : id)}
                onEditStart={(id, content) => handleStartEdit(id, content)}
                onEditCancel={() => setEditingCommentId(null)}
                onEditSave={handleUpdateComment}
                onEditDraftChange={setEditDraft}
                onReplyDraftChange={(rootId, val) => setReplyDraftById(prev => ({ ...prev, [rootId]: val }))}
                onReplySubmit={(id, rootId) => handleAddReply(id, rootId)}
                onDelete={handleDeleteComment}
                onCancelReply={() => setReplyingTo(null)}
                formatDate={formatDate}
              />
            ))
          )}
        </div>
      )}

      {/* Minimal Add Comment Input */}
      {user && (
        <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none placeholder:text-gray-500 text-gray-900"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddComment();
              }
            }}
          />
          {newComment.trim() && (
            <button
              onClick={handleAddComment}
              disabled={submitting}
              className="text-blue-600 text-sm font-semibold hover:text-blue-700 disabled:opacity-50 transition-colors"
            >
              Post
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
