import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Users, Clock, Star, Target, Award,
  PlayCircle, CheckCircle, TrendingUp, Calendar,
  MessageCircle, Bookmark, Zap, Activity,
  Loader2, AlertCircle, ArrowRight, Brain,
  Target as TargetIcon, Calendar as CalendarIcon
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import ProgressTracker from './ProgressTracker';
import CourseGrid from './CourseGrid';
import StudyStreak from './StudyStreak';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import LearningRecommendations from './LearningRecommendations';
import { useRealTimeData } from '../../../hooks/useRealTimeData';
import { useWebSocket } from '../../../hooks/useWebSocket';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorBoundary from '../../common/ErrorBoundary';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState('overview');

  // Real-time student data
  const { data: studentData, error, isLoading, refetch } = useRealTimeData('/student/dashboard', {
    progress: {
      totalCourses: 5,
      completedCourses: 2,
      totalLessons: 48,
      completedLessons: 23,
      studyStreak: 7,
      totalPoints: 1250,
      nextGoal: 'Complete 5 more lessons',
      weeklyGoal: 10,
      weeklyProgress: 7
    },
    enrolledCourses: [],
    recentActivity: [],
    recommendations: []
  });

  // WebSocket for live updates (new messages, course updates, etc.)
  const { lastMessage } = useWebSocket('/student/updates');

  // Update time every minute
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => [
    { 
      name: 'Courses Enrolled', 
      value: studentData?.progress?.totalCourses.toString() || '0', 
      icon: BookOpen, 
      change: '+1', 
      changeType: 'positive',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100'
    },
    { 
      name: 'Lessons Completed', 
      value: studentData?.progress?.completedLessons.toString() || '0', 
      icon: CheckCircle, 
      change: '+3', 
      changeType: 'positive',
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100'
    },
    { 
      name: 'Study Streak', 
      value: `${studentData?.progress?.studyStreak || 0} days`, 
      icon: Zap, 
      change: '+2', 
      changeType: 'positive',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100'
    },
    { 
      name: 'Total Points', 
      value: studentData?.progress?.totalPoints.toString() || '0', 
      icon: Award, 
      change: '+50', 
      changeType: 'positive',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100'
    }
  ], [studentData]);

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

  if (isLoading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text="Loading your learning dashboard..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg mb-4">Failed to load dashboard data</p>
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
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
                <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
                {lastMessage && (
                  <div className="flex items-center space-x-2 text-blue-100">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Live</span>
                  </div>
                )}
              </div>
              <p className="text-blue-100 text-sm sm:text-base">
                {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
              <p className="text-blue-200 text-xs sm:text-sm mt-1">
                {studentData?.progress?.weeklyProgress}/{studentData?.progress?.weeklyGoal} weekly lessons completed
              </p>
            </div>
            <div className="mt-4 lg:mt-0 lg:ml-6">
              <Link
                to="/courses"
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Courses
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, index) => (
            <div key={index} className={`bg-gradient-to-br ${stat.bgColor} rounded-xl p-3 sm:p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} shadow-sm`}>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <QuickActions />
            <CourseGrid courses={studentData?.enrolledCourses || []} />
            <LearningRecommendations recommendations={studentData?.recommendations || []} />
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-4 sm:space-y-6">
            <ProgressTracker progress={studentData?.progress} />
            <StudyStreak streak={studentData?.progress?.studyStreak} />
            <RecentActivity activities={studentData?.recentActivity || []} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(StudentDashboard);