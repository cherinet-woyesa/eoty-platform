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
              flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
              ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' : ''}
              ${status === 'skipped' ? 'bg-gray-300 border-gray-300 text-white' : ''}
              ${status === 'current' ? 'bg-blue-500 border-blue-500 text-white' : ''}
              ${status === 'pending' ? 'bg-white border-gray-300 text-gray-400' : ''}
            `}>
              {status === 'completed' ? (
                <Check className="h-4 w-4" />
              ) : status === 'skipped' ? (
                <SkipForward className="h-4 w-4" />
              ) : (
                <span className="text-xs font-medium">{stepNumber}</span>
              )}
            </div>
            {index < steps - 1 && (
              <div className={`
                w-8 h-0.5 transition-colors
                ${stepNumber < currentStep ? 'bg-green-500' : 'bg-gray-200'}
              `}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;