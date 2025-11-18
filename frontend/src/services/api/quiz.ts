import { apiClient } from './apiClient';

// Quiz interfaces
export interface QuizQuestion {
  id: number;
  lesson_id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'true_false';
  options?: { [key: string]: string };
  correct_answer: string;
  explanation?: string;
  points: number;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizSession {
  id: number;
  user_id: number;
  lesson_id: number;
  total_questions: number;
  correct_answers: number;
  total_points: number;
  max_points: number;
  score_percentage: number;
  is_completed: boolean;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: number;
  user_id: number;
  question_id: number;
  user_answer: string;
  is_correct: boolean;
  points_earned: number;
  attempted_at: string;
  created_at: string;
  updated_at: string;
}

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

export interface CreateQuestionData {
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'true_false';
  options?: { [key: string]: string };
  correct_answer: string;
  explanation?: string;
  points?: number;
  order?: number;
}

export interface SubmitAnswerData {
  answer: string;
}

export interface QuizResults {
  correctAnswers: number;
  totalQuestions: number;
  totalPoints: number;
  maxPoints: number;
  scorePercentage: number;
}

// Quiz Trigger interfaces (FR2 - In-lesson quiz integration)
export interface QuizTrigger {
  id: number;
  lesson_id: number;
  question_id: number;
  trigger_timestamp: number; // Seconds into video
  is_required: boolean;
  pause_video: boolean;
  duration_seconds: number | null;
  display_mode: 'overlay' | 'sidebar' | 'fullscreen';
  min_score_to_proceed: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined question data
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'true_false';
  options?: { [key: string]: string };
  correct_answer: string;
  explanation?: string;
  points: number;
}

export interface CreateQuizTriggerData {
  questionId: number;
  triggerTimestamp: number;
  isRequired?: boolean;
  pauseVideo?: boolean;
  durationSeconds?: number | null;
  displayMode?: 'overlay' | 'sidebar' | 'fullscreen';
  minScoreToProceed?: number | null;
}

export interface UpdateQuizTriggerData {
  triggerTimestamp?: number;
  isRequired?: boolean;
  pauseVideo?: boolean;
  durationSeconds?: number | null;
  displayMode?: 'overlay' | 'sidebar' | 'fullscreen';
  minScoreToProceed?: number | null;
}

export const quizApi = {
  // Question Management (Teachers)
  createQuestion: async (lessonId: number, questionData: CreateQuestionData) => {
    const response = await apiClient.post(`/quizzes/lessons/${lessonId}/questions`, questionData);
    return response.data;
  },

  getLessonQuestions: async (lessonId: number) => {
    const response = await apiClient.get(`/quizzes/lessons/${lessonId}/questions`);
    return response.data;
  },

  // Quiz Taking (Students)
  submitAnswer: async (questionId: number, answerData: SubmitAnswerData) => {
    const response = await apiClient.post(`/quizzes/questions/${questionId}/answer`, answerData);
    return response.data;
  },

  startQuizSession: async (lessonId: number) => {
    const response = await apiClient.post(`/quizzes/lessons/${lessonId}/start`);
    return response.data;
  },

  completeQuizSession: async (sessionId: number) => {
    const response = await apiClient.post(`/quizzes/sessions/${sessionId}/complete`);
    return response.data;
  },

  getQuizResults: async (lessonId: number) => {
    const response = await apiClient.get(`/quizzes/lessons/${lessonId}/results`);
    return response.data;
  },

  // Progress Tracking
  getLessonProgress: async (lessonId: number) => {
    const response = await apiClient.get(`/quizzes/lessons/${lessonId}/progress`);
    return response.data;
  },

  updateVideoProgress: async (lessonId: number, progress: number) => {
    const response = await apiClient.post(`/quizzes/lessons/${lessonId}/progress`, {
      type: 'video',
      progress
    });
    return response.data;
  },

  // ============================================================================
  // Quiz Triggers (FR2 - In-lesson quiz integration)
  // ============================================================================

  // Get all quiz triggers for a lesson
  getQuizTriggers: async (lessonId: number) => {
    const response = await apiClient.get<{ success: boolean; data: { triggers: QuizTrigger[] } }>(
      `/quizzes/lessons/${lessonId}/triggers`
    );
    return response.data;
  },

  // Create a quiz trigger (teachers only)
  createQuizTrigger: async (lessonId: number, triggerData: CreateQuizTriggerData) => {
    const response = await apiClient.post(`/quizzes/lessons/${lessonId}/triggers`, triggerData);
    return response.data;
  },

  // Update a quiz trigger
  updateQuizTrigger: async (triggerId: number, triggerData: UpdateQuizTriggerData) => {
    const response = await apiClient.put(`/quizzes/triggers/${triggerId}`, triggerData);
    return response.data;
  },

  // Delete a quiz trigger
  deleteQuizTrigger: async (triggerId: number) => {
    const response = await apiClient.delete(`/quizzes/triggers/${triggerId}`);
    return response.data;
  }
};

export default quizApi;
