import React, { useMemo, useState } from 'react';
import {
  MoreVertical, Edit3, Trash2, Heart, MessageCircle, Share2,
  FileText, Bookmark
} from 'lucide-react';
import CommentSection from '@/components/shared/social/CommentSection';
import { brandColors } from '@/theme/brand';

export interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  authorAvatar?: string;
  author_profile_picture?: string;
  authorProfilePicture?: string;
  content: string;
  media_type?: 'image' | 'video' | 'audio' | 'article';
  media_url?: string;
  created_at: string;
  likes: number;
  comments: number;
  shares: number;
  liked_by_user: boolean;
  is_bookmarked?: boolean;
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  showActions?: boolean;
  onDelete?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onShare?: (post: Post) => void;
  onBookmark?: (postId: string) => void;
  editingPost?: string | null;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  onSaveEdit?: (postId: string) => void;
  onCancelEdit?: () => void;
  onCommentCountChange?: (postId: string, newCount: number) => void;
  onStartEditing?: (post: Post) => void;
  isAdmin?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  showActions = true,
  onDelete,
  onLike,
  onShare,
  onBookmark,
  editingPost,
  editContent = '',
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
  onCommentCountChange,
  onStartEditing,
  isAdmin = false
}) => {
  const [showPostMenu, setShowPostMenu] = useState<boolean>(false);
  const [showComments, setShowComments] = useState<boolean>(false);

  const avatarUrl = useMemo(
    () =>
      post.author_avatar ||
      post.authorAvatar ||
      post.author_profile_picture ||
      post.authorProfilePicture ||
      undefined,
    [post.authorProfilePicture, post.authorAvatar, post.author_avatar, post.author_profile_picture]
  );

  const displayName = useMemo(() => {
    const pickName = (obj: any): string => {
      if (!obj) return '';
      const direct = obj.author_name || obj.authorName || obj.display_name || obj.displayName || obj.full_name || obj.author_full_name || obj.authorFullName || obj.fullName || obj.name || '';
      if (direct && String(direct).trim()) return String(direct).trim();
      const fn = obj.first_name || obj.firstName || '';
      const ln = obj.last_name || obj.lastName || '';
      const combo = `${fn} ${ln}`.trim();
      if (combo) return combo;
      const afn = obj.author_first_name || obj.authorFirstName || '';
      const aln = obj.author_last_name || obj.authorLastName || '';
      const acombo = `${afn} ${aln}`.trim();
      if (acombo) return acombo;
      const email = obj.email || obj.user_email || '';
      if (email && typeof email === 'string') {
        const base = email.split('@')[0]?.replace(/[._-]+/g, ' ');
        if (base) {
          return base
            .split(' ')
            .map((s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s))
            .join(' ');
        }
      }
      return '';
    };
    const name = pickName(post) || pickName((post as any).author) || pickName((post as any).user);
    return name || 'Member';
  }, [post]);

  const formattedDate = useMemo(() => {
    const date = new Date(post.created_at);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }, [post.created_at]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 mb-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-start gap-2.5">
          {avatarUrl ? (
            <div className="w-10 h-10 rounded-full cursor-pointer ring-1 ring-black/5 hover:ring-black/10 transition-all overflow-hidden bg-gray-50">
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{ background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col -mt-0.5">
            <span className="font-bold text-[15px] text-gray-900 leading-snug cursor-pointer hover:underline decoration-slate-400 underlines-offset-2">
              {displayName}
            </span>
            <span className="text-[12px] text-gray-500 font-normal hover:underline cursor-pointer">
              {formattedDate}
            </span>
          </div>
        </div>
        {showActions && (post.author_id === currentUserId || isAdmin) && (
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => onBookmark?.(post.id)}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-500 hover:text-gray-900"
            >
              <Bookmark className={`h-5 w-5 ${post.is_bookmarked ? 'fill-black text-black' : ''}`} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowPostMenu(!showPostMenu)}
                className="p-1 hover:bg-gray-50 rounded-full transition-colors"
              >
                <MoreVertical className="h-5 w-5 text-gray-600" />
              </button>
              {showPostMenu && (
                <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-lg shadow-xl z-20 min-w-[160px] py-1">
                  {post.author_id === currentUserId && (
                    <>
                      <button
                        onClick={() => {
                          onStartEditing?.(post);
                          setShowPostMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit Post
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
                    </>
                  )}
                  <button
                    onClick={() => {
                      onDelete?.(post.id);
                      setShowPostMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Post Content (Text only posts) */}
      {!post.media_url && post.content && !editingPost && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>
      )}

      {/* Editing Mode */}
      {editingPost === post.id && (
        <div className="px-4 pb-3">
          <textarea
            value={editContent}
            onChange={(e) => onEditContentChange?.(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none text-sm bg-gray-50"
            rows={3}
            placeholder="Edit your caption..."
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={onCancelEdit}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSaveEdit?.(post.id)}
              disabled={!editContent.trim()}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 text-xs font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Media Content - Edge to Edge */}
      <div className="bg-black/5 relative active:scale-[0.99] transition-transform duration-200 ease-out overflow-hidden">
        {post.media_url && post.media_type === 'image' && (
          <img
            src={post.media_url}
            alt="Post content"
            className="w-full h-auto max-h-[600px] object-cover block"
            loading="lazy"
          />
        )}
        {post.media_url && post.media_type === 'video' && (
          <video
            src={post.media_url}
            controls
            className="w-full h-auto max-h-[600px] block bg-black"
            preload="metadata"
          />
        )}
        {post.media_url && post.media_type === 'audio' && (
          <div className="p-4 bg-slate-50 flex items-center justify-center">
            <audio src={post.media_url} controls className="w-full" />
          </div>
        )}
        {post.media_type === 'article' && (
          <div className="p-6 bg-slate-50 border-y border-gray-100">
            <FileText className="h-8 w-8 text-slate-400 mb-3" />
            <p className="text-sm text-gray-800 whitespace-pre-wrap font-serif leading-relaxed line-clamp-6">
              {post.content}
            </p>
          </div>
        )}
      </div>

      <div className="p-3">
        {/* Action Bar */}
        {/* Facebook-style Action Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 mt-3">
          <button
            onClick={() => onLike?.(post.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${post.liked_by_user
              ? 'text-red-500 hover:bg-red-50'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <Heart
              className={`h-5 w-5 ${post.liked_by_user ? 'fill-current' : ''}`}
              strokeWidth={2}
            />
            <span className="font-medium text-sm">Like</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={2} />
            <span className="font-medium text-sm">Comment</span>
          </button>

          <button
            onClick={() => onShare?.(post)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Share2 className="h-5 w-5" strokeWidth={2} />
            <span className="font-medium text-sm">Share</span>
          </button>
        </div>

        {/* Likes Count */}
        <div className="font-semibold text-sm text-gray-900 mb-2">
          {post.likes === 0 ? 'Be the first to like this' : `${post.likes.toLocaleString()} likes`}
        </div>

        {/* Caption */}
        {post.media_url && post.content && !editingPost && (
          <div className="mb-2">
            <span className="font-semibold text-sm text-gray-900 mr-2">{displayName}</span>
            <span className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</span>
          </div>
        )}

        {/* Comment Preview section could act as 'View all comments' if we had that logic, 
            for now just render the comment section but simpler */}
        <CommentSection
          postId={post.id}
          commentCount={post.comments}
          onCommentCountChange={(newCount) => onCommentCountChange?.(post.id, newCount)}
          isFullWidth={true}
          isOpen={showComments}
          onToggle={() => setShowComments(!showComments)}
        />

        {/* Timestamp moved to header or strictly bottom if preferred, already in header */}
      </div>
    </div>
  );
};

export default PostCard;
