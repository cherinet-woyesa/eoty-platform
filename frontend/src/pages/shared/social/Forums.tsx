import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Search } from 'lucide-react';
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
              userLiked: topic.user_liked || false
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
        if (searchTerm || activeTag) return; // pause infinite scroll while filtering/searching
        const nextPage = (pageByForum[selectedForumId] || 1) + 1;
        loadDiscussions(selectedForumId, nextPage, true);
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectedForumId, hasMoreByForum, loadingDiscussions, pageByForum, loadDiscussions]);

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
    // newest
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
    } catch (err) {
      console.error('Failed to like topic card', err);
      showNotification({
        type: 'error',
        title: t('community.forums.like_failed_title'),
        message: t('community.forums.like_failed_message')
      });
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-12 bg-stone-200 rounded-xl w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-stone-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-red-200 p-6 shadow-md">
          <h2 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('community.forums.error_title')}
          </h2>
          <p className="text-red-600">{error || t('community.forums.load_error')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'min-h-screen bg-slate-50'}>
      <div className={embedded ? '' : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-4'}>
        {/* Header & Forum Selection */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-3">
          <div className="grid gap-3 sm:grid-cols-2 items-center p-4">
            {!embedded && (
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: brandColors.primaryHex }}>{t('community.forums.badge')}</p>
                <h1 className="text-2xl font-bold text-slate-900">{t('community.forums.header_title')}</h1>
              </div>
            )}
            
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <label className="flex items-center gap-2 min-w-[200px]">
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">{t('community.forums.forum_label')}</span>
                <select
                  value={selectedForumId}
                  onChange={(e) => setSelectedForumId(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                >
                  <option value="all">{t('community.forums.all_forums')}</option>
                  {forums.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={() => setShowCreateForum(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold shadow-sm bg-white hover:bg-slate-50 transition-colors text-sm whitespace-nowrap"
                style={{ color: brandColors.primaryHex, borderColor: `${brandColors.primaryHex}33` }}
              >
                <Plus className="h-4 w-4" />
                Create Forum
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4">
          <div className="grid gap-2 md:grid-cols-3 md:items-center">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('community.forums.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 focus:ring-[#1e1b4b] focus:border-[#1e1b4b]"
              >
                <option value="newest">{t('community.forums.sort.newest')}</option>
                <option value="replies">{t('community.forums.sort.replies')}</option>
                <option value="views">{t('community.forums.sort.views')}</option>
                <option value="pinned">{t('community.forums.sort.pinned')}</option>
              </select>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold shadow-sm text-white hover:shadow-md transition-all"
                style={{ backgroundColor: brandColors.primaryHex }}
              >
                <Plus className="h-4 w-4" />
                {t('community.forums.new')}
              </button>
            </div>
          </div>
          {activeTag && (
            <div className="mt-2 text-xs flex items-center gap-2">
              <span className="px-2 py-1 rounded-full" style={{ backgroundColor: `${brandColors.primaryHex}1A`, border: `1px solid ${brandColors.primaryHex}1A`, color: brandColors.primaryHex }}>{t('community.forums.filtering', { tag: activeTag })}</span>
              <button onClick={() => setActiveTag(null)} className="text-slate-500 hover:text-slate-700">{t('community.forums.clear_filters')}</button>
            </div>
          )}
        </div>

        {!embedded && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: brandColors.primaryHex, color: '#fff' }}>
              <p className="text-sm opacity-80">{t('community.forums.stats.total')}</p>
              <p className="text-2xl font-bold mt-1">{discussions.length}</p>
            </div>
            <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: `${brandColors.primaryHex}1A`, color: brandColors.primaryHex, border: `1px solid ${brandColors.primaryHex}1A` }}>
              <p className="text-sm opacity-80">{t('community.forums.stats.mine')}</p>
              <p className="text-2xl font-bold mt-1">{discussions.filter(d => d.visibility !== 'private').length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-600">{t('community.forums.stats.active_today')}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{Math.max(4, Math.round(discussions.length / 3))}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm sm:col-span-3">
              <p className="text-sm text-slate-600 mb-2">{t('community.forums.stats.popular_tags')}</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  discussions.reduce((map, d) => {
                    d.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1));
                    return map;
                  }, new Map<string, number>())
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([tag, count]) => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs border ${
                        activeTag === tag ? 'bg-slate-50' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                      style={activeTag === tag ? { backgroundColor: `${brandColors.primaryHex}1A`, borderColor: `${brandColors.primaryHex}33`, color: brandColors.primaryHex } : undefined}
                    >
                      #{tag} ({count})
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            {loadingDiscussions ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-slate-100 border border-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : topicsError ? (
              <div className="text-center py-8 bg-white border border-rose-200 rounded-xl shadow-sm text-rose-700">
                {topicsError}
              </div>
            ) : filteredDiscussions.length > 0 ? (
              <div className={embedded ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'}>
                {filteredDiscussions.map((discussion) => (
                  <DiscussionCard
                    key={discussion.id}
                    discussion={discussion}
                    onClick={(id) => navigate(`/forums/${id}/thread`)}
                    onTagClick={(tag) => setActiveTag(tag)}
                    onLike={(id) => handleLikeCard(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-7 w-7 text-indigo-800" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{t('community.forums.empty_title')}</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
                  {t('community.forums.empty_body')}
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg font-semibold shadow-sm bg-indigo-900 text-white hover:bg-indigo-800">
                    {t('community.forums.new')}
                  </button>
                  <button onClick={() => setActiveTag(null)} className="px-4 py-2 rounded-lg font-semibold bg-white text-indigo-900 border border-indigo-200 hover:border-indigo-400">
                    {t('community.forums.clear_filters')}
                  </button>
                </div>
              </div>
            )}
            <div ref={hasMoreByForum[selectedForumId] ? loadMoreRef : null} className="h-10 flex justify-center items-center">
              {loadingDiscussions && filteredDiscussions.length > 0 && (
                <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                  <span className="h-4 w-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  Loading more...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 text-xs text-center text-slate-500">
          © 2025 Community Threads. All rights reserved. • Made with Visily
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