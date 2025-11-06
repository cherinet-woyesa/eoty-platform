import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useRealTimeData } from '../../../hooks/useRealTimeData';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { Users, BookOpen, CheckCircle, BarChart2, Clock, AlertTriangle, Zap, TrendingUp, AlertCircle as AlertCircleIcon } from 'lucide-react';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorBoundary from '../../common/ErrorBoundary';

interface AdminDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const { user } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState<string | null>('totalUsers');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time data for admin metrics
  const initialAdminData = useMemo(() => ({
    totalUsers: 0,
    activeCourses: 0,
    completedLessons: 0,
    avgEngagement: 0,
    pendingApprovals: 0,
    flaggedContent: 0,
    activeUsers: 0,
    newRegistrations: 0
  }), []);

  const { data: realTimeStats, error: statsError, isLoading, refetch } = useRealTimeData('/admin/stats', initialAdminData);

  // WebSocket for live admin updates
  const { lastMessage } = useWebSocket('/admin/updates');

  // Update time every minute
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle real-time updates
  React.useEffect(() => {
    if (lastMessage) {
      const update = JSON.parse(lastMessage.data);
      console.log('Real-time admin update:', update);
    }
  }, [lastMessage]);

  // Log data to verify backend fetch
  React.useEffect(() => {
    console.log('Admin Dashboard - Stats:', realTimeStats);
    console.log('Admin Dashboard - Error:', statsError);
  }, [realTimeStats, statsError]);

  const metrics = [
    {
      id: 'totalUsers',
      title: 'Total Users',
      value: realTimeStats?.totalUsers || 0,
      change: 12,
      icon: <Users className="h-6 w-6" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      id: 'activeCourses',
      title: 'Active Courses',
      value: realTimeStats?.activeCourses || 0,
      change: 5,
      icon: <BookOpen className="h-6 w-6" />,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      id: 'completedLessons',
      title: 'Completed Lessons',
      value: realTimeStats?.completedLessons || 0,
      change: 8,
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      id: 'avgEngagement',
      title: 'Avg. Engagement',
      value: `${realTimeStats?.avgEngagement || 0}%`,
      change: 3,
      icon: <BarChart2 className="h-6 w-6" />,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      id: 'pendingApprovals',
      title: 'Pending Approvals',
      value: realTimeStats?.pendingApprovals || 0,
      change: 2,
      icon: <Clock className="h-6 w-6" />,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      id: 'flaggedContent',
      title: 'Flagged Content',
      value: realTimeStats?.flaggedContent || 0,
      change: 1,
      icon: <AlertTriangle className="h-6 w-6" />,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      id: 'activeUsers',
      title: 'Active Users',
      value: realTimeStats?.activeUsers || 0,
      change: 24,
      icon: <Zap className="h-6 w-6" />,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    },
    {
      id: 'newRegistrations',
      title: 'New Registrations',
      value: realTimeStats?.newRegistrations || 0,
      change: 3,
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-700'
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
    refetch();
  }, [refetch]);

  const selectedMetricData = metrics.find(m => m.id === selectedMetric);

  const renderViewContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text="Loading admin data..." />
        </div>
      );
    }

    return (
          <div className="space-y-6">
            {/* Metrics Grid - Always Visible Clickable Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              {metrics.map((metric) => (
                <button
                  key={metric.id}
                  onClick={() => setSelectedMetric(metric.id)}
                  className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all p-4 text-left group ${
                    selectedMetric === metric.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <div className={`bg-gradient-to-r ${metric.color} rounded-lg p-3 text-white mb-3 group-hover:scale-105 transition-transform`}>
                    {metric.icon}
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <p className={`text-xs mt-1 ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.change >= 0 ? '↑' : '↓'} {Math.abs(metric.change)}%
                  </p>
                </button>
              ))}
            </div>

            {/* Detail View - Shown Below Cards When Metric Selected */}
            {selectedMetric && selectedMetricData && (
              <div className="space-y-4">
                {/* Selected Metric Header */}
                <div className={`bg-gradient-to-r ${selectedMetricData.color} rounded-xl shadow-sm p-6 text-white`}>
                  <div className="flex items-center gap-4">
                    {selectedMetricData.icon}
                    <div>
                      <h2 className="text-2xl font-bold">{selectedMetricData.title}</h2>
                      <p className="text-white/80 mt-1">Detailed view and analytics</p>
                    </div>
                  </div>
                </div>

                {/* Metric Details */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Current Value</p>
                      <p className="text-3xl font-bold text-gray-900">{selectedMetricData.value}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Change</p>
                      <p className={`text-3xl font-bold ${selectedMetricData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedMetricData.change >= 0 ? '+' : ''}{selectedMetricData.change}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Status</p>
                      <p className="text-3xl font-bold text-blue-600">Active</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <p className="text-gray-600">Detailed {selectedMetricData.title.toLowerCase()} data will be displayed here.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
  };

  if (statsError) {
    return (
      <ErrorBoundary>
        <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <AlertCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 text-lg mb-4">Error loading admin data</p>
              <button 
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
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
                <h1 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h1>
                {lastMessage && (
                  <div className="flex items-center space-x-2 text-blue-100">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Live Updates</span>
                  </div>
                )}
              </div>
              <p className="text-blue-100 text-sm sm:text-base">
                Welcome, {user?.firstName}! {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
              <p className="text-blue-200 text-xs sm:text-sm mt-1">
                You have {user?.role === 'platform_admin' ? 'full platform' : 'chapter'} admin privileges • Managing {realTimeStats?.totalUsers || 0} users across {realTimeStats?.activeCourses || 0} courses
              </p>
            </div>
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

export default React.memo(AdminDashboard);