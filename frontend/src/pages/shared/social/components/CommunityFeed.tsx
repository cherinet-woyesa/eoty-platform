import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MessageSquare, Sparkles } from 'lucide-react';
import PostCard, { type Post } from '@/components/shared/social/PostCard';

interface CommunityFeedProps {
  posts: Post[];
  isLoading: boolean;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onEdit: (post: Post) => void;
  onShare: (post: Post) => void;
  onBookmark: (postId: string) => void;
  onCommentCountChange: (postId: string, count: number) => void;
  currentUserId?: string;
  onStartPost?: () => void;
  editingPostId?: string | null;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  onSaveEdit?: (postId: string) => void;
  onCancelEdit?: () => void;
}

const CommunityFeed: React.FC<CommunityFeedProps> = ({
  posts,
  isLoading,
  onLike,
  onDelete,
  onEdit,
  onShare,
  onBookmark,
  onCommentCountChange,
  currentUserId,
  onStartPost,
  editingPostId,
  editContent,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit
}) => {
  const { t } = useTranslation();

  if (isLoading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="h-3 w-full bg-gray-200 rounded" />
            <div className="h-3 w-2/3 bg-gray-200 rounded" />
            <div className="flex gap-3 pt-2">
              <div className="h-8 w-16 bg-gray-200 rounded" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
          <MessageSquare className="w-8 h-8 text-[color:#1e1b4b]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('community.feed.empty_title')}</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          {t('community.feed.empty_body')}
        </p>
        {onStartPost && (
          <button
            onClick={onStartPost}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors font-semibold"
            style={{ backgroundColor: '#1e1b4b' }}
          >
            <Sparkles className="h-4 w-4" />
            {t('community.feed.empty_cta')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onLike={() => onLike(post.id)}
          onDelete={() => onDelete(post.id)}
          onStartEditing={onEdit}
          onShare={onShare}
          onBookmark={() => onBookmark(post.id)}
          onCommentCountChange={onCommentCountChange}
          editingPost={editingPostId}
          editContent={editContent}
          onEditContentChange={onEditContentChange}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
        />
      ))}
      
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 text-[color:#1e1b4b] animate-spin" />
        </div>
      )}
    </div>
  );
};

export default CommunityFeed;
