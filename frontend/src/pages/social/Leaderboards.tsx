import React, { useState, useMemo, useCallback } from 'react';
import { Crown, Trophy, Calendar, Users, Globe, Shield } from 'lucide-react';
import LeaderboardTable from '../../components/social/LeaderboardTable';
import { useLeaderboard } from '../../hooks/useCommunity';
import { useAuth } from '../../context/AuthContext';

// Memoized loading component
const LoadingSkeleton = React.memo(() => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-6xl mx-auto px-4">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
));

// Memoized error component
const ErrorDisplay = React.memo(({ error }: { error: string }) => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-6xl mx-auto px-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-red-800 font-semibold mb-2">Error Loading Leaderboard</h2>
        <p className="text-red-600">{error}</p>
      </div>
    </div>
  </div>
));

const Leaderboards: React.FC = () => {
  const { user } = useAuth();
  const [leaderboardType, setLeaderboardType] = useState<'chapter' | 'global'>('chapter');
  const [period, setPeriod] = useState<'current' | 'weekly' | 'monthly'>('current');
  
  const { leaderboard, userRank, loading, error, updateAnonymity } = useLeaderboard(leaderboardType, period);

  // Memoized leaderboard types
  const leaderboardTypes = useMemo(() => [
    { id: 'chapter' as const, name: 'Chapter', icon: Users, description: 'Rank within your chapter' },
    { id: 'global' as const, name: 'Global', icon: Globe, description: 'Rank across all chapters' },
  ], []);

  // Memoized periods
  const periods = useMemo(() => [
    { id: 'current' as const, name: 'All Time', icon: Trophy },
    { id: 'weekly' as const, name: 'This Week', icon: Calendar },
    { id: 'monthly' as const, name: 'This Month', icon: Calendar },
  ], []);

  // Memoized user rank message
  const userRankMessage = useMemo(() => {
    if (!userRank) return '';
    if (userRank === 1) return '🏆 You are #1! Amazing work!';
    if (userRank <= 10) return `🎉 You're in the top 10! Rank #${userRank}`;
    return `You're currently ranked #${userRank}`;
  }, [userRank]);

  // Memoized update anonymity handler
  const handleUpdateAnonymity = useCallback(() => {
    const currentUser = leaderboard.find(e => e.user_id === Number(user?.id));
    const isCurrentlyAnonymous = currentUser?.is_anonymous;
    updateAnonymity(!isCurrentlyAnonymous);
  }, [leaderboard, user?.id, updateAnonymity]);

  if (loading && leaderboard.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboards</h1>
          <p className="text-gray-600">See how you rank in the community</p>
        </div>

        {/* User Rank Card */}
        {userRank && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">Your Ranking</h2>
                <p className="text-blue-100">
                  {userRankMessage}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">#{userRank}</div>
                <div className="text-blue-100 text-sm">Out of {leaderboard.length} users</div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Leaderboard Type */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Leaderboard Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {leaderboardTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setLeaderboardType(type.id)}
                      className={`p-4 rounded-lg border transition-all ${
                        leaderboardType === type.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-5 w-5 ${
                          leaderboardType === type.id ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                        <div className="text-left">
                          <div className={`font-medium ${
                            leaderboardType === type.id ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {type.name}
                          </div>
                          <div className={`text-sm ${
                            leaderboardType === type.id ? 'text-blue-700' : 'text-gray-500'
                          }`}>
                            {type.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Period */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Time Period
              </label>
              <div className="grid grid-cols-3 gap-3">
                {periods.map(timePeriod => {
                  const Icon = timePeriod.icon;
                  return (
                    <button
                      key={timePeriod.id}
                      onClick={() => setPeriod(timePeriod.id)}
                      className={`p-3 rounded-lg border transition-all ${
                        period === timePeriod.id
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2 justify-center">
                        <Icon className={`h-4 w-4 ${
                          period === timePeriod.id ? 'text-green-600' : 'text-gray-500'
                        }`} />
                        <span className={`text-sm font-medium ${
                          period === timePeriod.id ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {timePeriod.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Privacy Settings</h3>
                <p className="text-sm text-gray-500">
                  Control how you appear on leaderboards
                </p>
              </div>
              <button
                onClick={handleUpdateAnonymity}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Shield className="h-4 w-4" />
                <span>
                  {(() => {
                    const currentUser = leaderboard.find(e => e.user_id === Number(user?.id));
                    return currentUser?.is_anonymous ? 'Go Public' : 'Make Anonymous';
                  })()}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <LeaderboardTable
          entries={leaderboard}
          currentUserId={user?.id ? Number(user.id) : undefined}
          showChapter={leaderboardType === 'global'}
        />

        {/* Empty State */}
        {leaderboard.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No leaderboard data yet
            </h3>
            <p className="text-gray-600">
              Start participating in the community to earn points and appear on the leaderboard!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Leaderboards);