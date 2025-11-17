import { apiClient } from './apiClient';

export const teacherApi = {
  // Get teacher dashboard data
  getDashboard: async () => {
    const response = await apiClient.get('/teacher/dashboard');
    return response.data;
  },

  // Lightweight stats for recording page (reuses dashboard endpoint)
  getDashboardStats: async () => {
    const response = await apiClient.get('/teacher/dashboard');
    return response.data;
  },

  // Get all students enrolled in teacher's courses
  getStudents: async (params?: {
    search?: string;
    status?: 'active' | 'inactive' | 'all';
    courseId?: number;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params?.courseId) queryParams.append('courseId', params.courseId.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/teacher/students?${queryParams.toString()}`);
    return response.data;
  },

  // Get student details with progress
  getStudentDetails: async (studentId: number) => {
    const response = await apiClient.get(`/teacher/students/${studentId}`);
    return response.data;
  },
};


