import React from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import PostCard, { type Post } from '@/components/shared/social/PostCard';

interface CommunityFeedProps {
  posts: Post[];
  isLoading: boolean;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onEdit: (postId: string) => void;
  onShare: (post: Post) => void;
  onBookmark: (postId: string) => void;
  onCommentCountChange: (postId: string, count: number) => void;
  currentUserId?: string;
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
  currentUserId
}) => {
  if (isLoading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#27AE60] animate-spin mb-4" />
        <p className="text-gray-500">Loading community posts...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Be the first to share something with the community! Start a discussion or share your spiritual journey.
        </p>
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
          onStartEditing={() => onEdit(post.id)}
          onShare={onShare}
          onBookmark={() => onBookmark(post.id)}
          onCommentCountChange={onCommentCountChange}
        />
      ))}
      
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 text-[#27AE60] animate-spin" />
        </div>
      )}
    </div>
  );
};

export default CommunityFeed;
