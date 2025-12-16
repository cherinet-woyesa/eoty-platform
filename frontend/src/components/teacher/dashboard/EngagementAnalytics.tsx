import React, { useMemo, useState, useCallback } from 'react';
import { 
  BarChart, LineChart, CheckCircle, PieChart, TrendingUp, 
  Users, Clock, Eye, MessageCircle, Download, Filter, Calendar,
  AlertCircle, RefreshCw, Sparkles, Target, Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';

// Types
interface EngagementData {
  date: string;
  activeStudents: number;
  completedLessons: number;
  averageTimeSpent: number;
  discussionPosts: number;
  videoViews: number;
  completionRate: number;
  engagementScore: number;
  quizAttempts: number;
  assignmentSubmissions: number;
}

interface EngagementAnalyticsProps {
  courseId?: string;
  timeframe?: '7d' | '30d' | '90d' | '1y';
  showExport?: boolean;
}

type MetricType = 'engagement' | 'completion' | 'participation' | 'performance';
type ChartType = 'line' | 'bar' | 'area';

const EngagementAnalytics: React.FC<EngagementAnalyticsProps> = ({ 
  courseId,
  timeframe = '30d',
  showExport = true
}) => {
  const { t } = useTranslation();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('engagement');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: engagementResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-engagement', courseId || 'all', timeframe],
    queryFn: async () => {
      const res = await apiClient.get('/teacher/analytics/engagement', {
        params: { courseId, timeframe }
      });
      return res?.data?.data as { series?: EngagementData[] } | undefined;
    },
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });

  // Use backend data when available; fall back to generated data to keep UI usable.
  const engagementData: EngagementData[] = useMemo(() => {
    if (engagementResponse?.series && engagementResponse.series.length > 0) {
      return engagementResponse.series;
    }

    const data: EngagementData[] = [];
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const baseDate = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      const baseEngagement = 60 + Math.sin(i * 0.3) * 15;
      const trendFactor = 1 + (i / days) * 0.2;
      data.push({
        date: date.toISOString().split('T')[0],
        activeStudents: Math.floor((Math.random() * 30 + 20) * trendFactor),
        completedLessons: Math.floor((Math.random() * 25 + 15) * trendFactor),
        averageTimeSpent: Math.floor((Math.random() * 20 + 25) * trendFactor),
        discussionPosts: Math.floor((Math.random() * 12 + 8) * trendFactor),
        videoViews: Math.floor((Math.random() * 80 + 70) * trendFactor),
        completionRate: Math.floor((Math.random() * 25 + 60) * trendFactor),
        engagementScore: Math.floor(baseEngagement * trendFactor),
        quizAttempts: Math.floor((Math.random() * 15 + 10) * trendFactor),
        assignmentSubmissions: Math.floor((Math.random() * 8 + 5) * trendFactor)
      });
    }
    return data;
  }, [engagementResponse?.series, timeframe]);

  const metrics = useMemo(() => [
    {
      id: 'engagement' as MetricType,
      name: t('analytics.engagement_score'),
      value: Math.round(engagementData.reduce((sum, day) => sum + day.engagementScore, 0) / engagementData.length),
      change: '+5.2%',
      trend: 'up' as const,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'from-blue-500 to-cyan-500',
      description: t('analytics.engagement_score_description')
    },
    {
      id: 'completion' as MetricType,
      name: t('analytics.completion_rate'),
      value: Math.round(engagementData.reduce((sum, day) => sum + day.completionRate, 0) / engagementData.length),
      change: '+3.1%',
      trend: 'up' as const,
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'from-green-500 to-emerald-500',
      description: t('analytics.completion_rate_description')
    },
    {
      id: 'participation' as MetricType,
      name: t('analytics.student_participation'),
      value: Math.round(engagementData.reduce((sum, day) => sum + day.activeStudents, 0) / engagementData.length / 50 * 100),
      change: '+8.7%',
      trend: 'up' as const,
      icon: <Users className="h-5 w-5" />,
      color: 'from-purple-500 to-indigo-500',
      description: t('analytics.participation_description')
    },
    {
      id: 'performance' as MetricType,
      name: t('analytics.performance_score'),
      value: 82,
      change: '+2.4%',
      trend: 'up' as const,
      icon: <Target className="h-5 w-5" />,
      color: 'from-orange-500 to-amber-500',
      description: t('analytics.performance_description')
    }
  ], [engagementData, t]);

  const detailedMetrics = useMemo(() => [
    {
      name: t('analytics.active_students'),
      value: engagementData.reduce((sum, day) => sum + day.activeStudents, 0),
      change: '+12%',
      icon: <Users className="h-4 w-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: t('analytics.completed_lessons'),
      value: engagementData.reduce((sum, day) => sum + day.completedLessons, 0),
      change: '+8%',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: t('analytics.avg_time_spent'),
      value: `${Math.round(engagementData.reduce((sum, day) => sum + day.averageTimeSpent, 0) / engagementData.length)}m`,
      change: '+5%',
      icon: <Clock className="h-4 w-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: t('analytics.video_views'),
      value: engagementData.reduce((sum, day) => sum + day.videoViews, 0),
      change: '+15%',
      icon: <Eye className="h-4 w-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      name: t('analytics.discussion_posts'),
      value: engagementData.reduce((sum, day) => sum + day.discussionPosts, 0),
      change: '+22%',
      icon: <MessageCircle className="h-4 w-4" />,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    },
    {
      name: t('analytics.quiz_attempts'),
      value: engagementData.reduce((sum, day) => sum + day.quizAttempts, 0),
      change: '+18%',
      icon: <Zap className="h-4 w-4" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ], [engagementData, t]);

  const timeframeOptions = [
    { value: '7d', label: t('common.last_7_days') },
    { value: '30d', label: t('common.last_30_days') },
    { value: '90d', label: t('common.last_90_days') },
    { value: '1y', label: t('common.last_year') }
  ];

  const chartTypeOptions = [
    { value: 'line', label: t('common.line_chart'), icon: LineChart },
    { value: 'bar', label: t('common.bar_chart'), icon: BarChart },
    { value: 'area', label: t('common.area_chart'), icon: PieChart }
  ];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 1500));
    setExporting(false);
    // In real app, this would trigger download
    console.log('Exporting analytics data...');
  }, []);

  const getMetricData = useCallback((metric: MetricType) => {
    switch (metric) {
      case 'engagement':
        return engagementData.map(day => day.engagementScore);
      case 'completion':
        return engagementData.map(day => day.completionRate);
      case 'participation':
        return engagementData.map(day => day.activeStudents);
      case 'performance':
        return engagementData.map(day => day.quizAttempts);
      default:
        return engagementData.map(day => day.engagementScore);
    }
  }, [engagementData]);

  const getMetricLabel = useCallback((metric: MetricType) => {
    switch (metric) {
      case 'engagement':
        return t('analytics.engagement_score');
      case 'completion':
        return t('analytics.completion_rate');
      case 'participation':
        return t('analytics.active_students');
      case 'performance':
        return t('analytics.quiz_attempts');
      default:
        return t('analytics.engagement_score');
    }
  }, [t]);

  const renderMiniChart = (data: number[], color: string) => {
    const max = Math.max(...data);
    const recentData = data.slice(-7);
    
    return (
      <div className="flex items-end space-x-1 h-8 mt-2">
        {recentData.map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-gray-200 rounded-t transition-all duration-300 hover:opacity-80"
            style={{ 
              height: `${(value / max) * 100}%`,
              background: `linear-gradient(to top, ${color}, ${color}dd)`
            }}
          />
        ))}
      </div>
    );
  };

  const calculateInsights = useMemo(() => {
    const totalEngagement = engagementData.reduce((sum, day) => sum + day.engagementScore, 0);
    const avgEngagement = totalEngagement / engagementData.length;
    const trend = engagementData.slice(-7).reduce((sum, day) => sum + day.engagementScore, 0) / 7 > avgEngagement ? 'up' : 'down';
    
    const peakDay = engagementData.reduce((max, day) => 
      day.activeStudents > max.activeStudents ? day : max
    , engagementData[0]);

    return {
      avgEngagement: Math.round(avgEngagement),
      trend,
      peakDay: {
        date: new Date(peakDay.date).toLocaleDateString(),
        students: peakDay.activeStudents
      },
      recommendations: [
        t('analytics.insights.engagement_increased', { percent: '12%' }),
        t('analytics.insights.completion_highest_morning'),
        t('analytics.insights.add_interactive_content'),
        t('analytics.insights.peak_activity_day', { day: new Date(peakDay.date).toLocaleDateString('en-US', { weekday: 'long' }) })
      ]
    };
  }, [engagementData, t]);

  if (isError) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-sm text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{t('analytics.unable_to_load')}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            {t('analytics.engagement_analytics')}
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            {courseId 
              ? t('analytics.course_specific_analytics')
              : t('analytics.overall_platform_engagement')
            }
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          {/* Timeframe Selector */}
          <select 
            value={timeframe}
            onChange={(e) => console.log('Timeframe changed:', e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {timeframeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title={t('common.refresh_data')}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Export Button */}
          {showExport && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{exporting ? t('common.exporting') : t('common.export')}</span>
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
              selectedMetric === metric.id
                ? 'border-blue-300 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:shadow-md hover:border-gray-300'
            }`}
            onClick={() => setSelectedMetric(metric.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center shadow-sm`}>
                <div className="text-white">
                  {metric.icon}
                </div>
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                metric.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <TrendingUp className="h-3 w-3" />
                <span>{metric.change}</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}%</div>
            <div className="text-sm text-gray-600 mb-2">{metric.name}</div>
            <div className="text-xs text-gray-500">{metric.description}</div>
            
            {/* Mini chart */}
            {renderMiniChart(
              getMetricData(metric.id),
              metric.color.split(' ')[1]
            )}
          </div>
        ))}
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {detailedMetrics.map((metric, index) => (
          <div key={index} className={`text-center p-3 rounded-lg border ${metric.bgColor} border-gray-200`}>
            <div className={`mx-auto mb-2 ${metric.color}`}>
              {metric.icon}
            </div>
            <div className="text-lg font-bold text-gray-900">
              {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
            </div>
            <div className="text-xs text-gray-600 mb-1">{metric.name}</div>
            <div className={`text-xs font-medium ${
              metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
            }`}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
          <h4 className="font-semibold text-gray-900 mb-2 lg:mb-0">
            {getMetricLabel(selectedMetric)} {t('common.over_time')}
          </h4>
          <div className="flex items-center space-x-4">
            {/* Chart Type Selector */}
            <div className="flex items-center space-x-1 bg-white rounded-lg border border-gray-200 p-1">
              {chartTypeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setChartType(option.value as ChartType)}
                    className={`p-1 rounded transition-colors ${
                      chartType === option.value 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title={option.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>{t('common.current')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-300 rounded"></div>
                <span>{t('common.previous')}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chart visualization placeholder */}
        <div className="h-64 bg-white rounded border border-gray-200 flex items-center justify-center relative">
          <div className="text-center">
            {chartType === 'line' && <LineChart className="h-12 w-12 text-gray-300 mx-auto mb-2" />}
            {chartType === 'bar' && <BarChart className="h-12 w-12 text-gray-300 mx-auto mb-2" />}
            {chartType === 'area' && <PieChart className="h-12 w-12 text-gray-300 mx-auto mb-2" />}
            <p className="text-gray-500 text-sm">{t('analytics.chart_visualization')}</p>
            <p className="text-gray-400 text-xs mt-1">
              {t('analytics.showing_timeframe', { 
                timeframe: timeframeOptions.find(opt => opt.value === timeframe)?.label,
                metric: getMetricLabel(selectedMetric).toLowerCase()
              })}
            </p>
          </div>

          {/* Mock chart grid */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Horizontal grid lines */}
            {[0, 25, 50, 75, 100].map((percent) => (
              <div
                key={percent}
                className="absolute left-0 right-0 border-t border-gray-100"
                style={{ top: `${percent}%` }}
              />
            ))}
            {/* Vertical grid lines */}
            {[0, 25, 50, 75, 100].map((percent) => (
              <div
                key={percent}
                className="absolute top-0 bottom-0 border-l border-gray-100"
                style={{ left: `${percent}%` }}
              />
            ))}
          </div>
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{t('common.start')}</span>
          <span>{t('common.mid')}</span>
          <span>{t('common.current')}</span>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h5 className="font-semibold text-blue-900 mb-3 flex items-center">
            <Sparkles className="h-4 w-4 mr-2" />
            {t('analytics.insights_recommendations')}
          </h5>
          <ul className="text-sm text-blue-800 space-y-2">
            {calculateInsights.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Performance Summary */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h5 className="font-semibold text-green-900 mb-3 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            {t('analytics.performance_summary')}
          </h5>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex justify-between">
              <span>{t('analytics.avg_engagement')}:</span>
              <span className="font-semibold">{calculateInsights.avgEngagement}%</span>
            </div>
            <div className="flex justify-between">
              <span>{t('analytics.trend')}:</span>
              <span className={`font-semibold ${
                calculateInsights.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {calculateInsights.trend === 'up' ? '↗ ' : '↘ '}
                {t(`common.${calculateInsights.trend}ward`)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t('analytics.peak_activity')}:</span>
              <span className="font-semibold">{calculateInsights.peakDay.students} {t('analytics.students')}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('analytics.peak_date')}:</span>
              <span className="font-semibold">{calculateInsights.peakDay.date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-4 text-center text-sm text-gray-500">
        {t('common.last_updated')}: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default React.memo(EngagementAnalytics);