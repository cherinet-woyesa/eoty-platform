import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Search, TrendingUp, Users as UsersIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DiscussionCard, { type DiscussionCardData } from '@/components/shared/social/DiscussionCard';
import CreateDiscussionModal from '@/components/shared/social/CreateDiscussionModal';
import CreateForumModal from '@/components/shared/social/CreateForumModal';
import { useForums } from '@/hooks/useCommunity';
import { forumApi } from '@/services/api/forums';
import { useNotification } from '@/context/NotificationContext';
import { brandColors } from '@/theme/brand';

interface ForumsProps {
  embedded?: boolean;
}

const Forums: React.FC<ForumsProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const { forums, loading, error, refetch: refreshForums } = useForums();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateForum, setShowCreateForum] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [discussions, setDiscussions] = useState<DiscussionCardData[]>([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [selectedForumId, setSelectedForumId] = useState<string>('all');
  const [pageByForum, setPageByForum] = useState<Record<string, number>>({});
  const [hasMoreByForum, setHasMoreByForum] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'newest' | 'replies' | 'views' | 'pinned'>('newest');
  const [likedTopics, setLikedTopics] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadDiscussions = useCallback(
    async (forumId: string, page = 1, append = false) => {
      const targetForums = forumId === 'all' ? forums : forums.filter(f => String(f.id) === forumId);
      if (!targetForums.length) return;
      setLoadingDiscussions(true);
      setTopicsError(null);
      try {
        const topicResults = await Promise.all(
          targetForums.map(async (forum) => {
            const res = await forumApi.getTopics(String(forum.id), page, 20);
            const topics = res?.data?.topics || res?.topics || [];
            setHasMoreByForum(prev => ({ ...prev, [forumId]: topics.length === 20 }));
            const deriveName = (entity: any): string => {
              if (!entity) return '';
              const pickName = (obj: any): string => {
                if (!obj) return '';
                const direct = obj.author_name || obj.authorName || obj.display_name || obj.displayName || obj.full_name || obj.fullName || obj.name || '';
                if (direct && String(direct).trim()) return String(direct).trim();
                const fn = obj.first_name || obj.firstName || obj.given_name || '';
                const ln = obj.last_name || obj.lastName || obj.family_name || '';
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
              return (
                pickName(entity) ||
                pickName(entity.author) ||
                pickName(entity.user) ||
                ''
              );
            };
            return topics.map((topic: any) => ({
              id: String(topic.id),
              title: topic.title,
              excerpt: topic.content ? topic.content.slice(0, 220) : t('community.forums.no_description'),
              tags: topic.tags || (forum as any).tags || [t('community.forums.tag_general')],
              visibility: topic.is_private ? 'private' : forum.is_public ? 'public' : 'chapter',
              replies: topic.post_count || topic.reply_count || 0,
              lastActivity: topic.last_activity_at
                ? new Date(topic.last_activity_at).toLocaleString()
                : topic.updated_at
                  ? new Date(topic.updated_at).toLocaleDateString()
                  : t('community.forums.recently'),
              participants: topic.participants || [],
              forumId: forum.id,
              forumName: forum.title,
              pinned: topic.is_pinned,
              locked: topic.is_locked,
              views: topic.view_count || 0,
              likes: topic.like_count || topic.likes_count || 0,
              userLiked: topic.user_liked || false,
              author: deriveName(topic) || 'Member'
            }));
          })
        );
        const flattened = topicResults.flat();
        setPageByForum(prev => ({ ...prev, [forumId]: page }));
        setDiscussions(prev => (append ? [...prev, ...flattened] : flattened));
      } catch (err: any) {
        setTopicsError(err?.message || t('community.forums.load_error'));
        showNotification({ type: 'error', title: t('common.error'), message: err?.message || t('community.forums.load_error') });
      } finally {
        setLoadingDiscussions(false);
      }
    },
    [forums, showNotification, t]
  );

  useEffect(() => {
    setDiscussions([]);
    const startPage = pageByForum[selectedForumId] || 1;
    loadDiscussions(selectedForumId, startPage, false);
  }, [forums, selectedForumId, loadDiscussions]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first.isIntersecting) return;
        if (loadingDiscussions) return;
        if (!hasMoreByForum[selectedForumId]) return;
        if (searchTerm || activeTag) return;
        const nextPage = (pageByForum[selectedForumId] || 1) + 1;
        loadDiscussions(selectedForumId, nextPage, true);
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectedForumId, hasMoreByForum, loadingDiscussions, pageByForum, loadDiscussions, searchTerm, activeTag]);

  const filteredDiscussions = discussions.filter((d) => {
    const matchSearch =
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchTag = activeTag ? d.tags.includes(activeTag) : true;
    return matchSearch && matchTag;
  }).sort((a, b) => {
    if (sortBy === 'pinned') {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
    }
    if (sortBy === 'replies') return (b.replies || 0) - (a.replies || 0);
    if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
    const da = new Date(a.lastActivity).getTime();
    const db = new Date(b.lastActivity).getTime();
    return db - da;
  });

  const handleCreateSubmit = async (payload: {
    title: string;
    content: string;
    tags: string[];
    visibility: 'public' | 'chapter' | 'private';
    teacherOnly: boolean;
    invites: string[];
    forumId?: string;
  }) => {
    try {
      const targetForumId = payload.forumId || (forums[0] ? String(forums[0].id) : '');
      if (!targetForumId) {
        throw new Error(t('community.forums.no_forum_error'));
      }
      const isPrivate = payload.visibility === 'private';
      await forumApi.createTopic({
        forumId: targetForumId,
        title: payload.title,
        content: payload.content,
        isPrivate,
        allowedChapterId: payload.visibility === 'chapter' ? payload.forumId || forums[0]?.chapter_id : null,
        tags: payload.tags,
        teacherOnly: payload.teacherOnly
      });
      setShowCreate(false);
      showNotification({ type: 'success', title: t('common.success'), message: t('community.forums.create_success') });
      await loadDiscussions(selectedForumId, 1, false);
    } catch (err) {
      console.error('Failed to create discussion', err);
      setTopicsError(err instanceof Error ? err.message : t('community.forums.create_failed_message'));
      showNotification({
        type: 'error',
        title: t('community.forums.create_failed_title'),
        message: err instanceof Error ? err.message : t('community.forums.create_failed_message')
      });
    }
  };

  const handleLikeCard = async (id: string) => {
    if (likedTopics.has(id)) return;
    try {
      await forumApi.likeTopic(id);
      setLikedTopics((prev) => new Set(prev).add(id));
      setDiscussions((prev) =>
        prev.map((d) => (d.id === id ? { ...d, likes: (d.likes || 0) + 1, userLiked: true } : d))
      );
      showNotification({ type: 'success', title: t('common.success'), message: t('community.forums.like_success') });
    } catch (err) {
      console.error('Failed to like topic card', err);
      showNotification({
        type: 'error',
        title: t('community.forums.like_failed_title'),
        message: t('community.forums.like_failed_message')
      });
    }
  };

  if (loading) {
    return (
      <div className={`w-full ${embedded ? 'p-4' : 'min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-200 rounded-xl w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full ${embedded ? 'p-4' : 'min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
            <h2 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('community.forums.error_title')}
            </h2>
            <p className="text-red-600">{error || t('community.forums.load_error')}</p>
          </div>
        </div>
      </div>
    );
  }

  const popularTags = Array.from(
    discussions.reduce((map, d) => {
      d.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1));
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className={embedded ? 'w-full' : 'min-h-screen bg-slate-50'}>
      <div className={embedded ? 'w-full p-4' : 'max-w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16 py-6'}>
        {/* Header */}
        {!embedded && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <MessageSquare className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">{t('community.forums.badge')}</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('community.forums.header_title')}</h1>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="grid gap-4 lg:grid-cols-12 items-end">
            {/* Search */}
            <div className="lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('community.forums.search')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('community.forums.search_placeholder', 'Search discussions...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Forum Select */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('community.forums.forum_label')}</label>
              <select
                value={selectedForumId}
                onChange={(e) => setSelectedForumId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="all">{t('community.forums.all_forums')}</option>
                {forums.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('community.forums.sort_label', 'Sort by')}</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="newest">{t('community.forums.sort.newest')}</option>
                <option value="replies">{t('community.forums.sort.replies')}</option>
                <option value="views">{t('community.forums.sort.views')}</option>
                <option value="pinned">{t('community.forums.sort.pinned')}</option>
              </select>
            </div>

            {/* Actions */}
            <div className="lg:col-span-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowCreate(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold shadow-sm text-white hover:shadow-md transition-all whitespace-nowrap"
                style={{ backgroundColor: brandColors.primaryHex }}
                title={t('community.forums.new')}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden xl:inline">{t('community.forums.new')}</span>
                <span className="xl:hidden">{t('community.forums.new_topic_short')}</span>
              </button>
              <button
                onClick={() => setShowCreateForum(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold shadow-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap"
                title={t('community.forums.new_forum')}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden xl:inline">{t('community.forums.new_forum')}</span>
                <span className="xl:hidden">{t('community.forums.new_forum_short')}</span>
              </button>
            </div>
          </div>

          {/* Active Tag Filter */}
          {activeTag && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                #{activeTag}
              </span>
              <button onClick={() => setActiveTag(null)} className="text-slate-500 hover:text-slate-700 font-medium">
                {t('community.forums.clear_filters')}
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats & Tags */}
        {!embedded && popularTags.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">{t('community.forums.stats.total')}</p>
                  <p className="text-2xl font-bold text-slate-900">{discussions.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">{t('community.forums.stats.active_today')}</p>
                  <p className="text-2xl font-bold text-slate-900">{filteredDiscussions.filter(d => d.replies > 0).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <UsersIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">{t('community.forums.stats.forums')}</p>
                  <p className="text-2xl font-bold text-slate-900">{forums.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Popular Tags */}
        {!embedded && popularTags.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full" style={{ backgroundColor: brandColors.primaryHex }}></span>
              {t('community.forums.stats.popular_tags')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${activeTag === tag
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  #{tag} <span className="text-xs opacity-70">({count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Discussions Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          {loadingDiscussions && discussions.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : topicsError ? (
            <div className="text-center py-12 bg-red-50 border border-red-200 rounded-xl">
              <MessageSquare className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-700 font-medium">{topicsError}</p>
            </div>
          ) : filteredDiscussions.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredDiscussions.map((discussion) => (
                  <DiscussionCard
                    key={discussion.id}
                    discussion={discussion}
                    onClick={(id) => {
                      // Dynamically determine the prefix to maintain context (Admin/Teacher/Member)
                      const pathParts = window.location.pathname.split('/');
                      const isCommunity = window.location.pathname.includes('/community');

                      let prefix = '';
                      if (pathParts[1] === 'admin') prefix = '/admin';
                      else if (pathParts[1] === 'teacher') prefix = '/teacher';
                      else if (pathParts[1] === 'member') prefix = '/member';

                      if (isCommunity) {
                        navigate(`${prefix}/community/forums/${id}/thread`);
                      } else {
                        // Fallback logic for root /forums or other structures
                        navigate(`/forums/${id}/thread`);
                      }
                    }}
                    onTagClick={(tag) => setActiveTag(tag)}
                    onLike={(id) => handleLikeCard(id)}
                  />
                ))}
              </div>
              <div ref={hasMoreByForum[selectedForumId] ? loadMoreRef : null} className="h-10 flex justify-center items-center mt-6">
                {loadingDiscussions && filteredDiscussions.length > 0 && (
                  <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <span className="h-4 w-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    {t('common.loading_more', 'Loading more...')}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('community.forums.empty_title')}</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                {t('community.forums.empty_body')}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-5 py-2.5 rounded-xl font-semibold shadow-sm text-white hover:shadow-md transition-all"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  {t('community.forums.new')}
                </button>
                {(searchTerm || activeTag) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setActiveTag(null);
                    }}
                    className="px-5 py-2.5 rounded-xl font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    {t('community.forums.clear_filters')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateDiscussionModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateSubmit}
        forums={forums}
      />

      <CreateForumModal
        isOpen={showCreateForum}
        onClose={() => setShowCreateForum(false)}
        onSuccess={refreshForums}
      />
    </div>
  );
};

export default Forums;