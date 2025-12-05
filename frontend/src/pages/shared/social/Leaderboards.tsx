import React, { useState, useMemo, useCallback } from 'react';
import { Crown, Trophy, Calendar, Users, Globe, Shield, ChevronDown } from 'lucide-react';
import LeaderboardTable from '@/components/shared/social/LeaderboardTable';
import Podium from '@/components/shared/social/Podium';
import { useLeaderboard } from '@/hooks/useCommunity';
import { useAuth } from '@/context/AuthContext';

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
    {
      id: 'chapter' as const,
      name: 'Chapter Leaders',
      icon: Users,
      description: 'Rank within your chapter',
      color: 'text-[#27AE60]'
    },
    {
      id: 'global' as const,
      name: 'Global Leaders',
      icon: Globe,
      description: 'Rank across all chapters',
      color: 'text-[#2980B9]'
    },
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

  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const restOfLeaderboard = useMemo(() => leaderboard.slice(3), [leaderboard]);

  if (loading && leaderboard.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leaderboards</h1>
          <p className="text-lg text-gray-600">Celebrate growth and dedication in our community</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          {/* Type Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {leaderboardTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setLeaderboardType(type.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  leaderboardType === type.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <type.icon className={`w-4 h-4 mr-2 ${leaderboardType === type.id ? type.color : ''}`} />
                {type.name}
              </button>
            ))}
          </div>

          {/* Period Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  period === p.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <p.icon className="w-4 h-4 mr-2" />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Podium for Top 3 */}
        {leaderboard.length > 0 && (
          <div className="mb-12">
            <Podium topThree={topThree} currentUserId={Number(user?.id)} />
          </div>
        )}

        {/* User Stats Card (if logged in) */}
        {user && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg mb-8 flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="bg-white/20 p-3 rounded-full">
                <Trophy className="w-8 h-8 text-yellow-300" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{userRankMessage || 'Join the leaderboard!'}</h3>
                <p className="text-blue-100 text-sm">Keep learning to climb the ranks</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right mr-4">
                <p className="text-xs text-blue-200 uppercase font-semibold">Your Points</p>
                <p className="text-2xl font-bold">
                  {leaderboard.find(e => e.user_id === Number(user?.id))?.points || 0}
                </p>
              </div>
              <button
                onClick={handleUpdateAnonymity}
                className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium backdrop-blur-sm border border-white/20"
              >
                <Shield className="w-4 h-4 mr-2" />
                {leaderboard.find(e => e.user_id === Number(user?.id))?.is_anonymous ? 'Go Public' : 'Go Anonymous'}
              </button>
            </div>
          </div>
        )}

        {/* Rest of the Leaderboard Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Rankings</h3>
          </div>
          <LeaderboardTable 
            entries={restOfLeaderboard} 
            currentUserId={Number(user?.id)}
            showChapter={leaderboardType === 'global'}
          />
          {leaderboard.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No data available for this period yet. Be the first!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Leaderboards);