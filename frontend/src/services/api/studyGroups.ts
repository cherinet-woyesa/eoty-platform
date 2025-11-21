import { apiClient } from './index';

export const studyGroupsApi = {
  list: async () => {
    const response = await apiClient.get('/study-groups');
    return response.data;
  },

  create: async (payload: { name: string; description?: string; is_public?: boolean; max_members?: number }) => {
    const response = await apiClient.post('/study-groups', payload);
    return response.data;
  },

  join: async (groupId: number) => {
    const response = await apiClient.post('/study-groups/join', { group_id: groupId });
    return response.data;
  },

  leave: async (groupId: number) => {
    const response = await apiClient.post('/study-groups/leave', { group_id: groupId });
    return response.data;
  },

  get: async (groupId: number) => {
    const response = await apiClient.get(`/study-groups/${groupId}`);
    return response.data;
  }
};

export default studyGroupsApi;
