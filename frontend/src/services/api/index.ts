import { forumsApi, achievementsApi, socialFeaturesApi } from './community';
import { adminApi } from './admin';
import { teacherApi } from './teacher';
import { dashboardApi } from './dashboard';
import { quizApi } from './quiz';
import { progressApi } from './progress';
import { discussionsApi } from './discussions';
import { studyGroupsApi } from './studyGroups';
import { apiClient } from './apiClient';
import { subtitlesApi } from './subtitles';
import { lessonResourcesApi } from './lessonResources';
import { videoNotesApi } from './videoNotes';
import { videoChaptersApi } from './videoChapters';
import { thumbnailsApi } from './thumbnails';
import { relatedVideosApi } from './relatedVideos';
import { recordingPresetsApi } from './recordingPresets';
import { moderationApi } from './moderation';
import { assignmentsApi } from './assignments';
import { aiApi } from './ai';

// Export apiClient so other modules can import it
export { apiClient };
export { aiApi };

// Note: Request/response interceptors are handled in apiClient.ts
// No duplicate interceptors needed here

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

  // Facebook login (FR7: Facebook OAuth)
  facebookLogin: async (facebookData: { facebookId: string; email: string; firstName: string; lastName: string; profilePicture?: string }) => {
    const response = await apiClient.post('/auth/facebook-login', facebookData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  getUserPermissions: async () => {
    // Use a shorter timeout so the UI isn't blocked too long on slow networks
    const response = await apiClient.get('/auth/permissions', {
      timeout: 5000
    });
    return response.data;
  },

  logout: async () => {
    // Client-side logout - no storage to clear (session not persisted)
    return { success: true };
  },

  updateUserPreferences: async (preferences: any) => {
    const response = await apiClient.put('/auth/preferences', preferences);
    return response.data;
  },

  updateUserProfile: async (profileData: any) => {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  },

  uploadProfileImage: async (imageFile: File) => {
    const formData = new FormData();
    formData.append('profileImage', imageFile);
    const response = await apiClient.post('/auth/upload-profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  validateToken: async (token: string) => {
    try {
      // Make a request to a protected endpoint to validate the token
      // Use a shorter timeout to avoid blocking the UI
      await apiClient.get('/auth/validate-token', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000 // 5 second timeout instead of default 15s
      });
      return true;
    } catch (error: any) {
      // If the request fails, the token is considered invalid
      // But don't fail on network errors - only on auth errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false;
      }
      // For network errors, assume token is valid (will be checked on next API call)
      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        console.warn('Token validation timeout/network error - assuming valid');
        return true; // Assume valid if network error
      }
      return false;
    }
  },

  // Forgot Password endpoints
  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      password: newPassword
    });
    return response.data;
  },

  verifyResetToken: async (token: string) => {
    const response = await apiClient.post('/auth/verify-reset-token', { token });
    return response.data;
  },

  // Email verification endpoints
  verifyEmail: async (token: string) => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  resendVerificationEmail: async (email: string) => {
    const response = await apiClient.post('/auth/resend-verification', { email });
    return response.data;
  }
};

// Enhanced Courses API (with role checking)
export const coursesApi = {
  // Get teacher's courses
  getCourses: async () => {
    const response = await apiClient.get('/courses');
    return response.data;
  },

  // Get specific course by ID
  getCourseById: async (courseId: string) => {
    const response = await apiClient.get(`/courses/${courseId}`);
    return response.data;
  },

  // Create new course
  createCourse: async (courseData: { title: string; description?: string; category?: string; level?: string; cover_image?: string }) => {
    const response = await apiClient.post('/courses', courseData);
    return response.data;
  },

  // Delete course
  deleteCourse: async (courseId: string) => {
    const response = await apiClient.delete(`/courses/${courseId}`);
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
  },

  // Update lesson
  updateLesson: async (lessonId: string, lessonData: any) => {
    const response = await apiClient.put(`/courses/lessons/${lessonId}`, lessonData);
    return response.data;
  },

  // Delete lesson
  deleteLesson: async (lessonId: string) => {
    const response = await apiClient.delete(`/courses/lessons/${lessonId}`);
    return response.data;
  },

  // Reorder lessons
  reorderLessons: async (courseId: string, lessons: { id: number; order: number }[]) => {
    const response = await apiClient.post(`/courses/${courseId}/lessons/reorder`, { lessons });
    return response.data;
  },

  // Get video status
  getVideoStatus: async (lessonId: string) => {
    const response = await apiClient.get(`/courses/lessons/${lessonId}/video-status`);
    return response.data;
  },

  // Update course
  updateCourse: async (courseId: string, courseData: any) => {
    const response = await apiClient.put(`/courses/${courseId}`, courseData);
    return response.data;
  },

  // Publish / unpublish course
  publishCourse: async (courseId: string) => {
    const response = await apiClient.post(`/courses/${courseId}/publish`);
    return response.data;
  },

  unpublishCourse: async (courseId: string) => {
    const response = await apiClient.post(`/courses/${courseId}/unpublish`);
    return response.data;
  },

  // Get single course
  getCourse: async (courseId: string) => {
    const response = await apiClient.get(`/courses/${courseId}`);
    return response.data;
  },

  // Bulk operations
  bulkAction: async (action: string, courseIds: number[], data?: any) => {
    const response = await apiClient.post('/courses/bulk-action', {
      action,
      courseIds,
      data
    });
    return response.data;
  },

  // Analytics endpoints
  getEnrolledStudents: async (courseId: string, params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const response = await apiClient.get(`/courses/${courseId}/students`, { params });
    return response.data;
  },

  getStudentProgress: async (courseId: string, studentId: string) => {
    const response = await apiClient.get(`/courses/${courseId}/students/${studentId}/progress`);
    return response.data;
  },

  getEngagementAnalytics: async (courseId: string, params?: {
    startDate?: string;
    endDate?: string;
    granularity?: string;
  }) => {
    const response = await apiClient.get(`/courses/${courseId}/analytics/engagement`, { params });
    return response.data;
  },

  exportAnalytics: async (courseId: string, params?: {
    format?: string;
    reportType?: string;
  }) => {
    const response = await apiClient.get(`/courses/${courseId}/analytics/export`, { params });
    return response.data;
  },

  // Get course analytics summary
  getCourseAnalytics: async (courseId: string) => {
    const response = await apiClient.get(`/courses/${courseId}/analytics`);
    return response.data;
  },

  // Upload course cover image
  uploadCourseImage: async (courseId: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('coverImage', imageFile);
    const response = await apiClient.post(`/courses/${courseId}/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

// Enhanced Video API with progress tracking and retry logic
export const videoApi = {
  // Upload recorded video with progress tracking
  uploadVideo: async (videoBlob: Blob, lessonId: string, onProgress?: (progress: number) => void) => {
    // Convert Blob to File for proper handling
    const videoFile = new File([videoBlob], `lesson-${lessonId}-${Date.now()}.webm`, {
      type: videoBlob.type
    });

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('lessonId', lessonId);

    const response = await apiClient.post('/videos/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
      timeout: 300000, // 5 minutes timeout
    });
    return response.data;
  },

  // Upload pre-recorded video file
  uploadVideoFile: async (file: File, lessonId: string, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('lessonId', lessonId);

    const response = await apiClient.post('/videos/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
      timeout: 300000,
    });
    return response.data;
  },

  // Stream video with range support
  streamVideo: async (filename: string, range?: string) => {
    const headers = range ? { Range: range } : {};
    const response = await apiClient.get(`/videos/stream/${filename}`, {
      headers,
      responseType: 'blob',
      timeout: 0, // No timeout for streaming
    });
    return response.data;
  },
  
  // Get video metadata including subtitles
  getVideoMetadata: async (lessonId: string) => {
    const response = await apiClient.get(`/videos/lessons/${lessonId}/metadata`);
    return response.data;
  },

  // Check video availability with retry logic
  checkVideoAvailability: async (lessonId: string) => {
    const response = await apiClient.get(`/videos/lessons/${lessonId}/availability`);
    return response.data;
  },

  // Upload subtitle file
  uploadSubtitle: async (subtitleBlob: Blob, lessonId: string, languageCode: string, languageName: string) => {
    const subtitleFile = new File([subtitleBlob], `subtitle-${lessonId}-${languageCode}.vtt`, {
      type: 'text/vtt'
    });

    const formData = new FormData();
    formData.append('subtitle', subtitleFile);
    formData.append('lessonId', lessonId);
    formData.append('languageCode', languageCode);
    formData.append('languageName', languageName);

    const response = await apiClient.post('/videos/subtitles', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Subscribe to video notifications
  notifyVideoAvailable: async (lessonId: string) => {
    const response = await apiClient.post(`/videos/lessons/${lessonId}/notify`, {});
    return response.data;
  },

  // Get video notifications
  getUserVideoNotifications: async () => {
    const response = await apiClient.get('/videos/notifications');
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

  getLessonBookmarks: async (lessonId: string) => {
    const response = await apiClient.get(`/interactive/lessons/${lessonId}/bookmarks`);
    return response.data;
  },

  // Lesson engagement summary for teachers/admins
  getLessonSummary: async (lessonId: string) => {
    const response = await apiClient.get(`/interactive/lessons/${lessonId}/summary`);
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

  moderateDiscussionPost: async (postId: number, action: 'approve' | 'reject' | 'pin' | 'unpin') => {
    const response = await apiClient.post('/interactive/discussions/moderate', {
      postId,
      action
    });
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

// Journeys API (Spiritual Journeys)
export const journeysApi = {
  // List all available journeys
  getJourneys: async (filters?: any) => {
    const response = await apiClient.get('/journeys', { params: filters });
    return response.data;
  },

  // Get user's enrolled journeys
  getUserJourneys: async () => {
    const response = await apiClient.get('/journeys/my-journeys');
    return response.data;
  },

  // Get a single journey definition
  getJourney: async (id: number | string) => {
    const response = await apiClient.get(`/journeys/${id}`);
    return response.data;
  },

  // Enroll in a journey
  enroll: async (id: number | string) => {
    const response = await apiClient.post(`/journeys/${id}/enroll`);
    return response.data;
  },

  // Get detailed progress for a specific user journey
  getUserJourneyDetails: async (userJourneyId: number | string) => {
    const response = await apiClient.get(`/journeys/progress/${userJourneyId}`);
    return response.data;
  },

  // Complete a milestone
  completeMilestone: async (userJourneyId: number | string, milestoneId: number | string) => {
    const response = await apiClient.post(`/journeys/progress/${userJourneyId}/milestone/${milestoneId}/complete`);
    return response.data;
  },

  // Admin/Teacher: create journey
  createJourney: async (payload: any) => {
    const response = await apiClient.post('/journeys', payload);
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

// Moderation API is now imported from ./moderation

// Admin API
export { adminApi };
export { teacherApi };

export { forumsApi, achievementsApi, socialFeaturesApi };

// Export moderation API
export { moderationApi };

// Export subtitles API
export { subtitlesApi };

// Export lesson resources API
export { lessonResourcesApi };

// Export video notes API
export { videoNotesApi };
export type { VideoNote, CreateNoteData, UpdateNoteData } from './videoNotes';
export { videoChaptersApi };
export type { VideoChapter, CreateChapterData, UpdateChapterData } from './videoChapters';
export { thumbnailsApi };
export type { ThumbnailOption } from './thumbnails';
export { relatedVideosApi };
export type { RelatedVideo } from './relatedVideos';
export { recordingPresetsApi };
export type { RecordingPreset, CreatePresetData, UpdatePresetData } from './recordingPresets';
export { assignmentsApi };

// Landing Page API (public)
export const landingApi = {
  getContent: async () => {
    const response = await apiClient.get('/landing/content');
    return response.data;
  },
  getStats: async () => {
    const response = await apiClient.get('/landing/stats');
    return response.data;
  },
  getFeaturedCourses: async () => {
    const response = await apiClient.get('/landing/featured-courses');
    return response.data;
  },
  getTestimonials: async () => {
    const response = await apiClient.get('/landing/testimonials');
    return response.data;
  }
};

// Export all API
export default {
  auth: authApi,
  courses: coursesApi,
  video: videoApi,
  quiz: quizApi,
  progress: progressApi,
  discussions: discussionsApi,
    studyGroups: studyGroupsApi,
  ai: aiApi,
  interactive: interactiveApi,
  resources: resourcesApi,
  forums: forumsApi,
  achievements: achievementsApi,
  socialFeatures: socialFeaturesApi,
  moderation: moderationApi,
  admin: adminApi,
  dashboard: dashboardApi,
  subtitles: subtitlesApi,
  lessonResources: lessonResourcesApi,
  videoNotes: videoNotesApi,
  videoChapters: videoChaptersApi,
  thumbnails: thumbnailsApi,
  relatedVideos: relatedVideosApi,
  recordingPresets: recordingPresetsApi,
  landing: landingApi
};