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
} from '@/services/api/videoAnalytics';
import EngagementHeatmap from './EngagementHeatmap';

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
  const [heatmapData, setHeatmapData] = useState<{
    videoDuration: number;
    segmentData: Array<{ timestamp: number; watchCount: number }>;
  } | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

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
      // Build CSV content with summary and top-performing lessons
      const lines: string[] = [];

      // Summary section
      lines.push('Section,Metric,Value');
      lines.push(`Summary,Total Views,${analytics.summary.totalViews}`);
      lines.push(`Summary,Unique Viewers,${analytics.summary.uniqueViewers}`);
      lines.push(`Summary,Average Watch Time (seconds),${analytics.summary.averageWatchTime}`);
      lines.push(`Summary,Average Completion Rate (%),${analytics.summary.averageCompletionRate.toFixed(2)}`);
      lines.push('');

      // Top lessons section
      lines.push('Top Lessons,Lesson Title,Course Title,Views,Watch Time (seconds),Completion Rate (%)');
      analytics.topPerformingLessons.forEach((lesson) => {
        const safeLessonTitle = `"${lesson.lessonTitle.replace(/"/g, '""')}"`;
        const safeCourseTitle = `"${lesson.courseTitle.replace(/"/g, '""')}"`;
        lines.push([
          'Lesson',
          safeLessonTitle,
          safeCourseTitle,
          lesson.views,
          Math.round(lesson.watchTime),
          lesson.completionRate.toFixed(2)
        ].join(','));
      });

      const csvContent = lines.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `video-analytics-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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


  if (loading && !analytics) {
    return (
      <div className={`w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen ${className}`}>
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200 p-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-stone-600">{t('analytics.loading_video_analytics')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen ${className}`}>
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200 p-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center max-w-md">
              <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="h-6 w-6 text-stone-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-800 mb-2">
                {t('analytics.failed_to_load_analytics')}
              </h3>
              <p className="text-stone-600 mb-4">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                {t('common.try_again')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className={`w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-stone-800">
                {t('analytics.video_analytics')}
              </h1>
            </div>
            <p className="text-stone-600 font-medium">
              {t('analytics.insights_from_lessons', {
                lessons: analytics.totalLessons,
                courses: analytics.totalCourses
              })}
            </p>
          </div>
          <div className="mt-4 lg:mt-0 lg:ml-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                className="px-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border border-stone-200 hover:border-[#27AE60]/40 rounded-lg text-stone-700 hover:text-[#27AE60] font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50"
              >
                {timeframeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2.5 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </button>
              {showExport && (
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-4 py-2.5 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-lg transition-all duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('common.export')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Navigation */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-4 shadow-md">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {summaryMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all hover:border-[#27AE60]/40">
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#27AE60]/15 to-[#16A085]/15 rounded-lg blur-md"></div>
                    <div className="relative p-3 bg-gradient-to-br from-[#27AE60]/8 to-[#16A085]/8 rounded-lg border border-[#27AE60]/25">
                      <Icon className="h-6 w-6 text-[#27AE60]" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-bold text-stone-800 mb-1">{metric.formattedValue}</p>
                  <p className="text-stone-600 text-sm font-medium">{metric.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top Performing Lessons */}
      {(viewMode === 'overview' || viewMode === 'lessons') && (
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-stone-200">
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
                  className="pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-stone-400 w-full lg:w-64"
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
                      onClick={async () => {
                        const lessonId = lesson.lessonId.toString();
                        setSelectedLesson(lessonId);
                        // Load heatmap data for selected lesson
                        setLoadingHeatmap(true);
                        try {
                          const timeframeMap = {
                            '7d': '7:days',
                            '30d': '30:days',
                            '90d': '90:days',
                            '1y': '365:days'
                          } as const;
                          const heatmap = await videoAnalyticsApi.getEngagementHeatmap(
                            lesson.lessonId,
                            { timeframe: timeframeMap[timeframe] }
                          );
                          setHeatmapData({
                            videoDuration: heatmap.videoDuration,
                            segmentData: heatmap.segmentData
                          });
                        } catch (err) {
                          console.error('Failed to load heatmap:', err);
                        } finally {
                          setLoadingHeatmap(false);
                        }
                      }}
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
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200 p-4 sm:p-6">
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

      {/* Engagement Heatmap */}
      {selectedLesson && (viewMode === 'overview' || viewMode === 'lessons') && (
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200 p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-[#27AE60]" />
              Engagement Heatmap
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {selectedLesson && analytics?.topPerformingLessons.find(l => l.lessonId.toString() === selectedLesson)?.lessonTitle}
            </p>
          </div>
          {loadingHeatmap ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#27AE60]/20 border-t-[#27AE60] rounded-full animate-spin"></div>
            </div>
          ) : heatmapData ? (
            <EngagementHeatmap
              videoDuration={heatmapData.videoDuration}
              watchData={heatmapData.segmentData}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Select a lesson to view engagement heatmap</p>
            </div>
          )}
        </div>
      )}

      {/* Audience Insights */}
      {viewMode === 'audience' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Device Breakdown */}
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200 p-4 sm:p-6">
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
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200 p-4 sm:p-6">
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