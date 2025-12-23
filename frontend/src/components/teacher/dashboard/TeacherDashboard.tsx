import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Users, Plus,
  RefreshCw, Megaphone, Calendar,
  AlertTriangle, Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import TeacherMetrics from './TeacherMetrics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiClient } from '@/services/api/apiClient';
import { chaptersApi } from '@/services/api/chapters';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import DashboardSkeleton from './DashboardSkeleton';
import ProfileCompletionModal from '@/components/shared/ProfileCompletionModal';
import CreateAnnouncementModal from '@/components/admin/dashboard/modals/CreateAnnouncementModal';
import CreateEventModal from '@/components/admin/dashboard/modals/CreateEventModal';
import { useQuery } from '@tanstack/react-query';
import { brandColors } from '@/theme/brand';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';

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

type AnnouncementSource = 'global' | 'chapter';

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  createdAt?: string;
  source: AnnouncementSource;
  priority?: string;
}

interface EventItem {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  location?: string;
  isOnline?: boolean;
  meetingLink?: string;
  source: AnnouncementSource;
}

interface TeacherChapter {
  chapter_id: number;
  chapter_name?: string;
  name?: string;
  is_primary?: boolean;
  [key: string]: any;
}

const parseNumericId = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nested = record.id ?? record['chapter_id'] ?? record['chapterId'];
    return parseNumericId(nested);
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const TeacherDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
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
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

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

  const { data: teacherChaptersResponse } = useQuery({
    queryKey: ['teacher-chapters'],
    enabled: !!user && user.role === 'teacher',
    queryFn: async () => chaptersApi.getUserChapters(),
    staleTime: 5 * 60 * 1000
  });

  const teacherChapters = useMemo<TeacherChapter[]>(() => {
    const rows = teacherChaptersResponse?.data?.chapters;
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((chapter: any) => {
        const numericId = parseNumericId(chapter?.chapter_id ?? chapter?.id ?? chapter?.chapterId);
        if (!numericId) {
          return null;
        }
        return { ...chapter, chapter_id: numericId } as TeacherChapter;
      })
      .filter((chapter): chapter is TeacherChapter => Boolean(chapter));
  }, [teacherChaptersResponse]);

  useEffect(() => {
    if (activeChapterId || !user || user.role !== 'teacher') return;
    const anyUser = user as any;
    const candidate = parseNumericId(anyUser?.chapterId ?? anyUser?.chapter_id ?? anyUser?.chapter);
    if (candidate) {
      setActiveChapterId(candidate);
    }
  }, [user, activeChapterId]);

  useEffect(() => {
    if (!teacherChapters.length) return;
    const preferred = teacherChapters.find((chapter) => chapter.is_primary);
    const fallbackChapter = preferred || teacherChapters[0];
    if (fallbackChapter && fallbackChapter.chapter_id !== activeChapterId) {
      setActiveChapterId(fallbackChapter.chapter_id);
    }
  }, [teacherChapters, activeChapterId]);

  const activeChapterName = useMemo(() => {
    if (!activeChapterId) return null;
    const current = teacherChapters.find((chapter) => chapter.chapter_id === activeChapterId);
    return current?.chapter_name || current?.name || null;
  }, [teacherChapters, activeChapterId]);

  const {
    data: chapterAnnouncementsData,
    isLoading: isLoadingChapterAnnouncements,
    refetch: refetchChapterAnnouncements
  } = useQuery({
    queryKey: ['teacher-chapter-announcements', activeChapterId],
    queryFn: () => chaptersApi.getAnnouncements(activeChapterId as number),
    enabled: !!user && user.role === 'teacher' && !!activeChapterId
  });

  const {
    data: chapterEventsData,
    isLoading: isLoadingChapterEvents,
    refetch: refetchChapterEvents
  } = useQuery({
    queryKey: ['teacher-chapter-events', activeChapterId],
    queryFn: () => chaptersApi.getEvents(activeChapterId as number),
    enabled: !!user && user.role === 'teacher' && !!activeChapterId
  });

  const {
    data: globalAnnouncementsData,
    isLoading: isLoadingGlobalAnnouncements,
    refetch: refetchGlobalAnnouncements
  } = useQuery({
    queryKey: ['teacher-global-announcements'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/interactive/announcements/global');
        return res.data;
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Global announcements fetch failed', err);
        }
        return { data: { announcements: [] } };
      }
    },
    enabled: !!user && user.role === 'teacher',
    staleTime: 60_000
  });

  const {
    data: globalEventsData,
    isLoading: isLoadingGlobalEvents,
    refetch: refetchGlobalEvents
  } = useQuery({
    queryKey: ['teacher-global-events'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/interactive/events/global');
        return res.data;
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Global events fetch failed', err);
        }
        return { data: { events: [] } };
      }
    },
    enabled: !!user && user.role === 'teacher',
    staleTime: 60_000
  });

  const announcements = useMemo<AnnouncementItem[]>(() => {
    const combined: AnnouncementItem[] = [];
    const chapterList = Array.isArray(chapterAnnouncementsData?.data?.announcements)
      ? chapterAnnouncementsData.data.announcements
      : Array.isArray(chapterAnnouncementsData?.announcements)
        ? chapterAnnouncementsData.announcements
        : [];

    chapterList.forEach((item: any) => {
      combined.push({
        id: `chapter-${item.id}`,
        title: item.title || t('dashboard.teacher.announcement_fallback_title', 'Chapter announcement'),
        body: item.content || item.body || '',
        createdAt: item.created_at || item.createdAt,
        source: 'chapter',
        priority: item.priority || (item.is_pinned ? 'high' : undefined)
      });
    });

    const globalList = Array.isArray(globalAnnouncementsData?.data?.announcements)
      ? globalAnnouncementsData.data.announcements
      : Array.isArray(globalAnnouncementsData?.announcements)
        ? globalAnnouncementsData.announcements
        : [];

    globalList.forEach((item: any) => {
      combined.push({
        id: `global-${item.id}`,
        title: item.title || item.content || t('dashboard.teacher.announcement_fallback_title', 'Platform announcement'),
        body: item.content || item.body || item.message || '',
        createdAt: item.created_at || item.createdAt,
        source: 'global',
        priority: item.priority
      });
    });

    return combined
      .filter((item) => item.title || item.body)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 4);
  }, [chapterAnnouncementsData, globalAnnouncementsData, t]);

  const events = useMemo<EventItem[]>(() => {
    const combined: EventItem[] = [];
    const chapterList = Array.isArray(chapterEventsData?.data?.events)
      ? chapterEventsData.data.events
      : Array.isArray(chapterEventsData?.events)
        ? chapterEventsData.events
        : [];

    chapterList.forEach((event: any) => {
      combined.push({
        id: `chapter-${event.id}`,
        title: event.title || t('dashboard.teacher.event_fallback_title', 'Chapter event'),
        description: event.description || '',
        startTime: event.event_date || event.start_time || event.startTime,
        location: event.location || event.location_name,
        isOnline: Boolean(event.is_online || event.isOnline),
        meetingLink: event.meeting_link || event.meetingLink,
        source: 'chapter'
      });
    });

    const globalList = Array.isArray(globalEventsData?.data?.events)
      ? globalEventsData.data.events
      : Array.isArray(globalEventsData?.events)
        ? globalEventsData.events
        : [];

    globalList.forEach((event: any) => {
      combined.push({
        id: `global-${event.id}`,
        title: event.title || t('dashboard.teacher.event_fallback_title', 'Community event'),
        description: event.description || '',
        startTime: event.start_time || event.startTime,
        location: event.location,
        isOnline: Boolean(event.is_online || event.isOnline),
        meetingLink: event.meeting_link || event.meetingLink,
        source: 'global'
      });
    });

    return combined
      .filter((event) => event.startTime)
      .filter((event) => {
        if (!event.startTime) return false;
        const timestamp = new Date(event.startTime).getTime();
        return Number.isFinite(timestamp);
      })
      .sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
        return aTime - bTime;
      })
      .slice(0, 4);
  }, [chapterEventsData, globalEventsData, t]);

  const announcementsLoading = isLoadingGlobalAnnouncements || isLoadingChapterAnnouncements;
  const eventsLoading = isLoadingGlobalEvents || isLoadingChapterEvents;

  const formatDateTime = useCallback((value?: string) => {
    if (!value) {
      return t('dashboard.teacher.date_tbd', 'TBD');
    }
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      return t('dashboard.teacher.date_tbd', 'TBD');
    }
    return parsed.toLocaleString(i18n.language, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [i18n.language, t]);

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

  const handleRetry = useCallback(() => {
    refetch();
    refetchChapterAnnouncements();
    refetchGlobalAnnouncements();
    refetchChapterEvents();
    refetchGlobalEvents();
  }, [
    refetch,
    refetchChapterAnnouncements,
    refetchGlobalAnnouncements,
    refetchChapterEvents,
    refetchGlobalEvents
  ]);

  const handleAnnouncementCreated = useCallback(() => {
    refetchChapterAnnouncements();
    refetchGlobalAnnouncements();
  }, [refetchChapterAnnouncements, refetchGlobalAnnouncements]);

  const handleEventCreated = useCallback(() => {
    refetchChapterEvents();
    refetchGlobalEvents();
  }, [refetchChapterEvents, refetchGlobalEvents]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return t('admin.dashboard.time.never');
    const diff = Date.now() - lastUpdated;
    if (diff < 45_000) return t('admin.dashboard.time.just_now');
    if (diff < 3_600_000) return t('admin.dashboard.time.minutes_ago', { count: Math.round(diff / 60000) });
    return new Date(lastUpdated).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  }, [lastUpdated, t, i18n.language]);

  if (!user || user.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('dashboard.teacher.access_denied_title')}</h3>
          <p className="text-gray-600 mb-4">{t('dashboard.teacher.access_denied_message')}</p>
          <Link
            to="/login"
            className="px-6 py-3 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
            style={{ backgroundColor: brandColors.primaryHex }}
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('dashboard.teacher.unable_to_load_title')}</h3>
          <p className="text-gray-600 mb-4">{error || t('dashboard.teacher.unable_to_load_message')}</p>
          <button 
            onClick={handleRetry}
            className="px-6 py-3 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
            style={{ backgroundColor: brandColors.primaryHex }}
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
      <div className="w-full min-h-screen bg-gray-50">
        <div className="w-full space-y-4 p-4 lg:p-6">
          <div className="w-full rounded-3xl border border-gray-200 bg-white/90 shadow-xl backdrop-blur-sm p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Section */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColors.primaryHex}1A` }}>
                  <BookOpen className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.teacher.title', 'Teacher Dashboard')}</h1>
                {isConnected && (
                  <div className="flex items-center space-x-2 text-emerald-600">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Live</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-1">
                {t('dashboard.teacher.welcome_back', { name: user?.firstName || t('dashboard.teacher.default_teacher_name') })}! <DateTimeDisplay />
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {t('dashboard.teacher.overview_summary', { students: teacherData.totalStudentsEnrolled, courses: teacherData.totalCourses })}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${isLoading ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  <span className={`h-2 w-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
                  {isLoading ? t('admin.dashboard.updating') : t('admin.dashboard.synced')}
                </div>
                <span className="text-gray-400">Last updated {lastUpdatedLabel}</span>
              </div>
            </div>
            <div className="mt-4 lg:mt-0 flex flex-wrap gap-3">
              <Link
                to="/teacher/courses"
                className="inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg shadow-sm transition-all hover:shadow-md"
                style={{ backgroundColor: brandColors.primaryHex }}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {t('dashboard.teacher.manage_courses')}
              </Link>
              <Link
                to="/teacher/all-students"
                className="inline-flex items-center px-4 py-2 bg-white text-sm font-medium rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-all"
                style={{ color: brandColors.primaryHex, borderColor: `${brandColors.primaryHex}33` }}
              >
                <Users className="mr-2 h-4 w-4" />
                {t('dashboard.teacher.view_students')}
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white/70 p-4">
          <TeacherMetrics stats={teacherData} />
        </section>



        {teacherData.totalCourses === 0 && !isLoading && (
          <section className="rounded-2xl border border-dashed border-amber-200 bg-white/80 p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 border border-gray-100">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              {t('dashboard.teacher.start_teaching_title', 'Start Your Teaching Journey')}
            </h2>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              {t('dashboard.teacher.start_teaching_desc', 'Create your first course to start sharing your knowledge with students.')}
            </p>
            <Link
              to="/teacher/courses"
              className="mt-6 inline-flex items-center rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              <Plus className="mr-2 h-5 w-5" />
              {t('dashboard.teacher.create_first_course_btn', 'Create Course')}
            </Link>
          </section>
        )}

        {user?.role === 'teacher' && user.profileCompletion && !user.profileCompletion.isComplete && (
          <section className="flex flex-col gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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

        <section className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('dashboard.teacher.quick_actions')}
            </h3>
            <button
              onClick={handleRetry}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              {t('dashboard.teacher.refresh_data')}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/teacher/courses"
              className="group flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 transition hover:bg-white hover:shadow-md"
              style={{ ':hover': { borderColor: `${brandColors.primaryHex}4D` } } as React.CSSProperties}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('dashboard.teacher.manage_courses')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('dashboard.teacher.manage_courses_desc')}</p>
              </div>
              <div className="rounded-lg bg-white p-2 shadow-sm transition-colors"
                   style={{ ':group-hover': { backgroundColor: `${brandColors.primaryHex}1A`, color: brandColors.primaryHex } } as React.CSSProperties}>
                <BookOpen className="h-5 w-5 text-gray-500 group-hover:text-current" />
              </div>
            </Link>
            <Link
              to="/teacher/all-students"
              className="group flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 transition hover:bg-white hover:shadow-md"
              style={{ ':hover': { borderColor: `${brandColors.primaryHex}4D` } } as React.CSSProperties}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('dashboard.teacher.view_students')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('dashboard.teacher.view_students_desc')}</p>
              </div>
              <div className="rounded-lg bg-white p-2 shadow-sm transition-colors"
                   style={{ ':group-hover': { backgroundColor: `${brandColors.primaryHex}1A`, color: brandColors.primaryHex } } as React.CSSProperties}>
                <Users className="h-5 w-5 text-gray-500 group-hover:text-current" />
              </div>
            </Link>
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="group flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-left transition hover:bg-white hover:shadow-md"
              style={{ ':hover': { borderColor: `${brandColors.primaryHex}4D` } } as React.CSSProperties}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('dashboard.teacher.announcements')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('dashboard.teacher.announcements_desc')}</p>
              </div>
              <div className="rounded-lg bg-white p-2 shadow-sm transition-colors"
                   style={{ ':group-hover': { backgroundColor: `${brandColors.primaryHex}1A`, color: brandColors.primaryHex } } as React.CSSProperties}>
                <Megaphone className="h-5 w-5 text-gray-500 group-hover:text-current" />
              </div>
            </button>
            <button
              onClick={() => setShowEventModal(true)}
              className="group flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-left transition hover:bg-white hover:shadow-md"
              style={{ ':hover': { borderColor: `${brandColors.primaryHex}4D` } } as React.CSSProperties}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('dashboard.teacher.events')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('dashboard.teacher.events_desc')}</p>
              </div>
              <div className="rounded-lg bg-white p-2 shadow-sm transition-colors"
                   style={{ ':group-hover': { backgroundColor: `${brandColors.primaryHex}1A`, color: brandColors.primaryHex } } as React.CSSProperties}>
                <Calendar className="h-5 w-5 text-gray-500 group-hover:text-current" />
              </div>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white/80 p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-gray-50 p-2 text-gray-600">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('dashboard.teacher.announcements')}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {t('dashboard.teacher.announcements_desc')}
                    </p>
                  </div>
                </div>
                {announcementsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  <span className="text-xs text-gray-500">
                    {activeChapterName
                      ? t('dashboard.teacher.chapter_scope', {
                          chapter: activeChapterName,
                          defaultValue: `Chapter · ${activeChapterName}`
                        })
                      : t('dashboard.teacher.global_scope', 'Global updates')}
                  </span>
                )}
              </div>

              {announcementsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((skeleton) => (
                    <div key={skeleton} className="h-20 rounded-lg border border-gray-100 bg-gray-50 animate-pulse" />
                  ))}
                </div>
              ) : announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((item) => {
                    const badgeClasses = item.source === 'chapter'
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    return (
                      <div key={item.id} className="rounded-lg border border-gray-100 p-4 hover:border-gray-200 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.body}</p>
                          </div>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeClasses}`}>
                            {item.source === 'chapter'
                              ? t('dashboard.teacher.chapter_label', 'Chapter')
                              : t('dashboard.teacher.global_label', 'Global')}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                          <span>{formatDateTime(item.createdAt)}</span>
                          {item.priority && (
                            <span className="uppercase tracking-wide text-gray-400">
                              {t('dashboard.teacher.priority', 'Priority')}: {item.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  {t('dashboard.teacher.no_announcements', 'No announcements just yet.')}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-gray-50 p-2 text-gray-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.teacher.events')}</h3>
                    <p className="text-xs text-gray-500">{t('dashboard.teacher.events_desc')}</p>
                  </div>
                </div>
                {eventsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  <span className="text-xs text-gray-500">
                    {t('dashboard.teacher.upcoming_count', {
                      count: events.length,
                      defaultValue: `${events.length} upcoming`
                    })}
                  </span>
                )}
              </div>

              {eventsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((skeleton) => (
                    <div key={skeleton} className="h-24 rounded-lg border border-gray-100 bg-gray-50 animate-pulse" />
                  ))}
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event) => {
                    const badgeClasses = event.source === 'chapter'
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    return (
                      <div key={event.id} className="rounded-lg border border-gray-100 p-4 hover:border-gray-200 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                            {event.description && (
                              <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>
                            )}
                            <div className="text-[11px] text-gray-500 space-y-0.5">
                              <p>{formatDateTime(event.startTime)}</p>
                              {event.location && (
                                <p>
                                  {event.isOnline
                                    ? `${event.location} · ${t('dashboard.teacher.online', 'Online')}`
                                    : event.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeClasses}`}>
                            {event.source === 'chapter'
                              ? t('dashboard.teacher.chapter_label', 'Chapter')
                              : t('dashboard.teacher.global_label', 'Global')}
                          </span>
                        </div>
                        {event.meetingLink && (
                          <a
                            href={event.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                          >
                            {t('dashboard.teacher.join_event', 'Open details')}
                            <span className="ml-1" aria-hidden="true">→</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  {t('dashboard.teacher.no_events', 'No upcoming events.')}
                </div>
              )}
            </div>
          </div>
        </section>
          </div>
        </div>
      </div>

      <CreateAnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSuccess={handleAnnouncementCreated}
        type="teacher"
      />

      <CreateEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSuccess={handleEventCreated}
        type="teacher"
      />

    </ErrorBoundary>
  );
};

export default React.memo(TeacherDashboard);
