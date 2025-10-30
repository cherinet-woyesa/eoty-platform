import { apiClient } from './apiClient';

export interface GetStudentsParams {
  q?: string;
  status?: 'all' | 'active' | 'invited' | 'inactive';
  sort?: 'name' | 'last_active_at' | 'progress_percent';
  order?: 'asc' | 'desc';
}

export const studentsApi = {
  getStudents: async (params: GetStudentsParams = {}) => {
    const response = await apiClient.get('/students', { params });
    return response.data;
  }
};


