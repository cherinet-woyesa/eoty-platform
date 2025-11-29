import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Loader2, AlertCircle, Search, Menu, CheckCircle, Zap, Award, Target
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import CourseGrid from './CourseGrid';
import { useWebSocket } from '@/hooks/useWebSocket';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import DashboardSearch from './DashboardSearch';
import { apiClient } from '@/services/api/apiClient';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data directly from API (same as StudentCourses page)
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/students/dashboard');
      
      if (response.data.success) {
        setStudentData(response.data.data);
        console.log('✅ Dashboard data loaded from API:', response.data.data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
            loadDashboardData();
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    }
  }, [lastMessage, loadDashboardData]);

  // Update time every minute with cleanup
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Transform enrolled courses from API to match CourseGrid interface
  const transformedCourses = useMemo(() => {
    if (!studentData?.enrolledCourses || !Array.isArray(studentData.enrolledCourses)) {
      console.log('📚 No enrolled courses found in studentData:', studentData);
      return [];
    }
    
    console.log('📚 Transforming enrolled courses from API:', studentData.enrolledCourses);
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
    
    console.log('📚 Transformed courses:', transformed);
    return transformed;
  }, [studentData?.enrolledCourses]);

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
    loadDashboardData();
  }, [loadDashboardData]);

  const handleCourseAction = useCallback((courseId: string, action: string) => {
    console.log('Course action:', action, courseId);
    // Handle different course actions
    switch (action) {
      case 'view':
        navigate(`/student/courses/${courseId}`);
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

  // Show error if data failed to load
  if (error) {
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
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 font-semibold rounded-lg hover:shadow-lg transition-all"
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
                    <h1 className="text-xl font-semibold text-stone-800">Welcome back, {user?.firstName}!</h1>
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
                  {/* Search Bar */}
                  <div className="mt-4">
                    <DashboardSearch
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      resultsCount={transformedCourses.length || 0}
                    />
                  </div>
                </div>
                <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-2">
                  <Link
                    to="/student/browse-courses"
                    className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Courses
                  </Link>
                  <Link
                    to="/student/journeys"
                    className="inline-flex items-center px-4 py-2 bg-white hover:bg-stone-50 text-[#27AE60] text-sm font-semibold rounded-lg border border-[#27AE60]/30 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Spiritual Journeys
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm hover:shadow-md transition-all hover:border-[#27AE60]/40"
                title={stat.description}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#27AE60]/15 to-[#16A085]/15 rounded-md blur-md"></div>
                    <div className="relative p-1.5 bg-gradient-to-br from-[#27AE60]/8 to-[#16A085]/8 rounded-md border border-[#27AE60]/25">
                      <stat.icon className="h-3 w-3 text-stone-700" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-bold text-stone-800 mb-0.5">{stat.value}</p>
                  <p className="text-stone-600 text-xs font-medium">{stat.name}</p>
                </div>
              </div>
            ))}
          </div>


          {/* Enrolled Courses */}
          <CourseGrid 
            courses={transformedCourses} 
            compact={false}
            onCourseAction={handleCourseAction}
          />

          {/* Empty State for Search */}
          {searchQuery && transformedCourses.length === 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-stone-800 mb-1">No results found</h3>
              <p className="text-stone-600 text-xs mb-3">
                No courses match your search for "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 text-xs font-semibold rounded-lg hover:shadow-md transition-all"
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