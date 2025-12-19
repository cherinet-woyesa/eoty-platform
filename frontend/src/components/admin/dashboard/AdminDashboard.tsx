import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiClient } from '@/services/api/apiClient';
import { Users, BookOpen, Video, AlertTriangle, TrendingUp, RefreshCw, Megaphone } from 'lucide-react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AnomalyAlerts from '@/components/admin/system/AnomalyAlerts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CreateAnnouncementModal from './modals/CreateAnnouncementModal';

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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const prefetched = useRef<{ users: boolean; moderation: boolean }>({ users: false, moderation: false });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  const emptyStats: AdminStats = {
    totalUsers: 0,
    activeUsers: 0,
    activeCourses: 0,
    completedLessons: 0,
    newRegistrations: 0,
    pendingApprovals: 0,
    flaggedContent: 0
  };

  const fetchAdminStats = async (): Promise<AdminStats> => {
    const response = await apiClient.get('/admin/stats');
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Failed to load admin stats');
    }
    const data = response.data.data || {};
    return {
      totalUsers: data.totalUsers || 0,
      activeUsers: data.activeUsers || 0,
      activeCourses: data.activeCourses || 0,
      completedLessons: data.completedLessons || 0,
      newRegistrations: data.newRegistrations || 0,
      pendingApprovals: data.pendingApprovals || 0,
      flaggedContent: data.flaggedContent || 0
    };
  };

  const {
    data: stats = emptyStats,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['adminStats'],
    queryFn: fetchAdminStats,
    enabled: !!user && user.role === 'admin',
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2
  });

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

        // Refresh stats when updates occur
        if (update.type === 'dashboard_update' || update.type === 'metrics_update') {
          queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        }
      } catch (parseError) {
        // Silently ignore parse errors for WebSocket messages
        // These are typically non-critical and shouldn't interrupt the user experience
      }
    }
  }, [lastMessage, queryClient]);

  // Essential metrics only - clean and focused
  const metrics = useMemo(() => [
    {
      id: 'totalUsers',
      title: t('admin.dashboard.metrics.total_users'),
      value: stats.totalUsers,
      icon: <Users className="h-5 w-5" />,
      color: 'from-indigo-900 to-indigo-800',
      link: '/admin/users'
    },
    {
      id: 'activeUsers',
      title: t('admin.dashboard.metrics.active_users'),
      value: stats.activeUsers,
      icon: <Users className="h-5 w-5" />,
      color: 'from-indigo-700 to-indigo-600',
      link: '/admin/users?status=active'
    },
    {
      id: 'activeCourses',
      title: t('admin.dashboard.metrics.active_courses'),
      value: stats.activeCourses,
      icon: <BookOpen className="h-5 w-5" />,
      color: 'from-blue-900 to-blue-800',
      link: '/admin/courses?status=published'
    },
    {
      id: 'completedLessons',
      title: t('admin.dashboard.metrics.completed_lessons'),
      value: stats.completedLessons,
      icon: <Video className="h-5 w-5" />,
      color: 'from-blue-700 to-blue-600',
      link: '/admin/analytics'
    },
    {
      id: 'newRegistrations',
      title: t('admin.dashboard.metrics.new_registrations'),
      value: stats.newRegistrations,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'from-slate-700 to-slate-600',
      link: '/admin/users?time=week&sort=newest'
    },
    {
      id: 'flaggedContent',
      title: t('admin.dashboard.metrics.flagged_content'),
      value: stats.flaggedContent,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: stats.flaggedContent > 0 ? 'from-red-900 to-red-800' : 'from-gray-400 to-gray-500',
      link: '/admin/moderation',
      isAlert: stats.flaggedContent > 0
    }
  ], [stats, t]);



  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleRetry = () => {
    refetch();
  };

  const lastUpdatedLabel = useMemo(() => {
    if (!dataUpdatedAt) return t('admin.dashboard.time.never');
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 45_000) return t('admin.dashboard.time.just_now');
    if (diff < 3_600_000) return t('admin.dashboard.time.minutes_ago', { count: Math.round(diff / 60000) });
    return new Date(dataUpdatedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  }, [dataUpdatedAt, t, i18n.language]);

  // Lightweight prefetches to reduce perceived latency when navigating
  const prefetchUsers = () => {
    if (prefetched.current.users) return;
    prefetched.current.users = true;
    apiClient.get('/admin/users').catch(() => {
      prefetched.current.users = false;
    });
  };

  const prefetchModeration = () => {
    if (prefetched.current.moderation) return;
    prefetched.current.moderation = true;
    apiClient.get('/admin/moderation/flagged?status=pending&limit=5').catch(() => {
      prefetched.current.moderation = false;
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white/90 backdrop-blur-md rounded-xl p-8 border border-stone-200 shadow-lg">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">{t('admin.dashboard.access_denied')}</h3>
          <p className="text-stone-600">{t('admin.dashboard.access_denied_msg')}</p>
        </div>
      </div>
    );
  }

  if (isLoading && stats.totalUsers === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4">
        <div className="space-y-4">
          <div className="h-20 bg-white/80 border border-stone-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-28 bg-white/80 border border-stone-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError && stats.totalUsers === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white/90 backdrop-blur-md rounded-xl p-8 border border-stone-200 shadow-lg">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">{t('admin.dashboard.load_error')}</h3>
          <p className="text-stone-600 mb-4">{(error as Error)?.message || t('admin.dashboard.load_error_msg')}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-indigo-900 text-white font-semibold rounded-lg border border-indigo-800 hover:bg-indigo-800 transition-all shadow-md hover:shadow-lg"
          >
            {t('admin.dashboard.try_again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-900/5 via-blue-900/5 to-slate-900/5 rounded-lg p-4 border border-indigo-900/10 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-900/20 rounded-lg blur-md"></div>
                  <div className="relative p-1.5 bg-gradient-to-br from-indigo-900/10 to-blue-900/10 rounded-lg border border-indigo-900/20">
                    <Users className="h-5 w-5 text-indigo-900" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-stone-800">{t('admin.dashboard.title')}</h1>
                {isConnected && (
                  <div className="flex items-center space-x-2 text-emerald-600">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Live</span>
                  </div>
                )}
              </div>
              <p className="text-stone-700 text-sm mt-1">
                {t('admin.dashboard.welcome')}, <span className="font-semibold text-stone-800">{user?.firstName}</span>! {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
              <p className="text-stone-600 text-xs">
                {t('admin.dashboard.managing', { users: stats.totalUsers, courses: stats.activeCourses })}
              </p>
              <div className="flex items-center gap-2 text-xs text-stone-600 mt-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${isFetching ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-stone-200 bg-white/70 text-stone-700'}`}>
                  <span className={`h-2 w-2 rounded-full ${isFetching ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
                  {isFetching ? t('admin.dashboard.updating') : t('admin.dashboard.synced')}
                </div>
                <span className="text-stone-500">Last updated {lastUpdatedLabel}</span>
              </div>
            </div>
            <div className="mt-3 lg:mt-0">
              <button
                onClick={handleRetry}
                disabled={isFetching}
                className="inline-flex items-center px-3 py-1.5 bg-white text-indigo-900 text-xs font-medium rounded-md transition-all border border-indigo-200 hover:border-indigo-400 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-70"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-indigo-700 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? t('admin.dashboard.refreshing') : t('admin.dashboard.refresh')}
              </button>
            </div>
          </div>
        </div>

        {isError && stats.totalUsers > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{(error as Error)?.message || 'Some data may be out of date.'}</span>
            <button onClick={handleRetry} className="text-red-700 underline text-sm">Retry</button>
          </div>
        )}

        {/* Essential Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((metric) => (
            <Link
              key={metric.id}
              to={metric.link || '#'}
              className={`relative overflow-hidden bg-white/90 backdrop-blur-md rounded-xl border-2 shadow-sm hover:shadow-lg transition-all p-4 group ${metric.isAlert ? 'border-[#E53935]/40 ring-2 ring-[#F8B4B4]' : 'border-stone-200 hover:border-[#1F7A4C]/50'
                }`}
            >
              {isFetching && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] animate-pulse pointer-events-none" />
              )}
              <div className="flex items-center justify-between mb-3">
                <div className={`relative ${metric.id === 'totalUsers' ? 'text-indigo-900' :
                    metric.id === 'activeUsers' ? 'text-indigo-700' :
                      metric.id === 'activeCourses' ? 'text-blue-900' :
                        metric.id === 'completedLessons' ? 'text-blue-700' :
                          metric.id === 'newRegistrations' ? 'text-slate-700' :
                            metric.id === 'flaggedContent' ? 'text-red-900' :
                              'text-slate-600'
                  }`}>
                  <div className={`absolute inset-0 ${metric.id === 'totalUsers' ? 'bg-indigo-900/10' :
                      metric.id === 'activeUsers' ? 'bg-indigo-700/10' :
                        metric.id === 'activeCourses' ? 'bg-blue-900/10' :
                          metric.id === 'completedLessons' ? 'bg-blue-700/10' :
                            metric.id === 'newRegistrations' ? 'bg-slate-700/10' :
                              metric.id === 'flaggedContent' ? 'bg-red-900/10' :
                                'bg-slate-600/10'
                    } rounded-lg blur-md`}></div>
                  <div className={`relative p-3 ${metric.id === 'totalUsers' ? 'bg-indigo-50' :
                      metric.id === 'activeUsers' ? 'bg-indigo-50' :
                        metric.id === 'activeCourses' ? 'bg-blue-50' :
                          metric.id === 'completedLessons' ? 'bg-blue-50' :
                            metric.id === 'newRegistrations' ? 'bg-slate-50' :
                              metric.id === 'flaggedContent' ? 'bg-red-50' :
                                'bg-slate-50'
                    } rounded-lg border ${metric.id === 'totalUsers' ? 'border-indigo-200' :
                      metric.id === 'activeUsers' ? 'border-indigo-200' :
                        metric.id === 'activeCourses' ? 'border-blue-200' :
                          metric.id === 'completedLessons' ? 'border-blue-200' :
                            metric.id === 'newRegistrations' ? 'border-slate-200' :
                              metric.id === 'flaggedContent' ? 'border-red-200' :
                                'border-slate-200'
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
          <h3 className="text-base font-semibold text-stone-800 mb-3">{t('admin.dashboard.quick_actions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Link
              to="/admin/users"
              onMouseEnter={prefetchUsers}
              className="flex items-center p-3 bg-indigo-900 hover:bg-indigo-800 rounded-lg border border-indigo-800 transition-all shadow-sm hover:shadow-md text-white"
            >
              <Users className="h-5 w-5 text-white mr-2" />
              <span className="font-medium text-white text-sm">{t('admin.dashboard.actions.manage_users')}</span>
            </Link>
            <Link
              to="/admin/courses"
              className="flex items-center p-3 bg-indigo-900 hover:bg-indigo-800 rounded-lg border border-indigo-800 transition-all shadow-sm hover:shadow-md text-white"
            >
              <BookOpen className="h-5 w-5 text-white mr-2" />
              <span className="font-medium text-white text-sm">{t('admin.dashboard.actions.manage_courses')}</span>
            </Link>
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="flex items-center p-3 bg-indigo-900 hover:bg-indigo-800 rounded-lg border border-indigo-800 transition-all shadow-sm hover:shadow-md text-white"
            >
              <Megaphone className="h-5 w-5 text-white mr-2" />
              <span className="font-medium text-white text-sm">{t('admin.dashboard.actions.create_announcement')}</span>
            </button>
            {stats.flaggedContent > 0 && (
              <Link
                to="/admin/moderation"
                onMouseEnter={prefetchModeration}
                className="flex items-center p-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-all shadow-sm hover:shadow-md"
              >
                <AlertTriangle className="h-5 w-5 text-red-700 mr-2" />
                <span className="font-medium text-stone-800 text-sm">{t('admin.dashboard.actions.review_flagged')} ({stats.flaggedContent})</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <CreateAnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSuccess={() => {
          // Ideally refetch announcements here
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
        }}
      />
    </ErrorBoundary>
  );
};

export default React.memo(AdminDashboard);