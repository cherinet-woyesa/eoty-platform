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

  delete: async (groupId: number) => {
    const response = await apiClient.delete(`/study-groups/${groupId}`);
    return response.data;
  },

  get: async (groupId: number) => {
    const response = await apiClient.get(`/study-groups/${groupId}`);
    return response.data;
  },

  listMessages: async (groupId: number) => {
    const response = await apiClient.get(`/study-groups/${groupId}/messages`);
    return response.data;
  },

  postMessage: async (groupId: number, content: string, parentMessageId?: number | string) => {
    const response = await apiClient.post(`/study-groups/${groupId}/messages`, { content, parent_message_id: parentMessageId });
    return response.data;
  },

  deleteMessage: async (groupId: number, messageId: number) => {
    const response = await apiClient.delete(`/study-groups/${groupId}/messages/${messageId}`);
    return response.data;
  },

  editMessage: async (groupId: number, messageId: number, content: string) => {
    const response = await apiClient.put(`/study-groups/${groupId}/messages/${messageId}`, { content });
    return response.data;
  },

  toggleMessageLike: async (groupId: number, messageId: number) => {
    const response = await apiClient.post(`/study-groups/${groupId}/messages/${messageId}/like`);
    return response.data;
  },

  reportMessage: async (groupId: number, messageId: number, reason?: string) => {
    const response = await apiClient.post(`/study-groups/${groupId}/messages/${messageId}/report`, { reason });
    return response.data;
  },

  listAssignments: async (groupId: number) => {
    const response = await apiClient.get(`/study-groups/${groupId}/assignments`);
    return response.data;
  },

  createAssignment: async (groupId: number, payload: { title: string; description?: string; due_date?: string; total_points?: number }) => {
    const response = await apiClient.post(`/study-groups/${groupId}/assignments`, payload);
    return response.data;
  },

  listSubmissions: async (assignmentId: number) => {
    const response = await apiClient.get(`/study-groups/assignments/${assignmentId}/submissions`);
    return response.data;
  },

  submitAssignment: async (assignmentId: number, payload: { content?: string; file_url?: string }) => {
    const response = await apiClient.post(`/study-groups/assignments/${assignmentId}/submissions`, payload);
    return response.data;
  },

  gradeSubmission: async (assignmentId: number, submissionId: number, payload: { grade?: number; feedback?: string }) => {
    const response = await apiClient.post(`/study-groups/assignments/${assignmentId}/submissions/${submissionId}/grade`, payload);
    return response.data;
  }
};

export default studyGroupsApi;
