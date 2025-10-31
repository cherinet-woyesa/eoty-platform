import React, { useMemo } from 'react';
import { BookOpen, Users, Video, Clock, Star, Target, TrendingUp, DollarSign } from 'lucide-react';
import MetricsCard from '../AdminDashboard/MetricsCard';
import { useTranslation } from 'react-i18next'; // Added translation hook

interface TeacherMetricsProps {
  stats?: {
    totalCourses: number;
    totalStudents: number;
    totalLessons: number;
    totalHours: number;
    averageRating: number;
    completionRate: number;
    engagementScore: number;
    revenue?: number;
  };
}

// Define the metric item interface
interface MetricItem {
  title: string;
  value: number;
  change: number;
  icon: React.ReactNode;
  color: string;
  trend: 'up' | 'down';
  format?: 'number' | 'percent' | 'currency';
  decimal?: number;
}

const TeacherMetrics: React.FC<TeacherMetricsProps> = ({ stats }) => {
  const { t } = useTranslation(); // Added translation hook

  const metrics = useMemo<MetricItem[]>(() => [
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
      value: stats?.totalStudents || 0,
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
      title: t('dashboard.teacher.total_hours_taught', 'Hours Taught'), 
      value: stats?.totalHours || 0,
      change: 15,
      icon: <Clock className="h-6 w-6" />,
      color: 'from-orange-500 to-orange-600',
      trend: 'up' as const
    }
  ], [stats, t]); // Added t to dependency array

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <MetricsCard
          key={index}
          title={metric.title}
          value={metric.decimal ? metric.value.toFixed(metric.decimal) : metric.value}
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