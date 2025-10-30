import React, { useMemo } from 'react';
import { Target, TrendingUp, Award, Clock, CheckCircle } from 'lucide-react';

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
}

interface ProgressTrackerProps {
  progress?: ProgressData;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ progress }) => {
  const completionStats = useMemo(() => [
    {
      label: 'Course Completion',
      current: progress?.completedCourses || 0,
      total: progress?.totalCourses || 0,
      percentage: progress?.totalCourses ? (progress.completedCourses / progress.totalCourses) * 100 : 0,
      color: 'from-green-500 to-green-600',
      icon: <CheckCircle className="h-4 w-4 text-white" />
    },
    {
      label: 'Lesson Completion',
      current: progress?.completedLessons || 0,
      total: progress?.totalLessons || 0,
      percentage: progress?.totalLessons ? (progress.completedLessons / progress.totalLessons) * 100 : 0,
      color: 'from-blue-500 to-blue-600',
      icon: <Target className="h-4 w-4 text-white" />
    },
    {
      label: 'Weekly Goal',
      current: progress?.weeklyProgress || 0,
      total: progress?.weeklyGoal || 0,
      percentage: progress?.weeklyGoal ? (progress.weeklyProgress / progress.weeklyGoal) * 100 : 0,
      color: 'from-purple-500 to-purple-600',
      icon: <TrendingUp className="h-4 w-4 text-white" />
    }
  ], [progress]);

  const getAchievementLevel = (points: number) => {
    if (points >= 2000) return { level: 'Expert', color: 'from-purple-500 to-purple-600' };
    if (points >= 1000) return { level: 'Advanced', color: 'from-blue-500 to-blue-600' };
    if (points >= 500) return { level: 'Intermediate', color: 'from-green-500 to-green-600' };
    return { level: 'Beginner', color: 'from-gray-500 to-gray-600' };
  };

  const achievement = getAchievementLevel(progress?.totalPoints || 0);

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
        <Target className="h-5 w-5 mr-2 text-green-500" />
        Learning Progress
      </h3>

      {/* Achievement Level */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Achievement Level</span>
          <span className="text-xs text-gray-500">{progress?.totalPoints || 0} points</span>
        </div>
        <div className={`bg-gradient-to-r ${achievement.color} rounded-lg p-3 text-white text-center`}>
          <Award className="h-6 w-6 mx-auto mb-2" />
          <div className="text-sm font-semibold">{achievement.level}</div>
          <div className="text-xs opacity-90">Learning Path</div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        {completionStats.map((stat, index) => (
          <div key={index}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">{stat.label}</span>
              <span className="font-medium text-gray-900">
                {stat.current}/{stat.total} ({Math.round(stat.percentage)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`bg-gradient-to-r ${stat.color} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${stat.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Next Goal */}
      {progress?.nextGoal && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <div className="font-medium text-gray-900">Next Goal</div>
              <div className="text-gray-600">{progress.nextGoal}</div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Progress */}
      <div className="mt-4 bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">This Week</span>
          <span className="font-medium text-gray-900">
            {progress?.weeklyProgress || 0}/{progress?.weeklyGoal || 0} lessons
          </span>
        </div>
        <div className="w-full bg-white rounded-full h-1.5 mt-2">
          <div 
            className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ 
              width: `${progress?.weeklyGoal ? (progress.weeklyProgress / progress.weeklyGoal) * 100 : 0}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProgressTracker);