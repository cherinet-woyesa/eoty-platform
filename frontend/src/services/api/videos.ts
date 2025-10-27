import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const videoApi = {
  // Upload recorded video
  uploadVideo: async (videoBlob: Blob, lessonId: string) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('video', videoBlob, `lesson-${lessonId}-${Date.now()}.webm`);
    formData.append('lessonId', lessonId);

    const response = await axios.post(`${API_BASE}/videos/upload`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Stream video
  streamVideo: async (filename: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/videos/stream/${filename}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    });
    return response.data;
  }
};