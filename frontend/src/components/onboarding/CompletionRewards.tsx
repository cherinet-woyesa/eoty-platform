import React from 'react';
import { Award, Star, Trophy, Gift } from 'lucide-react';

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
      case 'badge': return 'bg-blue-100 text-blue-800';
      case 'points': return 'bg-yellow-100 text-yellow-800';
      case 'trophy': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (rewards.length === 0) {
    return (
      <div className="text-center py-8">
        <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No rewards available</h3>
        <p className="text-gray-500">Complete more steps to earn rewards!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rewards.map((reward) => (
        <div 
          key={reward.id} 
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start">
            <div className={`p-2 rounded-lg ${getRewardColor(reward.type)}`}>
              {getRewardIcon(reward.type)}
            </div>
            <div className="ml-4 flex-1">
              <h4 className="font-medium text-gray-900">{reward.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Earned on {new Date(reward.earned_at).toLocaleDateString()}
                </span>
                {!reward.claimed && (
                  <button
                    onClick={() => onClaimReward(reward.id)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full transition-colors"
                  >
                    Claim
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