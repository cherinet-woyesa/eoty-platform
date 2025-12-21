import { apiClient } from './apiClient';

// Forum interfaces
export interface Forum {
  id: string;
  title: string;
  description?: string;
  chapter_id: string;
  is_public: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ForumTopic {
  id: string;
  forum_id: string;
  title: string;
  content: string;
  author_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_private: boolean;
  view_count: number;
  post_count: number;
  last_post_id?: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  pinned_at?: string;
  pinned_by?: string;
  tags?: string[];
  like_count?: number;
  author_first_name?: string;
  author_last_name?: string;
  author_name?: string; // Sometimes returned as full name
}

export interface ForumPost {
  id: string;
  topic_id: string;
  author_id: string;
  content: string;
  parent_id?: string;
  reply_count: number;
  like_count: number;
  is_moderated: boolean;
  moderation_reason?: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_first_name?: string;
  author_last_name?: string;
}

export interface ForumAttachment {
  id: string;
  post_id?: string;
  topic_id?: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  uploader_first_name?: string;
  uploader_last_name?: string;
  created_at: string;
}

export interface Poll {
  id: string;
  topic_id: string;
  question: string;
  description?: string;
  allow_multiple_votes: boolean;
  is_anonymous: boolean;
  ends_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  options: PollOption[];
  userVotes: string[];
  hasVoted: boolean;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  vote_count: number;
  order_index: number;
}

export const forumApi = {
  // Forums
  getForums: async () => {
    const response = await apiClient.get('/forums');
    return response.data;
  },

  createForum: async (data: { title: string; description?: string; chapter_id: string; is_public?: boolean }) => {
    const response = await apiClient.post('/forums', data);
    return response.data;
  },

  // Topics
  getTopics: async (forumId: string, page = 1, limit = 20) => {
    const response = await apiClient.get(`/forums/${forumId}/topics`, { params: { page, limit } });
    return response.data;
  },

  getTopic: async (topicId: string) => {
    const response = await apiClient.get(`/forums/topics/${topicId}`);
    return response.data;
  },

  createTopic: async (data: {
    forumId: string;
    title: string;
    content: string;
    isPrivate?: boolean;
    allowedChapterId?: string | null;
    tags?: string[];
    teacherOnly?: boolean;
    attachments?: string[];
  }) => {
    // map frontend-friendly keys to backend expectation
    const payload = {
      forumId: data.forumId,
      title: data.title,
      content: data.content,
      isPrivate: data.isPrivate,
      allowedChapterId: data.allowedChapterId,
      tags: data.tags,
      teacherOnly: data.teacherOnly,
      attachments: data.attachments,
    };
    const response = await apiClient.post('/forums/topics', payload);
    return response.data;
  },

  // Posts
  createPost: async (data: { topic_id: string; content: string; parent_id?: string; attachments?: string[] }) => {
    const response = await apiClient.post('/forums/posts', data);
    return response.data;
  },

  // Topic interactions
  likeTopic: async (topicId: string) => {
    const response = await apiClient.post(`/forums/topics/${topicId}/like`);
    return response.data;
  },

  createReply: async (topicId: string, data: { content: string; parent_id?: string; attachments?: string[] }) => {
    const response = await apiClient.post(`/forums/topics/${topicId}/replies`, data);
    return response.data;
  },

  shareTopic: async (topicId: string, data: { share_type: string; message?: string }) => {
    const response = await apiClient.post(`/forums/topics/${topicId}/share`, data);
    return response.data;
  },

  reportTopic: async (topicId: string, data: { reason: string; details?: string }) => {
    const response = await apiClient.post(`/forums/topics/${topicId}/report`, data);
    return response.data;
  },

  // Post interactions
  likePost: async (postId: string) => {
    const response = await apiClient.post(`/forums/posts/${postId}/like`);
    return response.data;
  },

  // Moderation
  lockTopic: async (topicId: string) => {
    const response = await apiClient.post(`/forums/topics/${topicId}/lock`);
    return response.data;
  },

  moderatePost: async (postId: string, action: string, reason?: string) => {
    const response = await apiClient.post(`/forums/posts/${postId}/moderate`, { action, reason });
    return response.data;
  },

  // Attachments
  uploadAttachment: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/forums/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteAttachment: async (attachmentId: string) => {
    const response = await apiClient.delete(`/forums/attachments/${attachmentId}`);
    return response.data;
  },

  // Search
  searchForumPosts: async (query: string) => {
    const response = await apiClient.get(`/forums/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // Comments functionality (from community)
  addComment: async (postId: string, data: { content: string; parentCommentId?: string }) => {
    const response = await apiClient.post(`/community/posts/${postId}/comments`, data);
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

  // Polls functionality
  createPoll: async (topicId: string, pollData: {
    question: string;
    description?: string;
    options: string[];
    allowMultipleVotes: boolean;
    isAnonymous: boolean;
    endsAt?: string;
  }) => {
    const response = await apiClient.post(`/forums/${topicId}/topics/${topicId}/polls`, pollData);
    return response.data;
  },

  votePoll: async (pollId: string, optionIds: string[]) => {
    const response = await apiClient.post(`/forums/polls/${pollId}/vote`, { optionIds });
    return response.data;
  },

  // Pinned topics functionality
  pinTopic: async (forumId: string, topicId: string) => {
    const response = await apiClient.post(`/forums/${forumId}/topics/${topicId}/pin`);
    return response.data;
  },

  unpinTopic: async (forumId: string, topicId: string) => {
    const response = await apiClient.post(`/forums/${forumId}/topics/${topicId}/unpin`);
    return response.data;
  }
};

export default forumApi;
