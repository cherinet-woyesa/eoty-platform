import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Award,
  Download,
  Filter,
  Search,
  MoreVertical,
  ArrowUpRight,
  AlertCircle,
  Zap,
  BarChart,
  PieChart,
  LineChart,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  videoAnalyticsApi, 
  type TeacherDashboardAnalytics,
  type TopPerformingLesson,
  type RecentActivity 
} from '../../../services/api/videoAnalytics';

// Types
interface VideoAnalyticsDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  showExport?: boolean;
  courseId?: string;
}

type Timeframe = '7d' | '30d' | '90d' | '1y';
type ChartType = 'views' | 'engagement' | 'completion' | 'watchTime';
type ViewMode = 'overview' | 'lessons' | 'trends' | 'audience';

const VideoAnalyticsDashboard: React.FC<VideoAnalyticsDashboardProps> = ({ 
  className = '',
  autoRefresh = false,
  showExport = true,
  courseId
}) => {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<TeacherDashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('views');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, courseId]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAnalytics();
      }, 300000); // Refresh every 5 minutes

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const timeframeMap = {
        '7d': '7:days',
        '30d': '30:days',
        '90d': '90:days',
        '1y': '365:days'
      } as const;

      const data = await videoAnalyticsApi.getTeacherDashboardAnalytics({
        timeframe: timeframeMap[timeframe],
        limit: 10
      });
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to fetch video analytics:', err);
      setError(err.response?.data?.message || t('analytics.failed_to_load_video_analytics'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const handleExport = useCallback(async () => {
    if (!analytics) return;
    
    try {
      // In real app, this would generate and download a report
      console.log('Exporting video analytics data...');
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Export completed');
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [analytics]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return t('common.duration_hours_minutes', { hours, minutes });
    }
    return t('common.duration_minutes', { minutes });
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

  const calculateTrend = (current: number, previous: number): { value: number; trend: 'up' | 'down' } => {
    if (previous === 0) return { value: 100, trend: 'up' };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), trend: change >= 0 ? 'up' : 'down' };
  };

  // Mock previous period data for trend calculation
  const previousAnalytics = useMemo(() => {
    if (!analytics) return null;
    
    return {
      totalViews: Math.max(0, analytics.summary.totalViews - 500),
      uniqueViewers: Math.max(0, analytics.summary.uniqueViewers - 50),
      averageWatchTime: Math.max(0, analytics.summary.averageWatchTime - 300),
      averageCompletionRate: Math.max(0, analytics.summary.averageCompletionRate - 8)
    };
  }, [analytics]);

  const timeframeOptions = [
    { value: '7d', label: t('common.last_7_days') },
    { value: '30d', label: t('common.last_30_days') },
    { value: '90d', label: t('common.last_90_days') },
    { value: '1y', label: t('common.last_year') }
  ];

  const chartTypeOptions = [
    { value: 'views', label: t('analytics.views'), icon: Eye },
    { value: 'engagement', label: t('analytics.engagement'), icon: TrendingUp },
    { value: 'completion', label: t('analytics.completion'), icon: Target },
    { value: 'watchTime', label: t('analytics.watch_time'), icon: Clock }
  ];

  const viewModeOptions = [
    { value: 'overview', label: t('common.overview'), icon: BarChart3 },
    { value: 'lessons', label: t('common.lessons'), icon: Video },
    { value: 'trends', label: t('analytics.trends'), icon: TrendingUp },
    { value: 'audience', label: t('analytics.audience'), icon: Users }
  ];

  const summaryMetrics = useMemo(() => {
    if (!analytics) return [];
    
    const metrics = [
      {
        title: t('analytics.total_views'),
        value: analytics.summary.totalViews,
        formattedValue: formatNumber(analytics.summary.totalViews),
        change: previousAnalytics ? calculateTrend(analytics.summary.totalViews, previousAnalytics.totalViews) : { value: 0, trend: 'up' as const },
        icon: Eye,
        color: 'blue',
        description: t('analytics.total_views_description')
      },
      {
        title: t('analytics.unique_viewers'),
        value: analytics.summary.uniqueViewers,
        formattedValue: formatNumber(analytics.summary.uniqueViewers),
        change: previousAnalytics ? calculateTrend(analytics.summary.uniqueViewers, previousAnalytics.uniqueViewers) : { value: 0, trend: 'up' as const },
        icon: Users,
        color: 'green',
        description: t('analytics.unique_viewers_description')
      },
      {
        title: t('analytics.avg_watch_time'),
        value: analytics.summary.averageWatchTime,
        formattedValue: formatDuration(analytics.summary.averageWatchTime),
        change: previousAnalytics ? calculateTrend(analytics.summary.averageWatchTime, previousAnalytics.averageWatchTime) : { value: 0, trend: 'up' as const },
        icon: Clock,
        color: 'purple',
        description: t('analytics.avg_watch_time_description')
      },
      {
        title: t('analytics.completion_rate'),
        value: analytics.summary.averageCompletionRate,
        formattedValue: `${analytics.summary.averageCompletionRate.toFixed(1)}%`,
        change: previousAnalytics ? calculateTrend(analytics.summary.averageCompletionRate, previousAnalytics.averageCompletionRate) : { value: 0, trend: 'up' as const },
        icon: Target,
        color: 'orange',
        description: t('analytics.completion_rate_description')
      }
    ];

    return metrics;
  }, [analytics, previousAnalytics, t, formatNumber, formatDuration]);

  const filteredLessons = useMemo(() => {
    if (!analytics) return [];
    
    let lessons = analytics.topPerformingLessons;
    
    if (searchTerm) {
      lessons = lessons.filter(lesson => 
        lesson.lessonTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return lessons;
  }, [analytics, searchTerm]);

  const engagementScore = useMemo(() => {
    if (!analytics) return 0;
    
    const { averageCompletionRate, averageWatchTime, totalViews, uniqueViewers } = analytics.summary;
    
    // Simple engagement calculation (in real app, this would be more sophisticated)
    const completionWeight = 0.4;
    const watchTimeWeight = 0.3;
    const viewWeight = 0.2;
    const uniqueViewerWeight = 0.1;
    
    const maxWatchTime = 3600; // 1 hour as max
    const normalizedWatchTime = Math.min(averageWatchTime / maxWatchTime, 1) * 100;
    
    return Math.round(
      (averageCompletionRate * completionWeight) +
      (normalizedWatchTime * watchTimeWeight) +
      (Math.min(totalViews / 1000, 100) * viewWeight) +
      (Math.min(uniqueViewers / 100, 100) * uniqueViewerWeight)
    );
  }, [analytics]);

  if (loading && !analytics) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">{t('analytics.loading_video_analytics')}</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('analytics.failed_to_load_analytics')}
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            {t('common.try_again')}
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
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              <Video className="h-6 w-6 mr-2" />
              {t('analytics.video_analytics')}
            </h2>
            <p className="text-purple-100">
              {t('analytics.insights_from_lessons', {
                lessons: analytics.totalLessons,
                courses: analytics.totalCourses
              })}
            </p>
            
            {/* Engagement Score */}
            <div className="mt-4 flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-300" />
                  <span className="font-semibold">{t('analytics.engagement_score')}</span>
                </div>
                <div className="text-2xl font-bold mt-1">{engagementScore}%</div>
                <div className="text-purple-200 text-sm">
                  {engagementScore >= 80 ? t('analytics.excellent_engagement') :
                   engagementScore >= 60 ? t('analytics.good_engagement') :
                   t('analytics.needs_improvement')}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
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
              {t('common.refresh')}
            </button>
            {showExport && (
              <button
                onClick={handleExport}
                className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('common.export')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* View Mode Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {viewModeOptions.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value as ViewMode)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === mode.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Metrics */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-${metric.color}-100 rounded-lg flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 text-${metric.color}-600`} />
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    metric.change.trend === 'up' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <TrendingUp className={`h-3 w-3 ${metric.change.trend === 'down' ? 'rotate-180' : ''}`} />
                    <span>{metric.change.value.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {metric.formattedValue}
                </div>
                <div className="text-sm text-gray-600 mb-2">{metric.title}</div>
                <div className="text-xs text-gray-500">{metric.description}</div>
                
                {/* Mini trend chart */}
                <div className="mt-3 flex items-end space-x-1 h-8">
                  {[30, 45, 60, 75, 65, 80, 90].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gray-200 rounded-t transition-all duration-300"
                      style={{ 
                        height: `${height * 0.3}px`,
                        background: `linear-gradient(to top, var(--tw-gradient-stops))`,
                        ['--tw-gradient-from' as any]: metric.color === 'blue' ? '#3b82f6' : 
                                     metric.color === 'green' ? '#10b981' :
                                     metric.color === 'purple' ? '#8b5cf6' : '#f59e0b',
                        ['--tw-gradient-to' as any]: metric.color === 'blue' ? '#1d4ed8' : 
                                     metric.color === 'green' ? '#047857' :
                                     metric.color === 'purple' ? '#7c3aed' : '#d97706'
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top Performing Lessons */}
      {(viewMode === 'overview' || viewMode === 'lessons') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-yellow-600" />
                  {t('analytics.top_performing_lessons')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('analytics.most_viewed_engaging_lessons')}
                </p>
              </div>
              
              {/* Search */}
              <div className="mt-4 lg:mt-0 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('common.search_lessons')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full lg:w-64"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {filteredLessons.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('common.lesson')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('common.course')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('common.views')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('analytics.watch_time')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('common.completion')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLessons.map((lesson, index) => (
                    <tr 
                      key={lesson.lessonId} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedLesson(lesson.lessonId.toString())}
                    >
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
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-600 hover:text-blue-700 transition-colors">
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <PlayCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{t('analytics.no_video_views_yet')}</p>
                <p className="text-sm mt-1">{t('analytics.analytics_will_appear')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trends Chart */}
      {(viewMode === 'overview' || viewMode === 'trends') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                {t('analytics.recent_activity_trends')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('analytics.daily_video_views_over_time')}
              </p>
            </div>
            <div className="flex items-center space-x-2 mt-4 lg:mt-0">
              {chartTypeOptions.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setChartType(type.value as ChartType)}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartType === type.value
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {analytics.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentActivity.map((activity) => {
                const maxValue = Math.max(...analytics.recentActivity.map(a => a.views));
                const barWidth = maxValue > 0 ? (activity.views / maxValue) * 100 : 0;
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
                                {activity.views} {t('common.views')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 text-sm text-gray-600 w-24 text-right">
                          {activity.uniqueViewers} {t('analytics.viewers')}
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
              <p>{t('analytics.no_recent_activity')}</p>
            </div>
          )}

          {/* Chart Legend */}
          <div className="flex items-center justify-between text-xs text-gray-500 mt-4">
            <span>{t('common.start')}</span>
            <span>{t('common.mid')}</span>
            <span>{t('common.current')}</span>
          </div>
        </div>
      )}

      {/* Audience Insights */}
      {viewMode === 'audience' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              {t('analytics.audience_insights')}
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('analytics.average_view_duration')}</span>
                <span className="font-medium text-gray-900">
                  {formatDuration(analytics.summary.averageWatchTime)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('analytics.peak_viewing_hours')}</span>
                <span className="font-medium text-gray-900">2:00 PM - 4:00 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('analytics.returning_viewers')}</span>
                <span className="font-medium text-gray-900">
                  {Math.round((analytics.summary.uniqueViewers / analytics.summary.totalViews) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Performance Tips */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-600" />
              {t('analytics.performance_tips')}
            </h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">
                  {t('analytics.tip_optimal_length')}
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">
                  {t('analytics.tip_engagement_hooks')}
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">
                  {t('analytics.tip_visual_aids')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Synced */}
      <div className="text-center text-sm text-gray-500">
        {t('common.last_updated')}: {new Date(analytics.lastSynced).toLocaleString()}
      </div>
    </div>
  );
};

export default VideoAnalyticsDashboard;