import React, { useState } from 'react';
import { Trophy, Award, Star, Target, Users } from 'lucide-react';
import BadgeCard from '@/components/shared/social/BadgeCard';
import { useAchievements } from '@/hooks/useCommunity';

const Achievements: React.FC = () => {
  const { badges, totalPoints, loading, error } = useAchievements();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Badges', icon: Trophy, count: badges.length },
    { id: 'completion', name: 'Completion', icon: Target, count: badges.filter(b => b.badge_type === 'completion').length },
    { id: 'participation', name: 'Participation', icon: Users, count: badges.filter(b => b.badge_type === 'participation').length },
    { id: 'leadership', name: 'Leadership', icon: Award, count: badges.filter(b => b.badge_type === 'leadership').length },
    { id: 'special', name: 'Special', icon: Star, count: badges.filter(b => b.badge_type === 'special').length },
  ];

  const filteredBadges = activeCategory === 'all' 
    ? badges 
    : badges.filter(badge => badge.badge_type === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error Loading Achievements</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Achievements</h1>
          <p className="text-gray-600">Track your progress and earned badges</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{badges.length}</div>
            <div className="text-sm text-gray-600">Badges Earned</div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{totalPoints}</div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {categories.slice(1).reduce((acc, cat) => acc + cat.count, 0)}
            </div>
            <div className="text-sm text-gray-600">Available Badges</div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{category.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeCategory === category.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Badges Grid */}
        {filteredBadges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBadges.map(badge => (
              <BadgeCard key={badge.id} badge={badge} showDetails={true} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No badges in this category
            </h3>
            <p className="text-gray-600">
              {activeCategory === 'all' 
                ? "You haven't earned any badges yet. Start participating in the community!"
                : `You haven't earned any ${activeCategory} badges yet.`
              }
            </p>
          </div>
        )}

        {/* Progress Motivation */}
        {badges.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">Keep Going!</h2>
            <p className="text-blue-100 mb-4">
              You've earned {badges.length} badges and {totalPoints} points. 
              Continue your journey to unlock more achievements!
            </p>
            <div className="w-full bg-blue-400 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((badges.length / 20) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-blue-100 text-sm mt-2">
              {badges.length} of 20 badges collected
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;