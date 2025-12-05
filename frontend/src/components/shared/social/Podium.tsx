import React from 'react';
import { Crown, Shield } from 'lucide-react';
import type { LeaderboardEntry } from '@/types/community';

interface PodiumProps {
  topThree: LeaderboardEntry[];
  currentUserId?: number;
}

const Podium: React.FC<PodiumProps> = ({ topThree, currentUserId }) => {
  // Ensure we have 3 spots, fill with null if missing
  const first = topThree.find(e => e.rank === 1);
  const second = topThree.find(e => e.rank === 2);
  const third = topThree.find(e => e.rank === 3);

  const renderPodiumStep = (entry: LeaderboardEntry | undefined, position: number) => {
    if (!entry) return <div className="w-1/3"></div>;

    const isCurrentUser = entry.user_id === currentUserId;
    const height = position === 1 ? 'h-48' : position === 2 ? 'h-36' : 'h-24';
    const color = position === 1 ? 'bg-yellow-100 border-yellow-300' : position === 2 ? 'bg-gray-100 border-gray-300' : 'bg-amber-100 border-amber-300';
    const iconColor = position === 1 ? 'text-yellow-500' : position === 2 ? 'text-gray-500' : 'text-amber-600';
    
    return (
      <div className="flex flex-col items-center w-1/3 z-10">
            {/* Avatar/User Info */}
        <div className="mb-4 flex flex-col items-center">
          <div className={`relative w-16 h-16 rounded-full border-4 ${position === 1 ? 'border-yellow-400' : position === 2 ? 'border-gray-300' : 'border-amber-600'} overflow-hidden bg-white shadow-md flex items-center justify-center`}>
            {/* Use initials since avatar_url is not available */}
            <div className="text-xl font-bold text-gray-500">
              {entry.is_anonymous ? (
                <Shield className="w-8 h-8 text-gray-400" />
              ) : (
                <span>{entry.first_name?.[0]}{entry.last_name?.[0]}</span>
              )}
            </div>
            
            {position === 1 && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1">
                <Crown className="w-4 h-4 text-white fill-current" />
              </div>
            )}
          </div>
          <div className="mt-2 text-center">
            <p className={`font-bold text-sm ${isCurrentUser ? 'text-blue-600' : 'text-gray-800'}`}>
              {entry.is_anonymous ? 'Anonymous' : `${entry.first_name} ${entry.last_name}`}
            </p>
            <p className="text-xs text-gray-500 font-medium">{entry.points} pts</p>
          </div>
        </div>        {/* Podium Step */}
        <div className={`w-full ${height} ${color} border-t-4 rounded-t-lg flex items-end justify-center pb-4 shadow-sm relative`}>
          <span className={`text-4xl font-bold ${iconColor} opacity-20`}>{position}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-end justify-center w-full max-w-md mx-auto mb-12 px-4">
      {renderPodiumStep(second, 2)}
      {renderPodiumStep(first, 1)}
      {renderPodiumStep(third, 3)}
    </div>
  );
};

export default Podium;
