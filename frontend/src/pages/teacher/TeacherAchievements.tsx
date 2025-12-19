import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Award, Star, Target, Users, BookOpen, Video, TrendingUp, Sparkles, Medal, Crown, GraduationCap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAchievements } from '@/hooks/useCommunity';
import { brandColors } from '@/theme/brand';

const TeacherAchievements: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { badges, totalPoints, loading, error, refetch } = useAchievements();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Teacher-specific achievement categories
  const categories = [
    { id: 'all', name: t('teacher_achievements.categories.all'), icon: Trophy, count: badges.length, color: `text-[${brandColors.primaryHex}]` },
    { id: 'teaching', name: t('teacher_achievements.categories.teaching'), icon: GraduationCap, count: badges.filter(b => b.badge_type === 'teaching' || b.badge_type === 'completion').length, color: `text-[${brandColors.secondaryHex}]` },
    { id: 'engagement', name: t('teacher_achievements.categories.engagement'), icon: Users, count: badges.filter(b => b.badge_type === 'participation' || b.badge_type === 'engagement').length, color: `text-[${brandColors.accentHex}]` },
    { id: 'content', name: t('teacher_achievements.categories.content'), icon: Video, count: badges.filter(b => b.badge_type === 'content' || b.badge_type === 'creation').length, color: 'text-amber-500' },
    { id: 'leadership', name: t('teacher_achievements.categories.leadership'), icon: Award, count: badges.filter(b => b.badge_type === 'leadership').length, color: 'text-orange-500' },
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
      <div className="w-full space-y-2 p-2">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 rounded-lg w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-2 p-2">
        <div className="bg-white/90 backdrop-blur-md rounded-lg border border-red-200 p-4 shadow-sm">
          <h2 className="text-red-800 font-semibold mb-1 flex items-center gap-2 text-sm">
            <Award className="h-4 w-4" />
            {t('teacher_achievements.error.loading')}
          </h2>
          <p className="text-red-600 mb-3 text-xs">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-xs"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            {t('teacher_achievements.error.try_again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 p-2">
      {/* Compact Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-gray-200 shadow-sm text-center">
          <div className="relative inline-block mb-2">
            <div className="absolute inset-0 rounded-lg blur-md" style={{ backgroundColor: `${brandColors.primaryHex}20` }}></div>
            <Trophy className="relative h-5 w-5 mx-auto" style={{ color: brandColors.primaryHex }} />
          </div>
          <div className="text-lg font-bold text-gray-800 mb-0.5">{earnedBadgesCount}</div>
          <div className="text-xs text-gray-600 font-medium">{t('teacher_achievements.stats.total_achievements')}</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-gray-200 shadow-sm text-center">
          <div className="relative inline-block mb-2">
            <div className="absolute inset-0 rounded-lg blur-md" style={{ backgroundColor: `${brandColors.secondaryHex}20` }}></div>
            <Star className="relative h-5 w-5 mx-auto" style={{ color: brandColors.secondaryHex }} />
          </div>
          <div className="text-lg font-bold text-gray-800 mb-0.5">{totalPoints}</div>
          <div className="text-xs text-gray-600 font-medium">{t('teacher_achievements.stats.total_points')}</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-gray-200 shadow-sm text-center">
          <div className="relative inline-block mb-2">
            <div className="absolute inset-0 rounded-lg blur-md" style={{ backgroundColor: `${brandColors.accentHex}20` }}></div>
            <BookOpen className="relative h-5 w-5 mx-auto" style={{ color: brandColors.accentHex }} />
          </div>
          <div className="text-lg font-bold text-gray-800 mb-0.5">{teachingStats.totalCourses}</div>
          <div className="text-xs text-gray-600 font-medium">{t('teacher_achievements.stats.course_badges')}</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-gray-200 shadow-sm text-center">
          <div className="relative inline-block mb-2">
            <div className="absolute inset-0 bg-amber-500/20 rounded-lg blur-md"></div>
            <Users className="relative h-5 w-5 text-amber-500 mx-auto" />
          </div>
          <div className="text-lg font-bold text-gray-800 mb-0.5">{teachingStats.totalStudents}</div>
          <div className="text-xs text-gray-600 font-medium">{t('teacher_achievements.stats.student_impact')}</div>
        </div>
      </div>

      {/* Compact Search and Categories */}
      <div className="bg-white/90 backdrop-blur-md rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 mb-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={t('teacher_achievements.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 text-gray-700 text-sm"
              style={{ '--tw-ring-color': `${brandColors.primaryHex}50`, borderColor: 'transparent' } as React.CSSProperties}
            />
            <Star className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === category.id
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={activeCategory === category.id ? {
                  background: `linear-gradient(to right, ${brandColors.primaryHex}, ${brandColors.secondaryHex})`
                } : {}}
              >
                <Icon className={`h-3 w-3 ${activeCategory === category.id ? '' : category.color}`} />
                {category.name}
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  activeCategory === category.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact Achievements Grid */}
      {filteredBadges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBadges.map((badge) => (
            <div
              key={badge.id}
              className="bg-white/90 backdrop-blur-md rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all"
              style={{ ':hover': { borderColor: `${brandColors.primaryHex}50` } } as any}
            >
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 rounded-lg blur-md" style={{ backgroundColor: `${brandColors.primaryHex}20` }}></div>
                  <div
                    className="relative w-12 h-12 rounded-lg flex items-center justify-center border"
                    style={{
                      background: `linear-gradient(to bottom right, ${brandColors.primaryHex}20, ${brandColors.secondaryHex}20)`,
                      borderColor: `${brandColors.primaryHex}30`
                    }}
                  >
                    {badge.badge_type === 'leadership' ? (
                      <Crown className="h-5 w-5 text-orange-500" />
                    ) : badge.badge_type === 'teaching' || badge.badge_type === 'completion' ? (
                      <GraduationCap className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
                    ) : badge.badge_type === 'content' || badge.badge_type === 'creation' ? (
                      <Video className="h-5 w-5" style={{ color: brandColors.accentHex }} />
                    ) : (
                      <Award className="h-5 w-5" style={{ color: brandColors.secondaryHex }} />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">{badge.name}</h3>
                  {badge.description && (
                    <p className="text-xs text-gray-600 mb-2">{badge.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    {badge.points && (
                      <span className="text-xs font-medium" style={{ color: brandColors.primaryHex }}>
                        +{badge.points} {t('teacher_achievements.points')}
                      </span>
                    )}
                    {badge.earned_at && (
                      <span className="text-xs text-gray-500">
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
        <div className="bg-white/90 backdrop-blur-md rounded-lg border border-gray-200 p-8 text-center shadow-sm">
          <Trophy className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('teacher_achievements.empty.no_achievements')}</h3>
          <p className="text-xs text-gray-600">
            {searchQuery ? t('teacher_achievements.empty.adjust_search') : t('teacher_achievements.empty.keep_teaching')}
          </p>
        </div>
      )}
    </div>
  );
};

export default TeacherAchievements;

