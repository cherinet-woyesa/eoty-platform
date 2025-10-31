import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, BookOpen, Users, BarChart, 
  Plus, ArrowRight, PlayCircle, TrendingUp,
  Clock, Eye, Star, Zap, Target, Award,
  ChevronRight, Activity, Bookmark, MessageCircle,
  Loader2, AlertCircle, CheckCircle, DollarSign,
  GraduationCap, ThumbsUp, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import TeacherMetrics from './TeacherMetrics';
import CourseManagement from './CourseManagement';
import StudentPerformance from './StudentPerformance';
import EngagementAnalytics from './EngagementAnalytics';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import UpcomingTasks from './UpcomingTasks';
import { useRealTimeData } from '../../../hooks/useRealTimeData';
import { useWebSocket } from '../../../hooks/useWebSocket';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorBoundary from '../../common/ErrorBoundary';
import { useTranslation } from 'react-i18next'; // Added translation hook

const TeacherDashboard: React.FC = () => {
  const { t } = useTranslation(); // Added translation hook
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState('overview');
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>(undefined);

  // Real-time teacher data
  const initialTeacherData = useMemo(() => ({
    stats: {
      totalCourses: 8,
      totalStudents: 247,
      totalLessons: 156,
      totalHours: 342
  
    },
    courses: [],
    recentActivity: [],
    studentPerformance: [],
    upcomingTasks: []
  }), []);

  const { data: teacherData, error, isLoading, refetch } = useRealTimeData('/teacher/dashboard', initialTeacherData);

  // WebSocket for live student activity and notifications
  const { lastMessage } = useWebSocket('/teacher/updates');

  // Update time every minute
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle real-time updates
  React.useEffect(() => {
    if (lastMessage) {
      const update = JSON.parse(lastMessage.data);
      console.log('Real-time teacher update:', update);
      // Handle different types of updates (new enrollments, submissions, etc.)
    }
  }, [lastMessage]);

  const views = useMemo(() => [
    { id: 'overview', name: t('dashboard.teacher.title'), icon: '📊' }, 
    { id: 'courses', name: t('common.my_courses'), icon: '📚' }, 
    { id: 'students', name: t('common.community'), icon: '👥' }, 
    { id: 'analytics', name: t('dashboard.teacher.view_analytics'), icon: '📈' }, 
    { id: 'engagement', name: t('common.engagement'), icon: '🎯' },
    { id: 'content', name: t('common.resources'), icon: '🎥' } 
  ], [t]); // Added t to dependency array

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCourseSelect = useCallback((courseId: string) => {
    setSelectedCourse(courseId);
    setActiveView('analytics');
  }, []);

  const renderViewContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text={t('common.loading')} /> 
        </div>
      );
    }

    switch (activeView) {
      case 'courses':
        return <CourseManagement courses={teacherData?.courses || []} />;
      case 'students':
        return <StudentPerformance data={teacherData?.studentPerformance || []} />;
      case 'analytics':
        return <EngagementAnalytics courseId={selectedCourse} />;
      case 'engagement':
        return (
          <div className="space-y-6">
            <EngagementAnalytics />
            <StudentPerformance data={teacherData?.studentPerformance || []} compact />
          </div>
        );
      case 'content':
        return (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('common.resources')}</h2> 
            <p className="text-gray-600">{t('courses.manage_organize')}</p> 
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            {/* Teacher Metrics - Now only shows first 4 metrics */}
            <TeacherMetrics stats={{ ...teacherData?.stats, averageRating: 4.8, completionRate: 78, engagementScore: 85 }} />
            
            {/* Quick Actions & Upcoming Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <div>
                <QuickActions />
              </div>

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

            {/* Recent Activity */}
            <RecentActivity activities={teacherData?.recentActivity || []} />
          </div>
        );
    }
  };

  if (error) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg mb-4">{t('common.error')}</p> 
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('common.try_again')} 
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold">{t('dashboard.teacher.title')}</h1> 
                {lastMessage && (
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
                {t('dashboard.teacher.inspiring_students', 'Inspiring {{students}} students across {{courses}} courses', { // Updated to use translation
                  students: teacherData?.stats?.totalStudents || 0,
                  courses: teacherData?.stats?.totalCourses || 0
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
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  activeView === view.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
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