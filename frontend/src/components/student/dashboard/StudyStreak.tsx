import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { 
  Zap, Flame, Calendar, Target, Award, Clock, 
  Share2, Download, Settings, TrendingUp, Star,
  Bell, Gift, Crown, Users, Rocket
} from 'lucide-react';

interface StudyStreakProps {
  streak?: number;
  onStreakAction?: (action: string, data?: any) => void;
  userLevel?: number;
  totalStudyTime?: number; // in minutes
  longestStreak?: number;
  weeklyGoal?: number;
  weeklyProgress?: number;
}

interface StreakDay {
  date: Date;
  completed: boolean;
  studyTime?: number; // in minutes
  pointsEarned?: number;
  mood?: 'great' | 'good' | 'ok' | 'poor';
}

const StudyStreak: React.FC<StudyStreakProps> = ({ 
  streak = 0,
  onStreakAction,
  userLevel = 1,
  totalStudyTime = 0,
  longestStreak = 0,
  weeklyGoal = 5,
  weeklyProgress = 0
}) => {
  const [selectedView, setSelectedView] = useState<'calendar' | 'stats' | 'rewards'>('calendar');
  const [showShareModal, setShowShareModal] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [celebration, setCelebration] = useState(false);

  // Trigger celebration for milestone streaks
  useEffect(() => {
    if ([7, 14, 30, 60, 90, 100].includes(streak)) {
      setCelebration(true);
      const timer = setTimeout(() => setCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [streak]);

  const streakData = useMemo(() => {
    const today = new Date();
    const days: StreakDay[] = [];
    
    // Generate 35 days of data (5 weeks)
    for (let i = 34; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Mock data - in real app, this would come from API
      const completed = i < streak;
      const studyTime = completed ? Math.floor(Math.random() * 120) + 30 : 0;
      const pointsEarned = completed ? Math.floor(Math.random() * 50) + 10 : 0;
      const moods: StreakDay['mood'][] = ['great', 'good', 'ok', 'poor'];
      const mood = completed ? moods[Math.floor(Math.random() * moods.length)] : undefined;
      
      days.push({
        date,
        completed,
        studyTime,
        pointsEarned,
        mood
      });
    }
    
    return days;
  }, [streak]);

  const getStreakMessage = (streakCount: number) => {
    if (streakCount >= 100) return { 
      message: "Century Streak! 🎉", 
      color: "from-purple-600 to-pink-600",
      icon: "🏆",
      description: "You've studied for 100 days straight!"
    };
    if (streakCount >= 60) return { 
      message: "Diamond Learner! 💎", 
      color: "from-blue-500 to-teal-500",
      icon: "💎",
      description: "2 months of consistent learning!"
    };
    if (streakCount >= 30) return { 
      message: "Learning Champion! 🏅", 
      color: "from-yellow-500 to-orange-500",
      icon: "🏅",
      description: "A full month of dedication!"
    };
    if (streakCount >= 14) return { 
      message: "Amazing consistency! ⭐", 
      color: "from-purple-500 to-indigo-500",
      icon: "⭐",
      description: "Two weeks strong!"
    };
    if (streakCount >= 7) return { 
      message: "Great start! 🔥", 
      color: "from-orange-500 to-red-500",
      icon: "🔥",
      description: "One week complete!"
    };
    if (streakCount >= 3) return { 
      message: "Building momentum! 🚀", 
      color: "from-green-500 to-blue-500",
      icon: "🚀",
      description: "Keep the streak going!"
    };
    return { 
      message: "Start your journey! 🌱", 
      color: "from-gray-400 to-gray-500",
      icon: "🌱",
      description: "Study today to begin your streak!"
    };
  };

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'great': return 'from-green-400 to-green-500';
      case 'good': return 'from-blue-400 to-blue-500';
      case 'ok': return 'from-yellow-400 to-yellow-500';
      case 'poor': return 'from-orange-400 to-orange-500';
      default: return 'from-gray-300 to-gray-400';
    }
  };

  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'great': return '😄';
      case 'good': return '😊';
      case 'ok': return '😐';
      case 'poor': return '😔';
      default: return '';
    }
  };

  const streakInfo = getStreakMessage(streak);

  const upcomingMilestones = useMemo(() => [
    { days: 7, reward: '2x Points Multiplier', unlocked: streak >= 7, icon: <Zap className="h-4 w-4" /> },
    { days: 14, reward: 'Exclusive Badge', unlocked: streak >= 14, icon: <Award className="h-4 w-4" /> },
    { days: 30, reward: 'Legend Status', unlocked: streak >= 30, icon: <Crown className="h-4 w-4" /> },
    { days: 60, reward: 'Premium Feature Access', unlocked: streak >= 60, icon: <Star className="h-4 w-4" /> },
    { days: 100, reward: 'Special Achievement', unlocked: streak >= 100, icon: <Rocket className="h-4 w-4" /> },
  ], [streak]);

  const streakStats = useMemo(() => [
    { label: 'Current Streak', value: `${streak} days`, icon: <Flame className="h-4 w-4" /> },
    { label: 'Longest Streak', value: `${longestStreak} days`, icon: <Target className="h-4 w-4" /> },
    { label: 'Total Study Time', value: `${Math.floor(totalStudyTime / 60)}h ${totalStudyTime % 60}m`, icon: <Clock className="h-4 w-4" /> },
    { label: 'Level', value: `Level ${userLevel}`, icon: <TrendingUp className="h-4 w-4" /> },
  ], [streak, longestStreak, totalStudyTime, userLevel]);

  const handleShare = useCallback(() => {
    setShowShareModal(true);
    onStreakAction?.('share', { streak, message: streakInfo.message });
  }, [streak, streakInfo.message, onStreakAction]);

  const toggleReminder = useCallback(() => {
    setReminderEnabled(!reminderEnabled);
    onStreakAction?.('toggle_reminder', { enabled: !reminderEnabled });
  }, [reminderEnabled, onStreakAction]);

  const handleExport = useCallback(() => {
    onStreakAction?.('export', { streak, stats: streakStats });
  }, [streak, streakStats, onStreakAction]);

  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const StreakCalendar: React.FC = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1">
        {streakData.map((day, index) => (
          <div 
            key={index}
            className="text-center group relative"
            onClick={() => onStreakAction?.('day_click', day)}
          >
            <div
              className={`h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all cursor-pointer ${
                day.completed
                  ? `bg-gradient-to-b ${getMoodColor(day.mood)} text-white shadow-sm hover:scale-110`
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {day.date.getDate()}
              {day.mood && (
                <span className="absolute -top-1 -right-1 text-xs">
                  {getMoodEmoji(day.mood)}
                </span>
              )}
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap">
                <div className="font-medium">
                  {day.date.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
                {day.completed ? (
                  <>
                    <div>Study Time: {formatStudyTime(day.studyTime || 0)}</div>
                    <div>Points: +{day.pointsEarned}</div>
                    {day.mood && <div>Mood: {day.mood}</div>}
                  </>
                ) : (
                  <div>No study session</div>
                )}
              </div>
              <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1"></div>
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              {day.date.toLocaleDateString('en', { weekday: 'narrow' })}
            </div>
          </div>
        ))}
      </div>

      {/* Week Labels */}
      <div className="flex justify-between text-xs text-gray-500 px-2">
        <span>5 weeks ago</span>
        <span>This week</span>
      </div>
    </div>
  );

  const StreakStats: React.FC = () => (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4">
        {streakStats.map((stat, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-2 text-gray-600">
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-gray-600">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Progress */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-blue-900">Weekly Goal</span>
          </div>
          <span className="text-sm text-blue-700">
            {weeklyProgress}/{weeklyGoal} days
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(weeklyProgress / weeklyGoal) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-blue-600 mt-2">
          <span>This week</span>
          <span>{Math.round((weeklyProgress / weeklyGoal) * 100)}% complete</span>
        </div>
      </div>

      {/* Study Distribution */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Study Distribution</h4>
        <div className="space-y-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
            const dayStudyTime = Math.floor(Math.random() * 120) + 30; // Mock data
            return (
              <div key={day} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 w-8">{day}</span>
                <div className="flex-1 mx-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (dayStudyTime / 180) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {formatStudyTime(dayStudyTime)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const StreakRewards: React.FC = () => (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Upcoming Milestones</h4>
      <div className="space-y-3">
        {upcomingMilestones.map((milestone, index) => (
          <div
            key={milestone.days}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              milestone.unlocked
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                : streak >= milestone.days - 3
                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                milestone.unlocked
                  ? 'bg-green-100 text-green-600'
                  : streak >= milestone.days - 3
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {milestone.icon}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {milestone.days} Day Streak
                </div>
                <div className="text-sm text-gray-600">
                  {milestone.reward}
                </div>
              </div>
            </div>
            <div className="text-right">
              {milestone.unlocked ? (
                <div className="flex items-center space-x-1 text-green-600 text-sm">
                  <Award className="h-4 w-4" />
                  <span>Unlocked!</span>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {milestone.days - streak} days to go
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current Benefits */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <h4 className="font-medium text-purple-900 mb-3 flex items-center">
          <Gift className="h-4 w-4 mr-2" />
          Current Benefits
        </h4>
        <ul className="space-y-2 text-sm text-purple-800">
          {streak >= 7 && (
            <li className="flex items-center">
              <Zap className="h-3 w-3 mr-2 text-yellow-500" />
              2x points multiplier active
            </li>
          )}
          <li className="flex items-center">
            <Users className="h-3 w-3 mr-2 text-blue-500" />
            {Math.floor(streak / 7) + 1}x weekly leaderboard bonus
          </li>
          <li className="flex items-center">
            <Star className="h-3 w-3 mr-2 text-purple-500" />
            Special streak badge in community
          </li>
          {streak >= 14 && (
            <li className="flex items-center">
              <Crown className="h-3 w-3 mr-2 text-yellow-500" />
              Priority support access
            </li>
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Celebration Animation */}
      {celebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-8 text-center max-w-sm mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Milestone Reached!</h3>
            <p className="text-gray-600 mb-4">{streakInfo.description}</p>
            <button
              onClick={() => setCelebration(false)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-500" />
          Study Streak
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleReminder}
            className={`p-2 rounded-lg transition-colors ${
              reminderEnabled
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
            title="Daily Reminders"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Share Streak"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Export Data"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Streak Counter */}
      <div className="text-center mb-6">
        <div className={`bg-gradient-to-r ${streakInfo.color} rounded-xl p-6 text-white shadow-lg mb-4 relative overflow-hidden`}>
          {/* Animated background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-2 text-4xl">{streakInfo.icon}</div>
            <div className="absolute bottom-2 left-2 text-3xl">🔥</div>
          </div>
          
          <div className="relative z-10">
            <div className="text-4xl font-bold mb-2">{streak}</div>
            <div className="text-lg font-medium mb-1">days in a row</div>
            <div className="text-sm opacity-90">{streakInfo.message}</div>
          </div>
        </div>
        
        {/* Progress to next milestone */}
        {streak > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress to {upcomingMilestones.find(m => !m.unlocked)?.days} days</span>
              <span>{streak}/{upcomingMilestones.find(m => !m.unlocked)?.days}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(streak / (upcomingMilestones.find(m => !m.unlocked)?.days || 7)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        {[
          { id: 'calendar', label: 'Calendar', icon: <Calendar className="h-4 w-4" /> },
          { id: 'stats', label: 'Statistics', icon: <TrendingUp className="h-4 w-4" /> },
          { id: 'rewards', label: 'Rewards', icon: <Award className="h-4 w-4" /> }
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setSelectedView(view.id as any)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              selectedView === view.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-700'
            }`}
          >
            {view.icon}
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="mb-6">
        {selectedView === 'calendar' && <StreakCalendar />}
        {selectedView === 'stats' && <StreakStats />}
        {selectedView === 'rewards' && <StreakRewards />}
      </div>

      {/* Motivation & Actions */}
      <div className="space-y-4">
        {/* Daily Motivation */}
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800 text-center">
            {streak === 0 ? (
              "🌟 Start your learning journey today! Study for at least 15 minutes to begin your streak."
            ) : streak === 1 ? (
              "🎯 Great start! Come back tomorrow to continue your streak and earn bonus points."
            ) : streak < 7 ? (
              `🔥 You're on fire! ${7 - streak} more days until your first milestone.`
            ) : (
              `⭐ Amazing consistency! You've maintained your streak for ${streak} days.`
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => onStreakAction?.('study_now', { streak })}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Study Now
          </button>
          <button
            onClick={() => onStreakAction?.('set_goal', { streak })}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Set Goal
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Share Your Streak</h3>
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{streak} days</div>
              <div className="text-gray-600">Current study streak</div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  onStreakAction?.('share_social', { platform: 'twitter', streak });
                  setShowShareModal(false);
                }}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Twitter
              </button>
              <button
                onClick={() => {
                  onStreakAction?.('share_social', { platform: 'linkedin', streak });
                  setShowShareModal(false);
                }}
                className="flex-1 bg-blue-700 text-white py-2 rounded-lg hover:bg-blue-800 transition-colors"
              >
                LinkedIn
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(StudyStreak);