import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { communityPostsApi } from '@/services/api/communityPosts';
import type { Post } from '@/components/shared/social/PostCard';
import ShareModal from '@/components/shared/social/ShareModal';
import CreatePost from './components/CreatePost';
import CommunityFeed from './components/CommunityFeed';

interface CommunityHubProps {
  viewMode?: 'feed' | 'my-posts' | 'trending';
  embedded?: boolean;
}

const CommunityHub: React.FC<CommunityHubProps> = ({ 
  viewMode: initialViewMode = 'feed'
}) => {
  const { user } = useAuth();
  
  // State
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Filters removed
  const [viewMode] = useState(initialViewMode);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);

  // Load posts
  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await communityPostsApi.fetchPosts();
      setPosts(response.data.posts || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('Failed to load community posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    let currentPosts = posts;

    // 1. Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      currentPosts = currentPosts.filter(p => 
        p.content.toLowerCase().includes(query) || 
        p.author_name.toLowerCase().includes(query)
      );
    }

    // 2. View Mode
    if (viewMode === 'my-posts') {
      currentPosts = currentPosts.filter(p => p.author_id === user?.id);
    } else if (viewMode === 'trending') {
      currentPosts = [...currentPosts].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
    }

    // Category filters removed

    return currentPosts;
  }, [posts, searchQuery, viewMode, user?.id]);

  // Handlers
  const handlePostCreated = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handleLike = async (postId: string) => {
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          likes: p.liked_by_user ? p.likes - 1 : p.likes + 1,
          liked_by_user: !p.liked_by_user
        };
      }
      return p;
    }));

    try {
      await communityPostsApi.toggleLike(postId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert on error
      loadPosts();
    }
  };

  const handleBookmark = async (postId: string) => {
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_bookmarked: !p.is_bookmarked
        };
      }
      return p;
    }));

    try {
      await communityPostsApi.toggleBookmark(postId);
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      // Revert on error
      loadPosts();
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await communityPostsApi.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  const handleEdit = async (postId: string) => {
    // TODO: Implement edit modal
    console.log('Edit post:', postId);
  };

  const handleShare = (post: Post) => {
    setSharingPost(post);
    setShowShareModal(true);
  };

  const handleCommentCountChange = (postId: string, count: number) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: count } : p));
  };

  // No top nav or filter tabs per request

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto max-w-5xl space-y-4">
          {/* Main Content Area: Full width with only search */}
          <div className="grid grid-cols-1 gap-0">
            <div className="space-y-4">
              {/* Search only */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 min-w-[200px] bg-gray-50 px-3 py-2 rounded-md border border-gray-200 focus-within:border-[#27AE60] focus-within:ring-1 focus-within:ring-[#27AE60] transition-all">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search posts"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-0 placeholder-gray-400"
                  />
                </div>
                <button 
                  onClick={loadPosts}
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
                  title="Refresh feed"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
                <button 
                  onClick={loadPosts}
                  className="ml-auto text-sm font-medium hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Full-width feed */}
            <div className="space-y-4">
              <CreatePost onPostCreated={handlePostCreated} />
              <CommunityFeed
                posts={filteredPosts}
                isLoading={loading}
                currentUserId={user?.id}
                onLike={handleLike}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onShare={handleShare}
                onBookmark={handleBookmark}
                onCommentCountChange={handleCommentCountChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && sharingPost && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          postId={sharingPost.id}
          postContent={sharingPost.content}
        />
      )}
    </div>
  );
};

export default CommunityHub;