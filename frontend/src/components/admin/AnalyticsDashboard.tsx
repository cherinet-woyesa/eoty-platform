import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import type { AdminDashboard } from '../../types/admin';
import MetricsCard from './MetricsCard';
import { Users, BookOpen, BarChart2, Clock, TrendingUp, Server } from 'lucide-react';

const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<string>('7days');

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAnalytics(timeframe);
      setAnalytics(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const metrics = analytics.metrics;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
        <div className="flex space-x-2">
          {['24hours', '7days', '30days'].map(period => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                timeframe === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {period === '24hours' ? '24 Hours' : period === '7days' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard 
          title="Total Users" 
          value={metrics.users.total} 
          change={metrics.users.growth * 100}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <MetricsCard 
          title="Active Courses" 
          value={metrics.content.total} 
          change={metrics.content.approval_rate * 100}
          icon={<BookOpen className="h-6 w-6" />}
          color="green"
        />
        <MetricsCard 
          title="Completed Lessons" 
          value={Math.round(metrics.engagement.completion_rate * 100)} 
          change={5}
          icon={<BarChart2 className="h-6 w-6" />}
          color="purple"
          format="percent"
        />
        <MetricsCard 
          title="Avg. Session" 
          value={metrics.engagement.avg_session_minutes} 
          change={2}
          icon={<Clock className="h-6 w-6" />}
          color="orange"
          format="duration"
        />
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5 text-gray-500" />
                <span className="text-gray-600">Uptime</span>
              </div>
              <span className="font-medium">{metrics.technical.uptime}%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-gray-500" />
                <span className="text-gray-600">Response Time</span>
              </div>
              <span className="font-medium">{metrics.technical.response_time}ms</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Content Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Uploads Today</span>
              <span className="font-medium">{metrics.content.uploads_today}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Approval Rate</span>
              <span className="font-medium">{(metrics.content.approval_rate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Chapter Performance Comparison</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chapter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recent Posts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement Score</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(analytics.chapter_comparison).map(([chapterId, data]) => (
                <tr key={chapterId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {chapterId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.total_users}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.active_users}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.recent_posts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(data.engagement_score * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      {analytics.alerts && analytics.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Alerts</h3>
          <div className="space-y-3">
            {analytics.alerts.map((alert, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-md border ${
                  alert.severity === 'critical' || alert.severity === 'high' 
                    ? 'bg-red-50 border-red-200' 
                    : alert.severity === 'medium' 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{alert.message}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alert.severity === 'critical' || alert.severity === 'high' 
                      ? 'bg-red-200 text-red-900' 
                      : alert.severity === 'medium' 
                        ? 'bg-yellow-200 text-yellow-900' 
                        : 'bg-blue-200 text-blue-900'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                {alert.chapter_id && (
                  <div className="text-sm text-gray-600 mt-1">
                    Chapter: {alert.chapter_id}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;