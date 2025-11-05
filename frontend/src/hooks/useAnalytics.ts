import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { coursesApi } from '../services/api';

interface EngagementAnalyticsParams {
  startDate?: string;
  endDate?: string;
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

interface EnrolledStudentsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Hook to fetch engagement analytics for a course
 */
export const useEngagementAnalytics = (
  courseId: string,
  params?: EngagementAnalyticsParams,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['analytics', 'engagement', courseId, params],
    queryFn: async () => {
      const response = await coursesApi.getEngagementAnalytics(courseId, params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    ...options,
  });
};

/**
 * Hook to fetch enrolled students for a course
 */
export const useEnrolledStudents = (
  courseId: string,
  params?: EnrolledStudentsParams,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['analytics', 'students', courseId, params],
    queryFn: async () => {
      const response = await coursesApi.getEnrolledStudents(courseId, params);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
    ...options,
  });
};

/**
 * Hook to fetch individual student progress
 */
export const useStudentProgress = (
  courseId: string,
  studentId: string,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['analytics', 'student-progress', courseId, studentId],
    queryFn: async () => {
      const response = await coursesApi.getStudentProgress(courseId, studentId);
      return response.data;
    },
    enabled: !!courseId && !!studentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
    ...options,
  });
};

/**
 * Hook to export analytics data
 */
export const useExportAnalytics = () => {
  const exportAnalytics = async (
    courseId: string,
    format: 'csv' | 'json' = 'csv',
    reportType: 'summary' | 'students' = 'summary'
  ) => {
    try {
      const response = await coursesApi.exportAnalytics(courseId, { format, reportType });
      
      if (format === 'csv') {
        // Create a blob and download
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `course-${courseId}-${reportType}-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Return JSON data for further processing
        return response.data;
      }
    } catch (error) {
      console.error('Export analytics error:', error);
      throw error;
    }
  };

  return { exportAnalytics };
};
