import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, BookOpen, Users, BarChart, 
  Plus, ArrowRight, PlayCircle, TrendingUp,
  Clock, Eye, Star, Zap, Target, Award,
  ChevronRight, Activity, Bookmark, MessageCircle,
  Loader2, AlertCircle, CheckCircle, DollarSign,
  GraduationCap, ThumbsUp, MessageSquare, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import TeacherMetrics from './TeacherMetrics';
import CourseManagement from './CourseManagement';
import StudentPerformance from './StudentPerformance';
import EngagementAnalytics from './EngagementAnalytics';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import UpcomingTasks from './UpcomingTasks';
import VideoAnalyticsDashboard from './VideoAnalyticsDashboard';
import { useRealTimeData } from '../../../hooks/useRealTimeData';
import { useWebSocket } from '../../../hooks/useWebSocket';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorBoundary from '../../common/ErrorBoundary';
import { useTranslation } from 'react-i18next';

// Types
interface DashboardView {
  id: string;
  name: string;
  icon: string;
  requiredRole?: string;
}

interface TeacherStats {
  totalCourses: number;
  totalStudentsEnrolled: number;
  totalLessons: number;
  averageCompletionRate: number;
  averageRating?: number;
  revenue?: number;
  courses: any[];
  recentActivity: any[];
  studentPerformance: any[];
  upcomingTasks: any[];
}

const TeacherDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState('overview');
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>(undefined);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Real-time teacher data
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
  } = useRealTimeData('/teacher/dashboard', initialTeacherData);

  // WebSocket for live student activity and notifications
  const { lastMessage, isConnected } = useWebSocket('/teacher/updates');

  // Update time every minute and track last update
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      // Update last update time if data was refreshed recently
      if (isLoading) {
        setLastUpdate(now);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [isLoading]);

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const update = JSON.parse(lastMessage.data);
        console.log('Real-time teacher update:', update);
        
        // Handle different types of updates
        switch (update.type) {
          case 'new_enrollment':
            // Trigger data refresh for student counts
            refetch();
            break;
          case 'course_completed':
            // Update completion rates
            refetch();
            break;
          case 'new_submission':
            // Refresh recent activity
            refetch();
            break;
          default:
            console.log('Unhandled update type:', update.type);
        }
      } catch (parseError) {
        console.error('Failed to parse WebSocket message:', parseError);
      }
    }
  }, [lastMessage, refetch]);

  const views = useMemo((): DashboardView[] => [
    { id: 'overview', name: t('dashboard.teacher.title'), icon: '📊' },
    { id: 'courses', name: t('dashboard.teacher.my_courses'), icon: '📚' },
    { id: 'students', name: t('common.community'), icon: '👥' },
    { id: 'video-analytics', name: t('dashboard.teacher.video_analytics'), icon: '🎬' },
    { id: 'analytics', name: t('dashboard.teacher.view_analytics'), icon: '📈' },
    { id: 'engagement', name: t('common.engagement'), icon: '🎯' },
    { id: 'content', name: t('common.resources'), icon: '🎥' }
  ], [t]);

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

  const formatLastUpdate = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return t('common.just_now');
    if (minutes < 60) return t('common.minutes_ago', { count: minutes });
    if (minutes < 1440) return t('common.hours_ago', { count: Math.floor(minutes / 60) });
    return t('common.days_ago', { count: Math.floor(minutes / 1440) });
  }, [t]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCourseSelect = useCallback((courseId: string) => {
    setSelectedCourse(courseId);
    setActiveView('analytics');
  }, []);

  const renderViewContent = () => {
    if (isLoading && !teacherData) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text={t('common.loading_dashboard')} />
        </div>
      );
    }

    if (error && !teacherData) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('common.loading_error')}
            </h3>
            <p className="text-gray-600 mb-4">
              {error || t('common.failed_to_load_data')}
            </p>
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? t('common.retrying') : t('common.try_again')}
            </button>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'courses':
        return (
          <CourseManagement 
            courses={teacherData?.courses || []} 
            onCourseSelect={handleCourseSelect}
          />
        );
      case 'students':
        return (
          <StudentPerformance 
            data={teacherData?.studentPerformance || []} 
          />
        );
      case 'video-analytics':
        return <VideoAnalyticsDashboard />;
      case 'analytics':
        return <EngagementAnalytics courseId={selectedCourse} />;
      case 'engagement':
        return (
          <div className="space-y-6">
            <EngagementAnalytics />
            <StudentPerformance 
              data={teacherData?.studentPerformance || []} 
              compact 
            />
          </div>
        );
      case 'content':
        return (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('common.resources')}
            </h2>
            <p className="text-gray-600">
              {t('courses.manage_organize')}
            </p>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            {/* Status Bar */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                {isConnected && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>{t('common.live_updates')}</span>
                  </div>
                )}
                {lastUpdate && (
                  <span>
                    {t('common.last_updated')}: {formatLastUpdate(lastUpdate)}
                  </span>
                )}
              </div>
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{t('common.refresh')}</span>
              </button>
            </div>

            {/* Teacher Metrics */}
            <TeacherMetrics 
              stats={teacherData} 
              includeVideoAnalytics={true}
            />
            
            {/* Quick Actions & Upcoming Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuickActions />
              <UpcomingTasks tasks={teacherData?.upcomingTasks || []} />
            </div>

            {/* Course Management & Student Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CourseManagement 
                courses={teacherData?.courses || []} 
                onCourseSelect={handleCourseSelect}
                compact 
              />
              <StudentPerformance 
                data={teacherData?.studentPerformance || []} 
                compact 
              />
            </div>

            {/* Video Analytics Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Video className="h-5 w-5 mr-2 text-purple-600" />
                  {t('dashboard.teacher.video_analytics')}
                </h3>
                <button
                  onClick={() => setActiveView('video-analytics')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center transition-colors"
                >
                  {t('common.view_details')}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                {t('dashboard.teacher.video_analytics_description')}
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <div className="text-xs text-gray-600">{t('common.total_views')}</div>
                  <div className="text-lg font-bold text-gray-900">-</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                  <div className="text-xs text-gray-600">{t('common.watch_time')}</div>
                  <div className="text-lg font-bold text-gray-900">-</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Target className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <div className="text-xs text-gray-600">{t('common.completion')}</div>
                  <div className="text-lg font-bold text-gray-900">-</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <RecentActivity activities={teacherData?.recentActivity || []} />
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold">
                  {t('dashboard.teacher.title')}
                </h1>
                {isConnected && (
                  <div className="flex items-center space-x-2 text-blue-100">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">{t('common.live_updates')}</span>
                  </div>
                )}
              </div>
              <p className="text-blue-100 text-sm sm:text-base">
                {t('common.welcome')}, {user?.firstName}! {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
              <p className="text-blue-200 text-xs sm:text-sm mt-1">
                {t('dashboard.teacher.inspiring_students', {
                  students: teacherData?.totalStudentsEnrolled || 0,
                  courses: teacherData?.totalCourses || 0
                })}
              </p>
            </div>
            <div className="mt-4 lg:mt-0 lg:ml-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  to="/record"
                  className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
                >
                  <Video className="h-4 w-4 mr-2" />
                  {t('dashboard.teacher.record_new_video')}
                </Link>
                <Link
                  to="/courses/new"
                  className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('dashboard.teacher.create_course')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* View Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeView === view.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-gray-200'
                }`}
              >
                <span className="mr-2">{view.icon}</span>
                {view.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="min-h-96">
          {renderViewContent()}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(TeacherDashboard);