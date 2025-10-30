import axios from 'axios';
import { forumsApi, achievementsApi } from './community';
import { adminApi } from './admin';
import { dashboardApi } from './dashboard';
import { quizApi } from './quiz'; // Added this import
import { progressApi } from './progress'; // Added this import
import { discussionsApi } from './discussions'; // Added this import
import { apiClient } from './apiClient'; // Import apiClient from the new file

const API_BASE = 'http://localhost:5000/api';

// Export apiClient so other modules can import it
export { apiClient };

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Enhanced Authentication API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: any) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  // Google login
  googleLogin: async (googleData: { googleId: string; email: string; firstName: string; lastName: string; profilePicture?: string }) => {
    const response = await apiClient.post('/auth/google-login', googleData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  getUserPermissions: async () => {
    const response = await apiClient.get('/auth/permissions');
    return response.data;
  },

  logout: async () => {
    // Client-side logout - clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { success: true };
  }
};

// Enhanced Courses API (with role checking)
export const coursesApi = {
  // Get teacher's courses
  getCourses: async () => {
    const response = await apiClient.get('/courses');
    return response.data;
  },

  // Create new course
  createCourse: async (courseData: { title: string; description?: string; category?: string }) => {
    const response = await apiClient.post('/courses', courseData);
    return response.data;
  },

  // Create lesson in course
  createLesson: async (courseId: string, lessonData: { title: string; description?: string; order?: number }) => {
    const response = await apiClient.post(`/courses/${courseId}/lessons`, lessonData);
    return response.data;
  },

  // Get lessons for course
  getLessons: async (courseId: string) => {
    const response = await apiClient.get(`/videos/courses/${courseId}/lessons`);
    return response.data;
  }
};

// Video API
export const videoApi = {
  // Upload recorded video
  uploadVideo: async (videoBlob: Blob, lessonId: string) => {
    const formData = new FormData();
    formData.append('video', videoBlob, `lesson-${lessonId}-${Date.now()}.webm`);
    formData.append('lessonId', lessonId);

    const response = await apiClient.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Stream video
  streamVideo: async (filename: string) => {
    const response = await apiClient.get(`/videos/stream/${filename}`, {
      responseType: 'blob'
    });
    return response.data;
  },
  
  // Get video metadata including subtitles
  getVideoMetadata: async (lessonId: string) => {
    const response = await apiClient.get(`/videos/lessons/${lessonId}/metadata`);
    return response.data;
  },

  // Upload subtitle file
  uploadSubtitle: async (subtitleBlob: Blob, lessonId: string, languageCode: string, languageName: string) => {
    const formData = new FormData();
    formData.append('subtitle', subtitleBlob);
    formData.append('lessonId', lessonId);
    formData.append('languageCode', languageCode);
    formData.append('languageName', languageName);

    const response = await apiClient.post('/videos/subtitles', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

// AI API
export const aiApi = {
  // Ask a question to AI
  askQuestion: async (question: string, sessionId?: string, context?: any) => {
    const response = await apiClient.post('/ai/ask', {
      question,
      sessionId,
      context
    });
    return response.data;
  },

  // Get conversation history
  getConversationHistory: async (sessionId?: string) => {
    const response = await apiClient.get('/ai/conversation', {
      params: { sessionId }
    });
    return response.data;
  },

  // Clear conversation history
  clearConversation: async (sessionId?: string) => {
    const response = await apiClient.post('/ai/conversation/clear', {
      sessionId
    });
    return response.data;
  }
};

// Interactive Features API
export const interactiveApi = {
  // Quiz methods
  getLessonQuizzes: async (lessonId: string) => {
    const response = await apiClient.get(`/interactive/lessons/${lessonId}/quizzes`);
    return response.data;
  },

  getQuizQuestions: async (quizId: string) => {
    const response = await apiClient.get(`/interactive/quizzes/${quizId}/questions`);
    return response.data;
  },

  // Get quiz for taking (without correct answers)
  getQuizForTaking: async (quizId: string) => {
    const response = await apiClient.get(`/interactive/quizzes/${quizId}/take`);
    return response.data;
  },

  // Submit quiz attempt
  submitQuizAttempt: async (quizId: string, answers: any) => {
    const response = await apiClient.post(`/interactive/quizzes/${quizId}/attempt`, {
      answers
    });
    return response.data;
  },

  // Get quiz results after submission
  getQuizResults: async (attemptId: string) => {
    const response = await apiClient.get(`/interactive/quiz-attempts/${attemptId}/results`);
    return response.data;
  },

  // Annotation methods
  createAnnotation: async (data: any) => {
    const response = await apiClient.post('/interactive/annotations', data);
    return response.data;
  },

  getLessonAnnotations: async (lessonId: string) => {
    const response = await apiClient.get(`/interactive/lessons/${lessonId}/annotations`);
    return response.data;
  },

  // Discussion methods
  createDiscussionPost: async (data: any) => {
    const response = await apiClient.post('/interactive/discussions', data);
    return response.data;
  },

  getLessonDiscussions: async (lessonId: string) => {
    const response = await apiClient.get(`/interactive/lessons/${lessonId}/discussions`);
    return response.data;
  },

  // Progress methods
  updateLessonProgress: async (lessonId: string, data: any) => {
    const response = await apiClient.post(`/interactive/lessons/${lessonId}/progress`, data);
    return response.data;
  },

  getLessonProgress: async (lessonId: string) => {
    const response = await apiClient.get(`/interactive/lessons/${lessonId}/progress`);
    return response.data;
  },

  // System validation methods
  runAcceptanceValidation: async () => {
    const response = await apiClient.post(`/interactive/system/validate`);
    return response.data;
  },

  getValidationHistory: async () => {
    const response = await apiClient.get(`/interactive/system/validation-history`);
    return response.data;
  }
};

// NEW: Resources API for FR3 - Interactive Resource Library
export const resourcesApi = {
  // Get resources with filtering
  getResources: async (filters: any = {}) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`/resources?${params}`);
    return response.data;
  },

  // Get single resource
  getResource: async (id: number) => {
    const response = await apiClient.get(`/resources/${id}`);
    return response.data;
  },

  // Get filter options
  getFilters: async () => {
    const response = await apiClient.get('/resources/filters');
    return response.data;
  },

  // Create note
  createNote: async (noteData: any) => {
    const response = await apiClient.post('/resources/notes', noteData);
    return response.data;
  },

  // Get resource notes
  getNotes: async (resourceId: number) => {
    const response = await apiClient.get(`/resources/${resourceId}/notes`);
    return response.data;
  },

  // Get AI summary
  getSummary: async (resourceId: number, type: string = 'brief') => {
    const response = await apiClient.get(`/resources/${resourceId}/summary?type=${type}`);
    return response.data;
  },

  // Export content
  exportContent: async (resourceId: number, format: string = 'pdf') => {
    const response = await apiClient.get(`/resources/${resourceId}/export?format=${format}`);
    return response.data;
  }
};

// NEW: Moderation API for FR4 - Forum and Achievements
export const moderationApi = {
  // Get moderation dashboard data
  getDashboard: async () => {
    const response = await apiClient.get('/moderation/dashboard');
    return response.data;
  },

  // Moderate a post
  moderatePost: async (postId: number, action: 'delete' | 'hide' | 'warn' | 'approve', reason: string) => {
    const response = await apiClient.post(`/moderation/posts/${postId}`, { action, reason });
    return response.data;
  },

  // Get user moderation history
  getUserHistory: async (userId: number) => {
    const response = await apiClient.get(`/moderation/users/${userId}/history`);
    return response.data;
  }
};

// Admin API
export { adminApi };

export { forumsApi, achievementsApi };

// Export all API
export default {
  auth: authApi,
  courses: coursesApi,
  video: videoApi,
  quiz: quizApi, // Added quiz API
  progress: progressApi, // Added progress API
  discussions: discussionsApi, // Added discussions API
  ai: aiApi,
  interactive: interactiveApi,
  resources: resourcesApi,
  forums: forumsApi,        // NEW
  achievements: achievementsApi, 
  moderation: moderationApi, // NEW
  admin: adminApi,
  dashboard: dashboardApi
};