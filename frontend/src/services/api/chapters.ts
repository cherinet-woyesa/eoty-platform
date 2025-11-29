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

  getMembers: async (chapterId: number) => {
    const response = await apiClient.get(`/chapters/${chapterId}/members`);
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
  },

  createChapter: async (data: any) => {
    const response = await apiClient.post('/chapters', data);
    return response.data;
  },

  applyLeadership: async (data: any) => {
    const response = await apiClient.post('/chapters/apply-leadership', data);
    return response.data;
  },

  getEvents: async (chapterId: number) => {
    const response = await apiClient.get(`/chapters/${chapterId}/events`);
    return response.data;
  },

  createEvent: async (chapterId: number, data: any) => {
    const response = await apiClient.post(`/chapters/${chapterId}/events`, data);
    return response.data;
  },

  getResources: async (chapterId: number) => {
    const response = await apiClient.get(`/chapters/${chapterId}/resources`);
    return response.data;
  },

  createResource: async (chapterId: number, data: any) => {
    const response = await apiClient.post(`/chapters/${chapterId}/resources`, data);
    return response.data;
  },

  getAnnouncements: async (chapterId: number) => {
    const response = await apiClient.get(`/chapters/${chapterId}/announcements`);
    return response.data;
  },

  createAnnouncement: async (chapterId: number, data: any) => {
    const response = await apiClient.post(`/chapters/${chapterId}/announcements`, data);
    return response.data;
  },

  getEventAttendance: async (eventId: number) => {
    const response = await apiClient.get(`/chapters/events/${eventId}/attendance`);
    return response.data;
  },

  markAttendance: async (eventId: number, userId: number, status: string) => {
    const response = await apiClient.post(`/chapters/events/${eventId}/attendance`, { user_id: userId, status });
    return response.data;
  }
};
