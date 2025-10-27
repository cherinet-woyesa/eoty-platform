import React from 'react';
import { Crown, Medal, Trophy, User } from 'lucide-react';
import type { LeaderboardEntry } from '../../types/community';

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
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-orange-500" />;
    return <span className="text-sm font-medium text-gray-500">#{rank}</span>;
  };

  const getRowStyle = (entry: LeaderboardEntry) => {
    const isCurrentUser = entry.user_id === currentUserId;
    const baseStyle = "transition-colors duration-200";
    
    if (isCurrentUser) {
      return `${baseStyle} bg-blue-50 border-l-4 border-l-blue-500`;
    }
    
    if (entry.rank <= 3) {
      return `${baseStyle} bg-gradient-to-r from-white to-gray-50`;
    }
    
    return baseStyle;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              {showChapter && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chapter
                </th>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id} className={getRowStyle(entry)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getRankIcon(entry.rank)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {entry.is_anonymous 
                          ? 'Anonymous User'
                          : `${entry.first_name} ${entry.last_name}`
                        }
                      </p>
                      
                      {entry.user_id === currentUserId && (
                        <p className="text-xs text-blue-600 font-medium">You</p>
                      )}
                    </div>
                  </div>
                </td>
                
                {showChapter && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.chapter_id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                )}
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                  {entry.points.toLocaleString()} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {entries.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No leaderboard data yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Start participating in the community to earn points!
          </p>
        </div>
      )}
    </div>
  );
};

export default LeaderboardTable;