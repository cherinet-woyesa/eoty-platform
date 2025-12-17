import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Users, Plus,
  RefreshCw, Megaphone, Calendar,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import TeacherMetrics from './TeacherMetrics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiClient } from '@/services/api/apiClient';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import DashboardSkeleton from './DashboardSkeleton';
import ProfileCompletionModal from '@/components/shared/ProfileCompletionModal';
import CreateAnnouncementModal from '@/components/admin/dashboard/modals/CreateAnnouncementModal';
import CreateEventModal from '@/components/admin/dashboard/modals/CreateEventModal';
import { useQuery } from '@tanstack/react-query';

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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
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
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const { data: dashboardResp, isLoading: queryLoading, isError: queryError, refetch } = useQuery({
    queryKey: ['teacher-dashboard'],
    enabled: !!user && user.role === 'teacher',
    queryFn: async () => {
      const response = await apiClient.get('/teacher/dashboard');
      if (response.data.success) {
        return response.data.data || {};
      }
      throw new Error(response.data.message || 'Failed to load dashboard data');
    },
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

  useEffect(() => {
    if (dashboardResp) {
      setTeacherData({
        totalCourses: dashboardResp.totalCourses ?? 0,
        totalStudentsEnrolled: dashboardResp.totalStudentsEnrolled ?? 0,
        totalLessons: dashboardResp.totalLessons ?? 0,
        averageCompletionRate: dashboardResp.averageCompletionRate ?? 0,
        courses: dashboardResp.courses ?? [],
        recentActivity: dashboardResp.recentActivity ?? [],
        studentPerformance: dashboardResp.studentPerformance ?? [],
        upcomingTasks: dashboardResp.upcomingTasks ?? []
      });
      setLastUpdated(Date.now());
      setError(null);
      setIsLoading(false);
    }
  }, [dashboardResp]);

  useEffect(() => {
    if (queryError) {
      setError('Failed to load dashboard data');
      setIsLoading(false);
    }
  }, [queryError]);

  useEffect(() => {
    const flag = localStorage.getItem('show_profile_completion');
    if (flag === 'true') {
      localStorage.removeItem('show_profile_completion');
      setProfileModalOpen(true);
      return;
    }
    // Only show profile modal for completely new teachers (no chapter AND no profile completion status)
    if (user && !user.chapter && (!user.profileCompletion || !user.profileCompletion.isComplete)) {
      setProfileModalOpen(true);
    }
  }, [user]);

  // WebSocket for live dashboard updates (gated)
  const wsBase = import.meta.env.VITE_WS_BASE;
  const enableWs = import.meta.env.VITE_ENABLE_WS !== 'false' && !!wsBase && !!user?.id;
  const dashboardWsUrl = enableWs && user?.id ? `${wsBase}?type=dashboard&userId=${user.id}` : '';
  const { lastMessage, isConnected } = useWebSocket(dashboardWsUrl, {
    reconnectAttempts: 3,
    reconnectInterval: 5000,
    heartbeatInterval: 30000,
    disableReconnect: !enableWs,
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.warn('Dashboard WebSocket error:', error);
      }
    }
  });

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
          setTimeout(() => refetch(), 1000);
          return;
        }
        
        // Handle specific event types with optimistic updates
        switch (update.type) {
          case 'course_created':
            optimisticUpdate((currentData) => ({
              ...currentData,
              totalCourses: (currentData.totalCourses || 0) + 1
            }));
            setTimeout(() => refetch(), 500);
            break;
            
          case 'lesson_created':
            optimisticUpdate((currentData) => ({
              ...currentData,
              totalLessons: (currentData.totalLessons || 0) + 1
            }));
            setTimeout(() => refetch(), 500);
            break;
            
          case 'new_enrollment':
          case 'student_enrolled':
            optimisticUpdate((currentData) => ({
              ...currentData,
              totalStudentsEnrolled: (currentData.totalStudentsEnrolled || 0) + 1
            }));
            setTimeout(() => refetch(), 500);
            break;
            
          case 'lesson_completed':
          case 'course_completed':
            // Completion rate might change, refetch to get accurate calculation
            setTimeout(() => refetch(), 1000);
            break;
            
          case 'dashboard_update':
            // Generic dashboard update - refetch all metrics
            setTimeout(() => refetch(), 500);
            break;
            
          default:
            if (import.meta.env.DEV) {
              console.debug('Unhandled dashboard update type:', update.type);
            }
        }
      } catch (parseError) {
        if (import.meta.env.DEV) {
          console.error('Failed to parse dashboard update message:', parseError);
        }
      }
    }
  }, [lastMessage, refetch, optimisticUpdate]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString(i18n.language, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }, [i18n.language]);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString(i18n.language, { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, [i18n.language]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return t('admin.dashboard.time.never');
    const diff = Date.now() - lastUpdated;
    if (diff < 45_000) return t('admin.dashboard.time.just_now');
    if (diff < 3_600_000) return t('admin.dashboard.time.minutes_ago', { count: Math.round(diff / 60000) });
    return new Date(lastUpdated).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  }, [lastUpdated, t, i18n.language]);

  if (!user || user.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white/90 backdrop-blur-md rounded-xl p-8 border border-stone-200 shadow-lg">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">{t('dashboard.teacher.access_denied_title')}</h3>
          <p className="text-stone-600 mb-4">{t('dashboard.teacher.access_denied_message')}</p>
          <Link
            to="/login"
            className="px-6 py-3 bg-indigo-900 text-white font-semibold rounded-lg border border-indigo-800 hover:bg-indigo-800 transition-all shadow-md hover:shadow-lg"
          >
            {t('dashboard.teacher.go_to_login')}
          </Link>
        </div>
      </div>
    );
  }

  if (queryLoading) {
    return <DashboardSkeleton />;
  }

  if (queryError && teacherData.totalCourses === 0 && teacherData.totalLessons === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white/90 backdrop-blur-md rounded-xl p-8 border border-stone-200 shadow-lg">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">{t('dashboard.teacher.unable_to_load_title')}</h3>
          <p className="text-stone-600 mb-4">{error || t('dashboard.teacher.unable_to_load_message')}</p>
          <button 
            onClick={handleRetry}
            className="px-6 py-3 bg-indigo-900 text-white font-semibold rounded-lg border border-indigo-800 hover:bg-indigo-800 transition-all shadow-md hover:shadow-lg"
          >
            {t('dashboard.teacher.try_again')}
          </button>
        </div>
      </div>
    );
  }

  // Block dashboard UI for new users until setup completes
  if (profileModalOpen) {
    return (
      <ErrorBoundary>
        <ProfileCompletionModal isOpen={true} onClose={() => setProfileModalOpen(false)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-900/5 via-blue-900/5 to-slate-900/5 rounded-lg p-4 border border-indigo-900/10 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-900/20 rounded-lg blur-md"></div>
                  <div className="relative p-1.5 bg-gradient-to-br from-indigo-900/10 to-blue-900/10 rounded-lg border border-indigo-900/20">
                    <BookOpen className="h-5 w-5 text-indigo-900" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-stone-800">{t('dashboard.teacher.title', 'Teacher Dashboard')}</h1>
                {isConnected && (
                  <div className="flex items-center space-x-2 text-emerald-600">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Live</span>
                  </div>
                )}
              </div>
              <p className="text-stone-700 text-sm mt-1">
                {t('dashboard.teacher.welcome_back', { name: user?.firstName || t('dashboard.teacher.default_teacher_name') })}! {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
              <p className="text-stone-600 text-xs">
                {t('dashboard.teacher.overview_summary', { students: teacherData.totalStudentsEnrolled, courses: teacherData.totalCourses })}
              </p>
              <div className="flex items-center gap-2 text-xs text-stone-600 mt-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${isLoading ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-stone-200 bg-white/70 text-stone-700'}`}>
                  <span className={`h-2 w-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
                  {isLoading ? t('admin.dashboard.updating') : t('admin.dashboard.synced')}
                </div>
                <span className="text-stone-500">Last updated {lastUpdatedLabel}</span>
              </div>
            </div>
            <div className="mt-3 lg:mt-0 flex flex-wrap gap-2">
              <Link
                to="/teacher/courses"
                className="inline-flex items-center px-4 py-2 bg-indigo-900 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-800 transition-all"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {t('dashboard.teacher.manage_courses')}
              </Link>
              <Link
                to="/teacher/all-students"
                className="inline-flex items-center px-4 py-2 bg-white text-indigo-900 text-sm font-medium rounded-lg border border-indigo-200 shadow-sm hover:bg-indigo-50 transition-all"
              >
                <Users className="mr-2 h-4 w-4" />
                {t('dashboard.teacher.view_students')}
              </Link>
            </div>
          </div>
        </div>

        <TeacherMetrics stats={teacherData} />

        {teacherData.totalCourses === 0 && !isLoading && (
          <section className="rounded-xl border border-dashed border-indigo-200 bg-white/50 p-8 text-center shadow-sm backdrop-blur-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
              <BookOpen className="h-8 w-8 text-indigo-900" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-stone-800">
              {t('dashboard.teacher.start_teaching_title', 'Start Your Teaching Journey')}
            </h2>
            <p className="mt-2 text-stone-600 max-w-md mx-auto">
              {t('dashboard.teacher.start_teaching_desc', 'Create your first course to start sharing your knowledge with students.')}
            </p>
            <Link
              to="/teacher/courses"
              className="mt-6 inline-flex items-center rounded-lg bg-indigo-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-800 hover:shadow-lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              {t('dashboard.teacher.create_first_course_btn', 'Create Course')}
            </Link>
          </section>
        )}

        {user?.role === 'teacher' && user.profileCompletion && !user.profileCompletion.isComplete && (
          <section className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between backdrop-blur-sm">
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                {t('dashboard.teacher.complete_profile_title')}
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                {t('dashboard.teacher.complete_profile_message', { percentage: user.profileCompletion.percentage })}
              </p>
            </div>
            <div className="flex flex-1 items-center gap-4 sm:justify-end">
              <div className="h-2 flex-1 rounded-full bg-amber-200 max-w-[200px]">
                <div
                  className="h-2 rounded-full bg-amber-600 transition-all"
                  style={{ width: `${Math.min(user.profileCompletion.percentage || 0, 100)}%` }}
                />
              </div>
              <Link
                to="/teacher/profile"
                className="inline-flex items-center rounded-lg border border-amber-600 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                {t('dashboard.teacher.update_profile')}
              </Link>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-stone-800">
              {t('dashboard.teacher.quick_actions')}
            </h3>
            <button
              onClick={handleRetry}
              className="inline-flex items-center rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-800 bg-white"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              {t('dashboard.teacher.refresh_data')}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/teacher/all-courses"
              className="group flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 transition hover:border-indigo-300 hover:bg-white hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-stone-900">{t('dashboard.teacher.manage_courses')}</p>
                <p className="text-xs text-stone-500 mt-1">{t('dashboard.teacher.manage_courses_desc')}</p>
              </div>
              <div className="rounded-lg bg-white p-2 shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                <BookOpen className="h-5 w-5 text-stone-600 group-hover:text-indigo-700" />
              </div>
            </Link>
            <Link
              to="/teacher/all-students"
              className="group flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 transition hover:border-indigo-300 hover:bg-white hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-stone-900">{t('dashboard.teacher.view_students')}</p>
                <p className="text-xs text-stone-500 mt-1">{t('dashboard.teacher.view_students_desc')}</p>
              </div>
              <div className="rounded-lg bg-white p-2 shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                <Users className="h-5 w-5 text-stone-600 group-hover:text-indigo-700" />
              </div>
            </Link>
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="group flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 text-left transition hover:border-indigo-300 hover:bg-white hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-stone-900">{t('dashboard.teacher.announcements')}</p>
                <p className="text-xs text-stone-500 mt-1">{t('dashboard.teacher.announcements_desc')}</p>
              </div>
              <div className="rounded-lg bg-white p-2 shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                <Megaphone className="h-5 w-5 text-stone-600 group-hover:text-indigo-700" />
              </div>
            </button>
            <button
              onClick={() => setShowEventModal(true)}
              className="group flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 text-left transition hover:border-indigo-300 hover:bg-white hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-stone-900">{t('dashboard.teacher.events')}</p>
                <p className="text-xs text-stone-500 mt-1">{t('dashboard.teacher.events_desc')}</p>
              </div>
              <div className="rounded-lg bg-white p-2 shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                <Calendar className="h-5 w-5 text-stone-600 group-hover:text-indigo-700" />
              </div>
            </button>
          </div>
        </section>
      </div>
      
      <CreateAnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSuccess={() => {}}
        type="teacher"
      />
      
      <CreateEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSuccess={() => {}}
        type="teacher"
      />
    </ErrorBoundary>
  );
};

export default React.memo(TeacherDashboard);
