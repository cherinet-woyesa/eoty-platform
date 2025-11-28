import React, { useState, useEffect } from 'react';
import { X, Play, Check, SkipForward, Award } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import type { OnboardingStep } from '@/services/api/onboarding';
import { onboardingApi } from '@/services/api/onboarding';
import CompletionRewards from './CompletionRewards';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
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
            {currentStepIndex + 1} of {steps.length}
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
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="bg-[#27AE60] hover:bg-[#16A085] text-white rounded-full p-4 transition-colors"
                    aria-label="Play video walkthrough"
                  >
                    <Play className="h-8 w-8 ml-1" />
                  </button>
                  <div className="absolute bottom-4 left-4 right-4 text-white text-center">
                    <p className="text-sm opacity-75">Click to play video walkthrough</p>
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
          <div className="bg-[#27AE60]/10 border border-[#27AE60]/30 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-[#27AE60] mb-2">Required Action</h4>
            <p className="text-[#16A085]">{currentStep.action_required}</p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={handleSkipStep}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleCompleteStep}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#16A085] hover:to-[#27AE60] text-white rounded-lg transition-colors"
            >
              <Check className="h-4 w-4 mr-2" />
              {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#27AE60]/10 via-[#16A085]/10 to-[#27AE60]/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-lg flex items-center justify-center shadow-sm">
              <Award className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {flow.name || 'Get started as a teacher'}
              </h2>
              <p className="text-xs text-gray-500">
                A short guided checklist to help you set up your teaching space.
              </p>
              {flow?.version && (
                <p className="text-xs text-[#27AE60] font-medium">
                  Version {flow.version}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Show completion rewards if onboarding is complete (REQUIREMENT: Completion rewards) */}
        {progress && progress.progress >= 100 ? (
          <div className="p-6">
            <div className="text-center mb-6">
              <Award className="h-16 w-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">🎉 Congratulations!</h3>
              <p className="text-gray-600 mb-2">
                You’ve completed your onboarding successfully!
              </p>
              <p className="text-sm text-[#27AE60] font-medium">
                Your dashboard and tools are now fully unlocked.
              </p>
              {flow?.version && (
                <div className="mt-2 text-xs text-gray-500">
                  Completed onboarding version {flow.version}
                </div>
              )}
            </div>
            <CompletionRewards
              rewards={rewards}
              onClaimReward={(rewardId) => {
                console.log('Claim reward:', rewardId);
              }}
            />
            <div className="mt-6 text-center">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#16A085] hover:to-[#27AE60] text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
              >
                🚀 Go to my dashboard
              </button>
            </div>
          </div>
        ) : (
          renderStepContent()
        )}

        {/* Progress bar */}
        <div className="px-6 pb-6">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-gradient-to-r from-[#27AE60] to-[#16A085] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress?.progress || 0}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {progress?.progress?.toFixed(0) || 0}% complete
            </span>
          </div>
          
          {/* Milestones display (REQUIREMENT: Milestone-based) */}
          {milestones && milestones.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    milestone.is_completed
                      ? 'bg-[#27AE60]/20 text-[#27AE60]'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  title={milestone.name}
                >
                  {milestone.is_completed ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border-2 border-gray-400" />
                  )}
                  <span>{milestone.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;