import { apiClient } from './apiClient';

export interface OnboardingFlow {
  id: number;
  name: string;
  description: string;
  target_audience: string;
  version: string;
  is_active: boolean;
  estimated_minutes: number;
  prerequisites: any;
  completion_rewards: any;
  created_at: string;
  updated_at: string;
  steps?: OnboardingStep[];
}

export interface OnboardingStep {
  id: number;
  flow_id: number;
  title: string;
  description: string;
  step_type: string;
  content: string;
  video_url: string;
  action_required: string;
  action_target: string;
  order: number;
  is_optional: boolean;
  validation_rules: any;
  help_resources: any;
  created_at: string;
  updated_at: string;
}

export interface OnboardingProgress {
  id: number;
  user_id: number;
  flow_id: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  current_step_id: number | null;
  progress: number;
  started_at: string;
  completed_at: string | null;
  last_activity_at: string;
  completed_steps: number[];
  skipped_steps: number[];
  created_at: string;
  updated_at: string;
}

export interface HelpResource {
  id: number;
  title: string;
  content: string;
  resource_type: string;
  target_component: string;
  target_page: string;
  audience: string;
  is_active: boolean;
  related_resources: any;
  created_at: string;
  updated_at: string;
}

export const onboardingApi = {
  // Get user's onboarding progress
  getProgress: async (): Promise<{ 
    success: boolean; 
    data: { 
      has_onboarding: boolean; 
      flow?: OnboardingFlow; 
      progress?: OnboardingProgress; 
      is_completed?: boolean;
      message?: string;
    } 
  }> => {
    const response = await apiClient.get('/onboarding/progress');
    return response.data;
  },

  // Complete a step
  completeStep: async (stepId: number, flowId: number, timeSpent: number, completionData?: any): Promise<{ 
    success: boolean; 
    message: string; 
    data: { progress: OnboardingProgress } 
  }> => {
    const response = await apiClient.post('/onboarding/steps/complete', {
      stepId,
      flowId,
      timeSpent,
      completionData
    });
    return response.data;
  },

  // Skip a step
  skipStep: async (stepId: number, flowId: number): Promise<{ 
    success: boolean; 
    message: string; 
    data: { progress: OnboardingProgress } 
  }> => {
    const response = await apiClient.post('/onboarding/steps/skip', {
      stepId,
      flowId
    });
    return response.data;
  },

  // Dismiss onboarding
  dismissOnboarding: async (flowId: number): Promise<{ 
    success: boolean; 
    message: string; 
  }> => {
    const response = await apiClient.post('/onboarding/dismiss', {
      flowId
    });
    return response.data;
  },

  // Restart onboarding
  restartOnboarding: async (flowId: number): Promise<{ 
    success: boolean; 
    message: string; 
    data: { progress: OnboardingProgress } 
  }> => {
    const response = await apiClient.post('/onboarding/restart', {
      flowId
    });
    return response.data;
  },

  // Get contextual help
  getHelp: async (params: { 
    component?: string; 
    page?: string; 
    audience?: string; 
    category?: string 
  }): Promise<{ 
    success: boolean; 
    data: { 
      help?: HelpResource; 
      faqs?: any[]; 
      type?: string 
    } 
  }> => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key as keyof typeof params]) {
        queryParams.append(key, params[key as keyof typeof params] as string);
      }
    });
    
    const response = await apiClient.get(`/onboarding/help?${queryParams}`);
    return response.data;
  },

  // Track help interaction
  trackHelpInteraction: async (helpResourceId: number, interactionType: string, context?: any): Promise<{ 
    success: boolean; 
    message: string; 
  }> => {
    const response = await apiClient.post('/onboarding/help/track', {
      helpResourceId,
      interactionType,
      context
    });
    return response.data;
  },

  // Get popular help topics
  getPopularHelp: async (audience: string = 'all', limit: number = 5): Promise<{ 
    success: boolean; 
    data: { popular_help: any[] } 
  }> => {
    const response = await apiClient.get(`/onboarding/help/popular?audience=${audience}&limit=${limit}`);
    return response.data;
  },

  // Get milestones (REQUIREMENT: Milestone-based)
  getMilestones: async (flowId: number): Promise<{ 
    success: boolean; 
    data: { milestones: any[] } 
  }> => {
    const response = await apiClient.get(`/onboarding/milestones?flowId=${flowId}`);
    return response.data;
  },

  // Get user's active reminders (REQUIREMENT: Follow-up reminders)
  getReminders: async (): Promise<{ 
    success: boolean; 
    data: { reminders: any[] } 
  }> => {
    const response = await apiClient.get('/onboarding/reminders');
    return response.data;
  },

  // Get user's completion rewards (REQUIREMENT: Completion rewards)
  getCompletionRewards: async (flowId?: number): Promise<{
    success: boolean;
    data: { rewards: any[] }
  }> => {
    const params = flowId ? `?flowId=${flowId}` : '';
    const response = await apiClient.get(`/onboarding/rewards${params}`);
    return response.data;
  },

  // Initialize onboarding for new user (REQUIREMENT: 100% new users see guided onboarding)
  initializeForUser: async (role: string): Promise<{
    success: boolean;
    message: string;
    data?: { flow: OnboardingFlow; progress: OnboardingProgress }
  }> => {
    const response = await apiClient.post('/onboarding/initialize', {
      role
    });
    return response.data;
  },

  // Get completion analytics (REQUIREMENT: 95% completion within 7 days)
  getAnalytics: async (params?: string): Promise<{
    success: boolean;
    data: {
      completionRate: number;
      sevenDayCompletion: number;
      avgCompletionTime: number;
      totalCompletions: number;
    }
  }> => {
    const query = params || '';
    const response = await apiClient.get(`/onboarding/stats${query}`);
    return response.data;
  }
};