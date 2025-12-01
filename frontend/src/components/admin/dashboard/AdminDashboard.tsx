import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiClient } from '@/services/api/apiClient';
import { Users, BookOpen, Video, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AnomalyAlerts from '@/components/admin/system/AnomalyAlerts';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load admin stats directly from API (same approach as teacher dashboard)
  const loadAdminStats = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    try {
      // Don't set isLoading(true) here to avoid full page spinner on refresh
      setIsRefreshing(true);
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
      setIsRefreshing(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadAdminStats();
  }, [loadAdminStats]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    
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
      icon: <Users className="h-5 w-5" />,
      color: 'from-blue-500 to-blue-600',
      link: '/admin/users'
    },
    {
      id: 'activeUsers',
      title: 'Active Users',
      value: stats.activeUsers,
      icon: <Users className="h-5 w-5" />,
      color: 'from-green-500 to-green-600',
      link: '/admin/users'
    },
    {
      id: 'activeCourses',
      title: 'Active Courses',
      value: stats.activeCourses,
      icon: <BookOpen className="h-5 w-5" />,
      color: 'from-purple-500 to-purple-600',
      link: '/admin/courses'
    },
    {
      id: 'completedLessons',
      title: 'Completed Lessons',
      value: stats.completedLessons,
      icon: <Video className="h-5 w-5" />,
      color: 'from-indigo-500 to-indigo-600',
      link: '/admin/analytics'
    },
    {
      id: 'newRegistrations',
      title: 'New This Week',
      value: stats.newRegistrations,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'from-orange-500 to-orange-600',
      link: '/admin/users'
    },
    {
      id: 'flaggedContent',
      title: 'Flagged Content',
      value: stats.flaggedContent,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: stats.flaggedContent > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500',
      link: '/admin/moderation',
      isAlert: stats.flaggedContent > 0
    },
    {
      id: 'pendingApprovals',
      title: 'Pending Teacher Apps',
      value: stats.pendingApprovals,
      icon: <Users className="h-5 w-5" />,
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

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white/90 backdrop-blur-md rounded-xl p-8 border border-stone-200 shadow-lg">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">Access Denied</h3>
          <p className="text-stone-600">You must be logged in as an admin to view this dashboard.</p>
        </div>
      </div>
    );
  }

  if (isLoading && stats.totalUsers === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  if (error && stats.totalUsers === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white/90 backdrop-blur-md rounded-xl p-8 border border-stone-200 shadow-lg">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">Unable to Load Dashboard</h3>
          <p className="text-stone-600 mb-4">{error}</p>
          <button 
            onClick={handleRetry}
            className="px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-800 font-semibold rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-all shadow-md hover:shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-lg p-4 border border-[#27AE60]/25 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#27AE60]/20 rounded-lg blur-md"></div>
                    <div className="relative p-1.5 bg-gradient-to-br from-[#27AE60]/15 to-[#16A085]/15 rounded-lg border border-[#27AE60]/25">
                      <Users className="h-5 w-5 text-[#27AE60]" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-stone-800">Admin Dashboard</h1>
                  {isConnected && (
                    <div className="flex items-center space-x-2 text-[#27AE60]">
                      <div className="w-2 h-2 bg-[#27AE60] rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Live</span>
                    </div>
                  )}
                </div>
                <p className="text-stone-700 text-sm mt-1">
                  Welcome, <span className="font-semibold text-stone-800">{user?.firstName}</span>! {formatDate(currentTime)} • {formatTime(currentTime)}
                </p>
                <p className="text-stone-600 text-xs">
                  Managing <span className="font-semibold text-stone-800">{stats.totalUsers}</span> users across <span className="font-semibold text-stone-800">{stats.activeCourses}</span> courses
                </p>
              </div>
              <div className="mt-3 lg:mt-0">
                <button
                  onClick={handleRetry}
                  disabled={isRefreshing}
                  className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 text-xs font-medium rounded-md transition-all border border-[#27AE60]/30 shadow-sm hover:shadow-md hover:border-[#27AE60]/50 disabled:opacity-70"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-[#27AE60] ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          {/* Essential Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {metrics.map((metric) => (
              <Link
                key={metric.id}
                to={metric.link || '#'}
                className={`bg-white/90 backdrop-blur-md rounded-xl border-2 shadow-sm hover:shadow-lg transition-all p-4 group ${
                  metric.isAlert ? 'border-red-300 ring-2 ring-red-100' : 'border-stone-200 hover:border-[#27AE60]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`relative ${
                    metric.id === 'totalUsers' ? 'text-[#27AE60]' :
                    metric.id === 'activeUsers' ? 'text-[#16A085]' :
                    metric.id === 'activeCourses' ? 'text-[#2980B9]' :
                    metric.id === 'completedLessons' ? 'text-[#F39C12]' :
                    metric.id === 'newRegistrations' ? 'text-[#27AE60]' :
                    metric.id === 'flaggedContent' ? 'text-red-500' :
                    'text-amber-500'
                  }`}>
                    <div className={`absolute inset-0 ${
                      metric.id === 'totalUsers' ? 'bg-[#27AE60]/15' :
                      metric.id === 'activeUsers' ? 'bg-[#16A085]/15' :
                      metric.id === 'activeCourses' ? 'bg-[#2980B9]/15' :
                      metric.id === 'completedLessons' ? 'bg-[#F39C12]/15' :
                      metric.id === 'newRegistrations' ? 'bg-[#27AE60]/15' :
                      metric.id === 'flaggedContent' ? 'bg-red-500/15' :
                      'bg-amber-500/15'
                    } rounded-lg blur-md`}></div>
                    <div className={`relative p-3 ${
                      metric.id === 'totalUsers' ? 'bg-[#27AE60]/8' :
                      metric.id === 'activeUsers' ? 'bg-[#16A085]/8' :
                      metric.id === 'activeCourses' ? 'bg-[#2980B9]/8' :
                      metric.id === 'completedLessons' ? 'bg-[#F39C12]/8' :
                      metric.id === 'newRegistrations' ? 'bg-[#27AE60]/8' :
                      metric.id === 'flaggedContent' ? 'bg-red-500/8' :
                      'bg-amber-500/8'
                    } rounded-lg border ${
                      metric.id === 'totalUsers' ? 'border-[#27AE60]/25' :
                      metric.id === 'activeUsers' ? 'border-[#16A085]/25' :
                      metric.id === 'activeCourses' ? 'border-[#2980B9]/25' :
                      metric.id === 'completedLessons' ? 'border-[#F39C12]/25' :
                      metric.id === 'newRegistrations' ? 'border-[#27AE60]/25' :
                      metric.id === 'flaggedContent' ? 'border-red-500/25' :
                      'border-amber-500/25'
                    } group-hover:scale-105 transition-transform`}>
                      {metric.icon}
                    </div>
                  </div>
                  {metric.isAlert && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                      Action Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 mb-1">{metric.title}</p>
                <p className="text-2xl font-bold text-stone-800">{metric.value.toLocaleString()}</p>
              </Link>
            ))}
          </div>

          {/* FR5: Anomaly Alerts (REQUIREMENT: Warns admins on audit or moderation anomalies) */}
          <AnomalyAlerts autoRefresh={true} refreshInterval={60000} maxDisplay={3} />

          {/* Quick Actions */}
          <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 p-4">
            <h3 className="text-base font-semibold text-stone-800 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link
                to="/admin/users"
                className="flex items-center p-3 bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 hover:from-[#27AE60]/20 hover:to-[#16A085]/20 rounded-lg border border-[#27AE60]/25 transition-all shadow-sm hover:shadow-md"
              >
                <Users className="h-5 w-5 text-[#27AE60] mr-2" />
                <span className="font-medium text-stone-800 text-sm">Manage Users</span>
              </Link>
              <Link
                to="/admin/courses"
                className="flex items-center p-3 bg-gradient-to-r from-[#16A085]/10 to-[#2980B9]/10 hover:from-[#16A085]/20 hover:to-[#2980B9]/20 rounded-lg border border-[#16A085]/25 transition-all shadow-sm hover:shadow-md"
              >
                <BookOpen className="h-5 w-5 text-[#16A085] mr-2" />
                <span className="font-medium text-stone-800 text-sm">Manage Courses</span>
              </Link>
              {stats.flaggedContent > 0 && (
                <Link
                  to="/admin/moderation"
                  className="flex items-center p-3 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 rounded-lg border border-red-300 transition-all shadow-sm hover:shadow-md"
                >
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="font-medium text-stone-800 text-sm">Review Flagged ({stats.flaggedContent})</span>
                </Link>
              )}
            </div>
          </div>
        </div>
    </ErrorBoundary>
  );
};

export default React.memo(AdminDashboard);