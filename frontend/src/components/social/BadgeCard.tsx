import React from 'react';
import { Award, Star, Trophy, Target } from 'lucide-react';
import type { UserBadge } from '../../types/community';

interface BadgeCardProps {
  badge: UserBadge;
  showDetails?: boolean;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge, showDetails = false }) => {
  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case 'completion':
        return <Target className="h-6 w-6 text-green-600" />;
      case 'leadership':
        return <Trophy className="h-6 w-6 text-yellow-600" />;
      case 'special':
        return <Star className="h-6 w-6 text-purple-600" />;
      default:
        return <Award className="h-6 w-6 text-blue-600" />;
    }
  };

  const getBadgeColor = (badgeType: string) => {
    switch (badgeType) {
      case 'completion':
        return 'bg-green-50 border-green-200';
      case 'leadership':
        return 'bg-yellow-50 border-yellow-200';
      case 'special':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`relative rounded-lg border-2 p-4 ${getBadgeColor(badge.badge_type)}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="p-3 bg-white rounded-full shadow-sm">
            {getBadgeIcon(badge.badge_type)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {badge.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h3>
          
          <p className="text-sm text-gray-600 mb-2">
            {badge.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center space-x-1">
                <Award className="h-4 w-4" />
                <span>{badge.points} pts</span>
              </span>
              
              <span className="capitalize">{badge.badge_type}</span>
            </div>
            
            {badge.earned_at && (
              <div className="text-xs text-gray-400">
                Earned {new Date(badge.earned_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showDetails && badge.metadata && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Achievement unlocked!
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeCard;