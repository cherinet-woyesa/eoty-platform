// frontend/src/services/api.ts

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add timestamp for caching
    config.headers['X-Request-Timestamp'] = Date.now();
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful API calls in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });

    // Enhanced error handling
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden
      return Promise.reject(new Error('You do not have permission to perform this action.'));
    } else if (error.response?.status === 404) {
      // Not Found
      return Promise.reject(new Error('The requested resource was not found.'));
    } else if (error.response?.status >= 500) {
      // Server error
      return Promise.reject(new Error('Server error. Please try again later.'));
    } else if (error.code === 'NETWORK_ERROR') {
      // Network error
      return Promise.reject(new Error('Network error. Please check your internet connection.'));
    } else if (error.code === 'TIMEOUT_ERROR') {
      // Timeout error
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }

    return Promise.reject(error);
  }
);

// AI API interface
export interface AskQuestionParams {
  question: string;
  sessionId: string;
  context: any;
}

export interface TelemetryData {
  sessionId: string;
  context: any;
  totalTimeMs: number;
  success: boolean;
  errorMessage?: string;
  messageCount?: number;
}

export interface SummaryData {
  sessionId: string;
  language?: string;
  route?: string;
  questionLength: number;
  answerLength: number;
  flagged: boolean;
}

export interface AIApiResponse {
  answer: string;
  content?: string;
  metadata?: any;
  detectedLanguage?: string;
  sessionId?: string;
}

export const aiApi = {
  // Core AI methods
  askQuestion: async (question: string, sessionId: string = 'default', context: any = {}): Promise<AIApiResponse> => {
    const response = await api.post('/ai/ask', {
      question,
      sessionId,
      context,
      timestamp: new Date().toISOString()
    });
    return response.data;
  },

  getConversationHistory: async (sessionId: string = 'default'): Promise<any> => {
    const response = await api.get(`/ai/conversation/${sessionId}`);
    return response.data;
  },

  clearConversation: async (sessionId: string = 'default'): Promise<any> => {
    const response = await api.delete(`/ai/conversation/${sessionId}`);
    return response.data;
  },

  // Optional telemetry method
  sendTelemetry: async (telemetryData: TelemetryData): Promise<any> => {
    try {
      const response = await api.post('/ai/telemetry', {
        ...telemetryData,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.warn('Telemetry sending failed:', error);
      // Don't throw error for telemetry failures
      return { success: false, message: 'Telemetry failed but main operation succeeded' };
    }
  },

  // Optional summary logging method
  logSummary: async (summaryData: SummaryData): Promise<any> => {
    try {
      const response = await api.post('/ai/summary', {
        ...summaryData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      return response.data;
    } catch (error) {
      console.warn('Summary logging failed:', error);
      // Don't throw error for summary logging failures
      return { success: false, message: 'Summary logging failed but main operation succeeded' };
    }
  },

  // Additional utility methods
  getHealth: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  },

  // Feedback submission
  submitFeedback: async (sessionId: string, messageId: string, feedback: 'positive' | 'negative', comment?: string): Promise<any> => {
    const response = await api.post('/ai/feedback', {
      sessionId,
      messageId,
      feedback,
      comment,
      timestamp: new Date().toISOString()
    });
    return response.data;
  }
};

// Export the base API instance for other services
export default api;