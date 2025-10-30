import React, { useMemo } from 'react';
import { Zap, Flame, Calendar } from 'lucide-react';

interface StudyStreakProps {
  streak?: number;
}

const StudyStreak: React.FC<StudyStreakProps> = ({ streak = 0 }) => {
  const streakData = useMemo(() => {
    const today = new Date();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      days.push({
        date,
        completed: i < streak // Mock data - in real app, this would come from API
      });
    }
    
    return days;
  }, [streak]);

  const getStreakMessage = (streakCount: number) => {
    if (streakCount >= 30) return { message: "Fire Legend! 🔥", color: "from-red-500 to-orange-500" };
    if (streakCount >= 14) return { message: "Amazing streak! 💪", color: "from-orange-500 to-yellow-500" };
    if (streakCount >= 7) return { message: "Great consistency! ⭐", color: "from-yellow-500 to-green-500" };
    if (streakCount >= 3) return { message: "Keep it up! 👏", color: "from-green-500 to-blue-500" };
    return { message: "Start your streak today!", color: "from-gray-400 to-gray-500" };
  };

  const streakInfo = getStreakMessage(streak);

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Zap className="h-5 w-5 mr-2 text-yellow-500" />
        Study Streak
      </h3>

      {/* Streak Counter */}
      <div className="text-center mb-6">
        <div className={`bg-gradient-to-r ${streakInfo.color} rounded-xl p-4 text-white mb-3`}>
          <div className="text-3xl font-bold mb-1">{streak}</div>
          <div className="text-sm font-medium">days in a row</div>
        </div>
        <p className="text-sm text-gray-600">{streakInfo.message}</p>
      </div>

      {/* Weekly Calendar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <span>This Week</span>
          <Calendar className="h-4 w-4" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {streakData.map((day, index) => (
            <div key={index} className="text-center">
              <div
                className={`h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                  day.completed
                    ? 'bg-gradient-to-b from-yellow-400 to-orange-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {day.date.getDate()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {day.date.toLocaleDateString('en', { weekday: 'narrow' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Streak Benefits */}
      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Streak Benefits</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li className="flex items-center">
            <Flame className="h-3 w-3 text-orange-500 mr-2" />
            {streak >= 7 ? '🎉 2x points unlocked!' : '2x points at 7 days'}
          </li>
          <li className="flex items-center">
            <Zap className="h-3 w-3 text-yellow-500 mr-2" />
            {streak >= 14 ? '⭐ Exclusive badge earned!' : 'Special badge at 14 days'}
          </li>
          <li className="flex items-center">
            <Zap className="h-3 w-3 text-purple-500 mr-2" />
            {streak >= 30 ? '🏆 Legend status achieved!' : 'Legend status at 30 days'}
          </li>
        </ul>
      </div>

      {/* Motivation */}
      {streak > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-800 text-center">
            {streak === 1 
              ? "Great start! Come back tomorrow to continue your streak."
              : `You're on fire! ${7 - (streak % 7)} more days until your next milestone.`
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(StudyStreak);