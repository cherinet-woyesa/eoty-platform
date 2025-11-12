import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, BookOpen, Users, Plus,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import TeacherMetrics from './TeacherMetrics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiClient } from '@/services/api/apiClient';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';

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
  const [teacherData, setTeacherData] = useState<TeacherStats>({
    totalCourses: 0,
    totalStudentsEnrolled: 0,
    totalLessons: 0,
    averageCompletionRate: 0,
    courses: [],
    recentActivity: [],
    studentPerformance: [],
    upcomingTasks: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data directly from API (same approach as courses page)
  const loadDashboardData = useCallback(async () => {
    if (!user || user.role !== 'teacher') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get('/teacher/dashboard');
      
      if (response.data.success) {
        const data = response.data.data;
        console.log('✅ Dashboard data loaded:', data);
        
        setTeacherData({
          totalCourses: data.totalCourses || 0,
          totalStudentsEnrolled: data.totalStudentsEnrolled || 0,
          totalLessons: data.totalLessons || 0,
          averageCompletionRate: data.averageCompletionRate || 0,
          courses: [],
          recentActivity: [],
          studentPerformance: [],
          upcomingTasks: []
        });
      } else {
        throw new Error(response.data.message || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      console.error('❌ Failed to load dashboard data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user || user.role !== 'teacher') return;
    
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, loadDashboardData]);

  // WebSocket for live dashboard updates
  const dashboardWsUrl = user?.id ? `?type=dashboard&userId=${user.id}` : '';
  const { lastMessage, isConnected } = useWebSocket(dashboardWsUrl, {
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    heartbeatInterval: 30000,
    disableReconnect: !user?.id,
    onOpen: () => {
      console.log('✅ Dashboard WebSocket connected');
    },
    onError: (error) => {
      console.error('❌ Dashboard WebSocket error:', error);
    },
    onMessage: (message) => {
      console.log('📨 Dashboard WebSocket message received:', message);
    }
  });
  
  // Log WebSocket connection status
  useEffect(() => {
    console.log('🔌 Dashboard WebSocket status:', { isConnected, url: dashboardWsUrl });
  }, [isConnected, dashboardWsUrl]);

  // Optimistic update function for real-time updates
  const optimisticUpdate = useCallback((updater: (currentData: TeacherStats) => TeacherStats) => {
    setTeacherData(prev => updater(prev));
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle real-time dashboard updates with optimistic updates
  useEffect(() => {
    if (lastMessage && lastMessage.data) {
      try {
        const update = typeof lastMessage.data === 'string' 
          ? JSON.parse(lastMessage.data) 
          : lastMessage.data;
        
        console.log('Real-time dashboard update:', update);
        
        // Handle dashboard metric updates
        if (update.type === 'metrics_update' && update.data) {
          // Optimistically update metrics immediately
          optimisticUpdate((currentData) => ({
            ...currentData,
            totalCourses: update.data.totalCourses ?? currentData.totalCourses,
            totalStudentsEnrolled: update.data.totalStudentsEnrolled ?? currentData.totalStudentsEnrolled,
            totalLessons: update.data.totalLessons ?? currentData.totalLessons,
            averageCompletionRate: update.data.averageCompletionRate ?? currentData.averageCompletionRate,
          }));
          
          // Refetch after a short delay to ensure data consistency
          setTimeout(() => loadDashboardData(), 1000);
          return;
        }
        
        // Handle specific event types with optimistic updates
        switch (update.type) {
          case 'course_created':
            optimisticUpdate((currentData) => ({
              ...currentData,
              totalCourses: (currentData.totalCourses || 0) + 1
            }));
            setTimeout(() => loadDashboardData(), 500);
            break;
            
          case 'lesson_created':
            optimisticUpdate((currentData) => ({
              ...currentData,
              totalLessons: (currentData.totalLessons || 0) + 1
            }));
            setTimeout(() => loadDashboardData(), 500);
            break;
            
          case 'new_enrollment':
          case 'student_enrolled':
            optimisticUpdate((currentData) => ({
              ...currentData,
              totalStudentsEnrolled: (currentData.totalStudentsEnrolled || 0) + 1
            }));
            setTimeout(() => loadDashboardData(), 500);
            break;
            
          case 'lesson_completed':
          case 'course_completed':
            // Completion rate might change, refetch to get accurate calculation
            setTimeout(() => loadDashboardData(), 1000);
            break;
            
          case 'dashboard_update':
            // Generic dashboard update - refetch all metrics
            setTimeout(() => loadDashboardData(), 500);
            break;
            
          default:
            console.log('Unhandled update type:', update.type);
        }
      } catch (parseError) {
        console.error('Failed to parse WebSocket message:', parseError);
      }
    }
  }, [lastMessage, loadDashboardData, optimisticUpdate]);

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
    loadDashboardData();
  }, [loadDashboardData]);

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

  if (isLoading && teacherData.totalCourses === 0 && teacherData.totalLessons === 0) {
    return (
      <div className="w-full space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </div>
    );
  }

  if (error && teacherData.totalCourses === 0 && teacherData.totalLessons === 0) {
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
                {teacherData.totalStudentsEnrolled} students enrolled in {teacherData.totalCourses} courses
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
        <TeacherMetrics stats={teacherData} />

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
              to="/teacher/students"
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