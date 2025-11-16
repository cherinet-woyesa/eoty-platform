import React, { useState, useMemo } from 'react';
import { Trophy, Award, Star, Target, Users, BookOpen, Video, TrendingUp, Sparkles, Medal, Crown, GraduationCap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAchievements } from '@/hooks/useCommunity';

const TeacherAchievements: React.FC = () => {
  const { user } = useAuth();
  const { badges, totalPoints, loading, error, refetch } = useAchievements();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Teacher-specific achievement categories
  const categories = [
    { id: 'all', name: 'All Achievements', icon: Trophy, count: badges.length, color: 'text-[#27AE60]' },
    { id: 'teaching', name: 'Teaching Excellence', icon: GraduationCap, count: badges.filter(b => b.badge_type === 'teaching' || b.badge_type === 'completion').length, color: 'text-[#16A085]' },
    { id: 'engagement', name: 'Student Engagement', icon: Users, count: badges.filter(b => b.badge_type === 'participation' || b.badge_type === 'engagement').length, color: 'text-[#2980B9]' },
    { id: 'content', name: 'Content Creation', icon: Video, count: badges.filter(b => b.badge_type === 'content' || b.badge_type === 'creation').length, color: 'text-[#F39C12]' },
    { id: 'leadership', name: 'Leadership', icon: Award, count: badges.filter(b => b.badge_type === 'leadership').length, color: 'text-[#E67E22]' },
  ];

  const filteredBadges = useMemo(() => {
    let filtered = activeCategory === 'all' 
      ? badges 
      : badges.filter(badge => {
          if (activeCategory === 'teaching') {
            return badge.badge_type === 'teaching' || badge.badge_type === 'completion';
          }
          if (activeCategory === 'engagement') {
            return badge.badge_type === 'participation' || badge.badge_type === 'engagement';
          }
          if (activeCategory === 'content') {
            return badge.badge_type === 'content' || badge.badge_type === 'creation';
          }
          return badge.badge_type === activeCategory;
        });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(badge => 
        badge.name.toLowerCase().includes(query) ||
        badge.description?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const dateA = a.earned_at ? new Date(a.earned_at).getTime() : 0;
      const dateB = b.earned_at ? new Date(b.earned_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [badges, activeCategory, searchQuery]);

  const earnedBadgesCount = badges.length;
  const teachingStats = {
    totalCourses: badges.filter(b => b.name.toLowerCase().includes('course')).length,
    totalStudents: badges.filter(b => b.name.toLowerCase().includes('student')).length,
    totalVideos: badges.filter(b => b.name.toLowerCase().includes('video')).length,
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-stone-200 rounded-xl w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-stone-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-stone-200 rounded-xl"></div>
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
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
        <div className="flex items-center space-x-3 mb-2">
          <h1 className="text-3xl font-bold text-stone-800">Teaching Achievements</h1>
        </div>
        <p className="text-stone-600 font-medium">
          Celebrate your teaching milestones and impact on students
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md text-center">
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 bg-[#27AE60]/20 rounded-lg blur-md"></div>
            <Trophy className="relative h-8 w-8 text-[#27AE60] mx-auto" />
          </div>
          <div className="text-3xl font-bold text-stone-800 mb-1">{earnedBadgesCount}</div>
          <div className="text-sm text-stone-600 font-medium">Total Achievements</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md text-center">
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 bg-[#16A085]/20 rounded-lg blur-md"></div>
            <Star className="relative h-8 w-8 text-[#16A085] mx-auto" />
          </div>
          <div className="text-3xl font-bold text-stone-800 mb-1">{totalPoints}</div>
          <div className="text-sm text-stone-600 font-medium">Total Points</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md text-center">
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 bg-[#2980B9]/20 rounded-lg blur-md"></div>
            <BookOpen className="relative h-8 w-8 text-[#2980B9] mx-auto" />
          </div>
          <div className="text-3xl font-bold text-stone-800 mb-1">{teachingStats.totalCourses}</div>
          <div className="text-sm text-stone-600 font-medium">Course Badges</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md text-center">
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 bg-[#F39C12]/20 rounded-lg blur-md"></div>
            <Users className="relative h-8 w-8 text-[#F39C12] mx-auto" />
          </div>
          <div className="text-3xl font-bold text-stone-800 mb-1">{teachingStats.totalStudents}</div>
          <div className="text-sm text-stone-600 font-medium">Student Impact</div>
        </div>
      </div>

      {/* Search and Categories */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-md">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search achievements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
            />
            <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === category.id
                    ? 'bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 shadow-md'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${activeCategory === category.id ? '' : category.color}`} />
                {category.name}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeCategory === category.id
                    ? 'bg-stone-900/20 text-stone-900'
                    : 'bg-stone-200 text-stone-600'
                }`}>
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievements Grid */}
      {filteredBadges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBadges.map((badge) => (
            <div
              key={badge.id}
              className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-md hover:shadow-lg transition-all hover:border-[#27AE60]/50"
            >
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-[#27AE60]/20 rounded-lg blur-md"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20 rounded-lg flex items-center justify-center border border-[#27AE60]/30">
                    {badge.badge_type === 'leadership' ? (
                      <Crown className="h-8 w-8 text-[#F39C12]" />
                    ) : badge.badge_type === 'teaching' || badge.badge_type === 'completion' ? (
                      <GraduationCap className="h-8 w-8 text-[#27AE60]" />
                    ) : badge.badge_type === 'content' || badge.badge_type === 'creation' ? (
                      <Video className="h-8 w-8 text-[#2980B9]" />
                    ) : (
                      <Award className="h-8 w-8 text-[#16A085]" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-stone-800 mb-1">{badge.name}</h3>
                  {badge.description && (
                    <p className="text-sm text-stone-600 mb-3">{badge.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    {badge.points && (
                      <span className="text-sm font-medium text-[#27AE60]">
                        +{badge.points} points
                      </span>
                    )}
                    {badge.earned_at && (
                      <span className="text-xs text-stone-500">
                        {new Date(badge.earned_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-12 text-center shadow-md">
          <Trophy className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">No achievements found</h3>
          <p className="text-stone-600">
            {searchQuery ? 'Try adjusting your search' : 'Keep teaching to unlock achievements!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TeacherAchievements;

