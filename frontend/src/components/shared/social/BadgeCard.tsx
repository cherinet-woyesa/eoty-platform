import React from 'react';
import { Award, Star, Trophy, Target, Crown, Zap, Flame } from 'lucide-react';
import type { UserBadge } from '@/types/community';

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
      case 'participation':
        return <Flame className="h-6 w-6 text-red-600" />;
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
      case 'participation':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getRarityColor = (rarity: string | undefined) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-500';
      case 'uncommon':
        return 'text-green-500';
      case 'rare':
        return 'text-blue-500';
      case 'epic':
        return 'text-purple-500';
      case 'legendary':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getRarityIcon = (rarity: string | undefined) => {
    switch (rarity) {
      case 'common':
        return <div className="w-2 h-2 rounded-full bg-gray-400"></div>;
      case 'uncommon':
        return <div className="w-2 h-2 rounded-full bg-green-500"></div>;
      case 'rare':
        return <div className="w-2 h-2 rounded-full bg-blue-500"></div>;
      case 'epic':
        return <div className="w-2 h-2 rounded-full bg-purple-500"></div>;
      case 'legendary':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-400"></div>;
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
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {badge.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            
            {badge.rarity && (
              <div className="flex items-center space-x-1">
                {getRarityIcon(badge.rarity)}
                <span className={`text-xs font-medium ${getRarityColor(badge.rarity)}`}>
                  {badge.rarity}
                </span>
              </div>
            )}
          </div>
          
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
      
      {badge.badge_type === 'special' && (
        <div className="absolute top-2 right-2">
          <Zap className="h-4 w-4 text-yellow-500 fill-current" />
        </div>
      )}
    </div>
  );
};

export default BadgeCard;