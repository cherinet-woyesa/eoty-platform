import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Settings,
  Layers,
  Target,
  Clock,
  Tag,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight
} from 'lucide-react';
import { systemConfigApi } from '@/services/api/systemConfig';
import { CardSkeleton } from '@/components/shared/LoadingStates';
import type { EntityMetrics } from '@/types/systemConfig';

export const SystemConfigDashboard = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['system-config-metrics'],
    queryFn: async () => {
      console.log('Fetching system config metrics...');
      const data = await systemConfigApi.getMetrics();
      console.log('Received metrics:', data);
      return data;
    },
    refetchInterval: false, // Disable auto-refetch
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 1, // Only retry once on failure
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <CardSkeleton />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            Failed to load system configuration metrics
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings className="h-8 w-8" />
                System Configuration
              </h1>
              <p className="text-blue-100 mt-2">
                Manage course categories, levels, durations, tags, and chapters
              </p>
            </div>
            <Activity className="h-16 w-16 opacity-20" />
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
          <MetricCard
            title="Categories"
            icon={<Layers className="h-6 w-6" />}
            metrics={metrics.categories}
            link="/admin/config/categories"
            color="blue"
          />
          <MetricCard
            title="Levels"
            icon={<Target className="h-6 w-6" />}
            metrics={metrics.levels}
            link="/admin/config/levels"
            color="green"
          />
          <MetricCard
            title="Durations"
            icon={<Clock className="h-6 w-6" />}
            metrics={metrics.durations}
            link="/admin/config/durations"
            color="purple"
          />
          <MetricCard
            title="Tags"
            icon={<Tag className="h-6 w-6" />}
            metrics={metrics.tags}
            link="/admin/config/tags"
            color="orange"
          />
          <MetricCard
            title="Chapters"
            icon={<BookOpen className="h-6 w-6" />}
            metrics={metrics.chapters}
            link="/admin/config/chapters"
            color="pink"
          />
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Click on any card above to manage that configuration type. Changes are tracked in the audit log.
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper Components

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  metrics: EntityMetrics;
  link: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, icon, metrics, link, color }) => {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-700',
    green: 'from-green-600 to-green-700',
    purple: 'from-purple-600 to-purple-700',
    orange: 'from-orange-600 to-orange-700',
    pink: 'from-pink-600 to-pink-700',
  };

  const activePercentage = metrics.total > 0 ? (metrics.active / metrics.total) * 100 : 0;

  return (
    <Link
      to={link}
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
    >
      <div className={`bg-gradient-to-r ${colorClasses[color]} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold">{title}</h3>
          </div>
          <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold text-gray-900">{metrics.total}</span>
          <span className="text-sm text-gray-500">total</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-1 text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span>{metrics.active} active</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <TrendingDown className="h-4 w-4" />
            <span>{metrics.inactive} inactive</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`bg-gradient-to-r ${colorClasses[color]} h-2 rounded-full transition-all`}
            style={{ width: `${activePercentage}%` }}
          />
        </div>
      </div>
    </Link>
  );
};



export default SystemConfigDashboard;
