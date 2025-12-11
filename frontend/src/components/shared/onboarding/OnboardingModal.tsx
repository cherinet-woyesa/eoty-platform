import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Play, Check, SkipForward, Award } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import type { OnboardingStep } from '@/services/api/onboarding';
import { onboardingApi } from '@/services/api/onboarding';
import CompletionRewards from './CompletionRewards';
import { brandColors } from '@/theme/brand';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { flow, progress, completeStep, skipStep, milestones = [] } = useOnboarding();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rewards, setRewards] = useState<any[]>([]);

  // Auto-resume: Set current step from progress (REQUIREMENT: Auto-resume)
  useEffect(() => {
    if (isOpen && flow && progress && progress.current_step_id) {
      const steps = flow.steps || [];
      const currentStepIndex = steps.findIndex(step => step.id === progress.current_step_id);
      if (currentStepIndex >= 0) {
        setCurrentStepIndex(currentStepIndex);
      }
    }
  }, [isOpen, flow, progress]);

  // Fetch completion rewards when onboarding is complete (REQUIREMENT: Completion rewards)
  useEffect(() => {
    if (isOpen && progress && progress.progress >= 100 && flow) {
      const fetchRewards = async () => {
        try {
          const response = await onboardingApi.getCompletionRewards(flow.id);
          if (response.success) {
            setRewards(response.data.rewards || []);
          }
        } catch (error) {
          console.error('Failed to fetch rewards:', error);
        }
      };
      fetchRewards();
    }
  }, [isOpen, progress, flow]);

  // Timer to track time spent on each step
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && progress) {
      timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, progress]);

  // Reset time when step changes
  useEffect(() => {
    setTimeSpent(0);
  }, [currentStepIndex]);

  if (!isOpen || !flow || !progress) return null;

  const steps: OnboardingStep[] = flow.steps || [];
  const currentStep = steps[currentStepIndex];

  const handleCompleteStep = async () => {
    if (!currentStep) return;
    
    await completeStep(currentStep.id, timeSpent, { completed: true });
    
    // Check if onboarding is complete (REQUIREMENT: Completion rewards)
    if (progress && progress.progress >= 100) {
      // Show completion rewards before closing
      // The rewards will be displayed via CompletionRewards component
      setTimeout(() => {
        onClose();
      }, 2000);
      return;
    }
    
    // Move to next step or close if last step
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleSkipStep = async () => {
    if (!currentStep) return;
    
    await skipStep(currentStep.id);
    
    // Move to next step or close if last step
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleDismiss = () => {
    onClose();
  };

  const renderStepContent = () => {
    if (!currentStep) return null;

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">{currentStep.title}</h3>
          <span className="text-sm text-gray-500">
            {t('onboarding.step_of', { index: currentStepIndex + 1, total: steps.length })}
          </span>
        </div>

        {currentStep.description && (
          <p className="text-gray-600 mb-4">{currentStep.description}</p>
        )}

        {currentStep.video_url && (
          <div className="mb-6">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              {isPlaying ? (
                <video
                  src={currentStep.video_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                  onEnded={() => setIsPlaying(false)}
                  onError={(e) => {
                    console.error('Video playback error:', e);
                    setIsPlaying(false);
                  }}
                >
                  {t('onboarding.video_not_supported')}
                </video>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="text-white rounded-full p-4 transition-colors"
                    style={{ background: `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
                    aria-label={t('onboarding.play_video')}
                  >
                    <Play className="h-8 w-8 ml-1" />
                  </button>
                  <div className="absolute bottom-4 left-4 right-4 text-white text-center">
                    <p className="text-sm opacity-75">{t('onboarding.click_to_play')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep.content && (
          <div 
            className="prose max-w-none mb-6"
            dangerouslySetInnerHTML={{ __html: currentStep.content }}
          />
        )}

        {currentStep.action_required && (
          <div className="rounded-lg p-4 mb-6" style={{ background: `rgba(30,27,75,0.07)`, border: `1px solid rgba(30,27,75,0.15)` }}>
            <h4 className="font-medium text-[color:#1e1b4b] mb-2">{t('onboarding.required_action')}</h4>
            <p className="text-[color:#312e81]">{currentStep.action_required}</p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={handleSkipStep}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              {t('common.skip') || t('onboarding.skip')}
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleCompleteStep}
              className="flex items-center px-4 py-2 text-white rounded-lg transition-colors"
              style={{ background: `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
            >
              <Check className="h-4 w-4 mr-2" />
              {currentStepIndex === steps.length - 1 ? t('onboarding.finish') : t('common.next')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[color:rgba(30,27,75,0.06)] via-white to-[color:rgba(30,27,75,0.06)]">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-md transform rotate-3"
              style={{ background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}>
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                {flow.name || t('onboarding.title_fallback')}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 font-medium">
                  {steps.length > 0 ? t('onboarding.step_of', { index: currentStepIndex + 1, total: steps.length }) : t('onboarding.loading_steps')}
                </p>
                {flow?.version && (
                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-md font-mono">
                    v{flow.version}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-1.5">
          <div
            className="h-1.5 transition-all duration-500 ease-out"
            style={{
              width: `${steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0}%`,
              background: `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})`,
              boxShadow: '0 0 10px rgba(49,46,129,0.35)'
            }}
          ></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[400px]">
          {steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-8 h-8 border-2 border-[color:#1e1b4b] border-t-transparent rounded-full animate-spin mb-2"></div>
              <p>{t('onboarding.loading_journey')}</p>
            </div>
          ) : (
            /* Show completion rewards if onboarding is complete */
            progress && progress.progress >= 100 ? (
              <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                <div className="mb-8 relative inline-block">
                  <div className="absolute inset-0 bg-yellow-100 rounded-full animate-ping opacity-20"></div>
                  <Award className="h-24 w-24 text-yellow-500 relative z-10 drop-shadow-lg" />
                </div>
                
                <h3 className="text-3xl font-bold text-gray-900 mb-3">{t('onboarding.completed_title')}</h3>
                <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                  {t('onboarding.completed_subtitle')}
                </p>
                
                <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100 w-full max-w-lg">
                  <CompletionRewards
                    rewards={rewards}
                    onClaimReward={(rewardId) => {
                      console.log('Claim reward:', rewardId);
                    }}
                  />
                </div>

                <button
                  onClick={onClose}
                  className="px-8 py-3 text-white rounded-xl transition-all duration-200 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
                >
                  {t('onboarding.enter_dashboard')}
                </button>
              </div>
            ) : (
              renderStepContent()
            )
          )}
        </div>

        {/* Footer with Milestones (only show if not complete) */}
        {!(progress && progress.progress >= 100) && milestones && milestones.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-default select-none ${
                    milestone.is_completed
                      ? 'bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/20 shadow-sm'
                      : 'bg-white text-gray-400 border border-gray-200'
                  }`}
                >
                  {milestone.is_completed ? (
                    <div className="bg-[#27AE60] rounded-full p-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span>{milestone.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;