import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Users,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Award,
  Activity,
  Calendar,
} from 'lucide-react';
import { Skeleton } from '@/components/shared/LoadingStates';

interface EnrollmentStatsProps {
  courseId: string;
  data?: EngagementAnalytics;
  loading?: boolean;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
}

interface EngagementAnalytics {
  courseId: number;
  dateRange: {
    start: Date;
    end: Date;
    granularity: string;
  };
  dailyActiveStudents: Array<{
    date: string;
    active_students: number;
    lessons_accessed: number;
    total_time_spent: number;
    lessons_completed: number;
  }>;
  lessonStats: Array<{
    lessonId: number;
    title: string;
    order: number;
    totalViews: number;
    completions: number;
    completionRate: number;
    averageProgress: number;
    averageTimeSpent: number;
    isDropOffPoint: boolean;
  }>;
  dropOffPoints: Array<{
    lessonId: number;
    title: string;
    order: number;
    totalViews: number;
    completions: number;
    completionRate: number;
    isDropOffPoint: boolean;
  }>;
  enrollmentTrend: Array<{
    date: string;
    new_enrollments: number;
  }>;
  timeOfDayActivity: Array<{
    hour: number;
    day_of_week: number;
    activity_count: number;
  }>;
  watchTimeByLesson: Array<{
    lesson_id: number;
    title: string;
    lesson_duration: number;
    average_watch_time: number;
    unique_viewers: number;
  }>;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, subtitle }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className="text-blue-600">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span
            className={`flex items-center text-sm font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
};

const StatCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <Skeleton width="60%" height="1rem" />
        <Skeleton variant="circular" width="2rem" height="2rem" />
      </div>
      <Skeleton width="50%" height="2.5rem" className="mb-2" />
      <Skeleton width="40%" height="0.875rem" />
    </div>
  );
};

const DateRangeSelector: React.FC<{
  onRangeChange: (startDate: Date, endDate: Date) => void;
}> = ({ onRangeChange }) => {
  const [selectedRange, setSelectedRange] = useState('30d');

  const ranges = [
    { label: 'Last 7 days', value: '7d', days: 7 },
    { label: 'Last 30 days', value: '30d', days: 30 },
    { label: 'Last 90 days', value: '90d', days: 90 },
    { label: 'Last 6 months', value: '180d', days: 180 },
    { label: 'Last year', value: '365d', days: 365 },
  ];

  const handleRangeChange = (value: string) => {
    setSelectedRange(value);
    const range = ranges.find((r) => r.value === value);
    if (range) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - range.days);
      onRangeChange(startDate, endDate);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-5 w-5 text-gray-400" />
      <select
        value={selectedRange}
        onChange={(e) => handleRangeChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      >
        {ranges.map((range) => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const EnrollmentStats: React.FC<EnrollmentStatsProps> = ({
  data,
  loading = false,
  onDateRangeChange,
}) => {
  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!data) {
      return {
        totalStudents: 0,
        activeStudents: 0,
        completionRate: 0,
        averageProgress: 0,
      };
    }

    const latestData = data.dailyActiveStudents[data.dailyActiveStudents.length - 1];
    const previousData = data.dailyActiveStudents[data.dailyActiveStudents.length - 8];

    const totalStudents = data.dailyActiveStudents.reduce(
      (sum, day) => Math.max(sum, day.active_students),
      0
    );

    const activeStudents = latestData?.active_students || 0;

    const completionRate =
      data.lessonStats.length > 0
        ? data.lessonStats.reduce((sum, lesson) => sum + lesson.completionRate, 0) /
          data.lessonStats.length
        : 0;

    const averageProgress =
      data.lessonStats.length > 0
        ? data.lessonStats.reduce((sum, lesson) => sum + lesson.averageProgress * 100, 0) /
          data.lessonStats.length
        : 0;

    // Calculate trends
    const activeStudentsTrend = previousData
      ? ((activeStudents - previousData.active_students) / previousData.active_students) * 100
      : undefined;

    return {
      totalStudents,
      activeStudents,
      completionRate,
      averageProgress,
      activeStudentsTrend,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Date Range Selector Skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton width="200px" height="2.5rem" />
          <Skeleton width="150px" height="2.5rem" />
        </div>

        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <Skeleton width="200px" height="1.5rem" className="mb-4" />
            <Skeleton width="100%" height="300px" />
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <Skeleton width="200px" height="1.5rem" className="mb-4" />
            <Skeleton width="100%" height="300px" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">
          Analytics data will appear here once students start enrolling in your course.
        </p>
      </div>
    );
  }

  // Prepare enrollment trend data
  const enrollmentChartData = data.enrollmentTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    enrollments: item.new_enrollments,
  }));

  // Prepare lesson engagement heatmap data
  const lessonEngagementData = data.lessonStats.map((lesson) => ({
    name: lesson.title.length > 20 ? lesson.title.substring(0, 20) + '...' : lesson.title,
    views: lesson.totalViews,
    completions: lesson.completions,
    completionRate: lesson.completionRate,
  }));

  // Prepare completion funnel data
  const funnelData = [
    {
      stage: 'Enrolled',
      count: stats.totalStudents,
      percentage: 100,
    },
    {
      stage: 'Started',
      count: stats.activeStudents,
      percentage: stats.totalStudents > 0 ? (stats.activeStudents / stats.totalStudents) * 100 : 0,
    },
    {
      stage: 'In Progress',
      count: Math.round((stats.activeStudents * stats.averageProgress) / 100),
      percentage: stats.averageProgress,
    },
    {
      stage: 'Completed',
      count: Math.round((stats.totalStudents * stats.completionRate) / 100),
      percentage: stats.completionRate,
    },
  ];

  // Prepare time of day heatmap
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const heatmapData = Array.from({ length: 24 }, (_, hour) => {
    const hourData: any = { hour: `${hour}:00` };
    dayNames.forEach((day, dayIndex) => {
      const activity = data.timeOfDayActivity.find(
        (a) => a.hour === hour && a.day_of_week === dayIndex
      );
      hourData[day] = activity?.activity_count || 0;
    });
    return hourData;
  });

  // Get max activity for color scaling
  const maxActivity = Math.max(
    ...data.timeOfDayActivity.map((a) => a.activity_count),
    1
  );

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Course Analytics</h2>
        {onDateRangeChange && <DateRangeSelector onRangeChange={onDateRangeChange} />}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<Users className="h-6 w-6" />}
          subtitle="All enrolled students"
        />
        <StatCard
          title="Active Students"
          value={stats.activeStudents}
          icon={<UserCheck className="h-6 w-6" />}
          trend={
            stats.activeStudentsTrend !== undefined && stats.activeStudentsTrend !== 0
              ? {
                  value: Math.round(Math.abs(stats.activeStudentsTrend)),
                  isPositive: stats.activeStudentsTrend > 0,
                }
              : undefined
          }
          subtitle="Active in last 7 days"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate.toFixed(1)}%`}
          icon={<Award className="h-6 w-6" />}
          subtitle="Average across all lessons"
        />
        <StatCard
          title="Average Progress"
          value={`${stats.averageProgress.toFixed(1)}%`}
          icon={<Activity className="h-6 w-6" />}
          subtitle="Course completion progress"
        />
      </div>

      {/* Enrollment Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={enrollmentChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="enrollments"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              name="New Enrollments"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Lesson Engagement Heatmap */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lesson Engagement</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={lessonEngagementData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              width={150}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="views" fill="#3b82f6" name="Views" />
            <Bar dataKey="completions" fill="#22c55e" name="Completions" />
          </BarChart>
        </ResponsiveContainer>
        {data.dropOffPoints.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">Drop-off Points</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {data.dropOffPoints.map((point) => (
                <li key={point.lessonId}>
                  • {point.title} - {point.completionRate.toFixed(1)}% completion rate
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Completion Funnel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Funnel</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={funnelData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="stage" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'count') return [value, 'Students'];
                if (name === 'percentage') return [`${value.toFixed(1)}%`, 'Percentage'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar dataKey="count" name="Students">
              {funnelData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={['#3b82f6', '#60a5fa', '#93c5fd', '#22c55e'][index]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Time of Day Activity Heatmap */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Student Activity by Time of Day
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-xs font-medium text-gray-600 text-left p-2">Hour</th>
                {dayNames.map((day) => (
                  <th key={day} className="text-xs font-medium text-gray-600 text-center p-2">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row, index) => (
                <tr key={index}>
                  <td className="text-xs text-gray-600 p-2">{row.hour}</td>
                  {dayNames.map((day) => {
                    const value = row[day];
                    const intensity = value / maxActivity;
                    const bgColor =
                      value === 0
                        ? 'bg-gray-50'
                        : intensity > 0.7
                        ? 'bg-blue-600'
                        : intensity > 0.4
                        ? 'bg-blue-400'
                        : intensity > 0.2
                        ? 'bg-blue-200'
                        : 'bg-blue-100';
                    const textColor = intensity > 0.4 ? 'text-white' : 'text-gray-700';
                    return (
                      <td
                        key={day}
                        className={`text-xs text-center p-2 ${bgColor} ${textColor} border border-gray-200`}
                        title={`${value} activities`}
                      >
                        {value > 0 ? value : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Darker colors indicate higher student activity during that time period.
        </p>
      </div>
    </div>
  );
};

export default EnrollmentStats;
