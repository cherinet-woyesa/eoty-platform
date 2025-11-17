import { apiClient } from './apiClient';

export interface GetStudentsParams {
  q?: string;
  status?: 'all' | 'active' | 'invited' | 'inactive';
  sort?: 'name' | 'last_active_at' | 'progress_percent';
  order?: 'asc' | 'desc';
}

export const studentsApi = {
  // Teacher/admin: list students associated with their courses
  getStudents: async (params: GetStudentsParams = {}) => {
    const response = await apiClient.get('/students', { params });
    return response.data;
  },

  // Teacher: invite a student by email (and optional course)
  inviteStudent: async (payload: { email: string; courseId?: number | string | null }) => {
    const response = await apiClient.post('/students/invite', payload);
    return response.data;
  },

  // Student: get invitations for current user
  getInvitations: async () => {
    const response = await apiClient.get('/students/invitations');
    return response.data;
  },

  // Student: accept or decline an invitation
  respondToInvitation: async (invitationId: number | string, action: 'accept' | 'decline') => {
    const response = await apiClient.post(`/students/invitations/${invitationId}/respond`, { action });
    return response.data;
  }
};


