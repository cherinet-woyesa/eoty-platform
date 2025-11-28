import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Users,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import TeacherMetrics from './TeacherMetrics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiClient } from '@/services/api/apiClient';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import DashboardSkeleton from './DashboardSkeleton';

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
  // Only connect if WebSocket is enabled and user is available
  const dashboardWsUrl = user?.id ? `?type=dashboard&userId=${user.id}` : '';
  const { lastMessage, isConnected } = useWebSocket(dashboardWsUrl, {
    reconnectAttempts: 3,
    reconnectInterval: 5000,
    heartbeatInterval: 30000,
    disableReconnect: !user?.id || import.meta.env.VITE_ENABLE_WS === 'false',
    onOpen: () => {
      console.log('✅ Dashboard WebSocket connected');
    },
    onError: (error) => {
      // Silently handle WebSocket errors - they're not critical for dashboard functionality
      console.warn('⚠️ Dashboard WebSocket error (non-critical):', error);
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
      <div className="flex items-center justify-center min-h-64 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <div className="text-center max-w-sm bg-white/90 backdrop-blur-md rounded-lg p-6 border border-stone-200 shadow-sm">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-stone-800 mb-2">
            Access Denied
          </h3>
          <p className="text-stone-600 text-xs mb-3">
            You must be logged in as a teacher to view this dashboard.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:shadow-md transition-all font-medium text-xs"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading && teacherData.totalCourses === 0 && teacherData.totalLessons === 0) {
    return <DashboardSkeleton />;
  }

  if (error && teacherData.totalCourses === 0 && teacherData.totalLessons === 0) {
    return (
      <div className="w-full space-y-3 p-3 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center max-w-sm bg-white/90 backdrop-blur-md rounded-lg p-6 border border-red-200 shadow-sm">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-800 mb-2">
              Unable to Load Dashboard
            </h3>
            <p className="text-stone-600 text-xs mb-3">
              {error || 'We encountered an error while loading your dashboard data.'}
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:shadow-md transition-all font-medium text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        {/* Compact Welcome Section */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-lg p-4 border border-[#27AE60]/25 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1.5">
                <h1 className="text-xl font-semibold text-stone-800">
                  Welcome back, {user?.firstName}!
                </h1>
                {isConnected && (
                  <div className="flex items-center space-x-1.5 bg-[#27AE60]/15 px-2 py-0.5 rounded-full border border-[#27AE60]/40">
                    <div className="w-1.5 h-1.5 bg-[#27AE60] rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-medium text-stone-700">Live</span>
                  </div>
                )}
              </div>
              <p className="text-stone-600 font-medium text-sm">
                {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
              <p className="text-stone-700 text-xs mt-1">
                <span className="font-semibold text-[#27AE60]">{teacherData.totalStudentsEnrolled}</span> students enrolled in{' '}
                <span className="font-semibold text-[#16A085]">{teacherData.totalCourses}</span> courses
              </p>
            </div>
            {/* Shortcut Buttons - Commented out for cleaner UI */}
            {/* <div className="mt-4 lg:mt-0 lg:ml-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  to="/teacher/record"
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Record Video
                </Link>
                <Link
                  to="/teacher/courses/new"
                  className="inline-flex items-center px-4 py-2.5 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-lg transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Link>
              </div>
            </div> */}
          </div>
        </div>

        {/* Compact Teacher profile completion helper */}
        {user?.role === 'teacher' && user.profileCompletion && !user.profileCompletion.isComplete && (
          <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-stone-800">
                  Complete your teacher profile
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Your profile is {user.profileCompletion.percentage}% complete. Add more details to build trust with students.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 sm:w-32">
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(user.profileCompletion.percentage || 0, 100)}%` }}
                    />
                  </div>
                </div>
                <Link
                  to="/teacher/profile"
                  className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-xs font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Update Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Simplified Teacher Metrics */}
        <TeacherMetrics stats={teacherData} />

        {/* Compact Quick Actions */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 p-4">
          <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-[#27AE60] to-[#16A085] rounded-full"></span>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              to="/teacher/courses"
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#27AE60]/8 to-[#16A085]/8 hover:from-[#27AE60]/15 hover:to-[#16A085]/15 rounded-lg border border-[#27AE60]/25 hover:border-[#27AE60]/40 transition-all group"
            >
              <div className="p-2 bg-gradient-to-br from-[#27AE60]/15 to-[#16A085]/15 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                <BookOpen className="h-5 w-5 text-[#27AE60]" />
              </div>
              <span className="font-medium text-stone-800 text-sm">Manage Courses</span>
            </Link>
            <Link
              to="/teacher/students"
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#16A085]/8 to-[#2980B9]/8 hover:from-[#16A085]/15 hover:to-[#2980B9]/15 rounded-lg border border-[#16A085]/25 hover:border-[#16A085]/40 transition-all group"
            >
              <div className="p-2 bg-gradient-to-br from-[#16A085]/15 to-[#2980B9]/15 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-[#16A085]" />
              </div>
              <span className="font-medium text-stone-800 text-sm">View Students</span>
            </Link>
            <button
              onClick={handleRetry}
              className="flex flex-col items-center justify-center p-4 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 hover:border-stone-300 transition-all group"
            >
              <div className="p-2 bg-stone-100 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                <RefreshCw className="h-5 w-5 text-stone-600" />
              </div>
              <span className="font-medium text-stone-700 text-sm">Refresh Data</span>
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(TeacherDashboard);