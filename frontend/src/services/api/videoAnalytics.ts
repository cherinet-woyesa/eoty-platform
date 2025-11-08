/**
 * Video Analytics API Service
 * Handles video analytics data (Mux + Platform combined)
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface VideoAnalyticsSummary {
  totalViews: number;
  uniqueViewers: number;
  totalWatchTime: number;
  averageWatchTime: number;
  averageCompletionRate: number;
  completionRate?: number;
  completedViews?: number;
  totalRebuffers?: number;
  averageRebufferDuration?: number;
}

export interface DeviceBreakdown {
  type: string;
  count: number;
}

export interface GeographyBreakdown {
  country: string;
  count: number;
}

export interface AnalyticsBreakdown {
  devices: DeviceBreakdown[];
  geography: GeographyBreakdown[];
}

export interface DailyTrend {
  date: string;
  views: number;
  uniqueViewers: number;
  watchTime: number;
}

export interface LessonAnalytics {
  lessonId: number;
  lessonTitle: string;
  videoProvider: 'mux' | 's3';
  source: 'mux' | 'platform' | 'none';
  summary: VideoAnalyticsSummary;
  breakdown: AnalyticsBreakdown;
  trend: DailyTrend[];
  lastSynced: string;
}

export interface CourseAnalytics {
  courseId: number;
  totalLessons: number;
  summary: VideoAnalyticsSummary & {
    engagementRate: number;
  };
  lessonAnalytics: (LessonAnalytics & { lessonOrder: number })[];
  lastSynced: string;
}

export interface TopPerformingLesson {
  lessonId: number;
  lessonTitle: string;
  courseTitle: string;
  views: number;
  completionRate: number;
  watchTime: number;
}

export interface RecentActivity {
  date: string;
  views: number;
  uniqueViewers: number;
  watchTime: number;
}

export interface TeacherDashboardAnalytics {
  teacherId: string;
  totalCourses: number;
  totalLessons: number;
  summary: VideoAnalyticsSummary;
  topPerformingLessons: TopPerformingLesson[];
  recentActivity: RecentActivity[];
  lastSynced: string;
}

export const videoAnalyticsApi = {
  /**
   * Get analytics for a specific lesson
   */
  getLessonAnalytics: async (
    lessonId: number,
    options?: {
      timeframe?: string;
      forceRefresh?: boolean;
    }
  ): Promise<LessonAnalytics> => {
    const params = new URLSearchParams();
    if (options?.timeframe) params.append('timeframe', options.timeframe);
    if (options?.forceRefresh) params.append('forceRefresh', 'true');

    const response = await axios.get(
      `${API_BASE_URL}/video-analytics/lessons/${lessonId}?${params.toString()}`,
      { withCredentials: true }
    );
    return response.data.data;
  },

  /**
   * Get analytics for a course (all lessons aggregated)
   */
  getCourseAnalytics: async (
    courseId: number,
    options?: {
      timeframe?: string;
    }
  ): Promise<CourseAnalytics> => {
    const params = new URLSearchParams();
    if (options?.timeframe) params.append('timeframe', options.timeframe);

    const response = await axios.get(
      `${API_BASE_URL}/video-analytics/courses/${courseId}?${params.toString()}`,
      { withCredentials: true }
    );
    return response.data.data;
  },

  /**
   * Get teacher dashboard analytics (all courses)
   */
  getTeacherDashboardAnalytics: async (options?: {
    timeframe?: string;
    limit?: number;
  }): Promise<TeacherDashboardAnalytics> => {
    const params = new URLSearchParams();
    if (options?.timeframe) params.append('timeframe', options.timeframe);
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await axios.get(
      `${API_BASE_URL}/video-analytics/teacher/dashboard?${params.toString()}`,
      { withCredentials: true }
    );
    return response.data.data;
  },

  /**
   * Get analytics for multiple lessons
   */
  getBulkLessonAnalytics: async (
    lessonIds: number[],
    options?: {
      timeframe?: string;
    }
  ): Promise<LessonAnalytics[]> => {
    const response = await axios.post(
      `${API_BASE_URL}/video-analytics/lessons/bulk`,
      {
        lessonIds,
        timeframe: options?.timeframe || '7:days'
      },
      { withCredentials: true }
    );
    return response.data.data;
  }
};

export default videoAnalyticsApi;
