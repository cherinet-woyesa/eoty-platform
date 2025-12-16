import { apiClient } from './index';
import axios from 'axios';

export const communityPostsApi = {
  // Upload media using server upload (simplified approach)
  uploadMedia: async (file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append('file', file);

    const response = await apiClient.post('/community/media', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (ev: ProgressEvent) => {
        if (onProgress && ev.total) {
          onProgress((ev.loaded / ev.total) * 100);
        }
      },
      timeout: 300000, // 5 minutes for large files
    });

    return response.data;
  },

  createPost: async (payload: { content: string; mediaType?: string; mediaUrl?: string }) => {
    const response = await apiClient.post('/community/posts', payload);
    return response.data; // expected { success: true, data: { post } }
  },

  fetchPosts: async () => {
    console.log('🚀 communityPostsApi.fetchPosts called');
    console.log('🌐 Making GET request to /community/posts');

    try {
      const response = await apiClient.get('/community/posts');
      console.log('📥 API Response received:', response);
      console.log('📊 Response status:', response.status);
      console.log('📦 Response data:', response.data);
      return response.data; // expected { success: true, data: { posts: [] } }
    } catch (error) {
      console.error('❌ communityPostsApi.fetchPosts error:', error);
      console.error('❌ Error response:', error.response);
      throw error;
    }
  },

  deletePost: async (postId: string) => {
    const response = await apiClient.delete(`/community/posts/${postId}`);
    return response.data;
  },

  updatePost: async (postId: string, data: { content: string }) => {
    const response = await apiClient.put(`/community/posts/${postId}`, data);
    return response.data;
  },

  toggleLike: async (postId: string) => {
    const response = await apiClient.post(`/community/posts/${postId}/like`);
    return response.data;
  },

  toggleBookmark: async (postId: string) => {
    const response = await apiClient.post('/bookmarks/toggle', {
      entityType: 'community_post',
      entityId: postId
    });
    return response.data;
  },

  // Comments functionality
  addComment: async (postId: string, data: { content: string; parentCommentId?: string | number }) => {
    const payload: any = {
      content: data.content
    };
    if (data.parentCommentId != null && data.parentCommentId !== '') {
      // ensure we send a numeric id to backend
      payload.parent_comment_id = Number(data.parentCommentId);
    }
    const response = await apiClient.post(`/community/posts/${postId}/comments`, payload);
    return response.data;
  },

  fetchComments: async (postId: string) => {
    const response = await apiClient.get(`/community/posts/${postId}/comments`);
    return response.data;
  },

  deleteComment: async (commentId: string) => {
    const response = await apiClient.delete(`/community/comments/${commentId}`);
    return response.data;
  },

  updateComment: async (commentId: string, data: { content: string }) => {
    const response = await apiClient.put(`/community/comments/${commentId}`, data);
    return response.data;
  },

  toggleCommentLike: async (commentId: string) => {
    const response = await apiClient.post(`/community/comments/${commentId}/like`);
    return response.data;
  },

  // Post sharing functionality
  sharePost: async (postId: string, data: {
    sharedWith?: string;
    chapterId?: number;
    message?: string;
    shareType: 'user' | 'chapter' | 'public';
  }) => {
    const response = await apiClient.post(`/community/posts/${postId}/share`, data);
    return response.data;
  },

  getSharedPosts: async () => {
    const response = await apiClient.get('/community/posts/shared');
    return response.data;
  },

  getPostShares: async (postId: string) => {
    const response = await apiClient.get(`/community/posts/${postId}/shares`);
    return response.data;
  },

  // Search and trending functionality
  searchPosts: async (params: {
    q: string;
    filter?: 'all' | 'text' | 'image' | 'video' | 'audio' | 'article';
    sort?: 'newest' | 'oldest' | 'most_liked' | 'most_commented';
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('q', params.q);
    if (params.filter) queryParams.append('filter', params.filter);
    if (params.sort) queryParams.append('sort', params.sort);

    const response = await apiClient.get(`/community/search?${queryParams.toString()}`);
    return response.data;
  },

  getTrendingPosts: async (params?: {
    period?: '1h' | '6h' | '24h' | '7d' | '30d';
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/community/trending?${queryParams.toString()}`);
    return response.data;
  },

  getFeedStats: async () => {
    const response = await apiClient.get('/community/stats');
    return response.data;
  }
};

export default communityPostsApi;
