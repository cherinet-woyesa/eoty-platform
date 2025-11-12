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
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg p-6 max-w-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2" />
            <h3 className="font-bold">Welcome, {userName}!</h3>
          </div>
          <button 
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
            className="text-white/80 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <p className="text-sm mb-4">
          Let's get you started with the platform! Complete our quick onboarding to unlock all features.
        </p>
        
        <div className="flex items-center text-xs mb-4">
          <div className="flex items-center mr-3">
            <Gift className="h-3 w-3 mr-1" />
            <span>Rewards</span>
          </div>
          <div className="flex items-center">
            <Trophy className="h-3 w-3 mr-1" />
            <span>Badges</span>
          </div>
        </div>
        
        <button
          onClick={() => {
            setIsVisible(false);
            onStartOnboarding();
          }}
          className="w-full bg-white text-blue-600 hover:bg-gray-100 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Start Onboarding
        </button>
      </div>
    </div>
  );
};

export default WelcomeMessage;