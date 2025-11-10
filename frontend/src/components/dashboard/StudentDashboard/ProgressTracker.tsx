import React, { useMemo, useState, useCallback } from 'react';
import { 
  Target, TrendingUp, Award, Clock, CheckCircle, 
  Calendar, Star, Zap, Users, BookOpen, BarChart3,
  Download, Share2, Eye, EyeOff
} from 'lucide-react';

interface ProgressData {
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  studyStreak: number;
  totalPoints: number;
  nextGoal: string;
  weeklyGoal: number;
  weeklyProgress: number;
  level: string;
  xp: number;
  nextLevelXp: number;
  monthlyProgress?: number;
  monthlyGoal?: number;
  averageScore?: number;
  timeSpent?: number; // in minutes
  certificatesEarned?: number;
  rank?: string;
  percentile?: number;
}

interface ProgressTrackerProps {
  progress?: ProgressData;
  onExport?: (format: 'pdf' | 'image') => void;
  onShare?: () => void;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  progress,
  onExport,
  onShare
}) => {
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');

  const completionStats = useMemo(() => [
    {
      label: 'Course Completion',
      current: progress?.completedCourses || 0,
      total: progress?.totalCourses || 0,
      percentage: progress?.totalCourses ? (progress.completedCourses / progress.totalCourses) * 100 : 0,
      color: 'from-green-500 to-green-600',
      icon: <CheckCircle className="h-4 w-4 text-white" />,
      description: 'Courses completed vs enrolled'
    },
    {
      label: 'Lesson Completion',
      current: progress?.completedLessons || 0,
      total: progress?.totalLessons || 0,
      percentage: progress?.totalLessons ? (progress.completedLessons / progress.totalLessons) * 100 : 0,
      color: 'from-blue-500 to-blue-600',
      icon: <Target className="h-4 w-4 text-white" />,
      description: 'Lessons completed vs total'
    },
    {
      label: 'Weekly Goal',
      current: progress?.weeklyProgress || 0,
      total: progress?.weeklyGoal || 0,
      percentage: progress?.weeklyGoal ? (progress.weeklyProgress / progress.weeklyGoal) * 100 : 0,
      color: 'from-purple-500 to-purple-600',
      icon: <TrendingUp className="h-4 w-4 text-white" />,
      description: 'Weekly learning target'
    },
    {
      label: 'Monthly Progress',
      current: progress?.monthlyProgress || 0,
      total: progress?.monthlyGoal || 20,
      percentage: progress?.monthlyGoal ? (progress.monthlyProgress! / progress.monthlyGoal) * 100 : 0,
      color: 'from-orange-500 to-orange-600',
      icon: <Calendar className="h-4 w-4 text-white" />,
      description: 'Monthly learning progress'
    }
  ], [progress]);

  const additionalStats = useMemo(() => [
    {
      label: 'Study Time',
      value: progress?.timeSpent ? `${Math.floor(progress.timeSpent / 60)}h ${progress.timeSpent % 60}m` : '0h 0m',
      icon: <Clock className="h-4 w-4 text-blue-500" />,
      change: '+2h 30m',
      changeType: 'positive' as const
    },
    {
      label: 'Avg. Score',
      value: progress?.averageScore ? `${progress.averageScore}%` : '0%',
      icon: <Star className="h-4 w-4 text-yellow-500" />,
      change: '+5%',
      changeType: 'negative' as const
    },
    {
      label: 'Certificates',
      value: progress?.certificatesEarned?.toString() || '0',
      icon: <Award className="h-4 w-4 text-green-500" />,
      change: '+1',
      changeType: 'positive' as const
    },
    {
      label: 'Global Rank',
      value: progress?.rank || 'N/A',
      icon: <Users className="h-4 w-4 text-purple-500" />,
      change: progress?.percentile ? `Top ${progress.percentile}%` : 'N/A',
      changeType: 'neutral' as const
    }
  ], [progress]);

  const getAchievementLevel = (points: number) => {
    if (points >= 5000) return { level: 'Master', color: 'from-purple-600 to-pink-600', icon: '👑' };
    if (points >= 2000) return { level: 'Expert', color: 'from-purple-500 to-purple-600', icon: '⭐' };
    if (points >= 1000) return { level: 'Advanced', color: 'from-blue-500 to-blue-600', icon: '🚀' };
    if (points >= 500) return { level: 'Intermediate', color: 'from-green-500 to-green-600', icon: '📚' };
    if (points >= 100) return { level: 'Beginner', color: 'from-gray-500 to-gray-600', icon: '🌱' };
    return { level: 'Newcomer', color: 'from-gray-400 to-gray-500', icon: '🎯' };
  };

  const getLevelProgress = () => {
    if (!progress) return 0;
    const currentLevelXp = progress.xp;
    const xpForNextLevel = progress.nextLevelXp;
    return (currentLevelXp / xpForNextLevel) * 100;
  };

  const achievement = getAchievementLevel(progress?.totalPoints || 0);
  const levelProgress = getLevelProgress();

  const handleExport = useCallback((format: 'pdf' | 'image') => {
    onExport?.(format);
  }, [onExport]);

  const toggleView = useCallback(() => {
    setShowDetailedView(!showDetailedView);
  }, [showDetailedView]);

  const formatTimeframeData = useCallback(() => {
    // Mock data for different timeframes - in real app, this would come from API
    const data = {
      week: { label: 'This Week', progress: progress?.weeklyProgress || 0, goal: progress?.weeklyGoal || 0 },
      month: { label: 'This Month', progress: progress?.monthlyProgress || 0, goal: progress?.monthlyGoal || 20 },
      all: { label: 'All Time', progress: progress?.completedLessons || 0, goal: progress?.totalLessons || 0 }
    };
    return data[selectedTimeframe];
  }, [selectedTimeframe, progress]);

  const timeframeData = formatTimeframeData();

  const ProgressBar: React.FC<{
    percentage: number;
    color: string;
    showLabel?: boolean;
    height?: 'sm' | 'md' | 'lg';
  }> = ({ percentage, color, showLabel = true, height = 'md' }) => {
    const heightClasses = {
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4'
    };

    return (
      <div className="space-y-1">
        {showLabel && (
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <div className={`w-full bg-gray-200 rounded-full ${heightClasses[height]}`}>
          <div 
            className={`bg-gradient-to-r ${color} ${heightClasses[height]} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Target className="h-5 w-5 mr-2 text-green-500" />
          Learning Progress
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleView}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
            title={showDetailedView ? 'Simple View' : 'Detailed View'}
          >
            {showDetailedView ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onShare?.()}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
            title="Share Progress"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <div className="relative group">
            <button
              className="p-2 text-gray-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
              title="Export Progress"
            >
              <Download className="h-4 w-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                Export as PDF
              </button>
              <button
                onClick={() => handleExport('image')}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
              >
                Export as Image
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Level */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Achievement Level</span>
          <span className="text-xs text-gray-500">{progress?.totalPoints || 0} points</span>
        </div>
        <div className={`bg-gradient-to-r ${achievement.color} rounded-xl p-4 text-white shadow-lg relative overflow-hidden`}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-2 text-3xl">{achievement.icon}</div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold mb-1">{achievement.level}</div>
                <div className="text-sm opacity-90">Learning Path</div>
              </div>
              <div className="text-3xl">{achievement.icon}</div>
            </div>
            
            {/* Level Progress */}
            {progress && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-white/80 mb-1">
                  <span>Level Progress</span>
                  <span>{progress.xp} / {progress.nextLevelXp} XP</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-700"
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDetailedView ? (
        /* Detailed View */
        <div className="space-y-6">
          {/* Progress Overview */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <BarChart3 className="h-4 w-4 mr-2 text-blue-500" />
              Progress Overview
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {completionStats.map((stat, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg bg-gradient-to-r ${stat.color}`}>
                        {stat.icon}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                    </div>
                    <span className="text-xs text-gray-500" title={stat.description}>
                      ⓘ
                    </span>
                  </div>
                  <ProgressBar 
                    percentage={stat.percentage} 
                    color={stat.color}
                    showLabel={false}
                    height="sm"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>{stat.current}/{stat.total}</span>
                    <span className="font-medium">{Math.round(stat.percentage)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Statistics */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-purple-500" />
              Learning Analytics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {additionalStats.map((stat, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    {stat.icon}
                    <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className={`text-xs ${
                    stat.changeType === 'positive' ? 'text-green-600' : 
                    stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {stat.change}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeframe Progress */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-orange-500" />
                Timeframe Progress
              </h4>
              <div className="flex space-x-1">
                {(['week', 'month', 'all'] as const).map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => setSelectedTimeframe(timeframe)}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                      selectedTimeframe === timeframe
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-900">{timeframeData.label}</span>
                <span className="text-sm text-gray-600">
                  {timeframeData.progress}/{timeframeData.goal} lessons
                </span>
              </div>
              <ProgressBar 
                percentage={(timeframeData.progress / timeframeData.goal) * 100} 
                color="from-blue-500 to-purple-500"
                height="lg"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Started</span>
                <span>
                  {selectedTimeframe === 'week' ? 'This week' : 
                   selectedTimeframe === 'month' ? 'This month' : 'All time'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Simple View */
        <div className="space-y-4">
          {completionStats.slice(0, 3).map((stat, index) => (
            <div key={index}>
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <span className="text-gray-600">{stat.label}</span>
                </div>
                <span className="font-medium text-gray-900">
                  {stat.current}/{stat.total} ({Math.round(stat.percentage)}%)
                </span>
              </div>
              <ProgressBar percentage={stat.percentage} color={stat.color} />
            </div>
          ))}
        </div>
      )}

      {/* Next Goal & Weekly Progress */}
      <div className="mt-6 space-y-4">
        {progress?.nextGoal && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 text-sm">
              <Target className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div>
                <div className="font-medium text-blue-900">Next Goal</div>
                <div className="text-blue-700 text-sm">{progress.nextGoal}</div>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Progress */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-green-500" />
              <span className="font-medium text-gray-900">This Week's Progress</span>
            </div>
            <span className="font-medium text-gray-900">
              {progress?.weeklyProgress || 0}/{progress?.weeklyGoal || 0} lessons
            </span>
          </div>
          <ProgressBar 
            percentage={progress?.weeklyGoal ? (progress.weeklyProgress / progress.weeklyGoal) * 100 : 0} 
            color="from-green-500 to-blue-500"
            showLabel={false}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Weekly Target</span>
            <span>{Math.round((progress?.weeklyProgress || 0) / (progress?.weeklyGoal || 1) * 100)}% Complete</span>
          </div>
        </div>
      </div>

      {/* Motivation Message */}
      <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <div className="text-xs text-purple-800 text-center">
          {progress?.studyStreak && progress.studyStreak > 0 ? (
            progress.studyStreak >= 7 ? (
              `🔥 Amazing! You're on a ${progress.studyStreak}-day streak! Keep going!`
            ) : (
              `🎯 Great consistency! ${7 - progress.studyStreak} more days until your weekly milestone.`
            )
          ) : (
            "🌟 Start your learning journey today! Every lesson brings you closer to your goals."
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProgressTracker);