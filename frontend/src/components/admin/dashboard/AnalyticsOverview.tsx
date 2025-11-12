import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, BookOpen, Video, DollarSign, BarChart3, Clock } from 'lucide-react';

interface AnalyticsData {
  period: string;
  totalUsers: number;
  activeUsers: number;
  newRegistrations: number;
  totalCourses: number;
  totalLessons: number;
  totalRevenue: number;
  engagementRate: number;
  completionRate: number;
}

interface AnalyticsOverviewProps {
  data?: AnalyticsData[];
  compact?: boolean;
}

const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ 
  data = [], 
  compact = false 
}) => {
  const currentData = data[data.length - 1] || {
    totalUsers: 0,
    activeUsers: 0,
    newRegistrations: 0,
    totalCourses: 0,
    totalLessons: 0,
    totalRevenue: 0,
    engagementRate: 0,
    completionRate: 0
  };

  const previousData = data[data.length - 2] || {
    totalUsers: 0,
    activeUsers: 0,
    newRegistrations: 0,
    totalCourses: 0,
    totalLessons: 0,
    totalRevenue: 0,
    engagementRate: 0,
    completionRate: 0
  };

  const metrics = useMemo(() => [
    {
      title: 'Total Users',
      value: currentData.totalUsers,
      previous: previousData.totalUsers,
      icon: <Users className="h-5 w-5" />,
      color: 'from-blue-500 to-blue-600',
      format: 'number' as const
    },
    {
      title: 'Active Users',
      value: currentData.activeUsers,
      previous: previousData.activeUsers,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'from-green-500 to-green-600',
      format: 'number' as const
    },
    {
      title: 'New Registrations',
      value: currentData.newRegistrations,
      previous: previousData.newRegistrations,
      icon: <Users className="h-5 w-5" />,
      color: 'from-purple-500 to-purple-600',
      format: 'number' as const
    },
    {
      title: 'Total Courses',
      value: currentData.totalCourses,
      previous: previousData.totalCourses,
      icon: <BookOpen className="h-5 w-5" />,
      color: 'from-orange-500 to-orange-600',
      format: 'number' as const
    },
    {
      title: 'Total Lessons',
      value: currentData.totalLessons,
      previous: previousData.totalLessons,
      icon: <Video className="h-5 w-5" />,
      color: 'from-red-500 to-red-600',
      format: 'number' as const
    },
    {
      title: 'Total Revenue',
      value: currentData.totalRevenue,
      previous: previousData.totalRevenue,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'from-emerald-500 to-emerald-600',
      format: 'currency' as const
    },
    {
      title: 'Engagement Rate',
      value: currentData.engagementRate,
      previous: previousData.engagementRate,
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'from-cyan-500 to-cyan-600',
      format: 'percent' as const
    },
    {
      title: 'Completion Rate',
      value: currentData.completionRate,
      previous: previousData.completionRate,
      icon: <Clock className="h-5 w-5" />,
      color: 'from-pink-500 to-pink-600',
      format: 'percent' as const
    }
  ], [currentData, previousData]);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatValue = (value: number, format: string) => {
    if (format === 'currency') {
      return `$${value.toLocaleString()}`;
    }
    if (format === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View Details
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {metrics.slice(0, 4).map((metric, index) => {
            const change = calculateChange(metric.value, metric.previous);
            const isPositive = change >= 0;

            return (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center mx-auto mb-2`}>
                  <div className="text-white">
                    {metric.icon}
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {formatValue(metric.value, metric.format)}
                </div>
                <div className="text-xs text-gray-500 mb-1">{metric.title}</div>
                <div className={`flex items-center justify-center space-x-1 text-xs ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(change).toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Insights */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 text-sm mb-2">Quick Insights</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• User growth: {calculateChange(currentData.newRegistrations, previousData.newRegistrations).toFixed(1)}% this period</li>
            <li>• Engagement: {currentData.engagementRate}% platform-wide</li>
            <li>• Revenue: {calculateChange(currentData.totalRevenue, previousData.totalRevenue).toFixed(1)}% change</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analytics Overview</h2>
          <p className="text-gray-600 mt-1">Platform performance and growth metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Last year</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, index) => {
          const change = calculateChange(metric.value, metric.previous);
          const isPositive = change >= 0;

          return (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center`}>
                  <div className="text-white">
                    {metric.icon}
                  </div>
                </div>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(change).toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatValue(metric.value, metric.format)}
              </div>
              <div className="text-sm text-gray-600">{metric.title}</div>
              
              {/* Mini trend line */}
              <div className="mt-3 flex items-center space-x-1">
                {[30, 45, 60, 75, 65, 80, 90].map((height, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${
                      isPositive 
                        ? 'bg-gradient-to-t from-green-500 to-green-400' 
                        : 'bg-gradient-to-t from-red-500 to-red-400'
                    }`}
                    style={{ height: `${height * 0.2}px` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Growth Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Top Growth Areas</h3>
          <div className="space-y-2">
            {metrics
              .filter(metric => calculateChange(metric.value, metric.previous) > 0)
              .sort((a, b) => calculateChange(b.value, b.previous) - calculateChange(a.value, a.previous))
              .slice(0, 3)
              .map((metric, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{metric.title}</span>
                  <span className="font-semibold text-green-600">
                    +{calculateChange(metric.value, metric.previous).toFixed(1)}%
                  </span>
                </div>
              ))
            }
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Areas Needing Attention</h3>
          <div className="space-y-2">
            {metrics
              .filter(metric => calculateChange(metric.value, metric.previous) < 0)
              .sort((a, b) => calculateChange(a.value, a.previous) - calculateChange(b.value, b.previous))
              .slice(0, 3)
              .map((metric, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{metric.title}</span>
                  <span className="font-semibold text-red-600">
                    {calculateChange(metric.value, metric.previous).toFixed(1)}%
                  </span>
                </div>
              ))
            }
            {metrics.filter(metric => calculateChange(metric.value, metric.previous) < 0).length === 0 && (
              <p className="text-sm text-gray-500">All metrics showing positive growth!</p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Performance Trends</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Current Period</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span>Previous Period</span>
            </div>
          </div>
        </div>
        
        <div className="h-48 bg-white rounded border border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Analytics chart visualization</p>
            <p className="text-gray-400 text-xs">
              Showing trends across key platform metrics
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
          <TrendingUp className="h-4 w-4 mr-2" />
          Recommendations
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Consider running promotions to boost new user registrations</li>
          <li>• Engagement rates are strong - focus on retention strategies</li>
          <li>• Course completion rates indicate effective learning paths</li>
          <li>• Revenue growth aligns with user acquisition trends</li>
        </ul>
      </div>
    </div>
  );
};

export default React.memo(AnalyticsOverview);