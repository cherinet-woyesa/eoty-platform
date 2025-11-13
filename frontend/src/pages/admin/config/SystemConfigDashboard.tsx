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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 sm:p-6 lg:p-8">
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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4 text-red-800">
            Failed to load system configuration metrics
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#39FF14]/20 via-[#00FFC6]/20 to-[#00FFFF]/20 rounded-xl p-6 border border-[#39FF14]/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#39FF14]/30 rounded-lg blur-md"></div>
                  <div className="relative p-2 bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 rounded-lg border border-[#39FF14]/30">
                    <Settings className="h-6 w-6 text-[#39FF14]" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-stone-800">System Configuration</h1>
              </div>
              <p className="text-stone-700 text-sm mt-2">
                Manage course categories, levels, durations, tags, and chapters
              </p>
            </div>
            <Activity className="h-16 w-16 text-[#39FF14]/20" />
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
        <div className="bg-gradient-to-r from-[#39FF14]/10 to-[#00FFC6]/10 border border-[#39FF14]/30 rounded-lg p-4 backdrop-blur-sm">
          <p className="text-sm text-stone-700 font-medium">
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

  const neonColorClasses = {
    blue: { gradient: 'from-[#00FFFF] to-[#00FFC6]', text: 'text-[#00FFFF]', bg: 'bg-[#00FFFF]/10', border: 'border-[#00FFFF]/30' },
    green: { gradient: 'from-[#39FF14] to-[#00FFC6]', text: 'text-[#39FF14]', bg: 'bg-[#39FF14]/10', border: 'border-[#39FF14]/30' },
    purple: { gradient: 'from-[#00FFC6] to-[#00FFFF]', text: 'text-[#00FFC6]', bg: 'bg-[#00FFC6]/10', border: 'border-[#00FFC6]/30' },
    orange: { gradient: 'from-[#FFD700] to-[#39FF14]', text: 'text-[#FFD700]', bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/30' },
    pink: { gradient: 'from-[#00FFFF] to-[#39FF14]', text: 'text-[#00FFFF]', bg: 'bg-[#00FFFF]/10', border: 'border-[#00FFFF]/30' },
  };

  const neonColors = neonColorClasses[color];

  return (
    <Link
      to={link}
      className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
    >
      <div className={`bg-gradient-to-r ${neonColors.gradient} p-4 text-stone-800`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 ${neonColors.bg} rounded-lg border ${neonColors.border}`}>
              {icon}
            </div>
            <h3 className="font-semibold">{title}</h3>
          </div>
          <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold text-stone-800">{metrics.total}</span>
          <span className="text-sm text-stone-600">total</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-2">
          <div className={`flex items-center gap-1 ${neonColors.text}`}>
            <TrendingUp className="h-4 w-4" />
            <span className="font-semibold">{metrics.active} active</span>
          </div>
          <div className="flex items-center gap-1 text-stone-500">
            <TrendingDown className="h-4 w-4" />
            <span>{metrics.inactive} inactive</span>
          </div>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-2">
          <div
            className={`bg-gradient-to-r ${neonColors.gradient} h-2 rounded-full transition-all`}
            style={{ width: `${activePercentage}%` }}
          />
        </div>
      </div>
    </Link>
  );
};



export default SystemConfigDashboard;
