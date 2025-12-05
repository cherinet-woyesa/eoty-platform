import { apiClient } from './apiClient';

export const createAuditLog = async (data: any) => {
  const response = await apiClient.post('/admin/audit-logs', data);
  return response.data;
};

export const getUserActivity = async (userId: string | number) => {
  const response = await apiClient.get(`/admin/users/${userId}/activity`);
  return response.data;
};

export const getAuditLogs = async () => {
  const response = await apiClient.get('/admin/audit-logs');
  return response.data;
};

export const getSecurityAlerts = async () => {
  const response = await apiClient.get('/admin/security-alerts');
  return response.data;
};
