import { apiClient } from './apiClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
  /**
   * @deprecated S3 video upload is deprecated. Use Mux direct upload instead.
   * All new uploads should use createMuxUploadUrl() and MuxVideoUploader component.
   * This method is kept for backward compatibility only.
   */
  uploadVideo: async (file: File, lessonId: string, onProgress?: (progress: number) => void) => {
    console.warn('⚠️ uploadVideo is deprecated. Use Mux direct upload instead.');
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
    
    // Create AbortController for timeout handling (5 minutes for large video files)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes
    
    try {
      const response = await fetch(`${API_BASE}/videos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // DO NOT set Content-Type - let browser set it with boundary
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('=== UPLOAD SUCCESS ===');
      console.log('Upload response:', result);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Upload timeout - file may be too large or connection too slow');
      }
      throw error;
    }

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
    // Use API_BASE_URL for production, fallback to origin for localhost
    const apiBaseUrl = API_BASE.replace('/api', '');
    const baseUrl = window.location.origin.includes('localhost') 
      ? apiBaseUrl 
      : apiBaseUrl;
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
        // Use API_BASE_URL for production
        const apiBaseUrl = API_BASE.replace('/api', '');
        const baseUrl = window.location.origin.includes('localhost') 
          ? apiBaseUrl 
          : apiBaseUrl;
        return `${baseUrl}${videoUrl}`;
      }
      
      // If it's just a filename, construct the full streaming URL
      const filename = videoApi.extractFilenameFromUrl(videoUrl);
      if (filename) {
        // Use API_BASE_URL for production
        const apiBaseUrl = API_BASE.replace('/api', '');
        const baseUrl = window.location.origin.includes('localhost') 
          ? apiBaseUrl 
          : apiBaseUrl;
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

  /**
   * @deprecated S3 video processing polling is deprecated. Mux handles processing automatically via webhooks.
   * This method is kept for backward compatibility with legacy S3 videos only.
   */
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

  // Get video download URL (with permission check)
  getVideoDownloadUrl: async (lessonId: string) => {
    try {
      const response = await apiClient.get(`/courses/lessons/${lessonId}/download-url`);
      return response.data;
    } catch (error: any) {
      console.error('Get video download URL error:', error);
      if (error.response?.status === 403) {
        throw new Error('Video download is not permitted for this lesson');
      }
      throw new Error(error.response?.data?.message || 'Failed to get download URL');
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
  },

  // ============================================================================
  // MUX INTEGRATION METHODS
  // ============================================================================

  /**
   * Get playback information for a lesson (supports both Mux and S3)
   * This method automatically detects the video provider and returns appropriate playback URLs
   */
  getPlaybackInfo: async (lessonId: string, options?: { generateSignedUrls?: boolean }) => {
    try {
      const params = new URLSearchParams();
      if (options?.generateSignedUrls !== undefined) {
        params.append('generateSignedUrls', options.generateSignedUrls.toString());
      }

      const url = `/videos/${lessonId}/playback${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url, { timeout: 10000 });
      
      return response.data;
    } catch (error: any) {
      console.error('Get playback info error:', error);
      
      // Provider-specific error handling
      if (error.response?.status === 404) {
        throw new Error('Video not found or not yet processed');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have access to this video');
      } else if (error.response?.data?.message?.includes('Mux')) {
        throw new Error(`Mux error: ${error.response.data.message}`);
      } else if (error.response?.data?.message?.includes('S3')) {
        throw new Error(`S3 error: ${error.response.data.message}`);
      }
      
      throw new Error(error.response?.data?.message || 'Failed to get playback information');
    }
  },

  /**
   * Create Mux direct upload URL for a lesson
   */
  createMuxUploadUrl: async (lessonId: string, metadata?: Record<string, any>) => {
    try {
      const response = await apiClient.post('/videos/mux/upload-url', {
        lessonId,
        metadata
      }, { timeout: 15000 });
      
      return response.data;
    } catch (error: any) {
      console.error('Create Mux upload URL error:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Lesson not found');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to upload videos for this lesson');
      } else if (error.response?.data?.message?.includes('Mux')) {
        throw new Error(`Mux configuration error: ${error.response.data.message}`);
      }
      
      throw new Error(error.response?.data?.message || 'Failed to create Mux upload URL');
    }
  },

  /**
   * Get Mux asset status for a lesson
   */
  getMuxAssetStatus: async (lessonId: string) => {
    try {
      const response = await apiClient.get(`/videos/${lessonId}/mux-status`, {
        timeout: 10000
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Get Mux asset status error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get Mux asset status');
    }
  },

  /**
   * Track video view for analytics
   */
  trackVideoView: async (lessonId: string, viewData: {
    watchTime: number;
    videoDuration?: number;
    completionPercentage: number;
    muxViewId?: string;
    deviceInfo?: {
      deviceType?: string;
      browser?: string;
      os?: string;
      country?: string;
      region?: string;
    };
  }) => {
    try {
      const response = await apiClient.post(`/videos/${lessonId}/track-view`, viewData, {
        timeout: 5000
      });
      
      return response.data;
    } catch (error: any) {
      // Don't throw errors for analytics tracking - just log them
      console.error('Track video view error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get bulk analytics for multiple lessons
   */
  getBulkAnalytics: async (lessonIds: number[], timeframe: string = '7:days') => {
    try {
      const params = new URLSearchParams();
      params.append('lessonIds', lessonIds.join(','));
      params.append('timeframe', timeframe);

      const response = await apiClient.get(`/videos/bulk/analytics?${params.toString()}`, {
        timeout: 15000
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Get bulk analytics error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get bulk analytics');
    }
  },

  /**
   * Check if video provider is Mux or S3
   */
  detectVideoProvider: async (lessonId: string): Promise<'mux' | 's3' | 'none'> => {
    try {
      const playbackInfo = await videoApi.getPlaybackInfo(lessonId);
      return playbackInfo.data?.provider || 'none';
    } catch (error) {
      console.error('Detect video provider error:', error);
      return 'none';
    }
  },

  /**
   * Upload video to Mux (alternative to direct upload)
   * This method handles the entire upload process including URL generation
   */
  uploadToMux: async (
    file: File,
    lessonId: string,
    onProgress?: (progress: number) => void
  ) => {
    try {
      // Step 1: Get Mux upload URL
      const uploadUrlResponse = await videoApi.createMuxUploadUrl(lessonId, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      const { uploadUrl, uploadId } = uploadUrlResponse.data;

      // Step 2: Upload file directly to Mux
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              success: true,
              uploadId,
              message: 'Video uploaded successfully to Mux'
            });
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.send(file);
      });
    } catch (error: any) {
      console.error('Upload to Mux error:', error);
      throw new Error(error.message || 'Failed to upload video to Mux');
    }
  },

  /**
   * Handle provider-specific errors with user-friendly messages
   */
  handleProviderError: (error: any, provider: 'mux' | 's3' | 'unknown' = 'unknown'): string => {
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';

    // Mux-specific errors
    if (provider === 'mux' || errorMessage.toLowerCase().includes('mux')) {
      if (errorMessage.includes('not configured')) {
        return 'Mux video service is not configured. Please contact support.';
      } else if (errorMessage.includes('asset') && errorMessage.includes('not found')) {
        return 'Video asset not found in Mux. It may have been deleted.';
      } else if (errorMessage.includes('processing')) {
        return 'Video is still being processed. Please wait a few moments.';
      } else if (errorMessage.includes('playback')) {
        return 'Unable to generate playback URL. Please try again.';
      }
    }

    // S3-specific errors
    if (provider === 's3' || errorMessage.toLowerCase().includes('s3')) {
      if (errorMessage.includes('not found')) {
        return 'Video file not found in storage. It may have been moved or deleted.';
      } else if (errorMessage.includes('access denied')) {
        return 'Access to video file denied. Please check your permissions.';
      }
    }

    // Generic errors
    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return 'You do not have permission to access this video.';
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return 'Video not found. It may have been deleted.';
    } else if (errorMessage.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    } else if (errorMessage.includes('network')) {
      return 'Network error. Please check your internet connection.';
    }

    return errorMessage;
  }
};