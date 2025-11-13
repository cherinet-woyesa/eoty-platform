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
        return <Target className="h-6 w-6 text-[#00FFC6]" />;
      case 'leadership':
        return <Trophy className="h-6 w-6 text-[#FFD700]" />;
      case 'special':
        return <Star className="h-6 w-6 text-[#FF6B9D]" />;
      case 'participation':
        return <Flame className="h-6 w-6 text-[#00FFFF]" />;
      default:
        return <Award className="h-6 w-6 text-[#39FF14]" />;
    }
  };

  const getBadgeColor = (badgeType: string) => {
    switch (badgeType) {
      case 'completion':
        return 'bg-white/90 backdrop-blur-md border-stone-200 hover:border-[#00FFC6]/50';
      case 'leadership':
        return 'bg-white/90 backdrop-blur-md border-stone-200 hover:border-[#FFD700]/50';
      case 'special':
        return 'bg-white/90 backdrop-blur-md border-stone-200 hover:border-[#FF6B9D]/50';
      case 'participation':
        return 'bg-white/90 backdrop-blur-md border-stone-200 hover:border-[#00FFFF]/50';
      default:
        return 'bg-white/90 backdrop-blur-md border-stone-200 hover:border-[#39FF14]/50';
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
    <div className={`relative rounded-xl border-2 p-5 shadow-md transition-all hover:shadow-lg ${getBadgeColor(badge.badge_type)}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 rounded-full blur-md"></div>
            <div className="relative p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-stone-200">
              {getBadgeIcon(badge.badge_type)}
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-stone-800">
              {badge.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            
            {badge.rarity && (
              <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                {getRarityIcon(badge.rarity)}
                <span className={`text-xs font-semibold ${getRarityColor(badge.rarity)}`}>
                  {badge.rarity}
                </span>
              </div>
            )}
          </div>
          
          <p className="text-sm text-stone-600 mb-3 leading-relaxed">
            {badge.description}
          </p>
          
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center space-x-1.5 bg-gradient-to-r from-[#39FF14]/10 to-[#00FFC6]/10 px-2.5 py-1 rounded-full border border-[#39FF14]/30">
                <Award className="h-4 w-4 text-[#39FF14]" />
                <span className="font-semibold text-stone-700">{badge.points} pts</span>
              </span>
              
              <span className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-medium capitalize">
                {badge.badge_type}
              </span>
            </div>
            
            {badge.earned_at && (
              <div className="text-xs text-stone-500 font-medium">
                {new Date(badge.earned_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showDetails && badge.metadata && (
        <div className="mt-4 pt-4 border-t border-stone-200">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 bg-[#39FF14] rounded-full"></div>
            <span className="text-stone-600 font-medium">Achievement unlocked!</span>
          </div>
        </div>
      )}
      
      {badge.badge_type === 'special' && (
        <div className="absolute top-3 right-3">
          <div className="relative">
            <div className="absolute inset-0 bg-[#FF6B9D]/30 rounded-full blur-sm"></div>
            <Zap className="relative h-5 w-5 text-[#FF6B9D] fill-current" />
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeCard;