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
  }
};