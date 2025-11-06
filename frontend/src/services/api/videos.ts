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
  // FIXED: Upload video with enhanced error handling and file validation
 // Replace the uploadVideo method with this:

uploadVideo: async (file: File, lessonId: string, onProgress?: (progress: number) => void) => {
  try {
    console.log('=== UPLOAD PROCESS START ===');
    console.log('Upload parameters:', {
      fileType: file.type,
      fileSize: file.size,
      fileName: file.name,
      lessonId: lessonId,
      isFile: file instanceof File
    });

    // Validate file before upload
    if (!file || file.size === 0) {
      throw new Error('File is empty or invalid');
    }

    if (!file.type.startsWith('video/')) {
      throw new Error('File is not a video');
    }

    const formData = new FormData();
    formData.append('lessonId', lessonId);
    formData.append('video', file);
    
    // Log FormData contents for debugging
    console.log('FormData contents:');
    for (let pair of formData.entries()) {
      console.log(`  ${pair[0]}:`, pair[1]);
    }

    // FIX: Use fetch directly instead of apiClient to avoid JSON conversion
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE}/videos/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // DO NOT set Content-Type - let browser set it with boundary
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('=== UPLOAD SUCCESS ===');
    console.log('Upload response:', result);
    return result;

  } catch (error: any) {
    console.error('=== UPLOAD FAILED ===');
    console.error('Video upload error:', error);
    throw new Error(error.message || 'Failed to upload video');
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

  // Get video metadata with caching
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

  // Check video availability with retry logic
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

  // Stream video with range support for seeking
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

  // Enhanced video streaming with quality options
  streamVideoWithQuality: async (filename: string, quality: string = 'auto', range?: string) => {
    try {
      const params = new URLSearchParams();
      if (quality !== 'auto') {
        params.append('quality', quality);
      }

      const headers: any = {
        'Accept': 'video/*',
      };
      
      if (range) {
        headers['Range'] = range;
      }

      const url = `${API_BASE}/videos/stream/${filename}?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        data: await response.blob(),
        headers: response.headers,
        status: response.status,
        quality: response.headers.get('X-Video-Quality') || quality
      };
    } catch (error: any) {
      console.error('Video streaming with quality error:', error);
      throw new Error(error.message || 'Failed to stream video');
    }
  },

  // Get video analytics
  getVideoAnalytics: async (lessonId: string) => {
    try {
      const response = await apiClient.get(`/videos/lessons/${lessonId}/analytics`);
      return response.data;
    } catch (error: any) {
      console.error('Get video analytics error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch video analytics');
    }
  },

  // Update video metadata
  updateVideoMetadata: async (lessonId: string, metadata: any) => {
    try {
      const response = await apiClient.put(`/videos/lessons/${lessonId}/metadata`, metadata);
      return response.data;
    } catch (error: any) {
      console.error('Update video metadata error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update video metadata');
    }
  },

  // Delete video
  deleteVideo: async (lessonId: string) => {
    try {
      const response = await apiClient.delete(`/videos/lessons/${lessonId}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete video error:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete video');
    }
  },

  // Get direct video URL for HTML5 video element
  getVideoStreamUrl: (filename: string): string => {
    // Remove any existing API base to avoid duplication
    const cleanFilename = filename.replace(`${API_BASE}/videos/stream/`, '');
    const baseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:5000' 
      : window.location.origin;
    return `${baseUrl}/api/videos/stream/${cleanFilename}`;
  },

  // Helper to extract filename from video URL
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

  // Enhanced video URL resolver with proper CORS handling
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

  // Check if video URL is accessible
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
  },

  // Get video file info
  getVideoFileInfo: async (filename: string) => {
    try {
      const response = await apiClient.get(`/videos/info/${filename}`);
      return response.data;
    } catch (error: any) {
      console.error('Get video file info error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch video file info');
    }
  },

  // Generate video thumbnail
  generateThumbnail: async (lessonId: string, timestamp: number = 0) => {
    try {
      const response = await apiClient.post(`/videos/lessons/${lessonId}/thumbnail`, {
        timestamp
      });
      return response.data;
    } catch (error: any) {
      console.error('Generate thumbnail error:', error);
      throw new Error(error.response?.data?.message || 'Failed to generate thumbnail');
    }
  },

  // Get video processing status
  getVideoProcessingStatus: async (lessonId: string) => {
    try {
      const response = await apiClient.get(`/videos/lessons/${lessonId}/processing-status`);
      return response.data;
    } catch (error: any) {
      console.error('Get video processing status error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch processing status');
    }
  },

  // Poll for video processing completion with smart backoff
  pollProcessingStatus: async (
    lessonId: string,
    maxAttempts: number = 30,
    onProgress?: (status: string, progress: number) => void
  ): Promise<any> => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await apiClient.get(`/courses/lessons/${lessonId}/video-status`);
        const { videoStatus, processingProgress, videoUrl, signedStreamUrl } = response.data;
        
        console.log(`Polling attempt ${attempts + 1}:`, { videoStatus, processingProgress, videoUrl, signedStreamUrl });
        
        if (onProgress) {
          onProgress(videoStatus, processingProgress || 0);
        }
        
        // If complete, return the result with the video URL
        if (videoStatus === 'completed' || videoStatus === 'ready') {
          console.log('Video processing completed!');
          return {
            status: 'completed',
            videoUrl: signedStreamUrl || videoUrl,
            progress: 100
          };
        }
        
        // If failed, throw error
        if (videoStatus === 'failed' || videoStatus === 'error') {
          throw new Error('Video processing failed');
        }
        
        // Wait before next poll (exponential backoff: 2s, 3s, 4s, 5s, then 5s)
        const delay = Math.min(2000 + (attempts * 1000), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        attempts++;
      } catch (error: any) {
        console.error('Polling error:', error);
        throw error;
      }
    }
    
    throw new Error('Video processing timeout');
  },

  // Bulk video operations
  bulkVideoOperations: {
    // Upload multiple videos
    uploadMultiple: async (files: File[], courseId: string, onProgress?: (progress: number) => void) => {
      try {
        const formData = new FormData();
        formData.append('courseId', courseId);
        
        files.forEach((file, index) => {
          formData.append(`videos`, file);
        });

        const response = await apiClient.post('/videos/bulk-upload', formData, {
          headers: { 
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          },
          timeout: 600000, // 10 minutes for bulk uploads
        });
        return response.data;
      } catch (error: any) {
        console.error('Bulk upload error:', error);
        throw new Error(error.response?.data?.message || 'Failed to upload videos');
      }
    },

    // Delete multiple videos
    deleteMultiple: async (lessonIds: string[]) => {
      try {
        const response = await apiClient.post('/videos/bulk-delete', { lessonIds });
        return response.data;
      } catch (error: any) {
        console.error('Bulk delete error:', error);
        throw new Error(error.response?.data?.message || 'Failed to delete videos');
      }
    }
  },

  // Video compression
  compressVideo: async (lessonId: string, options: { quality: string; format: string }) => {
    try {
      const response = await apiClient.post(`/videos/lessons/${lessonId}/compress`, options);
      return response.data;
    } catch (error: any) {
      console.error('Video compression error:', error);
      throw new Error(error.response?.data?.message || 'Failed to compress video');
    }
  },

  // Video download
  downloadVideo: async (filename: string) => {
    try {
      const response = await apiClient.get(`/videos/download/${filename}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('Video download error:', error);
      throw new Error(error.response?.data?.message || 'Failed to download video');
    }
  },

  // NEW: Test file upload with simple fetch
  testUpload: async (file: File, lessonId: string) => {
    try {
      const formData = new FormData();
      formData.append('lessonId', lessonId);
      formData.append('video', file);

      console.log('Testing upload with fetch API...');
      
      const response = await fetch(`${API_BASE}/videos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Test upload failed:', error);
      throw error;
    }
  }
};