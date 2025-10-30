import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Star, Target, Clock, Users } from 'lucide-react';

interface StudentPerformanceData {
  id: string;
  name: string;
  avatar?: string;
  course: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastActive: string;
  performance: 'excellent' | 'good' | 'average' | 'needs_improvement';
  score: number;
  engagement: number;
}

interface StudentPerformanceProps {
  data: StudentPerformanceData[];
  compact?: boolean;
}

const StudentPerformance: React.FC<StudentPerformanceProps> = ({ data, compact = false }) => {
  const performanceStats = useMemo(() => {
    const total = data.length;
    const excellent = data.filter(s => s.performance === 'excellent').length;
    const good = data.filter(s => s.performance === 'good').length;
    const average = data.filter(s => s.performance === 'average').length;
    const needsImprovement = data.filter(s => s.performance === 'needs_improvement').length;

    return {
      total,
      excellent: (excellent / total) * 100,
      good: (good / total) * 100,
      average: (average / total) * 100,
      needsImprovement: (needsImprovement / total) * 100
    };
  }, [data]);

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'average':
        return 'bg-yellow-100 text-yellow-800';
      case 'needs_improvement':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 80) return 'text-green-600';
    if (engagement >= 60) return 'text-blue-600';
    if (engagement >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const lastActive = new Date(timestamp);
    const diff = now.getTime() - lastActive.getTime();
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-500" />
          Student Performance
        </h3>
        
        <div className="space-y-4">
          {data.slice(0, 5).map((student) => (
            <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-3">
                {student.avatar ? (
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {student.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {student.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {student.course}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(student.performance)}`}>
                  {student.performance.replace('_', ' ')}
                </span>
                <div className={`text-sm font-semibold ${getEngagementColor(student.engagement)}`}>
                  {student.engagement}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No student data available</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Student Performance</h2>
          <p className="text-gray-600 mt-1">Track and analyze student progress</p>
        </div>
        <div className="text-sm text-gray-500">
          {data.length} students
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-lg font-bold text-green-600">{performanceStats.excellent.toFixed(0)}%</div>
          <div className="text-xs text-green-700">Excellent</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-lg font-bold text-blue-600">{performanceStats.good.toFixed(0)}%</div>
          <div className="text-xs text-blue-700">Good</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-lg font-bold text-yellow-600">{performanceStats.average.toFixed(0)}%</div>
          <div className="text-xs text-yellow-700">Average</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-lg font-bold text-red-600">{performanceStats.needsImprovement.toFixed(0)}%</div>
          <div className="text-xs text-red-700">Needs Help</div>
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-3">
        {data.map((student) => (
          <div key={student.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {student.avatar ? (
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-sm text-white font-medium">
                  {student.name.charAt(0)}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-gray-900 truncate">{student.name}</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(student.performance)}`}>
                    {student.performance.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm text-gray-600 truncate">{student.course}</div>
                
                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{student.completedLessons}/{student.totalLessons} lessons</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${student.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4 ml-4">
              {/* Engagement Score */}
              <div className="text-center">
                <div className={`text-lg font-bold ${getEngagementColor(student.engagement)}`}>
                  {student.engagement}%
                </div>
                <div className="text-xs text-gray-500">Engagement</div>
              </div>

              {/* Score */}
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {student.score}%
                </div>
                <div className="text-xs text-gray-500">Score</div>
              </div>

              {/* Last Active */}
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {formatTimeAgo(student.lastActive)}
                </div>
                <div className="text-xs text-gray-500">Last active</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No students yet</h3>
          <p className="text-gray-600">
            Student performance data will appear here once students enroll in your courses.
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(StudentPerformance);