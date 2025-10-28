import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, BookOpen, Clock, Award, 
  Target, BarChart3, Calendar, Star,
  PlayCircle, CheckCircle, Zap, Trophy,
  Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import { progressApi, CourseProgress, UserProgressStats } from '../../services/api/progress';

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

      // For now, use mock data since the backend endpoints might not be fully implemented
      const mockStats = {
        total_courses_enrolled: 3,
        total_lessons_completed: 12,
        total_video_watch_time: 180, // 3 hours
        total_quiz_attempts: 8,
        average_quiz_score: 85,
        study_streak: 7,
        total_points_earned: 1250,
        level: 3,
        next_level_points: 1500
      };

      const mockCourses = [
        {
          course_id: 1,
          course_title: 'Introduction to Orthodox Faith',
          total_lessons: 8,
          completed_lessons: 5,
          overall_progress: 62.5,
          last_accessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          lessons: []
        },
        {
          course_id: 2,
          course_title: 'Church History',
          total_lessons: 12,
          completed_lessons: 7,
          overall_progress: 58.3,
          last_accessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          lessons: []
        }
      ];

      setStats(mockStats);
      setCourses(mockCourses);

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
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-xl">Loading progress...</p>
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
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={loadProgressData}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Your Learning Progress</h1>
        <p className="text-blue-100">
          Track your learning journey and celebrate your achievements
        </p>
      </div>

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
            <div key={index} className={`bg-gradient-to-br ${stat.bgColor} rounded-xl p-4 sm:p-5 border border-white/50 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} shadow-sm`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
                <p className="text-sm text-gray-600 font-medium">{stat.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Level Progress */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
              Level Progress
            </h2>
            <span className="text-sm text-gray-600">
              Level {stats.level}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Points Earned</span>
              <span className="font-semibold text-gray-900">
                {stats.total_points_earned} / {stats.next_level_points}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((stats.total_points_earned / stats.next_level_points) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 text-center">
              {stats.next_level_points - stats.total_points_earned} points to next level
            </div>
          </div>
        </div>
      )}

      {/* Course Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Course Progress
          </h2>
          <span className="text-sm text-gray-600">
            {courses.length} courses
          </span>
        </div>

        <div className="space-y-4">
          {courses.length > 0 ? (
            courses.map((course) => (
              <div key={course.course_id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{course.course_title}</h3>
                  <span className={`text-sm font-medium ${getProgressColor(course.overall_progress)}`}>
                    {Math.round(course.overall_progress)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(course.overall_progress)}`}
                    style={{ width: `${course.overall_progress}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {course.completed_lessons} of {course.total_lessons} lessons completed
                  </span>
                  <span>
                    Last accessed: {new Date(course.last_accessed).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No courses enrolled yet</p>
              <p className="text-sm">Start your learning journey by enrolling in a course!</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-green-600" />
          Recent Activity
        </h2>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Completed lesson</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <PlayCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Watched video</p>
              <p className="text-xs text-gray-500">1 day ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Award className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Earned points</p>
              <p className="text-xs text-gray-500">2 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;
