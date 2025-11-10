import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, BookOpen, Users, Plus,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import TeacherMetrics from './TeacherMetrics';
import { useRealTimeData } from '../../../hooks/useRealTimeData';
import { useWebSocket } from '../../../hooks/useWebSocket';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorBoundary from '../../common/ErrorBoundary';

// Types
interface TeacherStats {
  totalCourses: number;
  totalStudentsEnrolled: number;
  totalLessons: number;
  averageCompletionRate: number;
  courses: any[];
  recentActivity: any[];
  studentPerformance: any[];
  upcomingTasks: any[];
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Only fetch data if user is authenticated and has teacher role
  const shouldFetchData = useMemo(() => {
    return !!user && user.role === 'teacher';
  }, [user]);

  // Real-time teacher data with optimized caching
  const initialTeacherData = useMemo((): TeacherStats => ({
    totalCourses: 0,
    totalStudentsEnrolled: 0,
    totalLessons: 0,
    averageCompletionRate: 0,
    courses: [],
    recentActivity: [],
    studentPerformance: [],
    upcomingTasks: []
  }), []);

  const { 
    data: teacherData, 
    error, 
    isLoading, 
    refetch
  } = useRealTimeData('/teacher/dashboard', { 
    initialData: initialTeacherData,
    enabled: shouldFetchData,
    refetchInterval: 60000,
    staleTime: 30000,
    cacheKey: 'teacher_dashboard'
  });

  // WebSocket for live student activity and notifications with connection optimization
  const { lastMessage, isConnected } = useWebSocket('/teacher/updates', {
    reconnectAttempts: 3,
    reconnectInterval: 5000,
    heartbeatInterval: 60000
  });

  // Transform backend data to match TeacherStats interface
  const transformedTeacherData = useMemo(() => {
    if (!teacherData) return initialTeacherData;
    
    // If the data already matches our expected structure, use it as-is
    if (teacherData && typeof teacherData === 'object' && 'totalCourses' in teacherData) {
      return teacherData as TeacherStats;
    }
    
    // Transform backend response to match TeacherStats interface
    return {
      totalCourses: (teacherData as any).totalCourses || 0,
      totalStudentsEnrolled: (teacherData as any).totalStudentsEnrolled || 0,
      totalLessons: (teacherData as any).totalLessons || 0,
      averageCompletionRate: (teacherData as any).averageCompletionRate || 0,
      courses: [],
      recentActivity: [],
      studentPerformance: [],
      upcomingTasks: []
    } as TeacherStats;
  }, [teacherData, initialTeacherData]);

  // Update time every minute and track last update
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      if (isLoading) {
        setLastUpdate(now);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [isLoading]);

  // Handle real-time updates with debouncing
  useEffect(() => {
    if (lastMessage) {
      try {
        const update = JSON.parse(lastMessage.data);
        console.log('Real-time teacher update:', update);
        
        // Handle different types of updates
        switch (update.type) {
          case 'new_enrollment':
            // Update student count immediately and debounce data refresh
            const refreshTimer1 = setTimeout(() => {
              refetch();
            }, 2000);
            return () => clearTimeout(refreshTimer1);
            
          case 'course_completed':
            refetch();
            break;
            
          case 'new_submission':
            refetch();
            break;
            
          case 'course_created':
            // Update course count immediately
            refetch();
            break;
            
          case 'lesson_created':
            // Update lesson count immediately
            refetch();
            break;
            
          case 'student_count_updated':
            // Directly update student count from WebSocket message
            if (update.data && update.data.count !== undefined) {
              // We would need to update the local state here, but since we're using
              // the useRealTimeData hook, we'll just refetch to get the updated count
              refetch();
            }
            break;
            
          case 'course_count_updated':
            // Directly update course count from WebSocket message
            if (update.data && update.data.count !== undefined) {
              refetch();
            }
            break;
            
          case 'lesson_count_updated':
            // Directly update lesson count from WebSocket message
            if (update.data && update.data.count !== undefined) {
              refetch();
            }
            break;
            
          default:
            console.log('Unhandled update type:', update.type);
        }
      } catch (parseError) {
        console.error('Failed to parse WebSocket message:', parseError);
      }
    }
  }, [lastMessage, refetch]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }, []);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (!user || user.role !== 'teacher') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600 mb-4">
            You must be logged in as a teacher to view this dashboard.
          </p>
          <Link 
            to="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading && !transformedTeacherData) {
    return (
      <div className="w-full space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </div>
    );
  }

  if (error && !transformedTeacherData) {
    return (
      <div className="w-full space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unable to Load Dashboard
            </h3>
            <p className="text-gray-600 mb-4">
              {error || 'We encountered an error while loading your dashboard data.'}
            </p>
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full space-y-6 p-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold">
                  Welcome back, {user?.firstName}!
                </h1>
                {isConnected && (
                  <div className="flex items-center space-x-2 text-blue-100">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Live</span>
                  </div>
                )}
              </div>
              <p className="text-blue-100">
                {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
              <p className="text-blue-200 text-sm mt-1">
                {transformedTeacherData?.totalStudentsEnrolled || 0} students enrolled in {transformedTeacherData?.totalCourses || 0} courses
              </p>
            </div>
            <div className="mt-4 lg:mt-0 lg:ml-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  to="/record"
                  className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Record New Video
                </Link>
                <Link
                  to="/courses/new"
                  className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Simplified Teacher Metrics */}
        <TeacherMetrics stats={transformedTeacherData} />

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/teacher/courses"
              className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <BookOpen className="h-8 w-8 text-blue-600 mb-2" />
              <span className="font-medium text-blue-900">Manage Courses</span>
            </Link>
            <Link
              to="/students"
              className="flex flex-col items-center justify-center p-6 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
            >
              <Users className="h-8 w-8 text-green-600 mb-2" />
              <span className="font-medium text-green-900">View Students</span>
            </Link>
            <button
              onClick={handleRetry}
              className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            >
              <RefreshCw className="h-8 w-8 text-gray-600 mb-2" />
              <span className="font-medium text-gray-900">Refresh Data</span>
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(TeacherDashboard);