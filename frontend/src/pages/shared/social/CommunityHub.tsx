import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const createPostRef = useRef<HTMLDivElement | null>(null);

  const filteredPosts = useMemo(() => {
    let currentPosts = posts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      currentPosts = currentPosts.filter(p =>
        p.content.toLowerCase().includes(query) ||
        p.author_name.toLowerCase().includes(query)
      );
    }

    if (viewMode === 'my-posts') {
      currentPosts = currentPosts.filter(p => p.author_id === user?.id);
    } else if (viewMode === 'trending') {
      currentPosts = [...currentPosts].sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));
    }

    return currentPosts;
  }, [posts, searchQuery, viewMode, user?.id]);

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
    const firstName = user?.first_name || user?.name?.split(' ')?.[0] || 'there';

    switch (variant) {
      case 'teacher':
        return {
          title: `Guide your community, ${firstName}`,
          subtitle: 'Share lesson insights, celebrate chapter wins, and mentor fellow teachers in one collaborative space.',
          ctaLabel: 'Create Discussion',
          ctaDescription: 'Start a conversation rooted in Ethiopian Orthodox tradition.'
        };
      case 'student':
        return {
          title: `Welcome back, ${firstName}`,
          subtitle: 'Ask questions, join study circles, and grow alongside peers across every chapter.',
          ctaLabel: 'Ask a Question',
          ctaDescription: 'Share a thought or topic you’d like the community to explore.'
        };
      default:
        return {
          title: 'Community Hub',
          subtitle: 'A shared space for faithful discussions, cross-chapter collaboration, and guided growth.',
          ctaLabel: 'Start a Post',
          ctaDescription: 'Spark meaningful conversation with the wider community.'
        };
    }
  }, [variant, user?.first_name, user?.name]);

  const quickActions = useMemo<QuickAction[]>(() => {
    const base: QuickAction[] = [
      {
        label: heroContent.ctaLabel,
        description: heroContent.ctaDescription,
        icon: Sparkles,
        onClick: scrollToComposer
      },
      {
        label: 'Browse Forums',
        description: 'Dive into structured discussions curated by moderators.',
        icon: MessageSquare,
        onClick: () => navigate('/forums/1')
      },
      {
        label: 'Refresh Feed',
        description: 'Catch the latest updates and community highlights.',
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
        label: 'Invite to Chapter',
        description: 'Grow your teaching chapter with trusted peers.',
        icon: Users,
        onClick: () => navigate('/teacher/chapters')
      });
    } else if (variant === 'student') {
      base.push({
        label: 'Join Study Group',
        description: 'Find classmates preparing for the same lessons.',
        icon: Compass,
        onClick: () => navigate('/student/community-hub')
      });
    } else {
      base.push({
        label: 'View Calendar',
        description: 'Stay aligned with upcoming community events.',
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

  const handleEdit = async () => {
    // Placeholder for future inline edit flow
    console.log('Edit post feature is coming soon');
  };

  const handleShare = (post: Post) => {
    setSharingPost(post);
    setShowShareModal(true);
  };

  const handleCommentCountChange = (postId: string, count: number) => {
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, comments: count } : p)));
  };

  const renderSearchBar = (compact = false) => (
    <div
      className={`bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl ${compact ? 'px-3 py-2' : 'px-4 py-3'} flex items-center gap-2 shadow-sm`}
    >
      <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 focus-within:border-[#27AE60] focus-within:ring-1 focus-within:ring-[#27AE60] transition-all">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search community posts"
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
        title="Refresh feed"
        aria-label="Refresh feed"
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
          onEdit={handleEdit}
          onShare={handleShare}
          onBookmark={handleBookmark}
          onCommentCountChange={handleCommentCountChange}
        />

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
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl bg-gradient-to-br from-[#27AE60]/15 via-[#16A085]/10 to-[#2980B9]/15 border border-[#27AE60]/20 shadow-xl p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#27AE60] bg-white/80 border border-[#27AE60]/30 px-3 py-1 rounded-full w-fit shadow-sm">
                <Sparkles className="w-4 h-4" />
                Community Focus
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-snug">
                {heroContent.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-600">
                {heroContent.subtitle}
              </p>
              <button
                onClick={scrollToComposer}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#27AE60] border border-[#27AE60]/40 rounded-lg shadow-sm hover:shadow-md transition-all w-fit text-sm font-semibold"
              >
                <Sparkles className="w-4 h-4" />
                {heroContent.ctaLabel}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
              {[{
                label: 'Active Posts',
                value: metrics.totalPosts,
                icon: MessageSquare,
                accent: 'from-[#27AE60] to-[#16A085]'
              }, {
                label: 'This Week',
                value: metrics.weeklyPosts,
                icon: Activity,
                accent: 'from-[#2980B9] to-[#16A085]'
              }, {
                label: 'Contributors',
                value: metrics.activeContributors,
                icon: Users,
                accent: 'from-[#8E44AD] to-[#2980B9]'
              }, {
                label: 'Total Reactions',
                value: metrics.totalReactions,
                icon: Sparkles,
                accent: 'from-[#F39C12] to-[#E67E22]'
              }].map(card => (
                <div
                  key={card.label}
                  className="bg-white/90 border border-white/80 rounded-2xl px-4 py-5 shadow-sm flex flex-col gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center text-white`}> 
                    <card.icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{card.value}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">{card.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {renderSearchBar()}

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
              onEdit={handleEdit}
              onShare={handleShare}
              onBookmark={handleBookmark}
              onCommentCountChange={handleCommentCountChange}
            />
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Quick Actions</h2>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-3">
                {quickActions.map(action => (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="w-full flex items-start gap-3 text-left px-3 py-3 rounded-xl border border-slate-200 hover:border-[#27AE60]/40 hover:bg-[#27AE60]/5 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <action.icon className="w-5 h-5 text-[#27AE60]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                      <p className="text-xs text-slate-500">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Trending Now</h2>
                <TrendingUp className="w-4 h-4 text-[#2980B9]" />
              </div>
              <div className="space-y-3">
                {trendingPosts.length > 0 ? trendingPosts.map(post => (
                  <div key={post.id} className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                    <p className="text-sm text-slate-700 mb-2">{truncateText(post.content)}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{post.author_name}</span>
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        {post.likes + post.comments + post.shares}
                      </span>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No trending posts yet. Start a discussion to inspire others!</p>
                )}
              </div>
            </div>

            <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Top Contributors</h2>
                <Star className="w-4 h-4 text-[#F39C12]" />
              </div>
              <div className="space-y-3">
                {topContributors.length > 0 ? topContributors.map(contributor => (
                  <div key={contributor.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{contributor.name}</p>
                      <p className="text-xs text-slate-500">{contributor.posts} posts • {contributor.reactions} reactions</p>
                    </div>
                    <Bookmark className="w-5 h-5 text-[#27AE60]" />
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">Be the first to contribute and encourage others to join the discussion.</p>
                )}
              </div>
            </div>

            {metrics.latestPostAt && (
              <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2">Latest activity</h2>
                <p className="text-sm text-slate-600">Last post published {new Date(metrics.latestPostAt).toLocaleString()}.</p>
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
        />
      )}
    </div>
  );
};

export default CommunityHub;