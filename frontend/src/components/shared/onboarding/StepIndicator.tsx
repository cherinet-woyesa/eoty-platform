import React from 'react';
import { Check, Circle, SkipForward } from 'lucide-react';

interface StepIndicatorProps {
  steps: number;
  currentStep: number;
  completedSteps: number[];
  skippedSteps: number[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ 
  steps, 
  currentStep, 
  completedSteps, 
  skippedSteps 
}) => {
  return (
    <div className="flex items-center justify-center space-x-2">
      {Array.from({ length: steps }).map((_, index) => {
        const stepNumber = index + 1;
        let status = 'pending';
        
        if (completedSteps.includes(stepNumber)) {
          status = 'completed';
        } else if (skippedSteps.includes(stepNumber)) {
          status = 'skipped';
        } else if (stepNumber === currentStep) {
          status = 'current';
        }
        
        return (
          <React.Fragment key={index}>
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300
              ${status === 'completed' ? 'bg-[#27AE60] border-[#27AE60] text-white shadow-sm' : ''}
              ${status === 'skipped' ? 'bg-gray-100 border-gray-300 text-gray-400' : ''}
              ${status === 'current' ? 'bg-white border-[#27AE60] text-[#27AE60] shadow-md scale-110' : ''}
              ${status === 'pending' ? 'bg-white border-gray-200 text-gray-300' : ''}
            `}>
              {status === 'completed' ? (
                <Check className="h-4 w-4" />
              ) : status === 'skipped' ? (
                <SkipForward className="h-4 w-4" />
              ) : (
                <span className="text-xs font-bold">{stepNumber}</span>
              )}
            </div>
            {index < steps - 1 && (
              <div className={`
                flex-1 h-0.5 transition-colors duration-500 mx-1
                ${stepNumber < currentStep ? 'bg-[#27AE60]' : 'bg-gray-100'}
              `}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;