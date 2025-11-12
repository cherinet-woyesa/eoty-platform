import React from 'react';
import { Crown, User, Shield } from 'lucide-react';
import type { LeaderboardEntry } from '@/types/community';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: number;
  showChapter?: boolean;
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ 
  entries, 
  currentUserId,
  showChapter = false
}) => {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500 fill-current" />;
    if (rank === 2) return <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">2</div>;
    if (rank === 3) return <div className="w-5 h-5 rounded-full bg-amber-800 flex items-center justify-center text-xs font-bold text-white">3</div>;
    return <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{rank}</div>;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              {showChapter && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chapter</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => {
              const isCurrentUser = entry.user_id === currentUserId;
              const isAnonymous = entry.is_anonymous;
              
              return (
                <tr 
                  key={entry.id} 
                  className={isCurrentUser ? 'bg-blue-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getRankIcon(entry.rank)}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-blue-600 font-medium">(You)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          {isAnonymous ? (
                            <Shield className="h-5 w-5 text-gray-600" />
                          ) : (
                            <User className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        {isAnonymous ? (
                          <div className="text-sm font-medium text-gray-900">Anonymous User</div>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-gray-900">
                              {entry.first_name} {entry.last_name}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  {showChapter && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.chapter_id}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-semibold">
                      {entry.points.toLocaleString()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {entries.length === 0 && (
        <div className="text-center py-12">
          <Crown className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leaderboard data</h3>
          <p className="mt-1 text-sm text-gray-500">Start participating to appear on the leaderboard.</p>
        </div>
      )}
    </div>
  );
};

export default LeaderboardTable;