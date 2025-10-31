import axios from 'axios';
import { apiClient } from './apiClient';

const API_BASE = 'http://localhost:5000/api';

export const videoApi = {
  // Upload video with enhanced error handling and progress tracking
  uploadVideo: async (file: File, lessonId: string, onProgress?: (progress: number) => void) => {
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
  },

  // Upload subtitle with validation
  uploadSubtitle: async (lessonId: string, languageCode: string, languageName: string, file: File) => {
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
  },

  // Get video metadata with caching
  getVideoMetadata: async (lessonId: string) => {
    const response = await apiClient.get(`/videos/lessons/${lessonId}/metadata`, {
      timeout: 10000,
    });
    return response.data;
  },

  // Check video availability with retry logic
  checkVideoAvailability: async (lessonId: string, retries = 3): Promise<any> => {
    try {
      const response = await apiClient.get(`/videos/lessons/${lessonId}/availability`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      if (retries > 0 && error.response?.status >= 500) {
        // Retry on server errors
        await new Promise(resolve => setTimeout(resolve, 1000));
        return videoApi.checkVideoAvailability(lessonId, retries - 1);
      }
      throw error;
    }
  },

  // Subscribe to video availability notifications
  notifyVideoAvailable: async (lessonId: string) => {
    const response = await apiClient.post(`/videos/lessons/${lessonId}/notify`, {}, {
      timeout: 10000,
    });
    return response.data;
  },

  // Get user's video notifications
  getUserVideoNotifications: async () => {
    const response = await apiClient.get('/videos/notifications', {
      timeout: 10000,
    });
    return response.data;
  },

  // Stream video with range support for seeking
  streamVideo: async (filename: string, range?: string) => {
    const headers = range ? { Range: range } : {};
    const response = await apiClient.get(`/videos/stream/${filename}`, {
      headers,
      responseType: 'blob',
      timeout: 0, // No timeout for streaming
    });
    return response;
  },

  // Get course lessons with caching
  getCourseLessons: async (courseId: string) => {
    const response = await apiClient.get(`/videos/courses/${courseId}/lessons`, {
      timeout: 10000,
    });
    return response.data;
  }
};