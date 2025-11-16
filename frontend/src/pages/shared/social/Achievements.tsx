import React, { useState, useMemo } from 'react';
import { Trophy, Award, Star, Target, Users, Search, Filter, TrendingUp, Sparkles, Medal, Crown } from 'lucide-react';
import BadgeCard from '@/components/shared/social/BadgeCard';
import { useAchievements } from '@/hooks/useCommunity';

const Achievements: React.FC = () => {
  const { badges, totalPoints, loading, error, refetch } = useAchievements();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'points' | 'name'>('recent');

  const categories = [
    { id: 'all', name: 'All Badges', icon: Trophy, count: badges.length, color: 'text-[#27AE60]' },
    { id: 'completion', name: 'Completion', icon: Target, count: badges.filter(b => b.badge_type === 'completion').length, color: 'text-[#16A085]' },
    { id: 'participation', name: 'Participation', icon: Users, count: badges.filter(b => b.badge_type === 'participation').length, color: 'text-[#2980B9]' },
    { id: 'leadership', name: 'Leadership', icon: Award, count: badges.filter(b => b.badge_type === 'leadership').length, color: 'text-[#F39C12]' },
    { id: 'special', name: 'Special', icon: Star, count: badges.filter(b => b.badge_type === 'special').length, color: 'text-[#FF6B9D]' },
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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-stone-200 rounded-xl w-1/3 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-stone-200 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-stone-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-red-200 p-6 shadow-md">
            <h2 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
              <Award className="h-5 w-5" />
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-[#27AE60]/30 rounded-full blur-xl"></div>
            <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#27AE60]/20 via-[#16A085]/20 to-[#2980B9]/20 rounded-full border-2 border-[#27AE60]/50">
              <Trophy className="h-10 w-10 text-[#27AE60]" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-stone-800 mb-2">Your Achievements</h1>
          <p className="text-stone-600 text-lg">Track your progress and celebrate your milestones</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-md border border-stone-200 text-center hover:border-[#27AE60]/50 transition-all">
            <div className="flex items-center justify-center mb-2">
              <Medal className="h-6 w-6 text-[#27AE60] mr-2" />
              <div className="text-3xl font-bold text-stone-800">{earnedBadgesCount}</div>
            </div>
            <div className="text-sm text-stone-600 font-medium">Badges Earned</div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-md border border-stone-200 text-center hover:border-[#16A085]/50 transition-all">
            <div className="flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6 text-[#16A085] mr-2" />
              <div className="text-3xl font-bold text-stone-800">{totalPoints}</div>
            </div>
            <div className="text-sm text-stone-600 font-medium">Total Points</div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-md border border-stone-200 text-center hover:border-[#2980B9]/50 transition-all">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-6 w-6 text-[#2980B9] mr-2" />
              <div className="text-3xl font-bold text-stone-800">{averagePoints}</div>
            </div>
            <div className="text-sm text-stone-600 font-medium">Avg Points/Badge</div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-md border border-stone-200 text-center hover:border-[#F39C12]/50 transition-all">
            <div className="flex items-center justify-center mb-2">
              <Crown className="h-6 w-6 text-[#F39C12] mr-2" />
              <div className="text-3xl font-bold text-stone-800">{completionRate}</div>
            </div>
            <div className="text-sm text-stone-600 font-medium">Categories</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-md border border-stone-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search badges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'points' | 'name')}
                className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              >
                <option value="recent">Most Recent</option>
                <option value="points">Most Points</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
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
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-full border transition-all font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 border-[#27AE60] shadow-lg'
                    : 'bg-white/90 backdrop-blur-md text-stone-700 border-stone-200 hover:border-[#27AE60]/50 hover:bg-stone-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? category.color : 'text-stone-500'}`} />
                <span>{category.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isActive
                    ? 'bg-stone-900/20 text-stone-900'
                    : 'bg-stone-100 text-stone-600'
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
              <BadgeCard key={badge.id} badge={badge} showDetails={true} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-md">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-[#27AE60]/20 rounded-full blur-xl"></div>
              <Award className="relative h-16 w-16 text-stone-300 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-stone-800 mb-2">
              {searchQuery ? 'No badges found' : 'No badges in this category'}
            </h3>
            <p className="text-stone-600 max-w-md mx-auto">
              {searchQuery 
                ? `No badges match "${searchQuery}". Try a different search term.`
                : activeCategory === 'all' 
                  ? "You haven't earned any badges yet. Start participating in courses and activities to unlock achievements!"
                  : `You haven't earned any ${activeCategory} badges yet. Keep learning to unlock them!`
              }
            </p>
          </div>
        )}

        {/* Progress Motivation */}
        {earnedBadgesCount > 0 && (
          <div className="mt-12 bg-gradient-to-r from-[#27AE60]/20 via-[#16A085]/20 to-[#2980B9]/20 rounded-xl p-8 border border-[#27AE60]/30 shadow-lg">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-stone-800 mb-2 flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-[#27AE60]" />
                Keep Going!
              </h2>
              <p className="text-stone-700 mb-6 text-lg">
                You've earned <span className="font-bold text-[#27AE60]">{earnedBadgesCount}</span> badges and{' '}
                <span className="font-bold text-[#16A085]">{totalPoints}</span> points. 
                Continue your journey to unlock more achievements!
              </p>
              <div className="max-w-md mx-auto">
                <div className="flex justify-between text-sm text-stone-600 mb-2">
                  <span>Progress</span>
                  <span>{earnedBadgesCount} of {Math.max(20, earnedBadgesCount + 5)} badges</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#27AE60] to-[#16A085] h-3 rounded-full transition-all duration-700 shadow-lg"
                    style={{ width: `${Math.min((earnedBadgesCount / Math.max(20, earnedBadgesCount + 5)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;