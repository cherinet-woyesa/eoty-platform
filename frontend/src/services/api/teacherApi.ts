import api from './apiClient';
import type { ApiResponse } from '@/types/api';

export interface TeacherProfile {
  id: string;
  userId: string;
  bio?: string;
  phone?: string;
  location?: string;
  profilePicture?: string;
  profile_picture?: string;
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
    mobile_provider?: string;
    address?: string;
    dob?: string;
    tax_id?: string;
  };
  tax_status?: string;
  website_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  subjects?: string[];
  availability?: Record<string, string[]>;
  stats?: {
    total_students?: number;
    total_earnings?: number;
    rating?: number;
    reviews_count?: number;
  };
}

interface DocumentUploadResponse {
  profilePicture?: string;
  documentUrl?: string;
}

export interface TeacherStats {
  overview: {
    totalStudents: number;
    enrollmentGrowth: number;
    recentEnrollments: number;
    completionGrowth: number;
    averageCompletionRate: number;
    totalEnrollments: number;
    averageRating: number;
    totalRatings: number;
  };
  engagement: {
    activeStudents: number;
    weeklyEngagement: number;
    totalWatchTime: number;
    averageLessonCompletion: number;
    completedLessons: number;
  };
  earnings: {
    totalEarnings: number;
    monthlyEarnings: number;
    pendingPayments: number;
  };
  trends: {
    topCourses: Array<{
      id: string;
      title: string;
      studentCount: number;
      avgCompletion: number;
      avgRating: number;
    }>;
    monthlyActivity: Array<{
      month: string;
      enrollments: number;
      completions: number;
    }>;
  };
  recentActivity: Array<{
    type: 'enrollment' | 'completion';
    description: string;
    courseTitle: string;
    date: string;
  }>;
}

const teacherApi = {
  getProfile: (): Promise<ApiResponse<{
    teacherProfile: TeacherProfile
  }>> => {
    return api.get('/teacher/profile');
  },

  getDocuments: (): Promise<ApiResponse<{ documents: any[] }>> => {
    return api.get('/teacher/documents');
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

  getTeacherStats: (): Promise<ApiResponse<TeacherStats>> => {
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
