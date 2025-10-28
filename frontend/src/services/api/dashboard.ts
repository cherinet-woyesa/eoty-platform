import { apiClient } from './apiClient';

export interface CourseStats {
  id: number;
  title: string;
  description: string;
  lesson_count: number;
  student_count: number;
  total_duration: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalCourses: number;
  totalStudents: number;
  totalLessons: number;
  totalHours: number;
  averageRating: number;
  completionRate: number;
}

export interface RecentActivity {
  id: string;
  type: 'course_created' | 'lesson_uploaded' | 'student_enrolled' | 'course_completed';
  title: string;
  description: string;
  timestamp: string;
  courseId?: number;
  studentName?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export const dashboardApi = {
  // Get teacher dashboard statistics
  getTeacherStats: async (): Promise<{ success: boolean; data: DashboardStats }> => {
    const response = await apiClient.get('/courses');
    const courses = response.data.data.courses;
    
    // Calculate statistics from courses data
    const stats: DashboardStats = {
      totalCourses: courses.length,
      totalStudents: courses.reduce((sum: number, course: CourseStats) => sum + course.student_count, 0),
      totalLessons: courses.reduce((sum: number, course: CourseStats) => sum + course.lesson_count, 0),
      totalHours: Math.round(courses.reduce((sum: number, course: CourseStats) => sum + (course.total_duration || 0), 0) / 60),
      averageRating: 4.8, // This would come from a separate ratings endpoint
      completionRate: 87 // This would come from progress tracking
    };
    
    return { success: true, data: stats };
  },

  // Get teacher's courses with statistics
  getTeacherCourses: async (): Promise<{ success: boolean; data: { courses: CourseStats[] } }> => {
    const response = await apiClient.get('/courses');
    return response.data;
  },

  // Get recent activity (mock for now - would need backend endpoint)
  getRecentActivity: async (): Promise<{ success: boolean; data: RecentActivity[] }> => {
    // This would be a real API call when backend endpoint is available
    const mockActivity: RecentActivity[] = [
      {
        id: '1',
        type: 'lesson_uploaded',
        title: 'New Lesson Added',
        description: 'Introduction to Orthodox Faith - Lesson 3',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        courseId: 1
      },
      {
        id: '2',
        type: 'student_enrolled',
        title: 'New Student',
        description: 'John Doe enrolled in Church History',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        courseId: 2,
        studentName: 'John Doe'
      },
      {
        id: '3',
        type: 'course_completed',
        title: 'Course Completed',
        description: 'Sarah completed Introduction to Orthodox Faith',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        courseId: 1,
        studentName: 'Sarah'
      }
    ];
    
    return { success: true, data: mockActivity };
  },

  // Get notifications (mock for now - would need backend endpoint)
  getNotifications: async (): Promise<{ success: boolean; data: Notification[] }> => {
    // This would be a real API call when backend endpoint is available
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'New Student Enrollment',
        message: 'John Doe has enrolled in your Church History course',
        type: 'info',
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        title: 'Course Review',
        message: 'Your Introduction to Orthodox Faith course received a 5-star rating',
        type: 'success',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        title: 'System Update',
        message: 'New features are now available in your dashboard',
        type: 'info',
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    return { success: true, data: mockNotifications };
  },

  // Get student progress for teacher's courses
  getStudentProgress: async (): Promise<{ success: boolean; data: any }> => {
    // This would call a real endpoint for student progress
    const mockProgress = {
      totalStudents: 247,
      activeStudents: 189,
      completedLessons: 1250,
      averageCompletionRate: 87
    };
    
    return { success: true, data: mockProgress };
  }
};

export default dashboardApi;
