import React from 'react';
import { Award, Star, Trophy, Gift, CheckCircle } from 'lucide-react';

interface CompletionRewardsProps {
  rewards: any[];
  onClaimReward: (rewardId: number) => void;
}

const CompletionRewards: React.FC<CompletionRewardsProps> = ({ rewards, onClaimReward }) => {
  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'badge': return <Award className="h-6 w-6" />;
      case 'points': return <Star className="h-6 w-6" />;
      case 'trophy': return <Trophy className="h-6 w-6" />;
      default: return <Gift className="h-6 w-6" />;
    }
  };

  const getRewardColor = (type: string) => {
    switch (type) {
      case 'badge': return 'bg-blue-100 text-blue-600';
      case 'points': return 'bg-yellow-100 text-yellow-600';
      case 'trophy': return 'bg-purple-100 text-purple-600';
      default: return 'bg-[#27AE60]/10 text-[#27AE60]';
    }
  };

  if (rewards.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No rewards yet</h3>
        <p className="text-sm text-gray-500">Complete more steps to earn rewards!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {rewards.map((reward) => (
        <div 
          key={reward.id} 
          className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 group"
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${getRewardColor(reward.type)} group-hover:scale-110 transition-transform duration-200`}>
              {getRewardIcon(reward.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-gray-900 truncate">{reward.title}</h4>
                {reward.claimed && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Claimed
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{reward.description}</p>
              
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">
                  Earned {new Date(reward.earned_at).toLocaleDateString()}
                </span>
                {!reward.claimed && (
                  <button
                    onClick={() => onClaimReward(reward.id)}
                    className="text-xs font-semibold bg-[#27AE60] hover:bg-[#219150] text-white px-4 py-1.5 rounded-lg transition-all shadow-sm hover:shadow transform hover:-translate-y-0.5"
                  >
                    Claim Reward
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompletionRewards;