import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Clock, Award, Target, 
  TrendingUp, BarChart3, Calendar,
  PlayCircle, BookOpen, Star,
  Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import { progressApi, LessonProgress, UserProgressStats } from '../../services/api/progress';

interface ProgressTrackerProps {
  lessonId: number;
  courseId?: number;
  onProgressUpdate?: (progress: LessonProgress) => void;
  showDetailed?: boolean;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  lessonId, 
  courseId,
  onProgressUpdate,
  showDetailed = false 
}) => {
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [stats, setStats] = useState<UserProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [lessonId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      const [progressRes, statsRes] = await Promise.all([
        progressApi.getLessonProgress(lessonId),
        progressApi.getUserProgressStats()
      ]);

      setProgress(progressRes.data.progress);
      setStats(statsRes.data);
      onProgressUpdate?.(progressRes.data.progress);

    } catch (err) {
      console.error('Failed to load progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (type: 'video' | 'quiz', progressValue: number) => {
    try {
      const response = await progressApi.updateLessonProgress(lessonId, {
        type,
        progress: progressValue,
        is_completed: progressValue >= 100
      });

      setProgress(response.data.progress);
      onProgressUpdate?.(response.data.progress);

    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 text-blue-500 animate-spin mr-2" />
        <span className="text-gray-600">Loading progress...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 text-sm mb-2">{error}</p>
        <button
          onClick={loadProgress}
          className="text-blue-600 hover:text-blue-700 text-sm flex items-center mx-auto"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </button>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center p-4 text-gray-500">
        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No progress data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lesson Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Target className="h-4 w-4 mr-2 text-blue-600" />
            Lesson Progress
          </h3>
          <span className={`text-sm font-medium ${getProgressColor(progress.overall_progress)}`}>
            {Math.round(progress.overall_progress)}%
          </span>
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(progress.overall_progress)}`}
            style={{ width: `${progress.overall_progress}%` }}
          />
        </div>

        {/* Detailed Progress */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 flex items-center">
              <PlayCircle className="h-4 w-4 mr-1" />
              Video
            </span>
            <span className={`font-medium ${getProgressColor(progress.video_progress)}`}>
              {Math.round(progress.video_progress)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 flex items-center">
              <Award className="h-4 w-4 mr-1" />
              Quiz
            </span>
            <span className={`font-medium ${getProgressColor(progress.quiz_progress)}`}>
              {Math.round(progress.quiz_progress)}%
            </span>
          </div>
        </div>

        {/* Completion Status */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {progress.is_video_completed && (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Video Complete
              </div>
            )}
            {progress.is_quiz_completed && (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Quiz Complete
              </div>
            )}
          </div>
          {progress.is_lesson_completed && (
            <div className="flex items-center text-green-600 font-semibold">
              <Award className="h-4 w-4 mr-1" />
              Lesson Complete!
            </div>
          )}
        </div>
      </div>

      {/* User Stats (if detailed view) */}
      {showDetailed && stats && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2 text-blue-600" />
            Your Learning Stats
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                Courses
              </span>
              <span className="font-semibold text-blue-700">
                {stats.total_courses_enrolled}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Lessons
              </span>
              <span className="font-semibold text-blue-700">
                {stats.total_lessons_completed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Watch Time
              </span>
              <span className="font-semibold text-blue-700">
                {formatTime(stats.total_video_watch_time)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <Star className="h-4 w-4 mr-1" />
                Level
              </span>
              <span className="font-semibold text-blue-700">
                {stats.level}
              </span>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Level {stats.level} Progress</span>
              <span>{stats.total_points_earned} / {stats.next_level_points} points</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(stats.total_points_earned / stats.next_level_points) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Last Accessed */}
      <div className="text-xs text-gray-500 text-center">
        Last accessed: {new Date(progress.last_accessed_at).toLocaleDateString()}
      </div>
    </div>
  );
};

export default ProgressTracker;