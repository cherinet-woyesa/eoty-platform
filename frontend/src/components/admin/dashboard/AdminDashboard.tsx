import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiClient } from '@/services/api/apiClient';
import { Users, BookOpen, Video, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';

interface AdminDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  activeCourses: number;
  completedLessons: number;
  newRegistrations: number;
  pendingApprovals: number;
  flaggedContent: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    activeCourses: 0,
    completedLessons: 0,
    newRegistrations: 0,
    pendingApprovals: 0,
    flaggedContent: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load admin stats directly from API (same approach as teacher dashboard)
  const loadAdminStats = useCallback(async () => {
    if (!user || user.role !== 'admin' && user.role !== 'platform_admin') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get('/admin/stats');
      
      if (response.data.success) {
        const data = response.data.data;
        console.log('✅ Admin stats loaded:', data);
        
        setStats({
          totalUsers: data.totalUsers || 0,
          activeUsers: data.activeUsers || 0,
          activeCourses: data.activeCourses || 0,
          completedLessons: data.completedLessons || 0,
          newRegistrations: data.newRegistrations || 0,
          pendingApprovals: data.pendingApprovals || 0,
          flaggedContent: data.flaggedContent || 0
        });
      } else {
        throw new Error(response.data.message || 'Failed to load admin stats');
      }
    } catch (err: any) {
      console.error('❌ Failed to load admin stats:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load admin statistics');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadAdminStats();
  }, [loadAdminStats]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) return;
    
    const interval = setInterval(() => {
      loadAdminStats();
    }, 60000);

    return () => clearInterval(interval);
  }, [user, loadAdminStats]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // WebSocket for live admin updates
  const dashboardWsUrl = user?.id ? `?type=dashboard&userId=${user.id}` : '';
  const { lastMessage, isConnected } = useWebSocket(dashboardWsUrl, {
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    heartbeatInterval: 30000,
    disableReconnect: !user?.id
  });

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage && lastMessage.data) {
      try {
        const update = typeof lastMessage.data === 'string' 
          ? JSON.parse(lastMessage.data) 
          : lastMessage.data;
        
        console.log('Real-time admin update:', update);
        
        // Refresh stats when updates occur
        if (update.type === 'dashboard_update' || update.type === 'metrics_update') {
          setTimeout(() => loadAdminStats(), 1000);
        }
      } catch (parseError) {
        console.error('Failed to parse WebSocket message:', parseError);
      }
    }
  }, [lastMessage, loadAdminStats]);

  // Essential metrics only - clean and focused
  const metrics = [
    {
      id: 'totalUsers',
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <Users className="h-6 w-6" />,
      color: 'from-blue-500 to-blue-600',
      link: '/admin/users'
    },
    {
      id: 'activeUsers',
      title: 'Active Users',
      value: stats.activeUsers,
      icon: <Users className="h-6 w-6" />,
      color: 'from-green-500 to-green-600',
      link: '/admin/users'
    },
    {
      id: 'activeCourses',
      title: 'Active Courses',
      value: stats.activeCourses,
      icon: <BookOpen className="h-6 w-6" />,
      color: 'from-purple-500 to-purple-600',
      link: '/admin/courses'
    },
    {
      id: 'completedLessons',
      title: 'Completed Lessons',
      value: stats.completedLessons,
      icon: <Video className="h-6 w-6" />,
      color: 'from-indigo-500 to-indigo-600',
      link: '/admin/analytics'
    },
    {
      id: 'newRegistrations',
      title: 'New This Week',
      value: stats.newRegistrations,
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'from-orange-500 to-orange-600',
      link: '/admin/users'
    },
    {
      id: 'flaggedContent',
      title: 'Flagged Content',
      value: stats.flaggedContent,
      icon: <AlertTriangle className="h-6 w-6" />,
      color: stats.flaggedContent > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500',
      link: '/admin/moderation',
      isAlert: stats.flaggedContent > 0
    },
    {
      id: 'pendingApprovals',
      title: 'Pending Teacher Apps',
      value: stats.pendingApprovals,
      icon: <Users className="h-6 w-6" />,
      color: stats.pendingApprovals > 0 ? 'from-amber-500 to-amber-600' : 'from-gray-400 to-gray-500',
      link: '/admin/teacher-applications',
      isAlert: stats.pendingApprovals > 0
    }
  ];



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
    loadAdminStats();
  }, [loadAdminStats]);

  if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You must be logged in as an admin to view this dashboard.</p>
        </div>
      </div>
    );
  }

  if (isLoading && stats.totalUsers === 0) {
    return (
      <div className="w-full space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text="Loading admin dashboard..." />
        </div>
      </div>
    );
  }

  if (error && stats.totalUsers === 0) {
    return (
      <div className="w-full space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h3>
            <p className="text-gray-600 mb-4">{error}</p>
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
      <div className="w-full space-y-6 p-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                {isConnected && (
                  <div className="flex items-center space-x-2 text-blue-100">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Live</span>
                  </div>
                )}
              </div>
              <p className="text-blue-100">
                Welcome, {user?.firstName}! {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
              <p className="text-blue-200 text-sm mt-1">
                Managing {stats.totalUsers} users across {stats.activeCourses} courses
              </p>
            </div>
            <div className="mt-4 lg:mt-0">
              <button
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors backdrop-blur-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Essential Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {metrics.map((metric) => (
            <Link
              key={metric.id}
              to={metric.link || '#'}
              className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all p-6 group ${
                metric.isAlert ? 'border-red-200 ring-2 ring-red-100' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`bg-gradient-to-r ${metric.color} rounded-lg p-3 text-white group-hover:scale-105 transition-transform`}>
                  {metric.icon}
                </div>
                {metric.isAlert && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                    Action Required
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{metric.title}</p>
              <p className="text-3xl font-bold text-gray-900">{metric.value.toLocaleString()}</p>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/users"
              className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <Users className="h-6 w-6 text-blue-600 mr-3" />
              <span className="font-medium text-blue-900">Manage Users</span>
            </Link>
            <Link
              to="/admin/courses"
              className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
            >
              <BookOpen className="h-6 w-6 text-green-600 mr-3" />
              <span className="font-medium text-green-900">Manage Courses</span>
            </Link>
            {stats.flaggedContent > 0 && (
              <Link
                to="/admin/moderation"
                className="flex items-center p-4 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
              >
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <span className="font-medium text-red-900">Review Flagged ({stats.flaggedContent})</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(AdminDashboard);