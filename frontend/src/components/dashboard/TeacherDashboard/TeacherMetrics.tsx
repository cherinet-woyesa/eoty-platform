import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { 
  BookOpen, Users, Video, Target, Eye, Clock, 
  TrendingUp, TrendingDown, AlertCircle, RefreshCw,
  DollarSign, Star, MessageCircle, Award, Zap
} from 'lucide-react';
import MetricsCard from '../AdminDashboard/MetricsCard';
import { useTranslation } from 'react-i18next';
import { 
  videoAnalyticsApi, 
  type TeacherDashboardAnalytics,
  type VideoAnalyticsSummary 
} from '../../../services/api/videoAnalytics';

// Types
interface TeacherStats {
  totalCourses: number;
  totalStudentsEnrolled: number;
  totalLessons: number;
  averageCompletionRate: number;
  averageRating?: number;
  revenue?: number;
  engagementScore?: number;
  studentSatisfaction?: number;
  totalRevenue?: number;
  courses: any[];
  recentActivity: any[];
  studentPerformance: any[];
  upcomingTasks: any[];
}

interface TeacherMetricsProps {
  stats?: TeacherStats;
  includeVideoAnalytics?: boolean;
  showRevenue?: boolean;
  compact?: boolean;
  autoRefresh?: boolean;
}

interface MetricItem {
  title: string;
  value: number | string;
  change: number;
  icon: React.ReactNode;
  color: string;
  trend: 'up' | 'down';
  format?: 'number' | 'percent' | 'currency' | 'duration' | 'rating';
  decimal?: number;
  description?: string;
  isLoading?: boolean;
}

const TeacherMetrics: React.FC<TeacherMetricsProps> = ({ 
  stats, 
  includeVideoAnalytics = false,
  showRevenue = false,
  compact = false,
  autoRefresh = false
}) => {
  const { t } = useTranslation();
  const [videoAnalytics, setVideoAnalytics] = useState<TeacherDashboardAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    if (includeVideoAnalytics) {
      fetchVideoAnalytics();
    }
  }, [includeVideoAnalytics]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (includeVideoAnalytics) {
          fetchVideoAnalytics();
        }
        setLastRefreshed(new Date());
      }, 300000); // Refresh every 5 minutes

      return () => clearInterval(interval);
    }
  }, [autoRefresh, includeVideoAnalytics]);

  const fetchVideoAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      setAnalyticsError(null);
      const data = await videoAnalyticsApi.getTeacherDashboardAnalytics({
        timeframe: '7:days',
        limit: 5
      });
      setVideoAnalytics(data);
    } catch (error: any) {
      console.error('Failed to fetch video analytics:', error);
      setAnalyticsError(error.response?.data?.message || t('common.failed_to_load_analytics'));
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleRefresh = useCallback(() => {
    if (includeVideoAnalytics) {
      fetchVideoAnalytics();
    }
    setLastRefreshed(new Date());
  }, [includeVideoAnalytics]);

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

  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Mock previous period data for trend calculation
  const previousStats = useMemo(() => ({
    totalCourses: Math.max(0, (stats?.totalCourses || 0) - 2),
    totalStudentsEnrolled: Math.max(0, (stats?.totalStudentsEnrolled || 0) - 15),
    totalLessons: Math.max(0, (stats?.totalLessons || 0) - 8),
    averageCompletionRate: Math.max(0, (stats?.averageCompletionRate || 0) - 5),
    averageRating: Math.max(0, (stats?.averageRating || 0) - 0.2),
    revenue: Math.max(0, (stats?.revenue || 0) - 150)
  }), [stats]);

  const metrics = useMemo((): MetricItem[] => {
    const baseMetrics: MetricItem[] = [
      {
        title: t('dashboard.teacher.total_courses'),
        value: stats?.totalCourses || 0,
        change: calculateTrend(stats?.totalCourses || 0, previousStats.totalCourses),
        icon: <BookOpen className="h-5 w-5" />,
        color: 'from-blue-500 to-blue-600',
        trend: (stats?.totalCourses || 0) >= previousStats.totalCourses ? 'up' : 'down',
        description: t('metrics.courses_description')
      },
      {
        title: t('dashboard.teacher.active_students'),
        value: stats?.totalStudentsEnrolled || 0,
        change: calculateTrend(stats?.totalStudentsEnrolled || 0, previousStats.totalStudentsEnrolled),
        icon: <Users className="h-5 w-5" />,
        color: 'from-green-500 to-green-600',
        trend: (stats?.totalStudentsEnrolled || 0) >= previousStats.totalStudentsEnrolled ? 'up' : 'down',
        description: t('metrics.students_description')
      },
      {
        title: t('common.total_lessons'),
        value: stats?.totalLessons || 0,
        change: calculateTrend(stats?.totalLessons || 0, previousStats.totalLessons),
        icon: <Video className="h-5 w-5" />,
        color: 'from-purple-500 to-purple-600',
        trend: (stats?.totalLessons || 0) >= previousStats.totalLessons ? 'up' : 'down',
        description: t('metrics.lessons_description')
      },
      {
        title: t('metrics.completion_rate'),
        value: stats?.averageCompletionRate || 0,
        change: calculateTrend(stats?.averageCompletionRate || 0, previousStats.averageCompletionRate),
        icon: <Target className="h-5 w-5" />,
        color: 'from-orange-500 to-orange-600',
        trend: (stats?.averageCompletionRate || 0) >= previousStats.averageCompletionRate ? 'up' : 'down',
        format: 'percent',
        description: t('metrics.completion_description')
      }
    ];

    // Add rating metric if available
    if (stats?.averageRating) {
      baseMetrics.push({
        title: t('metrics.average_rating'),
        value: stats.averageRating,
        change: calculateTrend(stats.averageRating, previousStats.averageRating),
        icon: <Star className="h-5 w-5" />,
        color: 'from-yellow-500 to-yellow-600',
        trend: stats.averageRating >= previousStats.averageRating ? 'up' : 'down',
        format: 'rating',
        decimal: 1,
        description: t('metrics.rating_description')
      });
    }

    // Add engagement metric if available
    if (stats?.engagementScore) {
      baseMetrics.push({
        title: t('metrics.engagement_score'),
        value: stats.engagementScore,
        change: 5.2, // Mock change
        icon: <Zap className="h-5 w-5" />,
        color: 'from-indigo-500 to-indigo-600',
        trend: 'up',
        format: 'percent',
        description: t('metrics.engagement_description')
      });
    }

    // Add revenue metric if enabled and available
    if (showRevenue && stats?.revenue) {
      baseMetrics.push({
        title: t('metrics.total_revenue'),
        value: stats.revenue,
        change: calculateTrend(stats.revenue, previousStats.revenue),
        icon: <DollarSign className="h-5 w-5" />,
        color: 'from-emerald-500 to-emerald-600',
        trend: stats.revenue >= previousStats.revenue ? 'up' : 'down',
        format: 'currency',
        description: t('metrics.revenue_description')
      });
    }

    // Add student satisfaction if available
    if (stats?.studentSatisfaction) {
      baseMetrics.push({
        title: t('metrics.student_satisfaction'),
        value: stats.studentSatisfaction,
        change: 2.1, // Mock change
        icon: <Award className="h-5 w-5" />,
        color: 'from-pink-500 to-pink-600',
        trend: 'up',
        format: 'percent',
        description: t('metrics.satisfaction_description')
      });
    }

    // Add video analytics metrics if available
    if (includeVideoAnalytics && videoAnalytics && !loadingAnalytics) {
      const videoMetrics: MetricItem[] = [
        {
          title: t('metrics.video_views'),
          value: videoAnalytics.summary.totalViews,
          change: 12.5, // Mock change
          icon: <Eye className="h-5 w-5" />,
          color: 'from-cyan-500 to-cyan-600',
          trend: 'up',
          description: t('metrics.views_description'),
          isLoading: loadingAnalytics
        },
        {
          title: t('metrics.avg_watch_time'),
          value: formatDuration(videoAnalytics.summary.averageWatchTime),
          change: 8.3, // Mock change
          icon: <Clock className="h-5 w-5" />,
          color: 'from-rose-500 to-rose-600',
          trend: 'up',
          format: 'duration',
          description: t('metrics.watch_time_description'),
          isLoading: loadingAnalytics
        },
        {
          title: t('metrics.completion_rate'),
          value: videoAnalytics.summary.averageCompletionRate,
          change: calculateTrend(
            videoAnalytics.summary.averageCompletionRate,
            Math.max(0, videoAnalytics.summary.averageCompletionRate - 8)
          ),
          icon: <Target className="h-5 w-5" />,
          color: 'from-violet-500 to-violet-600',
          trend: 'up',
          format: 'percent',
          description: t('metrics.video_completion_description'),
          isLoading: loadingAnalytics
        },
        {
          title: t('metrics.unique_viewers'),
          value: videoAnalytics.summary.uniqueViewers,
          change: 15.7, // Mock change
          icon: <Users className="h-5 w-5" />,
          color: 'from-amber-500 to-amber-600',
          trend: 'up',
          description: t('metrics.viewers_description'),
          isLoading: loadingAnalytics
        }
      ];

      baseMetrics.push(...videoMetrics);
    }

    return baseMetrics;
  }, [
    stats, 
    previousStats, 
    videoAnalytics, 
    loadingAnalytics, 
    includeVideoAnalytics, 
    showRevenue, 
    t, 
    formatDuration
  ]);

  const gridCols = useMemo(() => {
    const count = metrics.length;
    if (count <= 4) return 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
    return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-8';
  }, [metrics.length]);

  const formatLastRefreshed = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return t('common.just_now');
    if (minutes < 60) return t('common.minutes_ago', { count: minutes });
    return t('common.hours_ago', { count: Math.floor(minutes / 60) });
  }, [t]);

  if (compact) {
    return (
      <div className={`grid ${gridCols} gap-4`}>
        {metrics.slice(0, 4).map((metric, index) => (
          <MetricsCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            format={metric.format}
            icon={metric.icon}
            color={metric.color}
            trend={metric.trend}
            compact={true}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('dashboard.teacher.performance_metrics')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('metrics.overview_of_teaching_performance')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastRefreshed && (
            <span className="text-sm text-gray-500">
              {t('common.last_updated')}: {formatLastRefreshed(lastRefreshed)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={loadingAnalytics}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingAnalytics ? 'animate-spin' : ''}`} />
            <span>{t('common.refresh')}</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {analyticsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 text-sm">{analyticsError}</span>
            <button
              onClick={fetchVideoAnalytics}
              className="ml-auto text-red-600 hover:text-red-800 text-sm font-medium"
            >
              {t('common.try_again')}
            </button>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className={`grid ${gridCols} gap-4`}>
        {metrics.map((metric, index) => (
          <MetricsCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            format={metric.format}
            icon={metric.icon}
            color={metric.color}
            trend={metric.trend}
            compact={false}
          />
        ))}
      </div>

      {/* Loading State for Video Analytics */}
      {includeVideoAnalytics && loadingAnalytics && !videoAnalytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                <div className="w-16 h-6 bg-gray-300 rounded"></div>
              </div>
              <div className="h-8 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Performance Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-blue-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            {t('metrics.performance_insights')}
          </h4>
          <div className="text-sm text-blue-700">
            {t('common.this_week')}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              +{calculateTrend(stats?.totalStudentsEnrolled || 0, previousStats.totalStudentsEnrolled).toFixed(1)}%
            </div>
            <div className="text-blue-700">{t('metrics.student_growth')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              +{calculateTrend(stats?.averageCompletionRate || 0, previousStats.averageCompletionRate).toFixed(1)}%
            </div>
            <div className="text-green-700">{t('metrics.completion_growth')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {formatNumber(stats?.totalLessons || 0)}
            </div>
            <div className="text-purple-700">{t('metrics.total_content')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">
              {stats?.engagementScore || 85}%
            </div>
            <div className="text-orange-700">{t('metrics.engagement_rate')}</div>
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{metrics.length}</div>
          <div className="text-sm text-gray-600">{t('metrics.total_metrics')}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {metrics.filter(m => m.trend === 'up').length}
          </div>
          <div className="text-sm text-gray-600">{t('metrics.improving')}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {metrics.filter(m => m.trend === 'down').length}
          </div>
          <div className="text-sm text-gray-600">{t('metrics.declining')}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(metrics.reduce((sum, m) => sum + m.change, 0) / metrics.length)}%
          </div>
          <div className="text-sm text-gray-600">{t('metrics.avg_growth')}</div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TeacherMetrics);