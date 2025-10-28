import React, { useState } from 'react';
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

  // Get featured badges (special badges)
  const featuredBadges = badges.filter(badge => badge.badge_type === 'special');
  
  // Get recent badges (last 5 earned)
  const recentBadges = badges.slice(0, 5);

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
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-3">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{forums.length}</div>
            <div className="text-sm text-gray-600">Active Forums</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mb-3">
              <Award className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{badges.length}</div>
            <div className="text-sm text-gray-600">Badges Earned</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full mb-3">
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalPoints}</div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-3">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {userRank ? `#${userRank}` : '--'}
            </div>
            <div className="text-sm text-gray-600">Your Rank</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('forums')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex-1 flex items-center justify-center ${
                  activeTab === 'forums'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Forums
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex-1 flex items-center justify-center ${
                  activeTab === 'badges'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Award className="h-4 w-4 mr-2" />
                Achievements
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex-1 flex items-center justify-center ${
                  activeTab === 'leaderboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Forums Tab */}
            {activeTab === 'forums' && (
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
            )}

            {/* Badges Tab */}
            {activeTab === 'badges' && (
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
            )}

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityHub;