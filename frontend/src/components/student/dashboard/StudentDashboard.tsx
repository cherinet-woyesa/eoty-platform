import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, Loader2, AlertCircle, Search, Menu, CheckCircle, Zap, Award, Target, Clock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import CourseGrid from './CourseGrid';
import { useWebSocket } from '@/hooks/useWebSocket';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import DashboardSearch from './DashboardSearch';
import { apiClient } from '@/services/api/apiClient';
import ProfileCompletionModal from '@/components/shared/ProfileCompletionModal';
import { useQuery } from '@tanstack/react-query';
import Alert from '@/components/common/Alert';
import ProgressBar from '@/components/common/ProgressBar';
import { Skeleton } from '@/components/common/Skeleton';

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
}

const StudentDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const wsRefreshTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    data: studentData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
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
  const { lastMessage, isConnected } = useWebSocket('/student/updates', {
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

  // Enhanced stats with real-time updates and memoization
  const stats = useMemo(() => [
    { 
      name: t('dashboard.student.courses_enrolled'), 
      value: studentData?.progress?.totalCourses.toString() || '0', 
      icon: BookOpen, 
      description: t('dashboard.student.courses_enrolled_desc')
    },
    { 
      name: t('dashboard.student.lessons_completed'), 
      value: studentData?.progress?.completedLessons.toString() || '0', 
      icon: CheckCircle, 
      description: t('dashboard.student.lessons_completed_desc')
    },
    { 
      name: t('dashboard.student.study_streak'), 
      value: `${studentData?.progress?.studyStreak || 0} days`, 
      icon: Zap, 
      description: t('dashboard.student.study_streak_desc')
    },
    { 
      name: t('dashboard.student.total_points'), 
      value: studentData?.progress?.totalPoints.toString() || '0', 
      icon: Award, 
      description: t('dashboard.student.total_points_desc')
    }
  ], [studentData, t]);

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

  const handleCourseAction = useCallback(async (courseId: string, action: string) => {
    switch (action) {
      case 'view':
        navigate(`/student/courses/${courseId}`);
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
        }
        break;
      case 'download-certificate':
        // Handle certificate download
        break;
      default:
        navigate(`/student/courses/${courseId}`);
    }
  }, [navigate]);




  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Show error if data failed to load
  if (error) {
    return (
      <div className="w-full space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-stone-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-800 mb-2">{t('dashboard.teacher.unable_to_load_title')}</h2>
            <p className="text-stone-600 mb-4">
              {error || t('dashboard.teacher.unable_to_load_message')}
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 font-semibold rounded-lg hover:shadow-lg transition-all"
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

  // Show only the profile completion modal for new users before dashboard UI
  if (profileModalOpen) {
    return (
      <ErrorBoundary>
        <ProfileCompletionModal isOpen={true} onClose={() => setProfileModalOpen(false)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
          {/* Header Section */}
          <div className="flex flex-col gap-4">
            {/* Welcome Section - match Teacher Dashboard style */}
            <div className="bg-gradient-to-r from-[#27AE60]/15 to-[#16A085]/15 rounded-lg p-4 border border-[#27AE60]/25 shadow-sm w-full">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="lg:hidden p-1.5 hover:bg-stone-200/50 rounded-md transition-colors text-stone-700"
                    >
                      <Menu className="h-4 w-4" />
                    </button>
                    <h1 className="text-xl font-semibold text-stone-800">{t('dashboard.teacher.welcome_back', { name: user?.firstName })}</h1>
                    {isConnected && (
                      <div className="flex items-center space-x-1.5 bg-[#27AE60]/15 px-2 py-0.5 rounded-full border border-[#27AE60]/40">
                        <div className="w-1.5 h-1.5 bg-[#27AE60] rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-medium text-stone-700">{t('dashboard.teacher.live')}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-stone-600 font-medium text-sm">
                    {formatDate(currentTime)} • {formatTime(currentTime)}
                  </p>
                  {/* Search Bar temporarily hidden */}
                  <div className="mt-4" />
                </div>
                <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-2">
                  <Link
                    to="/student/browse-courses"
                    className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    {t('dashboard.student.browse_courses')}
                  </Link>
                  <Link
                    to="/student/journeys"
                    className="inline-flex items-center px-4 py-2 bg-white hover:bg-stone-50 text-[#27AE60] text-sm font-semibold rounded-lg border border-[#27AE60]/30 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    {t('dashboard.student.spiritual_journeys')}
                  </Link>
                </div>
              </div>
            </div>
          </div>

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

          {/* Continue CTA (single highlight) */}
          {continueCourse && (
          <div className="bg-white rounded-xl border border-[#27AE60]/30 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                  <Zap className="h-4 w-4 text-[#27AE60]" />
                  {t('dashboard.student.continue_learning')}
                </div>
                <h3 className="text-lg font-bold text-stone-900 line-clamp-1">{continueCourse.title}</h3>
                <p className="text-sm text-stone-600 line-clamp-2">
                  {continueCourse.description || t('dashboard.student.keep_it_up')}
                </p>
                <div className="flex items-center gap-3">
                  <ProgressBar value={continueCourse.progress || 0} />
                  <span className="text-xs font-semibold text-stone-700">
                    {Math.round(continueCourse.progress || 0)}%
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <Link
                  to={`/student/courses/${continueCourse.id}`}
                  className="inline-flex items-center px-4 py-2 bg-[#27AE60] text-white text-sm font-semibold rounded-lg hover:bg-[#219150] transition-colors shadow-sm"
                >
                  {t('dashboard.student.resume_now')}
                </Link>
                <span className="text-xs text-stone-500">
                  {t('dashboard.student.last_accessed')}: {new Date(continueCourse.lastAccessed).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm hover:shadow-md transition-all duration-200 group"
                title={stat.description}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-stone-50 rounded-lg group-hover:bg-[#27AE60]/10 transition-colors">
                    <stat.icon className="h-5 w-5 text-stone-600 group-hover:text-[#27AE60] transition-colors" />
                  </div>
                  {index === 2 && ( // Streak badge
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                      HOT
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-800 mb-1">{stat.value}</p>
                  <p className="text-stone-500 text-sm font-medium">{stat.name}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 gap-6">
            {/* Left Column: Continue Learning & Recommendations */}
            <div className="space-y-6">
              
              {/* Continue Learning Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-[#27AE60]" />
                    {inProgressCourses.length > 0 && inProgressCourses[0].progress === 0 ? t('dashboard.student.start_learning') : t('dashboard.student.continue_learning')}
                  </h2>
                  <Link to="/student/all-courses" className="text-sm text-[#27AE60] font-medium hover:underline">
                    {t('dashboard.student.view_all')}
                  </Link>
                </div>
                
                {inProgressCourses.length > 0 ? (
                  <CourseGrid 
                    courses={inProgressCourses.slice(0, 2)} 
                    compact={true}
                    onCourseAction={handleCourseAction}
                  />
                ) : transformedCourses.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center border border-stone-200 border-dashed">
                    <BookOpen className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                    <h3 className="text-stone-800 font-medium mb-1">{t('dashboard.student.no_courses_title')}</h3>
                    <p className="text-stone-500 text-sm mb-4">{t('dashboard.student.no_courses_message')}</p>
                    <Link
                      to="/student/all-courses"
                      className="inline-flex items-center px-4 py-2 bg-[#27AE60] text-white text-sm font-medium rounded-lg hover:bg-[#219150] transition-colors"
                    >
                      {t('dashboard.student.view_all')}
                    </Link>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-8 text-center border border-stone-200 border-dashed">
                    <BookOpen className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                    <h3 className="text-stone-800 font-medium mb-1">{t('dashboard.student.no_active_courses')}</h3>
                    <p className="text-stone-500 text-sm mb-4">{t('dashboard.student.start_course_message')}</p>
                    <Link
                      to="/student/all-courses"
                      className="inline-flex items-center px-4 py-2 bg-[#27AE60] text-white text-sm font-medium rounded-lg hover:bg-[#219150] transition-colors"
                    >
                      {t('dashboard.student.view_all')}
                    </Link>
                  </div>
                )}
              </div>

              {/* Recommendations Section - removed per request */}
            </div>
          </div>

          {/* Empty State for Search */}
          {searchQuery && transformedCourses.length === 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-stone-800 mb-1">{t('dashboard.student.no_results_found')}</h3>
              <p className="text-stone-600 text-xs mb-3">
                {t('dashboard.student.no_results_message', { query: searchQuery })}
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 text-xs font-semibold rounded-lg hover:shadow-md transition-all"
              >
                {t('dashboard.student.clear_search')}
              </button>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(StudentDashboard);