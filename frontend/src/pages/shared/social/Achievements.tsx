import React, { useState, useMemo } from 'react';
import { Trophy, Award, Star, Target, Users, Search, Filter, TrendingUp, Sparkles, Medal, Crown, RefreshCcw, AlertTriangle, Share, Info } from 'lucide-react';
import BadgeCard from '@/components/shared/social/BadgeCard';
import { useAchievements } from '@/hooks/useCommunity';
import { Link } from 'react-router-dom';

const Achievements: React.FC = () => {
  const { badges, totalPoints, loading, error, refetch, isFetching } = useAchievements();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'points' | 'name'>('recent');
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

  const categories = [
    {
      id: 'all',
      name: 'All Badges',
      icon: Trophy,
      count: badges.length,
      color: 'text-[#27AE60]',
      description: 'All your achievements'
    },
    {
      id: 'completion',
      name: 'Completion',
      icon: Target,
      count: badges.filter(b => b.badge_type === 'completion').length,
      color: 'text-[#16A085]',
      description: 'Course and lesson completion'
    },
    {
      id: 'participation',
      name: 'Participation',
      icon: Users,
      count: badges.filter(b => b.badge_type === 'participation').length,
      color: 'text-[#2980B9]',
      description: 'Community engagement'
    },
    {
      id: 'leadership',
      name: 'Leadership',
      icon: Crown,
      count: badges.filter(b => b.badge_type === 'leadership').length,
      color: 'text-amber-600',
      description: 'Leadership and mentoring'
    },
    {
      id: 'special',
      name: 'Special',
      icon: Star,
      count: badges.filter(b => b.badge_type === 'special').length,
      color: 'text-[#FF6B9D]',
      description: 'Special recognition'
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

  const earnedBadgesCount = badges.length;
  const completionRate = categories.slice(1).reduce((acc, cat) => acc + cat.count, 0);
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
          Error Loading Achievements
        </h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!badges.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
        <Trophy className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No achievements yet</h3>
        <p className="text-gray-600 mb-4">Complete courses, participate, and engage to earn badges.</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all shadow-sm"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { icon: Medal, label: 'Badges Earned', value: earnedBadgesCount },
          { icon: Sparkles, label: 'Total Points', value: totalPoints },
          { icon: TrendingUp, label: 'Avg Points/Badge', value: averagePoints },
          { icon: Crown, label: 'Categories', value: completionRate }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white/95 rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="h-5 w-5 text-gray-900" />
              <span className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search badges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 text-gray-700"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'points' | 'name')}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 text-gray-700"
            >
              <option value="recent">Most Recent</option>
              <option value="points">Most Points</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all disabled:opacity-60 shadow-sm"
          >
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-8 justify-center">
        {categories.map(category => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              title={category.description}
              className={`flex items-center gap-3 px-5 py-3 rounded-full border transition-all font-medium group ${
                isActive
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'} transition-colors`} />
              <span>{category.name}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {category.count}
              </span>
            </button>
          );
        })}
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
                View details
              </button>
              <button
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/student/learning?tab=achievements#badge-${badge.id}`;
                  const shareData = {
                    title: badge.name,
                    text: badge.description || 'Check out this achievement I earned!',
                    url: shareUrl
                  };
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData);
                    } else if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(shareUrl);
                      alert('Link copied to clipboard');
                    } else {
                      alert(shareUrl);
                    }
                  } catch (err) {
                    console.error('Share failed', err);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-semibold"
              >
                <Share className="h-4 w-4" />
                Share
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
            {searchQuery ? 'No badges found' : 'No badges in this category'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchQuery 
              ? `No badges match "${searchQuery}". Try a different search term.`
              : activeCategory === 'all' 
                ? "You haven't earned any badges yet. Start participating in courses and activities to unlock achievements!"
                : `You haven't earned any ${activeCategory} badges yet. Keep learning to unlock them!`
            }
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              to="/student/browse-courses"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Browse courses
            </Link>
            <Link
              to="/community"
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-800 hover:bg-gray-50 transition-colors"
            >
              Join community
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
              Keep Going!
            </h2>
            <p className="text-gray-700 mb-6 text-lg">
              You've earned <span className="font-bold text-gray-900">{earnedBadgesCount}</span> badges and{' '}
              <span className="font-bold text-gray-900">{totalPoints}</span> points. 
              Continue your journey to unlock more achievements!
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{earnedBadgesCount} of {Math.max(20, earnedBadgesCount + 5)} badges</span>
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
                <div className="text-gray-500">Points</div>
                <div className="text-lg font-semibold text-gray-900">{selectedBadge.points}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-500">Type</div>
                <div className="text-lg font-semibold text-gray-900 capitalize">{selectedBadge.badge_type}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-500">Rarity</div>
                <div className="text-lg font-semibold text-gray-900 capitalize">{selectedBadge.rarity || '—'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-500">Earned</div>
                <div className="text-lg font-semibold text-gray-900">
                  {selectedBadge.earned_at
                    ? new Date(selectedBadge.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not yet'}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedBadge(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-800 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/student/learning?tab=achievements#badge-${selectedBadge.id}`;
                  const shareData = {
                    title: selectedBadge.name,
                    text: selectedBadge.description || 'Check out this achievement I earned!',
                    url: shareUrl
                  };
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData);
                    } else if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(shareUrl);
                      alert('Link copied to clipboard');
                    } else {
                      alert(shareUrl);
                    }
                  } catch (err) {
                    console.error('Share failed', err);
                  }
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
              >
                <Share className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Achievements;