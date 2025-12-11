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
  onStartEditing
}) => {
  const [showPostMenu, setShowPostMenu] = useState<boolean>(false);

  const avatarUrl = useMemo(
    () =>
      post.author_avatar ||
      post.authorAvatar ||
      post.author_profile_picture ||
      post.authorProfilePicture ||
      undefined,
    [post.authorProfilePicture, post.authorAvatar, post.author_avatar, post.author_profile_picture]
  );

  const displayName = useMemo(
    () =>
      post.author_name ||
      (post as any).authorName ||
      (post as any).author_full_name ||
      (post as any).authorFullName ||
      'User',
    [post.author_name]
  );

  const formattedDate = useMemo(() => {
    const date = new Date(post.created_at);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }, [post.created_at]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border border-gray-100 shadow-sm">
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm"
              style={{ background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{displayName}</h3>
            <p className="text-xs text-gray-500">{formattedDate}</p>
          </div>
        </div>
        {showActions && post.author_id === currentUserId && (
          <div className="relative">
            <button
              onClick={() => setShowPostMenu(!showPostMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>
            {showPostMenu && (
            <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                <button
                  onClick={() => {
                    onStartEditing?.(post);
                    setShowPostMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Post
                </button>
                <button
                  onClick={() => {
                    onDelete?.(post.id);
                    setShowPostMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      {editingPost === post.id ? (
        <div className="mb-4">
          <textarea
            value={editContent}
            onChange={(e) => onEditContentChange?.(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Edit your post..."
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onSaveEdit?.(post.id)}
              disabled={!editContent.trim()}
              className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-4 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        post.media_type !== 'article' && <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Media */}
      {post.media_url && post.media_type === 'image' && (
        <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 relative min-h-[200px]">
          <img
            src={post.media_url}
            alt="Post media"
            className="w-full max-h-96 object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-500"><span>Image failed to load</span></div>';
            }}
          />
        </div>
      )}
      {post.media_url && post.media_type === 'video' && (
        <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 relative">
          <video
            src={post.media_url}
            controls
            className="w-full max-h-96"
            preload="metadata"
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-500"><span>Video failed to load</span></div>';
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
      {post.media_url && post.media_type === 'audio' && (
        <div className="mb-4">
          <audio
            src={post.media_url}
            controls
            className="w-full"
            onError={(e) => {
              const target = e.target as HTMLAudioElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-16 bg-gray-200 text-gray-500 rounded"><span>Audio failed to load</span></div>';
            }}
          />
        </div>
      )}
      {post.media_type === 'article' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <FileText className="h-6 w-6 text-blue-600 mb-2" />
          <div className="text-gray-800 whitespace-pre-wrap">{post.content || 'Article content would appear here'}</div>
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={() => onLike?.(post.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            post.liked_by_user 
              ? 'text-red-600 bg-red-50 hover:bg-red-100' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Heart className={`h-5 w-5 ${post.liked_by_user ? 'fill-current' : ''}`} />
          <span className="font-medium">{post.likes}</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">{post.comments}</span>
        </button>
        <button
          onClick={() => onShare?.(post)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Share2 className="h-5 w-5" />
          <span className="font-medium">{post.shares}</span>
        </button>
        <button
          onClick={() => onBookmark?.(post.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            post.is_bookmarked 
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Bookmark className={`h-5 w-5 ${post.is_bookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Comments Section */}
      <CommentSection
        postId={post.id}
        commentCount={post.comments}
        onCommentCountChange={(newCount) => onCommentCountChange?.(post.id, newCount)}
      />
    </div>
  );
};

export default PostCard;
