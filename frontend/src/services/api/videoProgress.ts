/**
 * Video Progress API Service
 * Handles video progress tracking, preferences, and chapters
 */

import { apiClient } from './apiClient';

export interface VideoProgress {
  id: number;
  user_id: number;
  lesson_id: number;
  current_time: number;
  duration: number;
  completion_percentage: number;
  completed: boolean;
  watch_count: number;
  last_watched_at: string;
  created_at: string;
  updated_at: string;
}

export interface VideoPreferences {
  id: number;
  user_id: number;
  playback_speed: number;
  preferred_quality: string;
  auto_play_next: boolean;
  show_captions: boolean;
  caption_language: string;
  created_at: string;
  updated_at: string;
}

export interface VideoChapter {
  id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  start_time: number;
  end_time: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const videoProgressApi = {
  // Get user's progress for a lesson
  async getProgress(lessonId: number): Promise<{
    success: boolean;
    data?: { progress: VideoProgress };
    message?: string;
  }> {
    try {
      const response = await apiClient.get(`/api/video-progress/${lessonId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get video progress error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get video progress'
      };
    }
  },

  // Update video progress
  async updateProgress(
    lessonId: number,
    data: {
      current_time: number;
      duration: number;
      completion_percentage: number;
      completed?: boolean;
    }
  ): Promise<{
    success: boolean;
    data?: { progress: VideoProgress };
    message?: string;
  }> {
    try {
      const response = await apiClient.post(`/api/video-progress/${lessonId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Update video progress error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update video progress'
      };
    }
  },

  // Mark video as completed
  async markCompleted(lessonId: number): Promise<{
    success: boolean;
    data?: { progress: VideoProgress };
    message?: string;
  }> {
    try {
      const response = await apiClient.post(`/api/video-progress/${lessonId}/complete`);
      return response.data;
    } catch (error: any) {
      console.error('Mark video completed error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark video as completed'
      };
    }
  },

  // Get user video preferences
  async getPreferences(): Promise<{
    success: boolean;
    data?: { preferences: VideoPreferences };
    message?: string;
  }> {
    try {
      const response = await apiClient.get('/api/video-progress/preferences');
      return response.data;
    } catch (error: any) {
      console.error('Get video preferences error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get video preferences'
      };
    }
  },

  // Update video preferences
  async updatePreferences(data: Partial<VideoPreferences>): Promise<{
    success: boolean;
    data?: { preferences: VideoPreferences };
    message?: string;
  }> {
    try {
      const response = await apiClient.put('/api/video-progress/preferences', data);
      return response.data;
    } catch (error: any) {
      console.error('Update video preferences error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update video preferences'
      };
    }
  },

  // Get video chapters
  async getChapters(lessonId: number): Promise<{
    success: boolean;
    data?: { chapters: VideoChapter[] };
    message?: string;
  }> {
    try {
      const response = await apiClient.get(`/api/video-progress/${lessonId}/chapters`);
      return response.data;
    } catch (error: any) {
      console.error('Get video chapters error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get video chapters'
      };
    }
  },

  // Create video chapter (teachers only)
  async createChapter(
    lessonId: number,
    data: {
      title: string;
      description?: string;
      start_time: number;
      end_time?: number;
      order_index?: number;
    }
  ): Promise<{
    success: boolean;
    data?: { chapter: VideoChapter };
    message?: string;
  }> {
    try {
      const response = await apiClient.post(`/api/video-progress/${lessonId}/chapters`, data);
      return response.data;
    } catch (error: any) {
      console.error('Create video chapter error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create video chapter'
      };
    }
  },

  // Delete video chapter (teachers only)
  async deleteChapter(lessonId: number, chapterId: number): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const response = await apiClient.delete(`/api/video-progress/${lessonId}/chapters/${chapterId}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete video chapter error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete video chapter'
      };
    }
  }
};
