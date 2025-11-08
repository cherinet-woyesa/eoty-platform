import React, { useState, useEffect } from 'react';
import {
  Video,
  TrendingUp,
  Users,
  Clock,
  Target,
  BarChart3,
  RefreshCw,
  Calendar,
  Eye,
  PlayCircle,
  Award
} from 'lucide-react';
import { videoAnalyticsApi, type TeacherDashboardAnalytics } from '../../../services/api/videoAnalytics';

interface VideoAnalyticsDashboardProps {
  className?: string;
}

const VideoAnalyticsDashboard: React.FC<VideoAnalyticsDashboardProps> = ({ className = '' }) => {
  const [analytics, setAnalytics] = useState<TeacherDashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('7:days');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await videoAnalyticsApi.getTeacherDashboardAnalytics({
        timeframe,
        limit: 10
      });
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to fetch video analytics:', err);
      setError(err.response?.data?.message || 'Failed to load video analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const timeframeOptions = [
    { value: '7:days', label: '7 Days' },
    { value: '30:days', label: '30 Days' },
    { value: '90:days', label: '90 Days' }
  ];

  if (loading && !analytics) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading video analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-red-200 p-8 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Analytics</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              <Video className="h-6 w-6 mr-2" />
              Video Analytics
            </h2>
            <p className="text-purple-100">
              Insights from {analytics.totalLessons} video lessons across {analytics.totalCourses} courses
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {timeframeOptions.map(option => (
                <option key={option.value} value={option.value} className="text-gray-900">
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Total
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatNumber(analytics.summary.totalViews)}
          </div>
          <div className="text-sm text-gray-600">Total Views</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Unique
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatNumber(analytics.summary.uniqueViewers)}
          </div>
          <div className="text-sm text-gray-600">Unique Viewers</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Average
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatDuration(analytics.summary.averageWatchTime)}
          </div>
          <div className="text-sm text-gray-600">Avg Watch Time</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Rate
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {analytics.summary.averageCompletionRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Completion Rate</div>
        </div>
      </div>

      {/* Top Performing Lessons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Award className="h-5 w-5 mr-2 text-yellow-600" />
            Top Performing Lessons
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Your most viewed and engaging video lessons
          </p>
        </div>
        <div className="overflow-x-auto">
          {analytics.topPerformingLessons.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Lesson
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Watch Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Completion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.topPerformingLessons.map((lesson, index) => (
                  <tr key={lesson.lessonId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{lesson.lessonTitle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{lesson.courseTitle}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <Eye className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="font-medium text-gray-900">
                          {formatNumber(lesson.views)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <Clock className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-gray-900">
                          {formatDuration(lesson.watchTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(lesson.completionRate, 100)}%` }}
                          />
                        </div>
                        <span className="font-medium text-gray-900">
                          {lesson.completionRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <PlayCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No video views yet</p>
              <p className="text-sm mt-1">Analytics will appear once students start watching your videos</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Recent Activity
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Daily video views over the last 7 days
            </p>
          </div>
        </div>
        {analytics.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {analytics.recentActivity.map((activity) => {
              const maxViews = Math.max(...analytics.recentActivity.map(a => a.views));
              const barWidth = maxViews > 0 ? (activity.views / maxViews) * 100 : 0;
              const date = new Date(activity.date);
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div key={activity.date} className="flex items-center">
                  <div className="w-20 text-sm text-gray-600 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {dateStr}
                  </div>
                  <div className="flex-1 ml-4">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ width: `${barWidth}%` }}
                        >
                          {activity.views > 0 && (
                            <span className="text-white text-xs font-medium">
                              {activity.views} views
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 text-sm text-gray-600 w-24 text-right">
                        {activity.uniqueViewers} viewers
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No recent activity</p>
          </div>
        )}
      </div>

      {/* Last Synced */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(analytics.lastSynced).toLocaleString()}
      </div>
    </div>
  );
};

export default VideoAnalyticsDashboard;
