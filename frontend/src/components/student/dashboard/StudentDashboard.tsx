import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen,
  Loader2,
  AlertCircle,
  Menu,
  Zap,
  Target,
  Sparkles,
  Compass,
  Bookmark,
  LifeBuoy,
  Users
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import CourseGrid from './CourseGrid';
import { useWebSocket } from '@/hooks/useWebSocket';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { apiClient } from '@/services/api/apiClient';
import ProfileCompletionModal from '@/components/shared/ProfileCompletionModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Alert from '@/components/common/Alert';
import { chaptersApi } from '@/services/api/chapters';
import { brandButtons, brandColors } from '@/theme/brand';
import ContactAdminModal from './modals/ContactAdminModal';
import ProfileCompletionBanner from './ProfileCompletionBanner';
import EventDetailsModal from './modals/EventDetailsModal';

// Skeleton loader components
const DashboardSkeleton: React.FC = React.memo(() => (
  <div className="w-full space-y-6 p-6">
    {/* Welcome Section Skeleton */}
    <div className="bg-stone-200 rounded-xl p-6 animate-pulse h-32"></div>
    
    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-stone-200 rounded-xl p-4 animate-pulse h-24"></div>
      ))}
    </div>
    
    {/* Main Content Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-stone-200 rounded-xl p-6 animate-pulse h-64"></div>
        ))}
      </div>
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-stone-200 rounded-xl p-6 animate-pulse h-48"></div>
        ))}
      </div>
    </div>
  </div>
));

interface StudentDashboardData {
  progress: {
    totalCourses: number;
    completedCourses: number;
    totalLessons: number;
    completedLessons: number;
    studyStreak: number;
    totalPoints: number;
    nextGoal: string;
    weeklyGoal: number;
    weeklyProgress: number;
  };
  enrolledCourses: any[];
  recentActivity: any[];
  recommendations: any[];
  nextLessons?: Record<string, { id: number; title: string }>;
}

const StudentDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const wsRefreshTimer = useRef<NodeJS.Timeout | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const {
    data: studentData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/students/dashboard');
      if (!response.data.success) {
        throw new Error('Failed to load dashboard data');
      }
      return response.data.data as StudentDashboardData;
    },
    staleTime: 60_000,
    retry: 2,
    refetchOnWindowFocus: false
  });

  const { data: userChaptersData } = useQuery({
    queryKey: ['user-chapters'],
    queryFn: async () => {
      const response = await chaptersApi.getUserChapters();
      return response;
    },
    enabled: !!user
  });

  const chapters = useMemo(() => userChaptersData?.data?.chapters || [], [userChaptersData]);

  const derivedPrimaryChapterId = useMemo(() => {
    const primary = chapters.find((c: any) => c.is_primary);
    const first = chapters[0];
    return primary?.chapter_id || first?.chapter_id || null;
  }, [chapters]);

  useEffect(() => {
    if (derivedPrimaryChapterId && activeChapterId === null) {
      setActiveChapterId(derivedPrimaryChapterId);
    }
    if (derivedPrimaryChapterId && activeChapterId !== null && derivedPrimaryChapterId !== activeChapterId) {
      setActiveChapterId(derivedPrimaryChapterId);
    }
  }, [derivedPrimaryChapterId, activeChapterId]);

  const setPrimaryMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      await chaptersApi.setPrimaryChapter(chapterId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-chapters'] });
    }
  });

  const { data: announcementsData, isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ['chapter-announcements', activeChapterId],
    queryFn: async () => {
      const response = await chaptersApi.getAnnouncements(activeChapterId as number);
      return response;
    },
    enabled: !!activeChapterId
  });

  // Global announcements (admin-created)
  const { data: globalAnnouncementsData, isLoading: isLoadingGlobalAnnouncements } = useQuery({
    queryKey: ['global-announcements'],
    queryFn: async () => {
      try {
        // Fetch real global announcements
        const res = await apiClient.get('/interactive/announcements/global');
        return res.data;
      } catch (err: any) {
        console.warn('Global announcements fetch failed', err);
        return { announcements: [] };
      }
    },
    staleTime: 60_000
  });

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['chapter-events', activeChapterId],
    queryFn: async () => {
      const response = await chaptersApi.getEvents(activeChapterId as number);
      return response;
    },
    enabled: !!activeChapterId
  });

  const { data: globalEventsData, isLoading: isLoadingGlobalEvents } = useQuery({
    queryKey: ['global-events'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/interactive/events/global');
        return res.data;
      } catch (err) {
        console.warn('Global events fetch failed', err);
        return { events: [] };
      }
    },
    staleTime: 60_000
  });

  useEffect(() => {
    const flag = localStorage.getItem('show_profile_completion');
    if (flag === 'true') {
      localStorage.removeItem('show_profile_completion');
      setProfileModalOpen(true);
      return;
    }
    if (user && !user.chapter) {
      setProfileModalOpen(true);
    }
  }, [user]);

  // WebSocket for live updates with optimized settings
  const { lastMessage } = useWebSocket('/member/updates', {
    reconnectAttempts: 3,
    reconnectInterval: 5000,
    heartbeatInterval: 60000,
    disableReconnect: false
  });

  // Handle real-time updates from WebSocket with debouncing
  useEffect(() => {
    if (lastMessage) {
      try {
        const message = JSON.parse(lastMessage.data);
        if (message.type === 'COURSE_PROGRESS_UPDATE') {
          if (wsRefreshTimer.current) clearTimeout(wsRefreshTimer.current);
          wsRefreshTimer.current = setTimeout(() => {
            refetch();
          }, 1200);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    }
    return () => {
      if (wsRefreshTimer.current) clearTimeout(wsRefreshTimer.current);
    };
  }, [lastMessage, refetch]);

  // Update time every minute with cleanup
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Transform enrolled courses from API to match CourseGrid interface
  const transformedCourses = useMemo(() => {
    if (!studentData?.enrolledCourses || !Array.isArray(studentData.enrolledCourses)) {
      return [];
    }
    
    const transformed = studentData.enrolledCourses.map((course: any) => ({
      id: String(course.id || course.course_id || ''),
      title: course.title || 'Untitled Course',
      description: course.description || '',
      progress: course.progress || 0,
      totalLessons: course.totalLessons || course.total_lessons || 0,
      completedLessons: course.completedLessons || course.completed_lessons || 0,
      lastAccessed: course.lastAccessed || course.last_accessed || new Date().toISOString(),
      instructor: course.instructor || course.instructor_name || 'Instructor',
      rating: course.rating || 0,
      studentCount: course.studentCount || course.student_count || 0,
      duration: course.duration || 0,
      thumbnail: course.coverImage || course.cover_image || course.thumbnail || '',
      category: course.category || 'General',
      difficulty: (course.difficulty || course.level || 'beginner').toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
      tags: course.tags || [],
      isBookmarked: course.isBookmarked || course.is_bookmarked || false,
      isFeatured: course.isFeatured || course.is_featured || false,
      status: course.status || course.enrollment_status || 'enrolled'
    }));
    
    return transformed;
  }, [studentData?.enrolledCourses]);

  // Filter and sort courses for the "Continue Learning" section
  // Includes courses that are not fully completed (< 100%)
  // Prioritizes courses that are already started (> 0%)
  const inProgressCourses = useMemo(() => {
    const incomplete = transformedCourses.filter(c => c.progress < 100);
    return incomplete.sort((a, b) => {
      // Prioritize started courses
      if (a.progress > 0 && b.progress === 0) return -1;
      if (a.progress === 0 && b.progress > 0) return 1;
      // Then by recency (most recently accessed first)
      return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
    });
  }, [transformedCourses]);

  const continueCourse = useMemo(() => {
    return inProgressCourses.length > 0 ? inProgressCourses[0] : null;
  }, [inProgressCourses]);

  const bookmarkedCourses = useMemo(
    () => transformedCourses.filter(course => course.isBookmarked),
    [transformedCourses]
  );

  const recentActivity = useMemo(
    () => Array.isArray(studentData?.recentActivity) ? studentData?.recentActivity : [],
    [studentData?.recentActivity]
  );

  const announcements = useMemo(() => {
    const chapterAnns = Array.isArray(announcementsData?.data?.announcements)
      ? announcementsData.data.announcements
      : Array.isArray(announcementsData?.announcements)
        ? announcementsData.announcements
        : [];

    const globalAnnsRaw = Array.isArray(globalAnnouncementsData?.data?.announcements)
      ? globalAnnouncementsData.data.announcements
      : Array.isArray(globalAnnouncementsData?.announcements)
        ? globalAnnouncementsData.announcements
        : [];

    // Normalize notifications fallback shape
    const globalAnns = globalAnnsRaw.map((item: any) => ({
      id: item.id,
      title: item.title || item.content || 'Announcement',
      body: item.content || item.message || '',
      timestamp: item.created_at || item.createdAt || item.timestamp || null
    }));

    return [...globalAnns, ...chapterAnns];
  }, [announcementsData, globalAnnouncementsData]);

  const events = useMemo(() => {
    const chapterEvents = Array.isArray(eventsData?.data?.events) ? eventsData.data.events.map((e: any) => ({...e, source: 'chapter'})) : [];
    const globalEvents = Array.isArray(globalEventsData?.data?.events) ? globalEventsData.data.events.map((e: any) => ({...e, source: 'global'})) : [];
    
    // Combine and sort by date
    const allEvents = [...globalEvents, ...chapterEvents];
    return allEvents.sort((a: any, b: any) => new Date(a.start_time || a.date).getTime() - new Date(b.start_time || b.date).getTime());
  }, [eventsData, globalEventsData]);

  const primaryHex = brandColors.primaryHex;
  const accentHex = brandColors.accentHex;
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    let score = 0;
    if (user.firstName) score += 25;
    if (user.lastName) score += 25;
    if (user.profilePicture) score += 25;
    if (user.bio) score += 25;
    // If score is 0 (e.g. just created), default to 25 as per requirement to show progress
    return score === 0 ? 25 : score;
  }, [user]);

  // Enhanced stats with real-time updates and memoization
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

  useEffect(() => {
    if (studentData) {
      setLastUpdated(new Date());
    }
  }, [studentData]);

  const handleCourseAction = useCallback(async (courseId: string, action: string) => {
    switch (action) {
      case 'view':
        navigate(`/member/courses/${courseId}`);
        break;
      case 'bookmark':
      case 'unbookmark':
        try {
          await apiClient.post('/bookmarks/toggle', {
            entityType: 'course',
            entityId: courseId
          });
        } catch (err) {
          console.error('Failed to toggle bookmark:', err);
          showNotification({
            type: 'error',
            title: t('common.error', 'Error'),
            message: t('student.bookmark_error', 'Failed to update bookmark')
          });
        }
        break;
      case 'download-certificate':
        // Handle certificate download
        break;
      default:
        navigate(`/member/courses/${courseId}`);
    }
  }, [navigate]);




  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Show error if data failed to load
  if (error && !studentData) {
    return (
      <div className="w-full space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-stone-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-800 mb-2">{t('dashboard.teacher.unable_to_load_title')}</h2>
            <p className="text-stone-600 mb-4">
              {error ? String(error) : t('dashboard.teacher.unable_to_load_message')}
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 text-white font-semibold rounded-lg transition-all disabled:opacity-60"
                style={{ backgroundColor: primaryHex }}
                aria-label={t('dashboard.teacher.try_again')}
              >
                <Loader2 className="h-4 w-4 mr-2" />
                {t('dashboard.teacher.try_again')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="w-full space-y-4 p-6">
        <Alert
          variant="warning"
          title={t('student.no_data')}
          description={t('student.no_data_desc')}
          actionLabel={t('student.refresh')}
          onAction={handleRetry}
        />
      </div>
    );
  }

  const quickActions = [
    { label: t('student.browse_courses'), icon: BookOpen, to: '/member/all-courses' },
    { label: t('student.find_resources'), icon: Compass, to: '/member/all-resources' },
    { label: t('student.jump_back_in'), icon: Zap, to: continueCourse ? `/member/courses/${continueCourse.id}` : '/member/learning' },
    { label: t('bookmarks_page.title', 'Bookmarks'), icon: Bookmark, to: '/member/bookmarks' }
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-[#f6f7fb] via-white to-[#f9f5ef]">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="w-full space-y-6 p-4 sm:p-5 lg:p-6">
          {/* Hero */}
          <div className="rounded-2xl bg-gradient-to-r from-[#f1f4ff] via-[#f9f5ef] to-[#fdfbf6] text-[#1e2a55] border border-[#e5e9f5] shadow-sm overflow-hidden">
            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-1.5 bg-white/60 hover:bg-white/80 rounded-md transition-colors"
                    >
                      <Menu className="h-4 w-4" />
                    </button>
                  <div className="flex items-center gap-2 text-sm font-semibold bg-white/80 text-[#2f3f82] px-3 py-1 rounded-full border border-[#e5e9f5]">
                    <Sparkles className="h-4 w-4" />
                    <span>{t('student.member_dashboard')}</span>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-[#1e2a55]">
                  {t('student.welcome_message', { name: user?.firstName || t('common.student') })}
                </h1>
                <div className="flex flex-wrap gap-2 items-center text-sm sm:text-base text-[#2f3f82]/80 mt-2">
                  <span>{formatDate(currentTime)} • {formatTime(currentTime)}</span>
                  {lastUpdated && (
                    <span className="text-xs text-stone-500">
                      {t('student.last_updated', { time: lastUpdated.toLocaleString(i18n.language) })}
                    </span>
                  )}
                </div>
                {chapters.length > 1 && (
                  <div className="mt-3">
                    <select
                      className="text-sm text-stone-800 bg-white border border-[#e5e9f5] rounded-lg px-3 py-2 shadow-sm"
                      value={activeChapterId || ''}
                      onChange={e => {
                        const id = Number(e.target.value);
                        setActiveChapterId(id);
                        setPrimaryMutation.mutate(id);
                      }}
                    >
                      {chapters.map((c: any) => (
                        <option key={c.chapter_id} value={c.chapter_id}>
                          {c.chapter_name || 'Chapter'} {c.is_primary ? '(Primary)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Completion Banner */}
          <ProfileCompletionBanner completionPercentage={profileCompletion} />

          {/* Inline alert if refetch failed but partial data exists */}
          {isError && (
            <Alert
              variant="error"
              title={t('dashboard.student.error_loading')}
              description={t('dashboard.student.error_loading_message')}
              actionLabel={t('dashboard.student.retry')}
              onAction={handleRetry}
            />
          )}

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
            <div className="space-y-5">
              {/* Learning CTA (direct users to courses hub) */}
              <div className="rounded-2xl bg-white border border-[#e5e9f5] shadow-sm p-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" style={{ color: primaryHex }} />
                    <h2 className="text-lg font-semibold text-stone-900">
                      {t('student.learning_hub')}
                    </h2>
                  </div>
                  <p className="text-stone-600 text-sm">
                    {t('student.learning_hub_desc')}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <Link
                      to={continueCourse ? `/member/courses/${continueCourse.id}` : '/member/all-courses'}
                      className={`inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-lg ${brandButtons.primary}`}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {continueCourse ? t('student.resume_course') : t('student.go_to_courses')}
                    </Link>
                    <Link
                      to="/member/all-courses"
                      className={`inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-lg border ${brandButtons.primaryGhost}`}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      {t('student.browse_catalog')}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {recentActivity.length > 0 && (
                <div className="rounded-2xl bg-white border border-[#e5e9f5] shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Compass className="h-5 w-5" style={{ color: primaryHex }} />
                    <h3 className="text-base font-semibold text-[#1e2a55]">{t('student.recent_activity')}</h3>
                  </div>
                  <div className="space-y-3">
                    {recentActivity.map((activity: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-[#e5e9f5] hover:bg-stone-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#1e2a55]">{activity.lesson_title}</p>
                            <p className="text-xs text-slate-500">{activity.course_title}</p>
                          </div>
                        </div>
                        <Link 
                          to={`/member/courses/${activity.course_id}?lesson=${activity.lesson_id}`}
                          className="text-xs font-medium text-[#2f3f82] hover:underline px-3 py-1.5 rounded-lg bg-[#eef2ff] hover:bg-[#e0e7ff] transition-colors"
                        >
                          {t('student.resume')}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {studentData?.recommendations && studentData.recommendations.length > 0 && (
                <div className="rounded-2xl bg-white border border-[#e5e9f5] shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" style={{ color: primaryHex }} />
                      <h3 className="text-base font-semibold text-[#1e2a55]">{t('student.recommended_for_you')}</h3>
                    </div>
                    <Link to="/member/all-courses" className="text-sm text-[#2f3f82] font-medium hover:underline">
                      {t('student.view_all')}
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {studentData.recommendations.map((course: any) => (
                      <Link 
                        key={course.id} 
                        to={`/member/courses/${course.id}`}
                        className="group block p-3 rounded-xl border border-[#e5e9f5] hover:border-[#2f3f82]/30 hover:shadow-md transition-all"
                      >
                        <div className="aspect-video rounded-lg bg-stone-200 mb-3 overflow-hidden">
                          {course.cover_image ? (
                            <img 
                              src={course.cover_image} 
                              alt={course.title} 
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400">
                              <BookOpen className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-semibold text-[#1e2a55] line-clamp-1 group-hover:text-[#2f3f82] transition-colors">{course.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{course.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Bookmarked */}
              <div className="rounded-2xl bg-white border border-[#e5e9f5] shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5" style={{ color: primaryHex }} />
                    <h3 className="text-base font-semibold text-[#1e2a55]">{t('student.bookmarked')}</h3>
                  </div>
                  <Link to="/member/bookmarks" className="text-sm text-[#2f3f82] font-medium hover:underline">
                    {t('student.manage')}
                  </Link>
                </div>
                {bookmarkedCourses.length > 0 ? (
                  <CourseGrid 
                    courses={bookmarkedCourses.slice(0, 2)}
                    compact={true}
                    onCourseAction={handleCourseAction}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center">
                    <Bookmark className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-700 font-medium">{t('student.no_bookmarks')}</p>
                    <p className="text-stone-500 text-sm mt-1">{t('student.no_bookmarks_desc')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right rail */}
            <div className="space-y-5">
              {/* Events */}
              <div className="rounded-2xl bg-white border border-[#e5e9f5] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5" style={{ color: primaryHex }} />
                  <h3 className="text-base font-semibold text-[#1e2a55]">{t('student.events')}</h3>
                </div>
                {isLoadingEvents || isLoadingGlobalEvents ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />
                    ))}
                  </div>
                ) : events.length > 0 ? (
                  <div className="space-y-3">
                    {events.slice(0, 4).map((item: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="p-3 rounded-xl border border-[#e5e9f5] hover:bg-stone-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedEvent(item)}
                      >
                        <p className="text-sm font-semibold text-[#1e2a55] line-clamp-2">
                          {item.title || t('student.default_event_title')}
                        </p>
                        {(item.date || item.start_time) && (
                          <p className="text-xs text-slate-600 mt-1">
                            {new Date(item.date || item.start_time).toLocaleString()}
                          </p>
                        )}
                        {item.location && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.location}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center">
                    <p className="text-slate-700 font-medium">{t('student.no_events')}</p>
                    <p className="text-slate-500 text-sm mt-1">{t('student.no_events_desc')}</p>
                  </div>
                )}
              </div>

              {/* Announcements */}
              <div className="rounded-2xl bg-white border border-[#e5e9f5] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5" style={{ color: accentHex }} />
                  <h3 className="text-base font-semibold text-[#1e2a55]">{t('student.announcements')}</h3>
                </div>
                {isLoadingAnnouncements || isLoadingGlobalAnnouncements ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />
                    ))}
                  </div>
                ) : announcements.length > 0 ? (
                  <div className="space-y-3">
                    {announcements.slice(0, 4).map((item: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-stone-100">
                        <p className="text-sm font-semibold text-stone-900 line-clamp-2">
                          {item.title || t('student.default_announcement_title')}
                        </p>
                        { (item.body || item.content || item.message) && (
                          <p className="text-xs text-stone-600 mt-1 line-clamp-3">
                            {item.body || item.content || item.message}
                          </p>
                        )}
                        { (item.timestamp || item.created_at || item.createdAt) && (
                          <p className="text-[11px] text-stone-500 mt-1">
                            {new Date(item.timestamp || item.created_at || item.createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center">
                    <p className="text-stone-700 font-medium">{t('student.no_announcements')}</p>
                    <p className="text-stone-500 text-sm mt-1">{t('student.no_announcements_desc')}</p>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="rounded-2xl bg-white border border-[#e5e9f5] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5" style={{ color: accentHex }} />
                  <h3 className="text-base font-semibold text-[#1e2a55]">{t('student.quick_actions')}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action, idx) => (
                    <Link
                      key={idx}
                      to={action.to}
                      className="group rounded-xl border border-[#e5e9f5] hover:border-[#2f3f82]/30 hover:shadow-md transition-all p-3 flex items-center gap-2 text-sm font-semibold text-[#1e2a55]"
                    >
                      <span className="p-2 rounded-lg bg-[#eef2ff] text-[#2f3f82] group-hover:bg-[#e5e9f5]">
                        <action.icon className="h-4 w-4" />
                      </span>
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Connect with your team */}
              <div className="rounded-2xl bg-white border border-[#e5e9f5] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <LifeBuoy className="h-5 w-5" style={{ color: primaryHex }} />
                  <h3 className="text-base font-semibold text-[#1e2a55]">{t('student.connect_team')}</h3>
                </div>
                <div className="space-y-3">
                  <Link
                    to="/member/help"
                    className="flex items-center justify-between rounded-xl border border-[#e5e9f5] px-3 py-2 hover:border-[#2f3f82]/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1e2a55]">
                      <LifeBuoy className="h-4 w-4" style={{ color: primaryHex }} />
                      {t('student.help_support')}
                    </div>
                    <span className="text-xs text-slate-500">{t('student.contact_support')}</span>
                  </Link>
                  <Link
                    to="/member/community-hub"
                    className="flex items-center justify-between rounded-xl border border-[#e5e9f5] px-3 py-2 hover:border-[#2f3f82]/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1e2a55]">
                      <Users className="h-4 w-4" style={{ color: primaryHex }} />
                      {t('student.ask_community')}
                    </div>
                    <span className="text-xs text-slate-500">{t('student.peers_teachers')}</span>
                  </Link>
                  <button
                    onClick={() => setContactModalOpen(true)}
                    className="flex items-center justify-between rounded-xl border border-[#e5e9f5] px-3 py-2 hover:border-[#2f3f82]/30 hover:shadow-sm transition-all w-full text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1e2a55]">
                      <LifeBuoy className="h-4 w-4" style={{ color: primaryHex }} />
                      {t('student.email_admin')}
                    </div>
                    <span className="text-xs text-slate-500">{t('student.contact_support')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EventDetailsModal 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
        event={selectedEvent} 
      />
      
      <ContactAdminModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />

      {/* Profile Completion Modal */}
      {profileModalOpen && (
        <ProfileCompletionModal 
          isOpen={true} 
          onClose={() => setProfileModalOpen(false)} 
        />
      )}
    </ErrorBoundary>
  );
};

export default React.memo(StudentDashboard);