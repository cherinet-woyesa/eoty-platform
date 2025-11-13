import React, { useMemo } from 'react';
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
}

// Simplified Metrics Card Component
const MetricsCard: React.FC<{ metric: MetricItem }> = ({ metric }) => {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all hover:border-[#39FF14]/50">
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 rounded-lg blur-md"></div>
          <div className="relative p-3 bg-gradient-to-br from-[#39FF14]/10 to-[#00FFC6]/10 rounded-lg border border-[#39FF14]/30">
            {metric.icon}
          </div>
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-stone-800 mb-1">{metric.value}</p>
        <p className="text-stone-600 text-sm font-medium">{metric.title}</p>
      </div>
    </div>
  );
};

const TeacherMetrics: React.FC<TeacherMetricsProps> = ({ 
  stats
}) => {
  // Debug logging
  console.log('📈 TeacherMetrics received stats:', stats);
  
  // Simplified metrics - only the essential ones with real data
  const metrics = useMemo((): MetricItem[] => [
    {
      title: 'Total Courses',
      value: stats?.totalCourses || 0,
      icon: <BookOpen className="h-6 w-6 text-[#39FF14]" />,
      color: 'from-[#39FF14] to-[#00FFC6]'
    },
    {
      title: 'Active Students',
      value: stats?.totalStudentsEnrolled || 0,
      icon: <Users className="h-6 w-6 text-[#00FFC6]" />,
      color: 'from-[#00FFC6] to-[#00FFFF]'
    },
    {
      title: 'Total Lessons',
      value: stats?.totalLessons || 0,
      icon: <Video className="h-6 w-6 text-[#00FFFF]" />,
      color: 'from-[#00FFFF] to-[#39FF14]'
    },
    {
      title: 'Completion Rate',
      value: `${stats?.averageCompletionRate || 0}%`,
      icon: <Target className="h-6 w-6 text-[#FFD700]" />,
      color: 'from-[#FFD700] to-[#FFA500]'
    }
  ], [stats]);

  return (
    <div className="space-y-6">
      {/* Simplified Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, index) => (
          <MetricsCard key={index} metric={metric} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(TeacherMetrics);