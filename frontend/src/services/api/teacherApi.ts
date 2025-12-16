import api from './apiClient';
import { ApiResponse } from './types';

export interface TeacherProfile {
  id: string;
  userId: string;
  bio?: string;
  phone?: string;
  location?: string;
  profilePicture?: string;
  specialties?: string[];
  teachingExperience?: number;
  education?: string;
  onboarding_status?: any;
  verification_docs?: Record<string, string>;
  payout_method?: string;
  payout_region?: string;
  payout_details?: {
    account_holder?: string;
    account_number?: string;
    routing_number?: string;
    address?: string;
    dob?: string;
    tax_id?: string;
  };
  tax_status?: string;
}

interface DocumentUploadResponse {
  profilePicture?: string;
  documentUrl?: string;
}

const teacherApi = {
  getProfile: (): Promise<ApiResponse<{
    teacherProfile: TeacherProfile
  }>> => {
    return api.get('/teacher/profile');
  },

  updateProfile: (data: Partial<TeacherProfile>): Promise<ApiResponse<{
    teacherProfile: TeacherProfile
  }>> => {
    return api.put('/teacher/profile', data);
  },

  uploadDocument: (file: File, documentType: string): Promise<ApiResponse<DocumentUploadResponse>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return api.post('/teacher/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getTeacherStats: (): Promise<ApiResponse<any>> => {
    return api.get('/teacher/analytics/stats');
  },

  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<ApiResponse<any>> => {
    return api.put('/auth/change-password', data);
  },

  deleteAccount: (): Promise<ApiResponse<any>> => {
    return api.delete('/auth/delete-account');
  },

  getNotificationPreferences: (): Promise<ApiResponse<any>> => {
    return api.get('/auth/notification-preferences');
  },

  updateNotificationPreferences: (preferences: any): Promise<ApiResponse<any>> => {
    return api.put('/auth/notification-preferences', preferences);
  },
};

export default teacherApi;
