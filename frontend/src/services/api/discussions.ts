import { apiClient } from './apiClient';

// Discussion interfaces
export interface Discussion {
  id: string;
  user_id: string;
  lesson_id: string;
  parent_id: string | null;
  content: string;
  video_timestamp: number | null;
  is_approved: boolean;
  is_pinned: boolean;
  likes_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
  replies?: Discussion[];
  is_liked?: boolean;
  is_flagged?: boolean;
}

export interface CreateDiscussionData {
  content: string;
  video_timestamp?: number;
  parent_id?: string;
}

export interface UpdateDiscussionData {
  content?: string;
  is_pinned?: boolean;
  is_approved?: boolean;
}

export interface DiscussionFilters {
  sort_by?: 'newest' | 'oldest' | 'most_liked';
  show_pinned_only?: boolean;
  video_timestamp?: number;
  parent_id?: string | null;
}

export const discussionsApi = {
  // Get discussions for a lesson
  getLessonDiscussions: async (lessonId: number, filters?: DiscussionFilters) => {
    const params = new URLSearchParams();
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.show_pinned_only) params.append('show_pinned_only', 'true');
    if (filters?.video_timestamp) params.append('video_timestamp', filters.video_timestamp.toString());
    if (filters?.parent_id !== undefined) params.append('parent_id', filters.parent_id || 'null');

    const response = await apiClient.get(`/discussions/lessons/${lessonId}?${params.toString()}`);
    return response.data;
  },

  // Create a new discussion
  createDiscussion: async (lessonId: number, data: CreateDiscussionData) => {
    const response = await apiClient.post(`/discussions/lessons/${lessonId}`, data);
    return response.data;
  },

  // Update a discussion
  updateDiscussion: async (discussionId: string, data: UpdateDiscussionData) => {
    const response = await apiClient.put(`/discussions/${discussionId}`, data);
    return response.data;
  },

  // Delete a discussion
  deleteDiscussion: async (discussionId: string) => {
    const response = await apiClient.delete(`/discussions/${discussionId}`);
    return response.data;
  },

  // Like/unlike a discussion
  toggleLike: async (discussionId: string) => {
    const response = await apiClient.post(`/discussions/${discussionId}/like`);
    return response.data;
  },

  // Flag a discussion
  flagDiscussion: async (discussionId: string, reason: string) => {
    const response = await apiClient.post(`/discussions/${discussionId}/flag`, { reason });
    return response.data;
  },

  // Pin/unpin a discussion (moderators only)
  togglePin: async (discussionId: string) => {
    const response = await apiClient.post(`/discussions/${discussionId}/pin`);
    return response.data;
  },

  // Approve/unapprove a discussion (moderators only)
  toggleApproval: async (discussionId: string) => {
    const response = await apiClient.post(`/discussions/${discussionId}/approve`);
    return response.data;
  },

  // Get discussion statistics
  getDiscussionStats: async (lessonId: number) => {
    const response = await apiClient.get(`/discussions/lessons/${lessonId}/stats`);
    return response.data;
  },

  // Search discussions
  searchDiscussions: async (lessonId: number, query: string) => {
    const response = await apiClient.get(`/discussions/lessons/${lessonId}/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }
};

export default discussionsApi;





