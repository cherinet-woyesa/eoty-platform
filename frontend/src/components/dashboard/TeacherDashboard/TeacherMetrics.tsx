import React, { useMemo } from 'react';
import { BookOpen, Users, Video, Clock, Star, Target, TrendingUp, DollarSign } from 'lucide-react';
import MetricsCard from '../AdminDashboard/MetricsCard';

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

const TeacherMetrics: React.FC<TeacherMetricsProps> = ({ stats }) => {
  const metrics = useMemo(() => [
    {
      title: 'Active Courses',
      value: stats?.totalCourses || 0,
      change: 2,
      icon: <BookOpen className="h-6 w-6" />,
      color: 'from-blue-500 to-blue-600',
      trend: 'up' as const
    },
    {
      title: 'Total Students',
      value: stats?.totalStudents || 0,
      change: 12,
      icon: <Users className="h-6 w-6" />,
      color: 'from-green-500 to-green-600',
      trend: 'up' as const
    },
    {
      title: 'Video Lessons',
      value: stats?.totalLessons || 0,
      change: 8,
      icon: <Video className="h-6 w-6" />,
      color: 'from-purple-500 to-purple-600',
      trend: 'up' as const
    },
    {
      title: 'Hours Taught',
      value: stats?.totalHours || 0,
      change: 15,
      icon: <Clock className="h-6 w-6" />,
      color: 'from-orange-500 to-orange-600',
      trend: 'up' as const
    },
    {
      title: 'Average Rating',
      value: stats?.averageRating || 0,
      change: 0.2,
      format: 'number' as const,
      icon: <Star className="h-6 w-6" />,
      color: 'from-yellow-500 to-yellow-600',
      trend: 'up' as const,
      decimal: 1
    },
    {
      title: 'Completion Rate',
      value: stats?.completionRate || 0,
      change: 5,
      format: 'percent' as const,
      icon: <Target className="h-6 w-6" />,
      color: 'from-indigo-500 to-indigo-600',
      trend: 'up' as const
    },
    {
      title: 'Engagement Score',
      value: stats?.engagementScore || 0,
      change: 3,
      format: 'percent' as const,
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'from-pink-500 to-pink-600',
      trend: 'up' as const
    },
    ...(stats?.revenue ? [{
      title: 'Revenue',
      value: stats.revenue,
      change: 8,
      format: 'currency' as const,
      icon: <DollarSign className="h-6 w-6" />,
      color: 'from-emerald-500 to-emerald-600',
      trend: 'up' as const
    }] : [])
  ], [stats]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
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