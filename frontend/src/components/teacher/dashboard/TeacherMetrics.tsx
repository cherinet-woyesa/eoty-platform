import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Users, Video, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { brandColors } from '@/theme/brand';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';

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
}

interface MetricItem {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  trendDirection?: 'up' | 'down';
}

const MetricsCard: React.FC<MetricItem> = ({ title, value, icon, color, trend, trendDirection = 'up' }) => {
  const isPositive = trendDirection === 'up';
  
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${color} shadow-sm`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{trend}%</span>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-2xl font-bold text-stone-800 tracking-tight">{value}</p>
        <p className="text-sm font-medium text-stone-500 mt-1">{title}</p>
      </div>
    </div>
  );
};

const TeacherMetrics: React.FC<TeacherMetricsProps> = ({ 
  stats
}) => {
  const { t } = useTranslation();
  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['teacher-metrics-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/teacher/analytics/stats');
      return res?.data?.data || {};
    },
    staleTime: 2 * 60 * 1000,
    retry: 1
  });
  const formatCount = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '0';
    }
    if (value >= 1000000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString();
  };

  const metrics = useMemo((): MetricItem[] => {
    const source = metricsData || stats || {};
    return [
      {
        title: t('dashboard.teacher.total_courses'),
        value: formatCount(source.totalCourses),
        icon: <BookOpen className="h-5 w-5" />,
        color: 'from-indigo-500 to-indigo-600',
        trend: source.coursesDelta,
        trendDirection: (source.coursesDelta ?? 0) >= 0 ? 'up' : 'down'
      },
      {
        title: t('dashboard.teacher.active_students'),
        value: formatCount(source.totalStudentsEnrolled),
        icon: <Users className="h-5 w-5" />,
        color: 'from-blue-500 to-blue-600',
        trend: source.studentsDelta,
        trendDirection: (source.studentsDelta ?? 0) >= 0 ? 'up' : 'down'
      },
      {
        title: t('dashboard.teacher.total_lessons'),
        value: formatCount(source.totalLessons),
        icon: <Video className="h-5 w-5" />,
        color: 'from-violet-500 to-violet-600',
        trend: source.lessonsDelta,
        trendDirection: (source.lessonsDelta ?? 0) >= 0 ? 'up' : 'down'
      },
      {
        title: t('dashboard.teacher.completion_rate'),
        value: `${Math.round(source.averageCompletionRate || 0)}%`,
        icon: <Target className="h-5 w-5" />,
        color: 'from-emerald-500 to-emerald-600',
        trend: source.completionDelta,
        trendDirection: (source.completionDelta ?? 0) >= 0 ? 'up' : 'down'
      }
    ];
  }, [metricsData, stats, t]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {isLoading
        ? [1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)
        : metrics.map((metric) => (
          <MetricsCard key={metric.title} {...metric} />
        ))
      }
    </div>
  );
};

export default React.memo(TeacherMetrics);
