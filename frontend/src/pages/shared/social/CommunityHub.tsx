import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  RefreshCw,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Star,
  Bookmark
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { communityPostsApi } from '@/services/api/communityPosts';
import type { Post } from '@/components/shared/social/PostCard';
import ShareModal from '@/components/shared/social/ShareModal';
import CreatePost from './components/CreatePost';
import CommunityFeed from './components/CommunityFeed';
import { useCommunityFeed } from '@/hooks/useCommunity';

interface CommunityMetrics {
  totalPosts: number;
  weeklyPosts: number;
  todayPosts: number;
  activeContributors: number;
  totalReactions: number;
  bookmarkedPosts: number;
  latestPostAt: string | null;
}

interface CommunityFeedState {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void> | void;
  metrics?: CommunityMetrics;
}

type CommunityVariant = 'default' | 'teacher' | 'student' | 'admin';

interface CommunityHubProps {
  viewMode?: 'feed' | 'my-posts' | 'trending';
  embedded?: boolean;
  variant?: CommunityVariant;
  feedState?: CommunityFeedState;
  showTabs?: boolean;
  disableLayoutPadding?: boolean;
}

interface QuickAction {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

const truncateText = (value: string, limit = 120) => {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
};

const CommunityHub: React.FC<CommunityHubProps> = ({
  viewMode: initialViewMode = 'feed',
  embedded = false,
  variant = 'default',
  feedState,
  disableLayoutPadding = false
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const internalFeed = useCommunityFeed(feedState ? { autoFetch: false } : undefined);

  const posts = feedState?.posts ?? internalFeed.posts;
  const setPosts = feedState?.setPosts ?? internalFeed.setPosts;
  const loading = feedState?.loading ?? internalFeed.loading;
  const error = feedState?.error ?? internalFeed.error;
  const refresh = feedState?.refresh ?? internalFeed.refresh;

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode] = useState(initialViewMode);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const createPostRef = useRef<HTMLDivElement | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'most_liked' | 'most_commented'>('newest');
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'image' | 'video' | 'audio' | 'article'>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const filteredPosts = useMemo(() => {
    let currentPosts = posts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      currentPosts = currentPosts.filter(p =>
        p.content.toLowerCase().includes(query) ||
        p.author_name.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      currentPosts = currentPosts.filter(p => (p.media_type || 'text') === typeFilter);
    }

    if (viewMode === 'my-posts') {
      currentPosts = currentPosts.filter(p => p.author_id === user?.id);
    }

    if (sortBy === 'most_liked') {
      currentPosts = [...currentPosts].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    } else if (sortBy === 'most_commented') {
      currentPosts = [...currentPosts].sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0));
    } else {
      currentPosts = [...currentPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return currentPosts;
  }, [posts, searchQuery, viewMode, user?.id, sortBy, typeFilter]);

  const trendingPosts = useMemo(() => {
    if (!posts.length) return [];
    return [...posts]
      .sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))
      .slice(0, 3);
  }, [posts]);

  const topContributors = useMemo(() => {
    const contributions = new Map<string, { name: string; posts: number; reactions: number }>();

    posts.forEach(post => {
      if (!post.author_id) return;
      const key = post.author_id;
      const entry = contributions.get(key) ?? {
        name: post.author_name,
        posts: 0,
        reactions: 0
      };

      entry.posts += 1;
      entry.reactions += (post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0);

      contributions.set(key, entry);
    });

    return Array.from(contributions.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.reactions - a.reactions || b.posts - a.posts)
      .slice(0, 3);
  }, [posts]);

  const scrollToComposer = () => {
    if (createPostRef.current) {
      createPostRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const heroContent = useMemo(() => {
    const firstName = user?.firstName || user?.email?.split('@')?.[0] || '';

    switch (variant) {
      case 'teacher':
        return {
          title: t('community.hero.teacher_title', { name: firstName }),
          subtitle: t('community.hero.teacher_subtitle'),
          ctaLabel: t('community.hero.cta_create'),
          ctaDescription: t('community.hero.cta_hint_teacher')
        };
      case 'student':
        return {
          title: t('community.hero.student_title', { name: firstName }),
          subtitle: t('community.hero.student_subtitle'),
          ctaLabel: t('community.hero.cta_share'),
          ctaDescription: t('community.hero.cta_hint_student')
        };
      case 'admin':
        return {
          title: t('community.hero.admin_title', { name: firstName }),
          subtitle: t('community.hero.admin_subtitle'),
          ctaLabel: t('community.hero.cta_announce'),
          ctaDescription: t('community.hero.cta_hint_admin')
        };
      default:
        return {
          title: t('community.hero.default_title'),
          subtitle: t('community.hero.default_subtitle'),
          ctaLabel: t('community.hero.cta_start'),
          ctaDescription: t('community.hero.cta_hint_default')
        };
    }
  }, [variant, user?.firstName, user?.email, t]);

  const handlePostCreated = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handleLike = async (postId: string) => {
    if (actionLoading[`like-${postId}`]) return;

    setActionLoading(prev => ({ ...prev, [`like-${postId}`]: true }));

    // Optimistic update
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? {
            ...p,
            likes: p.liked_by_user ? p.likes - 1 : p.likes + 1,
            liked_by_user: !p.liked_by_user
          }
          : p
      )
    );

    try {
      await communityPostsApi.toggleLike(postId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      const result = refresh();
      if (result instanceof Promise) {
        await result;
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [`like-${postId}`]: false }));
    }
  };

  const handleBookmark = async (postId: string) => {
    if (actionLoading[`bookmark-${postId}`]) return;

    setActionLoading(prev => ({ ...prev, [`bookmark-${postId}`]: true }));

    // Optimistic update
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? {
            ...p,
            is_bookmarked: !p.is_bookmarked
          }
          : p
      )
    );

    try {
      await communityPostsApi.toggleBookmark(postId);
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      const result = refresh();
      if (result instanceof Promise) {
        await result;
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [`bookmark-${postId}`]: false }));
    }
  };

  const handleDelete = (postId: string) => {
    setDeletingPostId(postId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingPostId) return;

    try {
      await communityPostsApi.deletePost(deletingPostId);
      setPosts(prev => prev.filter(p => p.id !== deletingPostId));
      setShowDeleteModal(false);
      setDeletingPostId(null);
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingPostId(null);
  };

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) return;

    try {
      await communityPostsApi.updatePost(postId, { content: editContent });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent } : p));
      setEditingPostId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update post:', error);
      alert('Failed to update post');
    }
  };

  const handleShare = (post: Post) => {
    setSharingPost(post);
    setShowShareModal(true);
  };

  const handleShareSuccess = () => {
    if (sharingPost) {
      setPosts(prev =>
        prev.map(p =>
          p.id === sharingPost.id
            ? { ...p, shares: p.shares + 1 }
            : p
        )
      );
    }
  };

  const handleCommentCountChange = (postId: string, count: number) => {
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, comments: count } : p)));
  };

  const renderSearchBar = () => (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
      <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('community.groups.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full bg-transparent border-none focus:outline-none text-sm text-slate-900 placeholder-slate-500"
          aria-label="Search community posts"
        />
      </div>
      <button
        onClick={() => {
          const result = refresh();
          if (result instanceof Promise) {
            result.catch(() => null);
          }
        }}
        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
        title={t('community.actions.refresh')}
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );

  return (
    <div className={`w-full ${disableLayoutPadding ? '' : 'px-4 sm:px-6 lg:px-10 xl:px-12 py-6'}`}>
      <div className={`mx-auto ${disableLayoutPadding ? '' : 'max-w-full space-y-8'}`}>
        {!embedded && (
          <section className="rounded-3xl bg-gradient-to-br from-[#1e1b4b]/10 via-white to-[#1e1b4b]/5 border border-[#1e1b4b]/20 shadow-xl p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="max-w-2xl space-y-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1e1b4b] bg-white/80 border border-[#1e1b4b]/30 px-3 py-1 rounded-full w-fit shadow-sm">
                  <Sparkles className="w-4 h-4" />
                  {t('community.hero.badge')}
                </span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1e1b4b] leading-snug">
                  {heroContent.title}
                </h1>
                <p className="text-base sm:text-lg text-slate-600">
                  {heroContent.subtitle}
                </p>
                <button
                  onClick={scrollToComposer}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e1b4b] text-white border border-[#1e1b4b] rounded-lg shadow-sm hover:bg-[#312e81] hover:shadow-md transition-all w-fit text-sm font-semibold"
                >
                  <Sparkles className="w-4 h-4" />
                  {heroContent.ctaLabel}
                </button>
              </div>
              <div className="flex flex-col lg:flex-row gap-6 w-full lg:w-auto">
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-4 shadow-sm w-full lg:w-72">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold text-[#1e1b4b] uppercase tracking-wide">{t('community.sidebar.trending_now')}</h2>
                    <TrendingUp className="w-3.5 h-3.5 text-[#cfa15a]" />
                  </div>
                  <div className="space-y-2">
                    {trendingPosts.length > 0 ? trendingPosts.slice(0, 2).map(post => (
                      <div key={post.id} className="p-2 rounded-lg bg-white/50 border border-white/60 hover:bg-white transition cursor-pointer group">
                        <p className="text-xs text-slate-700 mb-1.5 line-clamp-1 group-hover:text-[#1e1b4b] transition-colors font-medium">{truncateText(post.content, 40)}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate max-w-[80px]">{post.author_name}</span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            <Sparkles className="w-2.5 h-2.5 text-[#cfa15a]" />
                            {(post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0)}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-500 italic">{t('community.sidebar.trending_empty')}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-4 shadow-sm w-full lg:w-72">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold text-[#1e1b4b] uppercase tracking-wide">{t('community.sidebar.top_contributors')}</h2>
                    <Star className="w-3.5 h-3.5 text-[#cfa15a]" />
                  </div>
                  <div className="space-y-2">
                    {topContributors.length > 0 ? topContributors.slice(0, 2).map(contributor => (
                      <div key={contributor.id} className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-white/60 hover:bg-white transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1e1b4b]/5 flex items-center justify-center text-[10px] font-bold text-[#1e1b4b]">
                            {contributor.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <p className="text-xs font-semibold text-slate-800 truncate max-w-[100px]">{contributor.name}</p>
                            <p className="text-[10px] text-slate-500">{contributor.posts} posts</p>
                          </div>
                        </div>
                        <div className="p-1 rounded-md bg-[#cfa15a]/10">
                          <Bookmark className="w-3 h-3 text-[#cfa15a]" />
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-500 italic">{t('community.sidebar.contributors_empty')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className={`flex flex-col gap-6 ${embedded ? 'w-full max-w-3xl mx-auto' : ''}`}>
          <div className="w-full space-y-6">
            {renderSearchBar()}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs uppercase tracking-wide text-slate-500 whitespace-nowrap">{t('community.filters.sort')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="newest">{t('community.filters.newest')}</option>
                  <option value="most_liked">{t('community.filters.most_liked')}</option>
                  <option value="most_commented">{t('community.filters.most_commented')}</option>
                </select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs uppercase tracking-wide text-slate-500 whitespace-nowrap">{t('community.filters.type')}</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="all">{t('community.filters.all')}</option>
                  <option value="text">{t('community.filters.text')}</option>
                  <option value="image">{t('community.filters.image')}</option>
                  <option value="video">{t('community.filters.video')}</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div ref={createPostRef}>
              <CreatePost onPostCreated={handlePostCreated} />
            </div>

            <CommunityFeed
              posts={filteredPosts}
              isLoading={loading}
              currentUserId={user?.id}
              isAdmin={user?.role === 'admin'}
              onLike={handleLike}
              onDelete={handleDelete}
              onEdit={handleStartEdit}
              onShare={handleShare}
              onBookmark={handleBookmark}
              onCommentCountChange={handleCommentCountChange}
              onStartPost={scrollToComposer}
              editingPostId={editingPostId}
              editContent={editContent}
              onEditContentChange={setEditContent}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        </div>
      </div>

      {showShareModal && sharingPost && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          postId={sharingPost.id}
          postContent={sharingPost.content}
          onShareSuccess={handleShareSuccess}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Post</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this post? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={cancelDelete} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityHub;