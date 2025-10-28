import axios from 'axios';
import { apiClient } from './api';

const API_BASE_URL = '/api/moderation';

// Moderation API functions
export const moderationApi = {
  // Get moderation dashboard data
  getDashboard: async () => {
    const response = await apiClient.get('/moderation/dashboard');
    return response.data;
  },

  // Moderate a post
  moderatePost: async (postId: number, action: 'delete' | 'hide' | 'warn' | 'approve', reason: string) => {
    const response = await apiClient.post(`/moderation/posts/${postId}`, { action, reason });
    return response.data;
  },

  // Get user moderation history
  getUserHistory: async (userId: number) => {
    const response = await apiClient.get(`/moderation/users/${userId}/history`);
    return response.data;
  }
};

export default moderationApi;