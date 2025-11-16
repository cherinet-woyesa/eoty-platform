import { apiClient } from './index';
import type {
  Forum,
  ForumTopic,
  ForumPost,
  Badge,
  UserBadge,
  LeaderboardResponse,
  BadgeProgress,
  CreateTopicRequest,
  CreatePostRequest
} from '@/types/community';

export const forumsApi = {
  // Get forums for user's chapter
  getForums: async (): Promise<{ success: boolean; data: { forums: Forum[] } }> => {
    const response = await apiClient.get('/forums');
    return response.data;
  },

  // Get forum topics
  getTopics: async (forumId: number, page: number = 1, limit: number = 20): Promise<{ success: boolean; data: { topics: ForumTopic[] } }> => {
    const response = await apiClient.get(`/forums/${forumId}/topics?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Create new topic
  createTopic: async (topicData: CreateTopicRequest): Promise<{ success: boolean; data: { topic: ForumTopic } }> => {
    const response = await apiClient.post('/forums/topics', topicData);
    return response.data;
  },

  // Get topic with posts
  getTopic: async (topicId: number, page: number = 1, limit: number = 50): Promise<{ success: boolean; data: { topic: ForumTopic; posts: ForumPost[] } }> => {
    const response = await apiClient.get(`/forums/topics/${topicId}?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Create post (reply)
  createPost: async (postData: CreatePostRequest): Promise<{ success: boolean; data: { post: ForumPost } }> => {
    const response = await apiClient.post('/forums/posts', postData);
    return response.data;
  },

  // Like a post
  likePost: async (postId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/forums/posts/${postId}/like`);
    return response.data;
  },

  // Report a post
  reportPost: async (postId: number, reason: string, details: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/forums/posts/${postId}/report`, { reason, details });
    return response.data;
  },

  // Lock topic (admin only)
  lockTopic: async (topicId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/forums/topics/${topicId}/lock`);
    return response.data;
  },

  // Search forum posts (REQUIREMENT: Forum posts indexed for search)
  searchForumPosts: async (query: string, chapterId?: number): Promise<{ success: boolean; data: { results: ForumPost[]; query: string; count: number } }> => {
    const params = new URLSearchParams({ query });
    if (chapterId) params.append('chapterId', chapterId.toString());
    const response = await apiClient.get(`/forums/search?${params.toString()}`);
    return response.data;
  }
};

export const achievementsApi = {
  // Get user badges
  getUserBadges: async (): Promise<{ success: boolean; data: { badges: UserBadge[]; total_points: number } }> => {
    const response = await apiClient.get('/achievements/badges');
    return response.data;
  },

  // Get all available badges
  getAvailableBadges: async (): Promise<{ success: boolean; data: { badges: Badge[] } }> => {
    const response = await apiClient.get('/achievements/badges/available');
    return response.data;
  },

  // Get featured badges
  getFeaturedBadges: async (): Promise<{ success: boolean; data: { badges: Badge[] } }> => {
    const response = await apiClient.get('/achievements/badges/featured');
    return response.data;
  },

  // Check badge eligibility
  checkEligibility: async (badgeId: number): Promise<{ success: boolean; data: { eligible: boolean; badge: Badge; progress: BadgeProgress } }> => {
    const response = await apiClient.get(`/achievements/badges/${badgeId}/eligibility`);
    return response.data;
  },

  // Get leaderboard
  getLeaderboard: async (type: string = 'chapter', period: string = 'current'): Promise<LeaderboardResponse> => {
    const response = await apiClient.get(`/achievements/leaderboard?type=${type}&period=${period}`);
    return response.data;
  },

  // Update anonymity preference
  updateAnonymity: async (isAnonymous: boolean): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put('/achievements/anonymity', { isAnonymous });
    return response.data;
  },

  // Mark badge notification as read
  markNotificationAsRead: async (notificationId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/achievements/notifications/${notificationId}/read`);
    return response.data;
  }
};

// Social features API (REQUIREMENT: FR4)
export const socialFeaturesApi = {
  // Get forum uptime status (REQUIREMENT: 100% uptime for forum access)
  getForumUptimeStatus: async (): Promise<{ success: boolean; data: { isHealthy: boolean; activeForums: number; recentPosts: number; uptime: number; lastCheck: string; requirement: string; meetsRequirement: boolean } }> => {
    const response = await apiClient.get('/social/forum-uptime');
    return response.data;
  }
};