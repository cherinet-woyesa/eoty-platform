import React, { useState, useEffect } from 'react';
import { X, Play, Check, SkipForward, Award, HelpCircle } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';
import type { OnboardingStep } from '../../services/api/onboarding';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { flow, progress, completeStep, skipStep } = useOnboarding();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 transition-colors"
                >
                  <Play className="h-8 w-8 ml-1" />
                </button>
              </div>
              {isPlaying && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <div className="text-white text-center">
                    <p className="text-lg">Video walkthrough would play here</p>
                    <p className="text-sm mt-2">In a real implementation, this would show the actual video</p>
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">Required Action</h4>
            <p className="text-blue-800">{currentStep.action_required}</p>
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
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <Award className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{flow.name}</h2>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {renderStepContent()}

        {/* Progress bar */}
        <div className="px-6 pb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;