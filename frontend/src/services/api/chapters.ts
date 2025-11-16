/**
 * FR7: Chapter API
 * REQUIREMENT: Multi-city/chapter membership
 */

import { apiClient } from './apiClient';

export interface Chapter {
  id: number;
  name: string;
  location?: string;
  country?: string;
  city?: string;
  description?: string;
  timezone?: string;
  language?: string;
  topics?: string[];
  region?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

export interface UserChapter {
  id: number;
  user_id: number;
  chapter_id: number;
  role: 'member' | 'moderator' | 'admin';
  is_primary: boolean;
  joined_at: string;
  chapter_name?: string;
  location?: string;
  country?: string;
  city?: string;
}

export const chaptersApi = {
  /**
   * Get all active chapters
   */
  getChapters: async (filters?: {
    country?: string;
    city?: string;
    region?: string;
    topic?: string;
  }) => {
    const response = await apiClient.get('/chapters', { params: filters });
    return response.data;
  },

  /**
   * Get user's chapters (REQUIREMENT: Multi-chapter membership)
   */
  getUserChapters: async () => {
    const response = await apiClient.get('/chapters/user');
    return response.data;
  },

  /**
   * Join a chapter
   */
  joinChapter: async (chapterId: number, role: 'member' | 'moderator' | 'admin' = 'member', setAsPrimary = false) => {
    const response = await apiClient.post('/chapters/join', {
      chapter_id: chapterId,
      role,
      set_as_primary: setAsPrimary
    });
    return response.data;
  },

  /**
   * Leave a chapter
   */
  leaveChapter: async (chapterId: number) => {
    const response = await apiClient.post('/chapters/leave', {
      chapter_id: chapterId
    });
    return response.data;
  },

  /**
   * Set primary chapter
   */
  setPrimaryChapter: async (chapterId: number) => {
    const response = await apiClient.post('/chapters/primary', {
      chapter_id: chapterId
    });
    return response.data;
  },

  /**
   * Search chapters (REQUIREMENT: Location/topic based)
   */
  searchChapters: async (searchTerm: string) => {
    const response = await apiClient.get('/chapters/search', {
      params: { q: searchTerm }
    });
    return response.data;
  }
};
