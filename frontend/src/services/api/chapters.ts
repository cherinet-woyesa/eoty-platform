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
  contact_email?: string;
  meeting_time?: string;
  distance?: number; // Calculated on frontend or backend
  is_active: boolean;
}

export interface UserChapter {
  id: number;
  user_id: number;
  chapter_id: number;
  role: 'member' | 'moderator' | 'admin';
  is_primary: boolean;
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
  chapter_name?: string;
  name?: string;
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

  getLocations: async () => {
    const response = await apiClient.get('/chapters/locations');
    return response.data;
  },

  updateMemberStatus: async (chapterId: number, userId: number, status: 'approved' | 'rejected') => {
    const response = await apiClient.put(`/chapters/${chapterId}/members/${userId}/status`, { status });
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
   * Get members of a chapter
   */
  getMembers: async (chapterId: number) => {
    const response = await apiClient.get(`/chapters/${chapterId}/members`);
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

  getNearby: async (params: { lat: number; lng: number; radiusKm?: number; limit?: number }) => {
    const response = await apiClient.get('/chapters/nearby', { params });
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
