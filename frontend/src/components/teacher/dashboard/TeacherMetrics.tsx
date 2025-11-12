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
    <div className={`bg-gradient-to-br ${metric.color} rounded-xl p-5 text-white shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="p-3 rounded-lg bg-white/20">
          {metric.icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold">{metric.value}</p>
        <p className="text-white/90 text-sm mt-1">{metric.title}</p>
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
      icon: <BookOpen className="h-6 w-6" />,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Active Students',
      value: stats?.totalStudentsEnrolled || 0,
      icon: <Users className="h-6 w-6" />,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Total Lessons',
      value: stats?.totalLessons || 0,
      icon: <Video className="h-6 w-6" />,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Completion Rate',
      value: `${stats?.averageCompletionRate || 0}%`,
      icon: <Target className="h-6 w-6" />,
      color: 'from-orange-500 to-orange-600'
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