import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Users, Clock, Star, Target, Award,
  PlayCircle, CheckCircle, TrendingUp, Calendar,
  MessageCircle, Bookmark, Zap, Activity,
  Loader2, AlertCircle, ArrowRight, Brain,
  Target as TargetIcon, Calendar as CalendarIcon,
  Search, Filter, Settings, Bell, Download,
  BarChart3, Rocket, Crown, Sparkles, Menu, X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ProgressTracker from './ProgressTracker';
import CourseGrid from './CourseGrid';
import StudyStreak from './StudyStreak';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import LearningRecommendations from './LearningRecommendations';
import { useDashboardData } from '@/hooks/useRealTimeData';
import { useWebSocket } from '@/hooks/useWebSocket';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import DashboardSearch from './DashboardSearch';
import ViewCustomizer from './ViewCustomizer';

// Skeleton loader components
const DashboardSkeleton: React.FC = React.memo(() => (
  <div className="w-full space-y-6 p-6">
    {/* Welcome Section Skeleton */}
    <div className="bg-gray-200 rounded-xl p-6 animate-pulse h-32"></div>
    
    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-200 rounded-xl p-4 animate-pulse h-24"></div>
      ))}
    </div>
    
    {/* Main Content Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl p-6 animate-pulse h-64"></div>
        ))}
      </div>
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl p-6 animate-pulse h-48"></div>
        ))}
      </div>
    </div>
  </div>
));

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New course available', read: false },
    { id: 2, message: 'Study reminder', read: true }
  ]);

  // Enhanced real-time data with error boundaries and retry
  const { 
    data: studentData, 
    error, 
    isLoading, 
    refetch, 
    isFetching,
    lastUpdated 
  } = useDashboardData();

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
        
        switch (message.type) {
          case 'COURSE_PROGRESS_UPDATE':
            // Show notification for progress updates
            setNotifications(prev => [{
              id: Date.now(),
              message: `Progress updated: ${message.data.courseTitle}`,
              read: false
            }, ...prev]);
            break;
          case 'NEW_RECOMMENDATION':
            // Refresh recommendations with debouncing
            const recommendationTimer = setTimeout(() => {
              refetch();
            }, 2000);
            return () => clearTimeout(recommendationTimer);
          case 'ACTIVITY_UPDATE':
            // Refresh activities with debouncing
            const activityTimer = setTimeout(() => {
              refetch();
            }, 2000);
            return () => clearTimeout(activityTimer);
          case 'STREAK_MILESTONE':
            // Show streak celebration
            console.log('Streak milestone reached:', message.data);
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    }
  }, [lastMessage, refetch]);

  // Update time every minute with cleanup
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Enhanced stats with real-time updates and memoization
  const stats = useMemo(() => [
    { 
      name: 'Courses Enrolled', 
      value: studentData?.progress?.totalCourses.toString() || '0', 
      icon: BookOpen, 
      change: '+1', 
      changeType: 'positive',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      description: 'Total courses enrolled'
    },
    { 
      name: 'Lessons Completed', 
      value: studentData?.progress?.completedLessons.toString() || '0', 
      icon: CheckCircle, 
      change: '+3', 
      changeType: 'positive',
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      description: 'Lessons finished this month'
    },
    { 
      name: 'Study Streak', 
      value: `${studentData?.progress?.studyStreak || 0} days`, 
      icon: Zap, 
      change: '+2', 
      changeType: 'positive',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      description: 'Current learning streak'
    },
    { 
      name: 'Total Points', 
      value: studentData?.progress?.totalPoints.toString() || '0', 
      icon: Award, 
      change: '+50', 
      changeType: 'positive',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100',
      description: 'Achievement points earned'
    }
  ], [studentData]);

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

  const handleCourseAction = useCallback((courseId: string, action: string) => {
    console.log('Course action:', action, courseId);
    // Handle different course actions
    switch (action) {
      case 'view':
        navigate(`/courses/${courseId}`);
        break;
      case 'bookmark':
        // API call to bookmark course
        break;
      case 'download-certificate':
        // Handle certificate download
        break;
      default:
        console.log('Unknown course action:', action);
    }
  }, [navigate]);

  const handleRecommendationAction = useCallback((recommendationId: string, action: string) => {
    console.log('Recommendation action:', action, recommendationId);
    // Handle recommendation actions
  }, []);

  const handleActivityAction = useCallback((activityId: string, action: string) => {
    console.log('Activity action:', action, activityId);
    // Handle activity actions
  }, []);

  const handleStreakAction = useCallback((action: string, data?: any) => {
    console.log('Streak action:', action, data);
    // Handle streak actions
  }, []);

  const handleExportProgress = useCallback((format: 'pdf' | 'image') => {
    console.log('Export progress as:', format);
    // Handle progress export
  }, []);

  const handleShareProgress = useCallback(() => {
    console.log('Share progress');
    // Handle progress sharing
  }, []);

  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.read).length, 
    [notifications]
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="w-full space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h2>
            <p className="text-gray-600 mb-4">
              {error || 'We encountered an error while loading your dashboard data.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Loader2 className="h-4 w-4 mr-2" />
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Header Section with Search and Controls */}
          <div className="flex flex-col gap-4">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-4 sm:p-6 text-white shadow-lg w-full">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
                    <div className="flex items-center space-x-2">
                      {isConnected && (
                        <div className="flex items-center space-x-1 text-blue-100">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-sm">Live</span>
                        </div>
                      )}
                      {isFetching && (
                        <Loader2 className="h-4 w-4 text-blue-200 animate-spin" />
                      )}
                    </div>
                  </div>
                  <p className="text-blue-100 text-sm sm:text-base">
                    {formatDate(currentTime)} • {formatTime(currentTime)}
                  </p>
                  <p className="text-blue-200 text-xs sm:text-sm mt-1">
                    {studentData?.progress?.weeklyProgress}/{studentData?.progress?.weeklyGoal} weekly lessons completed
                    {lastUpdated && (
                      <span className="ml-2">• Updated {formatTime(lastUpdated)}</span>
                    )}
                  </p>
                  {/* Search Bar - Moved here */}
                  <div className="mt-4">
                    <DashboardSearch
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      resultsCount={studentData?.enrolledCourses?.length || 0}
                    />
                  </div>
                </div>
                <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-2">
                  {/* Notifications */}
                  <div className="relative">
                    <button className="relative p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                      <Bell className="h-4 w-4" />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {unreadNotifications}
                        </span>
                      )}
                    </button>
                  </div>

                  <Link
                    to="/courses"
                    className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Courses
                  </Link>
                  <button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="inline-flex items-center px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className={`bg-gradient-to-br ${stat.bgColor} rounded-xl p-3 sm:p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer`}
                title={stat.description}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} shadow-sm group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-green-700">{stat.change}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.name}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats Bar */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-sm font-medium text-gray-900">{studentData?.progress?.averageScore || 0}%</div>
                <div className="text-xs text-gray-500">Avg. Score</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{Math.floor((studentData?.progress?.timeSpent || 0) / 60)}h</div>
                <div className="text-xs text-gray-500">Study Time</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{studentData?.progress?.certificatesEarned || 0}</div>
                <div className="text-xs text-gray-500">Certificates</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{studentData?.progress?.rank || 'N/A'}</div>
                <div className="text-xs text-gray-500">Global Rank</div>
              </div>
            </div>
          </div>

          {/* View Customizer */}
          {isSettingsOpen && (
            <ViewCustomizer
              activeView={activeView}
              onViewChange={setActiveView}
              onClose={() => setIsSettingsOpen(false)}
            />
          )}

          <QuickActions 
            onActionClick={(actionId, action) => console.log('Quick action:', actionId, action)}
            recentActions={['my-courses', 'ai-assistant']}
            pinnedActions={['progress', 'achievements']}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Main Content - 2/3 width */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              
              <CourseGrid 
                courses={studentData?.enrolledCourses || []} 
                compact={activeView === 'compact'}
                onCourseAction={handleCourseAction}
              />
              
              <LearningRecommendations 
                recommendations={studentData?.recommendations || []}
                onRecommendationAction={handleRecommendationAction}
              />
            </div>

            {/* Sidebar - 1/3 width */}
            <div className="space-y-4 sm:space-y-6">
              
              <StudyStreak 
                streak={studentData?.progress?.studyStreak}
                onStreakAction={handleStreakAction}
                userLevel={studentData?.progress?.level ? 2 : 1}
                totalStudyTime={studentData?.progress?.timeSpent}
                longestStreak={studentData?.progress?.studyStreak || 0}
                weeklyGoal={studentData?.progress?.weeklyGoal}
                weeklyProgress={studentData?.progress?.weeklyProgress}
              />
              
              <RecentActivity 
                activities={studentData?.recentActivity || []}
                compact={activeView === 'compact'}
                onActivityAction={handleActivityAction}
                onMarkAllRead={() => console.log('Mark all activities read')}
              />
            </div>
          </div>

          {/* Empty State for Search */}
          {searchQuery && studentData?.enrolledCourses?.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">
                No courses match your search for "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Motivation Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Rocket className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="text-lg font-semibold text-purple-900">Keep up the great work!</h3>
                  <p className="text-purple-700 text-sm">
                    You're making excellent progress. {studentData?.progress?.studyStreak && studentData.progress.studyStreak >= 5 
                      ? `Your ${studentData.progress.studyStreak}-day streak is impressive!` 
                      : 'Complete one more lesson today to maintain your streak.'}
                  </p>
                </div>
              </div>
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(StudentDashboard);