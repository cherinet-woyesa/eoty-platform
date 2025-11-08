import React, { useMemo, useEffect, useState } from 'react';
import { BookOpen, Users, Video, Target, Eye, Clock } from 'lucide-react';
import MetricsCard from '../AdminDashboard/MetricsCard';
import { useTranslation } from 'react-i18next'; // Added translation hook
import { videoAnalyticsApi, type TeacherDashboardAnalytics } from '../../../services/api/videoAnalytics';

interface TeacherMetricsProps {
  stats?: {
    totalCourses: number;
    totalStudentsEnrolled: number;
    totalLessons: number;
    averageCompletionRate: number;
    averageRating?: number;
    completionRate?: number;
    engagementScore?: number;
    revenue?: number;
  };
  includeVideoAnalytics?: boolean;
}

// Define the metric item interface
interface MetricItem {
  title: string;
  value: number | string;
  change: number;
  icon: React.ReactNode;
  color: string;
  trend: 'up' | 'down';
  format?: 'number' | 'percent' | 'currency';
  decimal?: number;
}

const TeacherMetrics: React.FC<TeacherMetricsProps> = ({ stats, includeVideoAnalytics = false }) => {
  const { t } = useTranslation(); // Added translation hook
  const [videoAnalytics, setVideoAnalytics] = useState<TeacherDashboardAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (includeVideoAnalytics) {
      fetchVideoAnalytics();
    }
  }, [includeVideoAnalytics]);

  const fetchVideoAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const data = await videoAnalyticsApi.getTeacherDashboardAnalytics({
        timeframe: '7:days',
        limit: 5
      });
      setVideoAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch video analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const metrics = useMemo<MetricItem[]>(() => {
    const baseMetrics: MetricItem[] = [
      {
        title: t('dashboard.teacher.total_courses'), // Updated to use translation
        value: stats?.totalCourses || 0,
        change: 2,
        icon: <BookOpen className="h-6 w-6" />,
        color: 'from-blue-500 to-blue-600',
        trend: 'up' as const
      },
      {
        title: t('dashboard.teacher.active_students'), // Updated to use translation
        value: stats?.totalStudentsEnrolled || 0,
        change: 12,
        icon: <Users className="h-6 w-6" />,
        color: 'from-green-500 to-green-600',
        trend: 'up' as const
      },
      {
        title: t('common.record_video'), // Updated to use translation
        value: stats?.totalLessons || 0,
        change: 8,
        icon: <Video className="h-6 w-6" />,
        color: 'from-purple-500 to-purple-600',
        trend: 'up' as const
      },
      {
        title: 'Completion Rate',
        value: stats?.averageCompletionRate || 0,
        change: 15,
        icon: <Target className="h-6 w-6" />,
        color: 'from-orange-500 to-orange-600',
        trend: 'up' as const,
        format: 'percent' as const
      }
    ];

    // Add video analytics metrics if available
    if (includeVideoAnalytics && videoAnalytics && !loadingAnalytics) {
      baseMetrics.push(
        {
          title: 'Video Views',
          value: videoAnalytics.summary.totalViews,
          change: 10,
          icon: <Eye className="h-6 w-6" />,
          color: 'from-indigo-500 to-indigo-600',
          trend: 'up' as const
        },
        {
          title: 'Avg Watch Time',
          value: formatDuration(videoAnalytics.summary.averageWatchTime),
          change: 5,
          icon: <Clock className="h-6 w-6" />,
          color: 'from-pink-500 to-pink-600',
          trend: 'up' as const
        }
      );
    }

    return baseMetrics;
  }, [stats, t, includeVideoAnalytics, videoAnalytics, loadingAnalytics]); // Added t to dependency array

  return (
    <div className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-${includeVideoAnalytics ? '6' : '4'} xl:grid-cols-${includeVideoAnalytics ? '6' : '4'} gap-4`}>
      {metrics.map((metric, index) => (
        <MetricsCard
          key={index}
          title={metric.title}
          value={
            metric.decimal 
              ? (metric.value as number).toFixed(metric.decimal) 
              : metric.value
          }
          change={metric.change}
          format={metric.format}
          icon={metric.icon}
          color={metric.color}
          trend={metric.trend}
          compact
        />
      ))}
    </div>
  );
};

export default React.memo(TeacherMetrics);