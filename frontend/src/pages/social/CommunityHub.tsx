import React, { useState, useMemo, useCallback } from 'react';
import { 
  Users, 
  Trophy, 
  Award, 
  MessageSquare, 
  TrendingUp, 
  Star,
  Shield,
  Zap
} from 'lucide-react';
import { useForums, useAchievements, useLeaderboard } from '../../hooks/useCommunity';
import ForumCard from '../../components/social/ForumCard';
import BadgeCard from '../../components/social/BadgeCard';
import LeaderboardTable from '../../components/social/LeaderboardTable';

const CommunityHub: React.FC = () => {
  const { forums, loading: forumsLoading } = useForums();
  const { badges, totalPoints, loading: badgesLoading } = useAchievements();
  const { leaderboard, userRank, loading: leaderboardLoading } = useLeaderboard('chapter', 'current');
  
  const [activeTab, setActiveTab] = useState<'forums' | 'badges' | 'leaderboard'>('forums');

  // Memoized values
  const featuredBadges = useMemo(() => badges.filter(badge => badge.badge_type === 'special'), [badges]);
  const recentBadges = useMemo(() => badges.slice(0, 5), [badges]);
  
  // Memoized stats
  const stats = useMemo(() => [
    {
      icon: Users,
      value: forums.length,
      label: 'Active Forums',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      icon: Award,
      value: badges.length,
      label: 'Badges Earned',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      icon: Trophy,
      value: totalPoints,
      label: 'Total Points',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600'
    },
    {
      icon: TrendingUp,
      value: userRank ? `#${userRank}` : '--',
      label: 'Your Rank',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    }
  ], [forums.length, badges.length, totalPoints, userRank]);

  // Memoized tabs
  const tabs = useMemo(() => [
    { id: 'forums' as const, label: 'Forums', icon: MessageSquare },
    { id: 'badges' as const, label: 'Achievements', icon: Award },
    { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy }
  ], []);

  // Memoized tab content renderers
  const renderForumsTab = useCallback(() => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Chapter Forums</h2>
        <div className="text-sm text-gray-500">
          {forums.length} active forums
        </div>
      </div>
      
      {forumsLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
        </div>
      ) : forums.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forums.map(forum => (
            <ForumCard key={forum.id} forum={forum} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No forums yet</h3>
          <p className="text-gray-500">Check back later for community discussions</p>
        </div>
      )}
    </div>
  ), [forums, forumsLoading]);

  const renderBadgesTab = useCallback(() => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Achievements</h2>
        
        {badgesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Featured Badges */}
            {featuredBadges.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Featured Achievements</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featuredBadges.map(badge => (
                    <BadgeCard key={badge.id} badge={badge} showDetails={true} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Badges */}
            <div>
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Recently Earned</h3>
              </div>
              {recentBadges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentBadges.map(badge => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No badges yet</h3>
                  <p className="text-gray-500">Participate in the community to earn your first badge</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  ), [badgesLoading, featuredBadges, recentBadges]);

  const renderLeaderboardTab = useCallback(() => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Chapter Leaderboard</h2>
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-500">Privacy protected</span>
        </div>
      </div>
      
      {leaderboardLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
        </div>
      ) : (
        <LeaderboardTable 
          entries={leaderboard} 
          currentUserId={1} // This would come from auth context in real implementation
        />
      )}
    </div>
  ), [leaderboard, leaderboardLoading]);

  // Memoized tab content
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'forums':
        return renderForumsTab();
      case 'badges':
        return renderBadgesTab();
      case 'leaderboard':
        return renderLeaderboardTab();
      default:
        return null;
    }
  }, [activeTab, renderForumsTab, renderBadgesTab, renderLeaderboardTab]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Hub</h1>
          <p className="text-gray-600">Connect, compete, and celebrate with fellow learners</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
              <div className={`inline-flex items-center justify-center w-10 h-10 ${stat.bgColor} rounded-full mb-3`}>
                <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex-1 flex items-center justify-center ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {tabContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CommunityHub);