import api from './index';
import { apiClient } from './apiClient';
import type{
  ContentUpload,
  FlaggedContent,
  AdminDashboard,
  ContentTag,
  AuditLog,
  UploadQueueResponse,
  FlaggedContentResponse,
  CreateUploadRequest,
  ReviewFlagRequest,
  AIModerationItem,
  AIModerationStats,
  RecentActivity
} from '@/types/admin';

// Define the quota type
export interface ContentQuota {
  id: number;
  chapter_id: string;
  content_type: string;
  monthly_limit: number;
  current_usage: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
}

export const adminApi = {
  // Create a new user with specific role
  createUser: async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    chapter: string;
    role: string;
  }) => {
    const response = await apiClient.post('/admin/users', userData);
    return response.data;
  },

  // Get all users (filtered by chapter for chapter admins)
  getUsers: async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  // Update user (comprehensive update)
  updateUser: async (userData: {
    userId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    chapter?: string | number;
    isActive?: boolean;
  }) => {
    const response = await apiClient.put('/admin/users', userData);
    return response.data;
  },

  // Update user role
  updateUserRole: async (userId: string, newRole: string) => {
    const response = await apiClient.put('/admin/users/role', { userId, newRole });
    return response.data;
  },

  // Update user status (activate/deactivate)
  updateUserStatus: async (userId: string, isActive: boolean) => {
    const response = await apiClient.put('/admin/users/status', { userId, isActive });
    return response.data;
  },

  // Upload Management
  getUploadQueue: async (status?: string, chapter?: string, page: number = 1, limit: number = 20): Promise<UploadQueueResponse> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (chapter) params.append('chapter', chapter);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get(`/admin/uploads?${params}`);
    return response.data;
  },

  uploadContent: async (uploadData: CreateUploadRequest): Promise<{ success: boolean; data: { upload: ContentUpload } }> => {
    const formData = new FormData();
    formData.append('title', uploadData.title);
    formData.append('chapterId', uploadData.chapterId);
    formData.append('file', uploadData.file);
    
    if (uploadData.description) formData.append('description', uploadData.description);
    if (uploadData.category) formData.append('category', uploadData.category);
    // Ensure tags is always a JSON string of an array
    if (uploadData.tags && uploadData.tags.length > 0) {
      formData.append('tags', JSON.stringify(Array.isArray(uploadData.tags) ? uploadData.tags : [uploadData.tags]));
    } else {
      formData.append('tags', JSON.stringify([]));
    }

    const response = await apiClient.post('/admin/uploads', formData);
    return response.data;
  },

  // Chunked upload functions for large files
  initializeChunkedUpload: async (fileName: string, fileSize: number, chunkSize: number): Promise<{ uploadId: string; chunks: number }> => {
    const response = await apiClient.post('/admin/uploads/chunked/init', {
      fileName,
      fileSize,
      chunkSize
    });
    return response.data;
  },

  uploadChunk: async (uploadId: string, chunkIndex: number, chunk: Blob): Promise<{ success: boolean }> => {
    const formData = new FormData();
    formData.append('chunk', chunk);
    
    const response = await apiClient.post(`/admin/uploads/chunked/${uploadId}/chunk/${chunkIndex}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  finalizeChunkedUpload: async (uploadId: string, uploadData: Omit<CreateUploadRequest, 'file'>): Promise<{ success: boolean; data: { upload: ContentUpload } }> => {
    const response = await apiClient.post(`/admin/uploads/chunked/${uploadId}/finalize`, uploadData);
    return response.data;
  },

  approveContent: async (uploadId: number, action: 'approve' | 'reject', rejectionReason?: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/admin/uploads/${uploadId}/review`, {
      action,
      rejectionReason
    });
    return response.data;
  },

  deleteContent: async (uploadId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/admin/uploads/${uploadId}`);
    return response.data;
  },

  // Moderation Tools
  getFlaggedContent: async (status?: string, page: number = 1, limit: number = 20): Promise<FlaggedContentResponse> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get(`/admin/moderation/flagged?${params}`);
    return response.data;
  },

  reviewFlaggedContent: async (flagId: number, reviewData: ReviewFlagRequest): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/admin/moderation/flagged/${flagId}/review`, reviewData);
    return response.data;
  },

  // Analytics Dashboard
  getAnalytics: async (timeframe: string = '7days', compare: boolean = false): Promise<{ success: boolean; data: AdminDashboard }> => {
    const response = await apiClient.get(`/admin/analytics?timeframe=${timeframe}&compare=${compare}`);
    return response.data;
  },

  // Content Tagging
  getTags: async (category?: string): Promise<{ success: boolean; data: { tags: ContentTag[] } }> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);

    const response = await apiClient.get(`/admin/tags?${params}`);
    return response.data;
  },

  reorderTags: async (items: { id: number; display_order: number }[]): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/system-config/tags/reorder', { items });
    return response.data;
  },

  createTag: async (tagData: { name: string; category?: string; color?: string }): Promise<{ success: boolean; data: { tag: ContentTag } }> => {
    const response = await apiClient.post('/admin/tags', tagData);
    return response.data;
  },

  tagContent: async (contentType: string, contentId: number, tagId: number): Promise<{ success: boolean; data: { relation: any } }> => {
    const response = await apiClient.post('/admin/tags/content', {
      contentType,
      contentId,
      tagId
    });
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (adminId?: number, actionType?: string, startDate?: string, endDate?: string, page: number = 1, limit: number = 50): Promise<{ success: boolean; data: { logs: AuditLog[] } }> => {
    const params = new URLSearchParams();
    if (adminId) params.append('adminId', adminId.toString());
    if (actionType) params.append('actionType', actionType);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get(`/admin/audit?${params}`);
    return response.data;
  },

  // Data Export
  exportData: async (type: string, format: string = 'json', startDate?: string, endDate?: string): Promise<any> => {
    const params = new URLSearchParams();
    params.append('type', type);
    params.append('format', format);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(`/admin/export?${params}`);
    return response.data;
  },

  // AI Moderation Tools
  getPendingAIModeration: async (page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get(`/admin/moderation/ai/pending?${params}`);
    return response.data;
  },

  reviewAIModeration: async (itemId: number, reviewData: { action: string; notes?: string }) => {
    const response = await apiClient.post(`/admin/moderation/ai/${itemId}/review`, reviewData);
    return response.data;
  },

  getModerationStats: async () => {
    const response = await apiClient.get('/admin/moderation/ai/stats');
    return response.data;
  },

  // AI labeling candidates (recent AI assistant responses) for manual labeling
  getAILabelingCandidates: async (page: number = 1, limit: number = 50, days: number = 14, language?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('days', days.toString());
    if (language) params.append('language', language);

    const response = await apiClient.get(`/admin/ai/labeling-candidates?${params}`);
    return response.data;
  },

  // Quota Management
  getQuotas: async (chapterId?: string): Promise<{ success: boolean; data: { quotas: ContentQuota[] } }> => {
    const params = new URLSearchParams();
    if (chapterId) params.append('chapterId', chapterId);

    const response = await apiClient.get(`/admin/quotas?${params}`);
    return response.data;
  },

  updateQuota: async (quotaId: number, monthlyLimit: number): Promise<{ success: boolean; data: { quota: ContentQuota } }> => {
    const response = await apiClient.put(`/admin/quotas/${quotaId}`, { monthlyLimit });
    return response.data;
  },

  resetQuota: async (quotaId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/admin/quotas/${quotaId}/reset`);
    return response.data;
  },

  // Teacher Applications
  getTeacherApplications: async (status?: 'pending' | 'approved' | 'rejected') => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const response = await apiClient.get(`/admin/teacher-applications?${params}`);
    return response.data;
  },

  getTeacherApplication: async (applicationId: number) => {
    const response = await apiClient.get(`/admin/teacher-applications/${applicationId}`);
    return response.data;
  },

  approveTeacherApplication: async (applicationId: number, adminNotes?: string) => {
    const response = await apiClient.post(`/admin/teacher-applications/${applicationId}/approve`, {
      adminNotes
    });
    return response.data;
  },

  rejectTeacherApplication: async (applicationId: number, adminNotes?: string) => {
    const response = await apiClient.post(`/admin/teacher-applications/${applicationId}/reject`, {
      adminNotes
    });
    return response.data;
  },

  // FR5: Upload Management Enhancements
  getUploadPreview: async (uploadId: number): Promise<{ success: boolean; data: { preview: any } }> => {
    const response = await apiClient.get(`/admin/uploads/${uploadId}/preview`);
    return response.data;
  },

  retryUpload: async (uploadId: number): Promise<{ success: boolean; message: string; data: { upload: ContentUpload } }> => {
    const response = await apiClient.post(`/admin/uploads/${uploadId}/retry`);
    return response.data;
  },

  // FR5: Moderation Tools Enhancements
  banUser: async (userId: number, reason: string, duration?: number): Promise<{ success: boolean; message: string; data: { ban: any } }> => {
    const response = await apiClient.post(`/admin/users/${userId}/ban`, { reason, duration });
    return response.data;
  },

  unbanUser: async (userId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/admin/users/${userId}/unban`);
    return response.data;
  },

  banPost: async (postId: number, reason: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/admin/posts/${postId}/ban`, { reason });
    return response.data;
  },

  unbanPost: async (postId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/admin/posts/${postId}/unban`);
    return response.data;
  },

  editContent: async (contentType: string, contentId: number, updates: any): Promise<{ success: boolean; message: string; data: { content: any } }> => {
    const response = await apiClient.put(`/admin/content/${contentType}/${contentId}/edit`, updates);
    return response.data;
  },

  // FR5: Analytics Enhancements
  getRetentionMetrics: async (timeframe: string = '30days'): Promise<{ success: boolean; data: { metrics: any } }> => {
    const response = await apiClient.get(`/admin/analytics/retention?timeframe=${timeframe}`);
    return response.data;
  },

  verifyDashboardAccuracy: async (snapshotId: number): Promise<{ success: boolean; data: { accuracy: number; meetsRequirement: boolean } }> => {
    const response = await apiClient.post(`/admin/analytics/snapshots/${snapshotId}/verify`);
    return response.data;
  },

  exportUsageData: async (startDate: string, endDate: string): Promise<{ success: boolean; data: { export: any } }> => {
    const response = await apiClient.get(`/admin/analytics/export?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  // Roles & Permissions Management
  getPermissions: async (): Promise<{ success: boolean; data: { permissions: any[] } }> => {
    const response = await apiClient.get('/admin/permissions');
    return response.data;
  },

  getRolePermissions: async (): Promise<{ success: boolean; data: any[] }> => {
    const response = await apiClient.get('/admin/role-permissions');
    return response.data;
  },

  addRolePermission: async (role: string, permissionId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/admin/role-permissions', { role, permissionId });
    return response.data;
  },

  removeRolePermission: async (role: string, permissionId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete('/admin/role-permissions', { data: { role, permissionId } });
    return response.data;
  },

  // FR5: Audit & Anomaly Detection
  getAnomalies: async (severity?: string, limit: number = 50): Promise<{ success: boolean; data: { anomalies: any[] } }> => {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    params.append('limit', limit.toString());
    const response = await apiClient.get(`/admin/anomalies?${params}`);
    return response.data;
  },

  // Landing Page Content Management
  updateLandingContent: async (section: string, content: any) => {
    const response = await apiClient.put('/landing/content', { section, content });
    return response.data;
  },

  uploadLandingVideo: async (formData: FormData) => {
    const response = await apiClient.post('/landing/upload-video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for large video uploads
    });
    return response.data;
  },

  getLandingContent: async () => {
    const response = await apiClient.get('/landing/content');
    return response.data;
  },

  // Featured Courses Management
  updateFeaturedCourses: async (courseIds: number[]) => {
    const response = await apiClient.put('/admin/courses/featured', { courseIds });
    return response.data;
  }
};