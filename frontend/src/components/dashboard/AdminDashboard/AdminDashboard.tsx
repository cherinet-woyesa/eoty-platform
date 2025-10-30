import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import AdminMetrics from './AdminMetrics';
import QuickActions from './QuickActions';
import SystemAlerts from './SystemAlerts';
import RecentActivity from './RecentActivity';
import UserManagementPreview from './UserManagementPreview';
import ContentManagementPreview from './ContentManagementPreview';
import AnalyticsOverview from './AnalyticsOverview';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useRealTimeData } from '../../../hooks/useRealTimeData';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorBoundary from '../../common/ErrorBoundary';

interface AdminDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  activeTab = 'overview', 
  onTabChange 
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Real-time data for admin metrics
  const { data: realTimeStats, error: statsError } = useRealTimeData('/admin/stats', {
    totalUsers: 1248,
    activeCourses: 86,
    completedLessons: 3421,
    avgEngagement: 78,
    pendingApprovals: 5,
    flaggedContent: 3,
    activeUsers: 1247,
    newRegistrations: 12
  });

  // WebSocket for live updates
  const { lastMessage } = useWebSocket('/admin/updates');

  // Handle real-time updates
  React.useEffect(() => {
    if (lastMessage) {
      const update = JSON.parse(lastMessage.data);
      console.log('Real-time admin update:', update);
      // Handle different types of updates (new users, content, etc.)
    }
  }, [lastMessage]);

  const tabs = useMemo(() => [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'content', name: 'Content Management', icon: '📚' },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
    { id: 'moderation', name: 'Moderation', icon: '🛡️' },
    { id: 'system', name: 'System Health', icon: '⚙️' }
  ], []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setRefreshKey(prev => prev + 1);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    onTabChange?.(tabId);
  }, [onTabChange]);

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text="Loading dashboard data..." />
        </div>
      );
    }

    switch (activeTab) {
      case 'users':
        return <UserManagementPreview />;
      case 'content':
        return <ContentManagementPreview />;
      case 'analytics':
        return <AnalyticsOverview />;
      case 'moderation':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemAlerts alerts={[]} />
            <RecentActivity activities={[]} />
          </div>
        );
      case 'system':
        return (
          <div className="space-y-6">
            <SystemAlerts alerts={[]} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                {/* System health metrics would go here */}
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                {/* Performance metrics would go here */}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            {/* Metrics Overview */}
            <AdminMetrics stats={realTimeStats || {}} error={statsError || undefined} />
            
            {/* Quick Actions & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <QuickActions />
              </div>
              <div>
                <SystemAlerts alerts={[]} />
              </div>
            </div>

            {/* Recent Activity & Previews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivity activities={[]} compact />
              <UserManagementPreview compact />
            </div>

            {/* Content & Analytics Previews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ContentManagementPreview compact />
              <AnalyticsOverview compact />
            </div>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome, {user?.firstName}! You have {user?.role === 'platform_admin' ? 'full' : 'chapter'} admin privileges.
              {lastMessage && (
                <span className="ml-2 text-green-600 text-sm">
                  ● Live
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {renderTabContent()}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(AdminDashboard);