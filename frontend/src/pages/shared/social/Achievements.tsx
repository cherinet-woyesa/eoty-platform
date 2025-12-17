import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trophy, Award, Star, Target, Users, Search, Filter, TrendingUp, Sparkles, Medal, Crown,
  RefreshCcw, AlertTriangle, Share, Info
} from 'lucide-react';
import BadgeCard from '@/components/shared/social/BadgeCard';
import { useAchievements } from '@/hooks/useCommunity';
import { Link } from 'react-router-dom';
import { brandColors } from '@/theme/brand';
import { useNotification } from '@/context/NotificationContext';
import type { UserBadge } from '@/types/community';

const Achievements: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showNotification } = useNotification();
  const { badges, totalPoints, loading, error, refetch, isFetching } = useAchievements();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'points' | 'name'>('recent');
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  const categories = [
    {
      id: 'all',
      name: t('achievements.categories.all'),
      icon: Trophy,
      count: badges.length,
      color: 'text-[color:#1e1b4b]',
      description: t('achievements.categories_desc.all')
    },
    {
      id: 'completion',
      name: t('achievements.categories.completion'),
      icon: Target,
      count: badges.filter(b => b.badge_type === 'completion').length,
      color: 'text-[color:#1e1b4b]',
      description: t('achievements.categories_desc.completion')
    },
    {
      id: 'participation',
      name: t('achievements.categories.participation'),
      icon: Users,
      count: badges.filter(b => b.badge_type === 'participation').length,
      color: 'text-[color:#1e1b4b]',
      description: t('achievements.categories_desc.participation')
    },
    {
      id: 'leadership',
      name: t('achievements.categories.leadership'),
      icon: Crown,
      count: badges.filter(b => b.badge_type === 'leadership').length,
      color: 'text-[color:#1e1b4b]',
      description: t('achievements.categories_desc.leadership')
    },
    {
      id: 'special',
      name: t('achievements.categories.special'),
      icon: Star,
      count: badges.filter(b => b.badge_type === 'special').length,
      color: 'text-[color:#1e1b4b]',
      description: t('achievements.categories_desc.special')
    },
  ];

  const filteredAndSortedBadges = useMemo(() => {
    let filtered = activeCategory === 'all'
      ? badges
      : badges.filter(badge => badge.badge_type === activeCategory);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(badge =>
        badge.name.toLowerCase().includes(query) ||
        badge.description?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return (b.points || 0) - (a.points || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          const dateA = a.earned_at ? new Date(a.earned_at).getTime() : 0;
          const dateB = b.earned_at ? new Date(b.earned_at).getTime() : 0;
          return dateB - dateA;
      }
    });

    return filtered;
  }, [badges, activeCategory, searchQuery, sortBy]);

  const badgeTypeLabel = useCallback(
    (type?: string) => t(`achievements.types.${type}`, type || '—'),
    [t]
  );

  const earnedBadgesCount = badges.length;
  const unlockedCategories = categories.filter(cat => cat.id !== 'all' && cat.count > 0).length;
  const averagePoints = earnedBadgesCount > 0 ? Math.round(totalPoints / earnedBadgesCount) : 0;

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-stone-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-stone-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
        <h2 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {t('achievements.error_title')}
        </h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          {t('achievements.retry')}
        </button>
      </div>
    );
  }

  if (!badges.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
        <Trophy className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('achievements.empty_title')}</h3>
        <p className="text-gray-600 mb-4">{t('achievements.empty_desc')}</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm"
          style={{ background: `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
        >
          <RefreshCcw className="h-4 w-4" />
          {t('achievements.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header + Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[color:#1e1b4b]" />
              {t('learning_page.achievements_tab')}
            </h1>
            <p className="text-sm text-gray-600">{t('achievements.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white shadow-sm disabled:opacity-60"
              style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
            >
              <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? t('achievements.refreshing') : t('achievements.refresh')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: Medal, label: t('achievements.stat_badges'), value: earnedBadgesCount },
            { icon: Sparkles, label: t('achievements.stat_points'), value: totalPoints },
            { icon: TrendingUp, label: t('achievements.stat_avg_points'), value: averagePoints },
            { icon: Crown, label: t('achievements.stat_categories'), value: unlockedCategories }
          ].map((stat, idx) => (
            <div key={idx} className="bg-gradient-to-br from-white via-indigo-50 to-white rounded-xl p-4 border border-indigo-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="h-5 w-5 text-[color:#1e1b4b]" />
                <span className="text-[11px] uppercase tracking-wide text-indigo-700/70">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search / Sort / Tabs */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('achievements.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:rgba(30,27,75,0.2)] focus:border-[color:rgba(30,27,75,0.35)] text-gray-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'points' | 'name')}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:rgba(30,27,75,0.2)] focus:border-[color:rgba(30,27,75,0.35)] text-gray-700"
            >
              <option value="recent">{t('achievements.sort_recent')}</option>
              <option value="points">{t('achievements.sort_points')}</option>
              <option value="name">{t('achievements.sort_name')}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          {categories.map(category => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                title={category.description}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all font-medium ${isActive
                  ? 'bg-[color:#1e1b4b] text-white border-[color:#1e1b4b] shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'} transition-colors`} />
                <span>{category.name}</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Badges Display */}
      {filteredAndSortedBadges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedBadges.map(badge => (
            <div key={badge.id} className="space-y-3">
              <BadgeCard badge={badge} showDetails={true} />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedBadge(badge)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-gray-800 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <Info className="h-4 w-4" />
                  {t('achievements.view_details')}
                </button>
                <button
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/member/learning?tab=achievements#badge-${badge.id}`;
                    const shareData = {
                      title: badge.name,
                      text: badge.description || t('achievements.share_default_text'),
                      url: shareUrl
                    };
                    try {
                      if (navigator.share) {
                        await navigator.share(shareData);
                      } else if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(shareUrl);
                        showNotification({
                          type: 'success',
                          title: t('achievements.share_title'),
                          message: t('achievements.share_copied')
                        });
                      } else {
                        showNotification({
                          type: 'info',
                          title: t('achievements.share_title'),
                          message: shareUrl
                        });
                      }
                    } catch (err) {
                      console.error('Share failed', err);
                      showNotification({
                        type: 'error',
                        title: t('achievements.share_title'),
                        message: t('achievements.share_failed')
                      });
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 text-white rounded-lg transition-colors text-sm font-semibold"
                  style={{ background: `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
                >
                  <Share className="h-4 w-4" />
                  {t('achievements.share')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="relative inline-block mb-4">
            <Award className="relative h-16 w-16 text-gray-300 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? t('achievements.empty_search_title') : t('achievements.empty_category_title')}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchQuery
              ? t('achievements.empty_search_desc', { query: searchQuery })
              : activeCategory === 'all'
                ? t('achievements.empty_all_desc')
                : t('achievements.empty_category_desc')
            }
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              to="/member/browse-courses"
              className="px-4 py-2 text-white rounded-lg transition-colors"
              style={{ background: `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
            >
              {t('achievements.browse_courses')}
            </Link>
            <Link
              to="/community"
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-800 hover:bg-gray-50 transition-colors"
            >
              {t('achievements.join_community')}
            </Link>
          </div>
        </div>
      )}

      {/* Progress Motivation */}
      {earnedBadgesCount > 0 && (
        <div className="mt-12 bg-gray-50 rounded-xl p-8 border border-gray-200">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-gray-900" />
              {t('achievements.keep_going_title')}
            </h2>
            <p className="text-gray-700 mb-6 text-lg">
              {t('achievements.keep_going_body', { count: earnedBadgesCount, points: totalPoints })}
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{t('achievements.progress_label')}</span>
                <span>{t('achievements.progress_of_total', { earned: earnedBadgesCount, total: Math.max(20, earnedBadgesCount + 5) })}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gray-900 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min((earnedBadgesCount / Math.max(20, earnedBadgesCount + 5)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge details modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-gray-200 p-6 relative">
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <div className="flex items-start gap-3 mb-3">
              <Award className="h-6 w-6 text-gray-900" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedBadge.name}</h3>
                <p className="text-gray-600 text-sm">{selectedBadge.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-500">{t('achievements.modal.points')}</div>
                <div className="text-lg font-semibold text-gray-900">{selectedBadge.points}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-500">{t('achievements.modal.type')}</div>
                <div className="text-lg font-semibold text-gray-900 capitalize">
                  {badgeTypeLabel(selectedBadge.badge_type)}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-500">{t('achievements.modal.rarity')}</div>
                <div className="text-lg font-semibold text-gray-900 capitalize">{selectedBadge.rarity || '—'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-500">{t('achievements.modal.earned')}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {selectedBadge.earned_at
                    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(selectedBadge.earned_at))
                    : t('achievements.modal.not_yet')}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedBadge(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-800 hover:bg-gray-50 transition-colors"
              >
                {t('achievements.close')}
              </button>
              <button
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/member/learning?tab=achievements#badge-${selectedBadge.id}`;
                  const shareData = {
                    title: selectedBadge.name,
                    text: selectedBadge.description || t('achievements.share_default_text'),
                    url: shareUrl
                  };
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData);
                    } else if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(shareUrl);
                      showNotification({
                        type: 'success',
                        title: t('achievements.share_title'),
                        message: t('achievements.share_copied')
                      });
                    } else {
                      showNotification({
                        type: 'info',
                        title: t('achievements.share_title'),
                        message: shareUrl
                      });
                    }
                  } catch (err) {
                    console.error('Share failed', err);
                    showNotification({
                      type: 'error',
                      title: t('achievements.share_title'),
                      message: t('achievements.share_failed')
                    });
                  }
                }}
                className="px-4 py-2 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                style={{ background: `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
              >
                <Share className="h-4 w-4" />
                {t('achievements.share')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Achievements;