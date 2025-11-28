import React, { useState } from 'react';
import { X, Sparkles, Gift, Trophy } from 'lucide-react';

interface WelcomeMessageProps {
  userName: string;
  onDismiss: () => void;
  onStartOnboarding: () => void;
}

const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ 
  userName, 
  onDismiss, 
  onStartOnboarding 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 animate-fade-in-up">
      <div className="bg-gradient-to-br from-[#27AE60] via-[#16A085] to-[#2ECC71] text-white rounded-xl shadow-2xl p-6 max-w-sm border border-white/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 animate-pulse" />
            <h3 className="font-bold text-lg">Welcome to EOTY, {userName}! 🎉</h3>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm mb-4 leading-relaxed">
          Ready to start your spiritual learning journey? Complete our quick guided onboarding to unlock all platform features and earn your first achievements!
        </p>

        {/* Benefits */}
        <div className="bg-white/10 rounded-lg p-3 mb-4">
          <div className="text-xs font-medium mb-2 text-white/90">What you'll get:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center">
              <Gift className="h-3 w-3 mr-1 text-yellow-300" />
              <span>Welcome Rewards</span>
            </div>
            <div className="flex items-center">
              <Trophy className="h-3 w-3 mr-1 text-yellow-300" />
              <span>Achievement Badges</span>
            </div>
            <div className="flex items-center">
              <Sparkles className="h-3 w-3 mr-1 text-yellow-300" />
              <span>Personalized Setup</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 mr-1 bg-yellow-300 rounded-full"></div>
              <span>Quick 5-10 min process</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsVisible(false);
              onStartOnboarding();
            }}
            className="flex-1 bg-white text-[#27AE60] hover:bg-gray-100 font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            🚀 Start My Journey
          </button>
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
            className="px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
          >
            Skip
          </button>
        </div>

        {/* Encouraging note */}
        <div className="mt-3 text-center">
          <p className="text-xs text-white/70">
            95% of users complete onboarding within 7 days and love the experience! ✨
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessage;