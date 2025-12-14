import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Users,
  Activity,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  Star,
  Bookmark,
  Calendar,
  Compass
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { communityPostsApi } from '@/services/api/communityPosts';
import type { Post } from '@/components/shared/social/PostCard';
import ShareModal from '@/components/shared/social/ShareModal';
import CreatePost from './components/CreatePost';
import CommunityFeed from './components/CommunityFeed';
import { useCommunityFeed } from '@/hooks/useCommunity';
import { brandColors } from '@/theme/brand';

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

type CommunityVariant = 'default' | 'teacher' | 'student';

interface CommunityHubProps {
  viewMode?: 'feed' | 'my-posts' | 'trending';
  embedded?: boolean;
  variant?: CommunityVariant;
  feedState?: CommunityFeedState;
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
  feedState
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
  const metrics = feedState?.metrics ?? internalFeed.metrics;

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode] = useState(initialViewMode);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const createPostRef = useRef<HTMLDivElement | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'most_liked' | 'most_commented'>('newest');
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'image' | 'video' | 'audio' | 'article'>('all');

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
      default:
        return {
          title: t('community.hero.default_title'),
          subtitle: t('community.hero.default_subtitle'),
          ctaLabel: t('community.hero.cta_start'),
          ctaDescription: t('community.hero.cta_hint_default')
        };
    }
  }, [variant, user?.firstName, user?.email, t]);

  const quickActions = useMemo<QuickAction[]>(() => {
    const base: QuickAction[] = [
      {
        label: heroContent.ctaLabel,
        description: heroContent.ctaDescription,
        icon: Sparkles,
        onClick: scrollToComposer
      },
      {
        label: t('community.actions.browse_forums'),
        description: t('community.actions.browse_forums_desc'),
        icon: MessageSquare,
        onClick: () => navigate('/forums/1')
      },
      {
        label: t('community.actions.refresh'),
        description: t('community.actions.refresh_desc'),
        icon: RefreshCw,
        onClick: () => {
          const result = refresh();
          if (result instanceof Promise) {
            result.catch(() => null);
          }
        }
      }
    ];

    if (variant === 'teacher') {
      base.push({
        label: t('community.actions.invite_chapter'),
        description: t('community.actions.invite_chapter_desc'),
        icon: Users,
        onClick: () => navigate('/teacher/chapters')
      });
    } else if (variant === 'student') {
      base.push({
        label: t('community.actions.join_group'),
        description: t('community.actions.join_group_desc'),
        icon: Compass,
        onClick: () => navigate('/member/community-hub')
      });
    } else {
      base.push({
        label: t('community.actions.view_calendar'),
        description: t('community.actions.view_calendar_desc'),
        icon: Calendar,
        onClick: () => navigate('/calendar')
      });
    }

    return base;
  }, [heroContent, navigate, refresh, variant]);

  const handlePostCreated = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handleLike = async (postId: string) => {
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
    }
  };

  const handleBookmark = async (postId: string) => {
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

  const renderSearchBar = (compact = false) => (
    <div
      className={`bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl ${compact ? 'px-3 py-2' : 'px-4 py-3'} flex items-center gap-2 shadow-sm`}
    >
      <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 focus-within:border-[color:#1e1b4b] focus-within:ring-1 focus-within:ring-[color:#1e1b4b] transition-all">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('community.feed.search_placeholder')}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-700 placeholder-slate-400"
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
        className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
        title={t('community.actions.refresh')}
        aria-label={t('community.actions.refresh')}
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {renderSearchBar(true)}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
            <button
              onClick={() => {
                const result = refresh();
                if (result instanceof Promise) {
                  result.catch(() => null);
                }
              }}
              className="ml-auto text-sm font-medium hover:underline"
            >
              {t('common.try_again')}
            </button>
          </div>
        )}

        <div ref={createPostRef} id="community-create-post">
          <CreatePost onPostCreated={handlePostCreated} />
        </div>

        <CommunityFeed
          posts={filteredPosts}
          isLoading={loading}
          currentUserId={user?.id}
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

        {showShareModal && sharingPost && (
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            postId={sharingPost.id}
            postContent={sharingPost.content}
            onShareSuccess={handleShareSuccess}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Delete Post
                </h3>
                <p className="text-sm text-gray-600 text-center mb-6">
                  Are you sure you want to delete this post? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto max-w-7xl space-y-8">
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e1b4b] text-white border border-[#1e1b4b] rounded-lg shadow-sm hover:bg-[#312e81] hover:shadow-md transition-all w-fit text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e1b4b]"
              >
                <Sparkles className="w-4 h-4" />
                {heroContent.ctaLabel}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
              {[{
                label: t('community.metrics.total_posts'),
                value: metrics.totalPosts,
                icon: MessageSquare,
                accent: 'from-[#1e1b4b] to-[#312e81]'
              }, {
                label: t('community.metrics.weekly_posts'),
                value: metrics.weeklyPosts,
                icon: Activity,
                accent: 'from-[#1e1b4b] to-[#312e81]'
              }, {
                label: t('community.metrics.contributors'),
                value: metrics.activeContributors,
                icon: Users,
                accent: 'from-[#cfa15a] to-[#d8b26d]'
              }, {
                label: t('community.metrics.reactions'),
                value: metrics.totalReactions,
                icon: Sparkles,
                accent: 'from-[#1e1b4b] to-[#312e81]'
              }].map(card => (
                <div
                  key={card.label}
                  className="bg-white/90 border border-white/80 rounded-2xl px-4 py-5 shadow-sm flex flex-col gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center text-white`}> 
                    <card.icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-bold text-[#1e1b4b]">{card.value}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">{card.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {renderSearchBar()}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                <span className="text-xs uppercase tracking-wide text-slate-500 whitespace-nowrap">{t('community.filters.sort')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'most_liked' | 'most_commented')}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-[#1e1b4b] focus:ring-1 focus:ring-[#1e1b4b] focus:outline-none cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {(['newest', 'most_liked', 'most_commented'] as const).map(key => (
                    <option key={key} value={key}>
                      {t(`community.filters.${key}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                <span className="text-xs uppercase tracking-wide text-slate-500 whitespace-nowrap">{t('community.filters.type')}</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'text' | 'image' | 'video' | 'audio' | 'article')}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-[#1e1b4b] focus:ring-1 focus:ring-[#1e1b4b] focus:outline-none cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {(['all', 'text', 'image', 'video', 'audio', 'article'] as const).map(key => (
                    <option key={key} value={key}>
                      {t(`community.filters.${key}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
                <button
                  onClick={() => {
                    const result = refresh();
                    if (result instanceof Promise) {
                      result.catch(() => null);
                    }
                  }}
                  className="ml-auto text-sm font-medium hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={createPostRef} id="community-create-post">
              <CreatePost onPostCreated={handlePostCreated} />
            </div>

            <CommunityFeed
              posts={filteredPosts}
              isLoading={loading}
              currentUserId={user?.id}
              onLike={handleLike}
              onDelete={handleDelete}
              onEdit={handleStartEdit}
              onShare={handleShare}
              onBookmark={handleBookmark}
              onCommentCountChange={handleCommentCountChange}
              editingPostId={editingPostId}
              editContent={editContent}
              onEditContentChange={setEditContent}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
            />
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{t('community.sidebar.quick_actions')}</h2>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-3">
                {quickActions.map(action => (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="w-full flex items-start gap-3 text-left px-3 py-3 rounded-xl border border-slate-200 hover:border-[#1e1b4b]/40 hover:bg-[#1e1b4b]/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-white transition-colors">
                      <action.icon className="w-5 h-5 text-[#1e1b4b]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-[#1e1b4b] transition-colors">{action.label}</p>
                      <p className="text-xs text-slate-500">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{t('community.sidebar.trending_now')}</h2>
                <TrendingUp className="w-4 h-4 text-[#cfa15a]" />
              </div>
              <div className="space-y-3">
                {trendingPosts.length > 0 ? trendingPosts.map(post => (
                  <div key={post.id} className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer group">
                    <p className="text-sm text-slate-700 mb-2 line-clamp-2 group-hover:text-[#1e1b4b] transition-colors">{truncateText(post.content)}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium">{post.author_name}</span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3 text-[#cfa15a]" />
                        {post.likes + post.comments + post.shares}
                      </span>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">{t('community.sidebar.trending_empty')}</p>
                )}
              </div>
            </div>

            <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{t('community.sidebar.top_contributors')}</h2>
                <Star className="w-4 h-4 text-[#cfa15a]" />
              </div>
              <div className="space-y-3">
                {topContributors.length > 0 ? topContributors.map(contributor => (
                  <div key={contributor.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-[#1e1b4b]/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e1b4b]/5 flex items-center justify-center text-xs font-bold text-[#1e1b4b]">
                        {contributor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{contributor.name}</p>
                        <p className="text-xs text-slate-500">{contributor.posts} posts • {contributor.reactions} reactions</p>
                      </div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#cfa15a]/10">
                      <Bookmark className="w-4 h-4 text-[#cfa15a]" />
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">{t('community.sidebar.contributors_empty')}</p>
                )}
              </div>
            </div>

            {metrics.latestPostAt && (
              <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2">{t('community.sidebar.latest_activity')}</h2>
                <p className="text-sm text-slate-600">{t('community.sidebar.last_post_published', { date: new Date(metrics.latestPostAt).toLocaleString() })}</p>
              </div>
            )}
          </aside>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Post
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityHub;