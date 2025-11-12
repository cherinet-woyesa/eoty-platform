import axios, { type AxiosResponse, AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { parseApiError, logError } from '@/utils/errorHandler';

// Demo mode flag - set to true to use mock data when backend is unavailable
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || false;
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Mock data store for demo mode
const mockDataStore = new Map<string, any>();

// Enhanced axios instance with better error handling and performance optimizations
export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // Increased timeout to 60 seconds for production (handles slow connections)
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add response type for better performance
  responseType: 'json',
});

// Request interceptor with enhanced CORS handling and performance optimizations
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    
    // Add auth token if available
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Handle CORS-safe headers
    if (config.headers) {
      // Remove problematic headers that might cause CORS preflight issues
      delete config.headers['Cache-Control'];
      delete config.headers['X-Requested-With'];
      
      // Add safe headers
      config.headers['Accept'] = 'application/json';
      
      // For FormData, let browser set Content-Type automatically
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
    }
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        baseURL: config.baseURL,
        headers: config.headers
      });
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(enhanceError(error));
  }
);

// Enhanced response interceptor with caching support
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`, {
        data: response.data,
        headers: response.headers
      });
    }
    
    // Cache GET requests for performance
    if (response.config.method?.toUpperCase() === 'GET') {
      const cacheKey = `${response.config.method}:${response.config.url}`;
      responseCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }
    
    return response;
  },
  (error: AxiosError) => {
    // Parse error using centralized error handler
    const errorInfo = parseApiError(error);
    logError(error, `API: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.warn('🛑 Authentication failed, clearing local storage');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?session_expired=true';
      }
    }
    
    // Handle CORS and network errors
    if (error.code === 'ERR_NETWORK' || error.response?.status === 0) {
      console.error('🌐 Network/CORS Error:', {
        code: error.code,
        message: error.message,
        url: error.config?.url
      });
      
      // If in demo mode, return mock data instead of failing
      if (DEMO_MODE && error.config) {
        const mockData = getMockData(error.config.url || '');
        if (mockData) {
          console.log('🎭 Using mock data for:', error.config.url);
          return Promise.resolve({
            data: mockData,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: error.config
          });
        }
      }
    }
    
    // Enhance error with user-friendly message
    const enhancedError = enhanceError(error);
    (enhancedError as any).userMessage = errorInfo.userMessage;
    (enhancedError as any).retryable = errorInfo.retryable;
    (enhancedError as any).errorCode = errorInfo.code;
    
    return Promise.reject(enhancedError);
  }
);

// Enhanced error utility
const enhanceError = (error: AxiosError): AxiosError => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    let message = 'An error occurred';
    
    switch (status) {
      case 400:
        message = 'Bad request - please check your input';
        break;
      case 401:
        message = 'Authentication required';
        break;
      case 403:
        message = 'Access denied';
        break;
      case 404:
        message = 'Resource not found';
        break;
      case 429:
        message = 'Too many requests - please slow down';
        break;
      case 500:
        message = 'Server error - please try again later';
        break;
      case 502:
        message = 'Bad gateway - service temporarily unavailable';
        break;
      case 503:
        message = 'Service unavailable';
        break;
      default:
        message = `Request failed with status ${status}`;
    }
    
    error.message = message;
  } else if (error.request) {
    // Request was made but no response received
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout - please check your connection';
    } else if (error.code === 'ERR_NETWORK') {
      error.message = 'Network error - cannot connect to server';
    } else {
      error.message = 'No response received from server';
    }
  }
  
  return error;
};

// Mock data generator for demo mode
const getMockData = (url: string): any => {
  const mockEndpoints: { [key: string]: any } = {
    '/students/dashboard': {
      success: true,
      data: {
        progress: {
          totalCourses: 5,
          completedCourses: 2,
          totalLessons: 48,
          completedLessons: 23,
          studyStreak: 7,
          totalPoints: 1250,
          nextGoal: 'Complete 5 more lessons',
          weeklyGoal: 10,
          weeklyProgress: 7,
          level: 'Intermediate',
          xp: 750,
          nextLevelXp: 1000,
          monthlyProgress: 15,
          monthlyGoal: 20,
          averageScore: 85,
          timeSpent: 1250,
          certificatesEarned: 3,
          rank: 'Top 15%',
          percentile: 15
        },
        enrolledCourses: [
          {
            id: '1',
            title: 'Advanced React Patterns',
            description: 'Learn advanced React patterns and best practices for building scalable applications.',
            progress: 75,
            totalLessons: 12,
            completedLessons: 9,
            lastAccessed: new Date().toISOString(),
            instructor: 'Sarah Johnson',
            rating: 4.8,
            studentCount: 1247,
            duration: 360,
            thumbnail: '/api/placeholder/300/200',
            category: 'Web Development',
            difficulty: 'intermediate',
            tags: ['React', 'JavaScript', 'Frontend'],
            isBookmarked: true,
            isFeatured: true
          },
          {
            id: '2',
            title: 'Machine Learning Fundamentals',
            description: 'Introduction to machine learning concepts and practical implementations.',
            progress: 30,
            totalLessons: 20,
            completedLessons: 6,
            lastAccessed: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            instructor: 'Dr. Michael Chen',
            rating: 4.6,
            studentCount: 2893,
            duration: 480,
            category: 'Data Science',
            difficulty: 'beginner',
            tags: ['Python', 'ML', 'AI'],
            isFeatured: false
          }
        ],
        recentActivity: [
          {
            id: '1',
            type: 'lesson_completed',
            title: 'Completed Lesson',
            description: 'Finished React Hooks Deep Dive',
            timestamp: new Date(),
            metadata: {
              courseTitle: 'Advanced React Patterns',
              points: 50,
              progress: 75
            },
            read: false,
            importance: 'medium',
            category: 'learning'
          },
          {
            id: '2',
            type: 'achievement_earned',
            title: 'Achievement Unlocked',
            description: 'Earned Quick Learner badge',
            timestamp: new Date(Date.now() - 3600000),
            metadata: {
              points: 100
            },
            read: true,
            importance: 'high',
            category: 'achievement'
          }
        ],
        recommendations: [
          {
            id: '1',
            type: 'course',
            title: 'React Performance Optimization',
            description: 'Learn techniques to optimize React application performance and reduce bundle size.',
            difficulty: 'intermediate',
            duration: 240,
            rating: 4.7,
            students: 1560,
            matchScore: 92,
            tags: ['React', 'Performance', 'Optimization'],
            reason: 'Based on your React learning pattern',
            isNew: true,
            pointsReward: 200
          }
        ]
      }
    },
    '/courses': {
      success: true,
      data: [
        {
          id: '1',
          title: 'Advanced React Patterns',
          description: 'Learn advanced React patterns and best practices',
          progress: 75,
          totalLessons: 12,
          completedLessons: 9,
          instructor: 'Sarah Johnson',
          rating: 4.8,
          studentCount: 1247,
          duration: 360,
          category: 'Web Development',
          difficulty: 'intermediate',
          isBookmarked: true
        }
      ]
    }
  };
  
  // Extract endpoint path from full URL
  const endpoint = url.replace(API_BASE, '');
  return mockEndpoints[endpoint] || null;
};

// Utility functions for API calls
export const apiUtils = {
  // Enhanced GET with error handling and caching
  async get<T>(url: string, config?: any): Promise<T> {
    try {
      // Check cache first for GET requests
      if (config?.method?.toUpperCase() !== 'POST') {
        const cacheKey = `GET:${url}`;
        const cached = responseCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log('📦 Using cached response for:', url);
          return cached.data;
        }
      }
      
      const response = await apiClient.get<T>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  },
  
  // Enhanced POST with error handling
  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    try {
      const response = await apiClient.post<T>(url, data, config);
      // Clear cache for this endpoint after POST
      responseCache.delete(`GET:${url}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  },
  
  // Enhanced PUT with error handling
  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    try {
      const response = await apiClient.put<T>(url, data, config);
      // Clear cache for this endpoint after PUT
      responseCache.delete(`GET:${url}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  },
  
  // Enhanced DELETE with error handling
  async delete<T>(url: string, config?: any): Promise<T> {
    try {
      const response = await apiClient.delete<T>(url, config);
      // Clear cache for this endpoint after DELETE
      responseCache.delete(`GET:${url}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  },
  
  // Error handler
  handleApiError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      const enhancedError = new Error(message);
      enhancedError.name = 'ApiError';
      (enhancedError as any).status = error.response?.status;
      (enhancedError as any).code = error.code;
      return enhancedError;
    }
    return error;
  },
  
  // Check if server is reachable
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  },
  
  // Clear cache
  clearCache(): void {
    responseCache.clear();
  }
};

// Attach utility methods to axios instance
(apiClient as any).utils = apiUtils;

export default apiClient;