import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Loader2, AlertCircle, Search, Menu
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import CourseGrid from './CourseGrid';
import { useDashboardData } from '@/hooks/useRealTimeData';
import { useWebSocket } from '@/hooks/useWebSocket';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import DashboardSearch from './DashboardSearch';

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

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            // Refresh dashboard data
            refetch();
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
      description: 'Total courses enrolled'
    },
    { 
      name: 'Lessons Completed', 
      value: studentData?.progress?.completedLessons.toString() || '0', 
      icon: CheckCircle, 
      description: 'Lessons finished this month'
    },
    { 
      name: 'Study Streak', 
      value: `${studentData?.progress?.studyStreak || 0} days`, 
      icon: Zap, 
      description: 'Current learning streak'
    },
    { 
      name: 'Total Points', 
      value: studentData?.progress?.totalPoints.toString() || '0', 
      icon: Award, 
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




  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Only show error if it's not a canceled request (which is expected during navigation)
  if (error && !error.includes('canceled') && !error.includes('CanceledError') && !error.includes('ERR_CANCELED')) {
    return (
      <div className="w-full space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-stone-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-800 mb-2">Unable to Load Dashboard</h2>
            <p className="text-stone-600 mb-4">
              {error || 'We encountered an error while loading your dashboard data.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                <Loader2 className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
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

        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Header Section - Simplified */}
          <div className="flex flex-col gap-4">
            {/* Welcome Section - Light Beige/Silver */}
            <div className="bg-gradient-to-r from-stone-100 via-neutral-100 to-slate-100 rounded-2xl p-4 sm:p-6 border border-stone-200/50 shadow-sm w-full">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="lg:hidden p-2 hover:bg-stone-200/50 rounded-lg transition-colors text-stone-700"
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl sm:text-2xl font-bold text-stone-800">Welcome back, {user?.firstName}!</h1>
                    {isConnected && (
                      <div className="flex items-center space-x-1 text-emerald-600">
                        <div className="w-2 h-2 bg-[#39FF14] rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium">Live</span>
                      </div>
                    )}
                  </div>
                  <p className="text-stone-600 text-sm sm:text-base">
                    {formatDate(currentTime)} • {formatTime(currentTime)}
                  </p>
                  {/* Search Bar */}
                  <div className="mt-4">
                    <DashboardSearch
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      resultsCount={studentData?.enrolledCourses?.length || 0}
                    />
                  </div>
                </div>
                <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-2">
                  <Link
                    to="/courses"
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 text-sm font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Courses
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid - Light Beige/Silver */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-br from-stone-50 to-neutral-50 rounded-xl p-3 sm:p-4 border border-stone-200/50 shadow-sm hover:shadow-md transition-all duration-200 group"
                title={stat.description}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-[#39FF14] to-[#00FFC6] shadow-sm group-hover:scale-110 transition-transform">
                    <stat.icon className="h-4 w-4 text-stone-900" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-stone-800 mb-1">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-stone-600 font-medium">{stat.name}</p>
                </div>
              </div>
            ))}
          </div>


          {/* Enrolled Courses */}
          <CourseGrid 
            courses={studentData?.enrolledCourses || []} 
            compact={false}
            onCourseAction={handleCourseAction}
          />

          {/* Empty State for Search */}
          {searchQuery && studentData?.enrolledCourses?.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-stone-800 mb-2">No results found</h3>
              <p className="text-stone-600 mb-4">
                No courses match your search for "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(StudentDashboard);