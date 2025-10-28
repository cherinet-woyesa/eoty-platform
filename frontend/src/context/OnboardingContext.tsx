import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onboardingApi, type OnboardingFlow, type OnboardingProgress } from '../services/api/onboarding';
import { useAuth } from './AuthContext';

interface OnboardingContextType {
  hasOnboarding: boolean;
  flow: OnboardingFlow | null;
  progress: OnboardingProgress | null;
  isCompleted: boolean;
  isLoading: boolean;
  error: string | null;
  fetchProgress: () => Promise<void>;
  completeStep: (stepId: number, timeSpent: number, completionData?: any) => Promise<void>;
  skipStep: (stepId: number) => Promise<void>;
  dismissOnboarding: () => Promise<void>;
  restartOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasOnboarding, setHasOnboarding] = useState(false);
  const [flow, setFlow] = useState<OnboardingFlow | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchProgress = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await onboardingApi.getProgress();
      
      if (response.success) {
        setHasOnboarding(response.data.has_onboarding);
        setFlow(response.data.flow || null);
        setProgress(response.data.progress || null);
        setIsCompleted(response.data.is_completed || false);
      } else {
        setError(response.data.message || 'Failed to fetch onboarding progress');
      }
    } catch (err: any) {
      console.error('Failed to fetch onboarding progress:', err);
      setError(err.message || 'An error occurred while fetching onboarding progress');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const completeStep = useCallback(async (stepId: number, timeSpent: number, completionData?: any) => {
    if (!flow || !progress) return;

    try {
      const response = await onboardingApi.completeStep(stepId, flow.id, timeSpent, completionData);
      if (response.success) {
        setProgress(response.data.progress);
        setIsCompleted(response.data.progress.progress === 100);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      console.error('Failed to complete step:', err);
      setError(err.message || 'An error occurred while completing the step');
    }
  }, [flow, progress]);

  const skipStep = useCallback(async (stepId: number) => {
    if (!flow || !progress) return;

    try {
      const response = await onboardingApi.skipStep(stepId, flow.id);
      if (response.success) {
        setProgress(response.data.progress);
        setIsCompleted(response.data.progress.progress === 100);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      console.error('Failed to skip step:', err);
      setError(err.message || 'An error occurred while skipping the step');
    }
  }, [flow, progress]);

  const dismissOnboarding = useCallback(async () => {
    if (!flow) return;

    try {
      const response = await onboardingApi.dismissOnboarding(flow.id);
      if (response.success) {
        setHasOnboarding(false);
        setFlow(null);
        setProgress(null);
        setIsCompleted(true);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      console.error('Failed to dismiss onboarding:', err);
      setError(err.message || 'An error occurred while dismissing onboarding');
    }
  }, [flow]);

  const restartOnboarding = useCallback(async () => {
    if (!flow) return;

    try {
      const response = await onboardingApi.restartOnboarding(flow.id);
      if (response.success) {
        setProgress(response.data.progress);
        setIsCompleted(false);
        setHasOnboarding(true);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      console.error('Failed to restart onboarding:', err);
      setError(err.message || 'An error occurred while restarting onboarding');
    }
  }, [flow]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const value = {
    hasOnboarding,
    flow,
    progress,
    isCompleted,
    isLoading,
    error,
    fetchProgress,
    completeStep,
    skipStep,
    dismissOnboarding,
    restartOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};