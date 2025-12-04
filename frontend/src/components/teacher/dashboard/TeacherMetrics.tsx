import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, Users, Video, Target
} from 'lucide-react';

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
  value: number | string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
}

// Compact Metrics Card Component
const MetricsCard: React.FC<{ metric: MetricItem }> = ({ metric }) => {
  return (
    <div className={`bg-white/90 backdrop-blur-md rounded-lg p-4 border ${metric.borderColor} shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${metric.color} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
      <div className="flex items-center justify-between mb-3">
        <div className="relative">
          <div className={`absolute inset-0 ${metric.bgColor} rounded-full blur-md group-hover:blur-lg transition-all opacity-50`}></div>
          <div className={`relative p-2 ${metric.bgColor} rounded-lg group-hover:scale-110 transition-transform`}>
            {metric.icon}
          </div>
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-stone-800 mb-0.5">{metric.value}</p>
        <p className="text-stone-600 text-xs font-medium">{metric.title}</p>
      </div>
    </div>
  );
};

const TeacherMetrics: React.FC<TeacherMetricsProps> = ({ 
  stats
}) => {
  const { t } = useTranslation();
  
  // Debug logging
  console.log('📈 TeacherMetrics received stats:', stats);
  
  // Compact metrics - only the essential ones with real data
  const metrics = useMemo((): MetricItem[] => [
    {
      title: t('dashboard.teacher.total_courses'),
      value: stats?.totalCourses || 0,
      icon: <BookOpen className="h-5 w-5 text-[#27AE60]" />,
      color: 'from-[#27AE60] to-[#16A085]',
      borderColor: 'border-[#27AE60]/20 hover:border-[#27AE60]/50',
      bgColor: 'bg-[#27AE60]/10'
    },
    {
      title: t('dashboard.teacher.active_students'),
      value: stats?.totalStudentsEnrolled || 0,
      icon: <Users className="h-5 w-5 text-[#16A085]" />,
      color: 'from-[#16A085] to-[#2980B9]',
      borderColor: 'border-[#16A085]/20 hover:border-[#16A085]/50',
      bgColor: 'bg-[#16A085]/10'
    },
    {
      title: t('dashboard.teacher.total_lessons'),
      value: stats?.totalLessons || 0,
      icon: <Video className="h-5 w-5 text-[#2980B9]" />,
      color: 'from-[#2980B9] to-[#27AE60]',
      borderColor: 'border-[#2980B9]/20 hover:border-[#2980B9]/50',
      bgColor: 'bg-[#2980B9]/10'
    },
    {
      title: t('dashboard.teacher.completion_rate'),
      value: `${stats?.averageCompletionRate || 0}%`,
      icon: <Target className="h-5 w-5 text-[#27AE60]" />,
      color: 'from-[#27AE60] to-[#16A085]',
      borderColor: 'border-[#27AE60]/20 hover:border-[#27AE60]/50',
      bgColor: 'bg-[#27AE60]/10'
    }
  ], [stats, t]);

  return (
    <div className="space-y-3">
      {/* Compact Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric, index) => (
          <MetricsCard key={index} metric={metric} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(TeacherMetrics);