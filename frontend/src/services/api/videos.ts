import { apiClient } from './apiClient';

const API_BASE = 'http://localhost:5000/api';

// Create a public API client for streaming (no auth required)
export const publicApiClient = {
  get: (url: string, config?: any) => {
    return fetch(`${API_BASE}${url}`, {
      method: 'GET',
      headers: {
        ...config?.headers,
      },
      ...config,
    });
  },
};

export const videoApi = {
  // Upload video with enhanced error handling and progress tracking
  uploadVideo: async (file: File, lessonId: string, onProgress?: (progress: number) => void) => {
    try {
      const formData = new FormData();
      formData.append('lessonId', lessonId);
      formData.append('video', file);
      
      const response = await apiClient.post('/videos/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
        timeout: 300000, // 5 minutes for large files
      });
      return response.data;
    } catch (error: any) {
      console.error('Video upload error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload video');
    }
  },

  // Upload subtitle with validation
  uploadSubtitle: async (lessonId: string, languageCode: string, languageName: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('lessonId', lessonId);
      formData.append('languageCode', languageCode);
      formData.append('languageName', languageName);
      formData.append('subtitle', file);
      
      const response = await apiClient.post('/videos/subtitles', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000, // 1 minute for subtitle files
      });
      return response.data;
    } catch (error: any) {
      console.error('Subtitle upload error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload subtitle');
    }
  },

  // Get video metadata with caching - USE PUBLIC CLIENT
  getVideoMetadata: async (lessonId: string) => {
    try {
      const response = await apiClient.get(`/videos/lessons/${lessonId}/metadata`, {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      console.error('Get video metadata error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch video metadata');
    }
  },

  // Check video availability with retry logic - USE PUBLIC CLIENT
  checkVideoAvailability: async (lessonId: string, retries = 3): Promise<any> => {
    try {
      const response = await apiClient.get(`/videos/lessons/${lessonId}/availability`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      if (retries > 0 && error.response?.status >= 500) {
        // Retry on server errors only
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries))); // Exponential backoff
        return videoApi.checkVideoAvailability(lessonId, retries - 1);
      }
      console.error('Check video availability error:', error);
      throw new Error(error.response?.data?.message || 'Failed to check video availability');
    }
  },

  // Subscribe to video availability notifications
  notifyVideoAvailable: async (lessonId: string) => {
    try {
      const response = await apiClient.post(`/videos/lessons/${lessonId}/notify`, {}, {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      console.error('Notify video available error:', error);
      throw new Error(error.response?.data?.message || 'Failed to subscribe to notifications');
    }
  },

  // Get user's video notifications
  getUserVideoNotifications: async () => {
    try {
      const response = await apiClient.get('/videos/notifications', {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      console.error('Get user notifications error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch notifications');
    }
  },

  // Stream video with range support for seeking - USE PUBLIC CLIENT
  streamVideo: async (filename: string, range?: string) => {
    try {
      const headers: any = {
        'Accept': 'video/*',
      };
      
      if (range) {
        headers['Range'] = range;
      }

      // Use fetch API for better streaming support
      const response = await fetch(`${API_BASE}/videos/stream/${filename}`, {
        method: 'GET',
        headers: headers,
        credentials: 'include' // Important for CORS with credentials
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        data: await response.blob(),
        headers: response.headers,
        status: response.status
      };
    } catch (error: any) {
      console.error('Video streaming error:', {
        filename,
        range,
        message: error.message
      });
      
      // Enhanced error handling for streaming
      if (error.message.includes('404')) {
        throw new Error('Video file not found on server');
      } else if (error.message.includes('416')) {
        throw new Error('Invalid video range request');
      } else if (error.message.includes('401')) {
        throw new Error('Video access denied');
      } else {
        throw new Error(error.message || 'Failed to stream video');
      }
    }
  },

  // Get course lessons with caching
  getCourseLessons: async (courseId: string) => {
    try {
      const response = await apiClient.get(`/videos/courses/${courseId}/lessons`, {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      console.error('Get course lessons error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch course lessons');
    }
  },

  // NEW: Get direct video URL for HTML5 video element
  getVideoStreamUrl: (filename: string): string => {
    // Remove any existing API base to avoid duplication
    const cleanFilename = filename.replace(`${API_BASE}/videos/stream/`, '');
    const baseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:5000' 
      : window.location.origin;
    return `${baseUrl}/api/videos/stream/${cleanFilename}`;
  },

  // NEW: Helper to extract filename from video URL
  extractFilenameFromUrl: (videoUrl: string): string => {
    if (!videoUrl) return '';
    
    // If it's already just a filename, return it
    if (!videoUrl.includes('/')) return videoUrl;
    
    // Extract filename from path (handle both /stream/ and direct filename)
    if (videoUrl.includes('/stream/')) {
      return videoUrl.split('/stream/').pop() || '';
    } else {
      return videoUrl.split('/').pop() || '';
    }
  },

  // NEW: Enhanced video URL resolver with proper CORS handling
  resolveVideoUrl: (videoUrl: string): string => {
    if (!videoUrl) {
      throw new Error('No video URL provided');
    }

    try {
      // If it's already a full streaming URL, use it directly
      if (videoUrl.includes('/api/videos/stream/')) {
        return videoUrl;
      }
      
      // If it's a relative URL starting with /api/, make it absolute
      if (videoUrl.startsWith('/api/')) {
        // Use the same origin to avoid CORS issues
        const baseUrl = window.location.origin.includes('localhost') 
          ? 'http://localhost:5000' 
          : window.location.origin;
        return `${baseUrl}${videoUrl}`;
      }
      
      // If it's just a filename, construct the full streaming URL
      const filename = videoApi.extractFilenameFromUrl(videoUrl);
      if (filename) {
        const baseUrl = window.location.origin.includes('localhost') 
          ? 'http://localhost:5000' 
          : window.location.origin;
        return `${baseUrl}/api/videos/stream/${filename}`;
      }
      
      // Return original URL as fallback
      return videoUrl;
    } catch (error) {
      console.error('Error resolving video URL:', error, videoUrl);
      return videoUrl; // Fallback to original URL
    }
  },

  // NEW: Check if video URL is accessible
  validateVideoUrl: async (videoUrl: string): Promise<boolean> => {
    try {
      const resolvedUrl = videoApi.resolveVideoUrl(videoUrl);
      const response = await fetch(resolvedUrl, {
        method: 'HEAD',
        credentials: 'include'
      });
      return response.ok;
    } catch (error) {
      console.error('Video URL validation error:', error);
      return false;
    }
  }
};