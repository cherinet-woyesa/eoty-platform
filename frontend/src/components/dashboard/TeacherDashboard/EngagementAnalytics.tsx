import React, { useMemo, useState } from 'react';
import { BarChart, LineChart, CheckCircle, PieChart, TrendingUp, Users, Clock, Eye, MessageCircle } from 'lucide-react';

interface EngagementData {
  date: string;
  activeStudents: number;
  completedLessons: number;
  averageTimeSpent: number;
  discussionPosts: number;
  videoViews: number;
  completionRate: number;
}

interface EngagementAnalyticsProps {
  courseId?: string;
  timeframe?: '7d' | '30d' | '90d' | '1y';
}

const EngagementAnalytics: React.FC<EngagementAnalyticsProps> = ({ 
  courseId,
  timeframe = '30d'
 }) => {
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'completion' | 'participation'>('engagement');

  // Mock data - in real app, this would come from API
  const engagementData: EngagementData[] = useMemo(() => {
    const data: EngagementData[] = [];
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        activeStudents: Math.floor(Math.random() * 50) + 20,
        completedLessons: Math.floor(Math.random() * 30) + 10,
        averageTimeSpent: Math.floor(Math.random() * 40) + 20,
        discussionPosts: Math.floor(Math.random() * 15) + 5,
        videoViews: Math.floor(Math.random() * 100) + 50,
        completionRate: Math.floor(Math.random() * 30) + 60
      });
    }
    
    return data;
  }, [timeframe]);

  const metrics = useMemo(() => [
    {
      id: 'engagement' as const,
      name: 'Engagement Score',
      value: '85%',
      change: '+5%',
      trend: 'up' as const,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'completion' as const,
      name: 'Completion Rate',
      value: '78%',
      change: '+3%',
      trend: 'up' as const,
      icon: <Clock className="h-5 w-5" />,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'participation' as const,
      name: 'Student Participation',
      value: '64%',
      change: '+8%',
      trend: 'up' as const,
      icon: <Users className="h-5 w-5" />,
      color: 'from-purple-500 to-indigo-500'
    }
  ], []);

  const detailedMetrics = useMemo(() => [
    {
      name: 'Active Students',
      value: engagementData.reduce((sum, day) => sum + day.activeStudents, 0),
      icon: <Users className="h-4 w-4" />,
      color: 'text-blue-600'
    },
    {
      name: 'Completed Lessons',
      value: engagementData.reduce((sum, day) => sum + day.completedLessons, 0),
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-green-600'
    },
    {
      name: 'Avg. Time Spent',
      value: `${Math.round(engagementData.reduce((sum, day) => sum + day.averageTimeSpent, 0) / engagementData.length)}m`,
      icon: <Clock className="h-4 w-4" />,
      color: 'text-purple-600'
    },
    {
      name: 'Video Views',
      value: engagementData.reduce((sum, day) => sum + day.videoViews, 0),
      icon: <Eye className="h-4 w-4" />,
      color: 'text-orange-600'
    },
    {
      name: 'Discussion Posts',
      value: engagementData.reduce((sum, day) => sum + day.discussionPosts, 0),
      icon: <MessageCircle className="h-4 w-4" />,
      color: 'text-pink-600'
    }
  ], [engagementData]);

  const getMaxValue = (key: keyof EngagementData) => {
    return Math.max(...engagementData.map(day => day[key] as number));
  };

  const renderMiniBarChart = (data: number[], color: string) => {
    const max = Math.max(...data);
    return (
      <div className="flex items-end space-x-1 h-8">
        {data.slice(-7).map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-gray-200 rounded-t transition-all duration-300 hover:opacity-80"
            style={{ 
              height: `${(value / max) * 100}%`,
              background: `linear-gradient(to top, ${color}, ${color}dd)`
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Engagement Analytics</h3>
          <p className="text-gray-600 text-sm mt-1">
            {courseId ? 'Course-specific analytics' : 'Overall platform engagement'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select 
            value={timeframe}
            onChange={(e) => console.log('Timeframe changed:', e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
              selectedMetric === metric.id
                ? 'border-blue-300 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:shadow-md'
            }`}
            onClick={() => setSelectedMetric(metric.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center`}>
                <div className="text-white">
                  {metric.icon}
                </div>
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                metric.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <TrendingUp className="h-3 w-3" />
                <span>{metric.change}</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
            <div className="text-sm text-gray-600">{metric.name}</div>
            
            {/* Mini chart */}
            {renderMiniBarChart(
              engagementData.map(day => day[selectedMetric === 'engagement' ? 'activeStudents' : 
                selectedMetric === 'completion' ? 'completionRate' : 'discussionPosts']),
              metric.color.split(' ')[1] // Extract color from gradient
            )}
          </div>
        ))}
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {detailedMetrics.map((metric, index) => (
          <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className={`mx-auto mb-2 ${metric.color}`}>
              {metric.icon}
            </div>
            <div className="text-lg font-bold text-gray-900">{metric.value.toLocaleString()}</div>
            <div className="text-xs text-gray-600">{metric.name}</div>
          </div>
        ))}
      </div>

      {/* Chart Placeholder */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">
            {selectedMetric === 'engagement' && 'Student Engagement Over Time'}
            {selectedMetric === 'completion' && 'Completion Rate Trend'}
            {selectedMetric === 'participation' && 'Participation Metrics'}
          </h4>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Current</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span>Previous</span>
            </div>
          </div>
        </div>
        
        {/* Chart visualization placeholder */}
        <div className="h-48 bg-white rounded border border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <BarChart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Engagement chart visualization</p>
            <p className="text-gray-400 text-xs">
              Showing {timeframe} of {selectedMetric} data
            </p>
          </div>
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Start</span>
          <span>Mid</span>
          <span>Current</span>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h5 className="font-semibold text-blue-900 mb-2 flex items-center">
          <TrendingUp className="h-4 w-4 mr-2" />
          Insights & Recommendations
        </h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Student engagement increased by 12% this week</li>
          <li>• Completion rates are highest in the morning sessions</li>
          <li>• Consider adding more interactive content for better participation</li>
        </ul>
      </div>
    </div>
  );
};

export default React.memo(EngagementAnalytics);