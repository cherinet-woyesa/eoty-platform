import React, { useMemo } from 'react';
import { Users, BookOpen, CheckCircle, BarChart2, Clock, AlertTriangle, Zap, TrendingUp } from 'lucide-react';
import MetricsCard from './MetricsCard';

interface AdminMetricsProps {
  stats: any;
  error?: string;
}

const AdminMetrics: React.FC<AdminMetricsProps> = ({ stats, error }) => {
  const metrics = useMemo(() => [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      change: 12,
      icon: <Users className="h-6 w-6" />,
      color: 'from-blue-500 to-blue-600',
      trend: 'up' as const
    },
    {
      title: 'Active Courses',
      value: stats?.activeCourses || 0,
      change: 5,
      icon: <BookOpen className="h-6 w-6" />,
      color: 'from-green-500 to-green-600',
      trend: 'up' as const
    },
    {
      title: 'Completed Lessons',
      value: stats?.completedLessons || 0,
      change: 8,
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'from-purple-500 to-purple-600',
      trend: 'up' as const
    },
    {
      title: 'Avg. Engagement',
      value: stats?.avgEngagement || 0,
      change: 3,
      format: 'percent' as const,
      icon: <BarChart2 className="h-6 w-6" />,
      color: 'from-orange-500 to-orange-600',
      trend: 'up' as const
    },
    {
      title: 'Pending Approvals',
      value: stats?.pendingApprovals || 0,
      change: -2,
      icon: <Clock className="h-6 w-6" />,
      color: 'from-yellow-500 to-yellow-600',
      trend: 'down' as const
    },
    {
      title: 'Flagged Content',
      value: stats?.flaggedContent || 0,
      change: 1,
      icon: <AlertTriangle className="h-6 w-6" />,
      color: 'from-red-500 to-red-600',
      trend: 'up' as const
    },
    {
      title: 'Active Users',
      value: '1.2K',
      change: 24,
      icon: <Zap className="h-6 w-6" />,
      color: 'from-indigo-500 to-indigo-600',
      trend: 'up' as const
    },
    {
      title: 'New Registrations',
      value: stats?.newRegistrations || 0,
      change: 3,
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'from-pink-500 to-pink-600',
      trend: 'up' as const
    }
  ], [stats]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load metrics</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
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
          compact
        />
      ))}
    </div>
  );
};

export default React.memo(AdminMetrics);