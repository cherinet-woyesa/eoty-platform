import { apiClient } from './apiClient';

// Progress interfaces
export interface LessonProgress {
  id: number;
  user_id: number;
  lesson_id: number;
  video_progress: number;
  quiz_progress: number;
  overall_progress: number;
  is_video_completed: boolean;
  is_quiz_completed: boolean;
  is_lesson_completed: boolean;
  last_accessed_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CourseProgress {
  course_id: number;
  course_title: string;
  total_lessons: number;
  completed_lessons: number;
  overall_progress: number;
  last_accessed: string;
  lessons: LessonProgress[];
}

export interface UserProgressStats {
  total_courses_enrolled: number;
  total_lessons_completed: number;
  total_video_watch_time: number; // in minutes
  total_quiz_attempts: number;
  average_quiz_score: number;
  study_streak: number;
  total_points_earned: number;
  level: number;
  next_level_points: number;
}

export interface UpdateProgressData {
  type: 'video' | 'quiz' | 'lesson';
  progress: number;
  timestamp?: number;
  is_completed?: boolean;
}

export const progressApi = {
  // Get lesson progress
  getLessonProgress: async (lessonId: number) => {
    const response = await apiClient.get(`/quizzes/lessons/${lessonId}/progress`);
    return response.data;
  },

  // Update lesson progress
  updateLessonProgress: async (lessonId: number, data: UpdateProgressData) => {
    const response = await apiClient.post(`/quizzes/lessons/${lessonId}/progress`, data);
    return response.data;
  },

  // Get course progress
  getCourseProgress: async (courseId: number) => {
    const response = await apiClient.get(`/progress/courses/${courseId}`);
    return response.data;
  },

  // Get user progress stats
  getUserProgressStats: async () => {
    const response = await apiClient.get('/progress/stats');
    return response.data;
  },

  // Get all user progress
  getAllUserProgress: async () => {
    const response = await apiClient.get('/progress/all');
    return response.data;
  },

  // Mark lesson as completed
  markLessonCompleted: async (lessonId: number) => {
    const response = await apiClient.post(`/progress/lessons/${lessonId}/complete`);
    return response.data;
  },

  // Get progress history
  getProgressHistory: async (limit: number = 50) => {
    const response = await apiClient.get(`/progress/history?limit=${limit}`);
    return response.data;
  }
};

export default progressApi;
