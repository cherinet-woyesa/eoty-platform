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

// Compact Metrics Card Component
const MetricsCard: React.FC<{ metric: MetricItem }> = ({ metric }) => {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 border border-stone-200 shadow-sm hover:shadow-md transition-all hover:border-[#27AE60]/40">
      <div className="flex items-center justify-between mb-3">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#27AE60]/15 to-[#16A085]/15 rounded-lg blur-md"></div>
          <div className="relative p-2 bg-gradient-to-br from-[#27AE60]/8 to-[#16A085]/8 rounded-lg border border-[#27AE60]/25">
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
  // Debug logging
  console.log('📈 TeacherMetrics received stats:', stats);
  
  // Compact metrics - only the essential ones with real data
  const metrics = useMemo((): MetricItem[] => [
    {
      title: 'Total Courses',
      value: stats?.totalCourses || 0,
      icon: <BookOpen className="h-5 w-5 text-[#27AE60]" />,
      color: 'from-[#27AE60] to-[#16A085]'
    },
    {
      title: 'Active Students',
      value: stats?.totalStudentsEnrolled || 0,
      icon: <Users className="h-5 w-5 text-[#16A085]" />,
      color: 'from-[#16A085] to-[#2980B9]'
    },
    {
      title: 'Total Lessons',
      value: stats?.totalLessons || 0,
      icon: <Video className="h-5 w-5 text-[#2980B9]" />,
      color: 'from-[#2980B9] to-[#27AE60]'
    },
    {
      title: 'Completion Rate',
      value: `${stats?.averageCompletionRate || 0}%`,
      icon: <Target className="h-5 w-5 text-[#F39C12]" />,
      color: 'from-[#F39C12] to-[#E67E22]'
    }
  ], [stats]);

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