import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 animate-fade-in-up">
      <div className="bg-gradient-to-br from-[#27AE60] via-[#16A085] to-[#2ECC71] text-white rounded-xl shadow-2xl p-6 max-w-sm border border-white/20 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-yellow-300 opacity-10 rounded-full blur-xl"></div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-white/20 p-1.5 rounded-lg mr-3 backdrop-blur-sm">
                <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
              </div>
              <h3 className="font-bold text-lg tracking-tight">{t('onboarding.welcome.title', { name: userName })}</h3>
            </div>
            <button
              onClick={() => {
                setIsVisible(false);
                onDismiss();
              }}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm mb-5 leading-relaxed text-white/90 font-medium">
            {t('onboarding.welcome.subtitle')}
          </p>

          {/* Benefits */}
          <div className="bg-black/10 backdrop-blur-sm rounded-xl p-4 mb-5 border border-white/10">
            <div className="text-[10px] uppercase tracking-wider font-bold mb-3 text-white/60">{t('onboarding.welcome.benefits_title')}</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center">
                <Gift className="h-3.5 w-3.5 mr-2 text-yellow-300" />
                <span className="font-medium">{t('onboarding.welcome.benefit_rewards')}</span>
              </div>
              <div className="flex items-center">
                <Trophy className="h-3.5 w-3.5 mr-2 text-yellow-300" />
                <span className="font-medium">{t('onboarding.welcome.benefit_badges')}</span>
              </div>
              <div className="flex items-center">
                <Sparkles className="h-3.5 w-3.5 mr-2 text-yellow-300" />
                <span className="font-medium">{t('onboarding.welcome.benefit_setup')}</span>
              </div>
              <div className="flex items-center">
                <div className="h-3.5 w-3.5 mr-2 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse"></div>
                </div>
                <span className="font-medium">{t('onboarding.welcome.benefit_quick')}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsVisible(false);
                onStartOnboarding();
              }}
              className="flex-1 bg-white text-[#27AE60] hover:bg-gray-50 font-bold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
            >
              <span className="mr-2">🚀</span> {t('onboarding.welcome.cta_start')}
            </button>
            <button
              onClick={() => {
                setIsVisible(false);
                onDismiss();
              }}
              className="px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-medium"
            >
              {t('onboarding.welcome.cta_later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessage;