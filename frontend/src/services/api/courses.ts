import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const coursesApi = {
  // Get teacher's courses
  getCourses: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/courses`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Create new course
  createCourse: async (courseData: { title: string; description?: string; category?: string; coverImage?: string }) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/courses`, courseData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Create lesson in course
  createLesson: async (courseId: string, lessonData: { title: string; description?: string; order?: number }) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/courses/${courseId}/lessons`, lessonData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get lessons for course
  getLessons: async (courseId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/videos/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};