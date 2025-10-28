import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const interactiveApi = {
  // Quiz methods
  getLessonQuizzes: async (lessonId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/interactive/lessons/${lessonId}/quizzes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getQuizQuestions: async (quizId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/interactive/quizzes/${quizId}/questions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  submitQuizAttempt: async (quizId: string, answers: any) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/interactive/quizzes/${quizId}/attempt`, {
      answers
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Annotation methods
  createAnnotation: async (data: any) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/interactive/annotations`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getLessonAnnotations: async (lessonId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/interactive/lessons/${lessonId}/annotations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Discussion methods
  createDiscussionPost: async (data: any) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/interactive/discussions`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getLessonDiscussions: async (lessonId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/interactive/lessons/${lessonId}/discussions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Moderation methods
  moderateDiscussionPost: async (postId: string, action: 'approve' | 'reject' | 'pin' | 'unpin') => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/interactive/discussions/moderate`, {
      postId,
      action
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getFlaggedPosts: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/interactive/discussions/flagged`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Community reporting method
  reportDiscussionPost: async (postId: string, reason: 'inappropriate' | 'spam' | 'harassment' | 'offensive' | 'other') => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/interactive/discussions/report`, {
      postId,
      reason
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Progress methods
  updateLessonProgress: async (lessonId: string, data: any) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/interactive/lessons/${lessonId}/progress`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getLessonProgress: async (lessonId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/interactive/lessons/${lessonId}/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getUserProgress: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/interactive/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Notification methods
  getUserNotifications: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/interactive/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  markNotificationAsRead: async (notificationId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/interactive/notifications/read`, {
      notificationId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // System validation methods
  runAcceptanceValidation: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/interactive/system/validate`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getValidationHistory: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/interactive/system/validation-history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export default interactiveApi;
