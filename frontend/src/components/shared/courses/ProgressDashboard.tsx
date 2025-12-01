import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, BookOpen, Clock, Award, 
  Target, BarChart3, Calendar, Star,
  PlayCircle, CheckCircle, Zap, Trophy,
  Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import { progressApi, CourseProgress, UserProgressStats } from '@/services/api/progress';
import { apiClient } from '@/services/api/apiClient';

const ProgressDashboard: React.FC = () => {
  const [stats, setStats] = useState<UserProgressStats | null>(null);
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real data from student dashboard
      const response = await apiClient.get('/students/dashboard');
      
      if (!response.data.success) {
        throw new Error('Failed to load dashboard data');
      }

      const dashboardData = response.data.data;
      const progress = dashboardData.progress || {};
      const enrolledCourses = dashboardData.enrolledCourses || [];

      // Transform dashboard data to stats format
      const realStats: UserProgressStats = {
        total_courses_enrolled: progress.totalCourses || 0,
        total_lessons_completed: progress.completedLessons || 0,
        total_video_watch_time: Math.floor((progress.timeSpent || 0) / 60), // Convert to minutes
        total_quiz_attempts: 0, // Not available in current API
        average_quiz_score: progress.averageScore || 0,
        study_streak: progress.studyStreak || 0,
        total_points_earned: progress.totalPoints || 0,
        level: progress.level ? parseInt(progress.level.toString().replace(/\D/g, '')) || 1 : 1,
        next_level_points: progress.nextLevelXp || 1000
      };

      // Transform enrolled courses to progress format
      const realCourses: CourseProgress[] = enrolledCourses.map((course: any) => ({
        course_id: course.id,
        course_title: course.title,
        total_lessons: course.totalLessons || course.total_lessons || 0,
        completed_lessons: course.completedLessons || course.completed_lessons || 0,
        overall_progress: course.progress || 0,
        last_accessed: course.lastAccessed || course.last_accessed || new Date().toISOString(),
        lessons: []
      }));

      setStats(realStats);
      setCourses(realCourses);

    } catch (err) {
      console.error('Failed to load progress data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-[#27AE60]';
    if (percentage >= 75) return 'text-[#16A085]';
    if (percentage >= 50) return 'text-[#2980B9]';
    return 'text-stone-600';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-[#27AE60]';
    if (percentage >= 75) return 'bg-[#16A085]';
    if (percentage >= 50) return 'bg-[#2980B9]';
    return 'bg-stone-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#27AE60] animate-spin mx-auto mb-4" />
          <p className="text-stone-600 text-xl">Loading progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-200">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-3">Error Loading Progress</h2>
          <p className="text-stone-700 mb-6">{error}</p>
          <button
            onClick={loadProgressData}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors duration-200"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { 
              name: 'Courses Enrolled', 
              value: stats.total_courses_enrolled.toString(), 
              icon: BookOpen, 
              color: 'from-blue-500 to-blue-600',
              bgColor: 'from-blue-50 to-blue-100'
            },
            { 
              name: 'Lessons Completed', 
              value: stats.total_lessons_completed.toString(), 
              icon: CheckCircle, 
              color: 'from-green-500 to-green-600',
              bgColor: 'from-green-50 to-green-100'
            },
            { 
              name: 'Watch Time', 
              value: formatTime(stats.total_video_watch_time), 
              icon: Clock, 
              color: 'from-purple-500 to-purple-600',
              bgColor: 'from-purple-50 to-purple-100'
            },
            { 
              name: 'Current Level', 
              value: stats.level.toString(), 
              icon: Trophy, 
              color: 'from-yellow-500 to-orange-500',
              bgColor: 'from-yellow-50 to-orange-100'
            }
            ].map((stat, index) => (
            <div key={index} className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-stone-200 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-[#27AE60] to-[#16A085] shadow-sm">
                  <stat.icon className="h-4 w-4 text-stone-900" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-stone-800 mb-0.5">{stat.value}</p>
                <p className="text-sm text-stone-600 font-medium">{stat.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Level Progress */}
      {stats && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-stone-200 p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-800 flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-[#FFD700]" />
              Level Progress
            </h2>
            <span className="text-sm text-stone-600">
              Level {stats.level}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600">Points Earned</span>
              <span className="font-semibold text-stone-800">
                {stats.total_points_earned} / {stats.next_level_points}
              </span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-[#27AE60] to-[#16A085] h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((stats.total_points_earned / stats.next_level_points) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-stone-500 text-center">
              {Math.max(0, stats.next_level_points - stats.total_points_earned)} points to next level
            </div>
          </div>
        </div>
      )}

      {/* Course Progress */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-stone-200 p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-800 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-[#39FF14]" />
            Course Progress
          </h2>
          <span className="text-sm text-stone-600">
            {courses.length} courses
          </span>
        </div>

        <div className="space-y-4">
          {courses.length > 0 ? (
            courses.map((course) => (
              <Link
                key={course.course_id}
                to={`/student/courses/${course.course_id}`}
                className="block border border-stone-200 rounded-lg p-4 hover:border-[#27AE60] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-stone-800 hover:text-[#27AE60] transition-colors">{course.course_title}</h3>
                  <span className={`text-sm font-medium ${getProgressColor(course.overall_progress)}`}>
                    {Math.round(course.overall_progress)}%
                  </span>
                </div>
                
                <div className="w-full bg-stone-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-[#27AE60] to-[#16A085] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${course.overall_progress}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>
                    {course.completed_lessons} of {course.total_lessons} lessons completed
                  </span>
                  <span>
                    Last accessed: {new Date(course.last_accessed).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-8 text-stone-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No courses enrolled yet</p>
              <p className="text-sm">Start your learning journey by enrolling in a course!</p>
            </div>
          )}
        </div>
      </div>

      {/* Study Streak */}
      {stats && stats.study_streak > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-stone-200 p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-800 mb-2 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-[#27AE60]" />
                Study Streak
              </h2>
              <p className="text-3xl font-bold text-stone-800">{stats.study_streak} days</p>
              <p className="text-sm text-stone-600 mt-1">Keep it up! 🔥</p>
            </div>
            <div className="text-6xl">🔥</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;
