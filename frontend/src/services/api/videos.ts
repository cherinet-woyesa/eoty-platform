import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const videoApi = {
  // Upload video
  uploadVideo: async (lessonId: string, file: File) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('lessonId', lessonId);
    formData.append('video', file);
    
    const response = await axios.post(`${API_BASE}/videos/upload`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Upload subtitle
  uploadSubtitle: async (lessonId: string, languageCode: string, languageName: string, file: File) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('lessonId', lessonId);
    formData.append('languageCode', languageCode);
    formData.append('languageName', languageName);
    formData.append('subtitle', file);
    
    const response = await axios.post(`${API_BASE}/videos/subtitles`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get video metadata
  getVideoMetadata: async (lessonId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/videos/lessons/${lessonId}/metadata`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Check video availability
  checkVideoAvailability: async (lessonId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/videos/lessons/${lessonId}/availability`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Subscribe to video availability notifications
  notifyVideoAvailable: async (lessonId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/videos/lessons/${lessonId}/notify`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get user's video notifications
  getUserVideoNotifications: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/videos/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};