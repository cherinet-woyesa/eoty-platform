import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Award, MessageCircle, Activity, Brain, Target, Clock, Star } from 'lucide-react';

const QuickActions: React.FC = () => {
  const actions = [
    {
      icon: <BookOpen className="h-5 w-5" />,
      label: 'My Courses',
      description: 'Continue learning',
      href: '/courses',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: <Award className="h-5 w-5" />,
      label: 'Achievements',
      description: 'View badges',
      href: '/achievements',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: <MessageCircle className="h-5 w-5" />,
      label: 'Discussions',
      description: 'Ask questions',
      href: '/forums',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: <Activity className="h-5 w-5" />,
      label: 'AI Assistant',
      description: 'Get help',
      href: '/ai-assistant',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: <Brain className="h-5 w-5" />,
      label: 'Study Paths',
      description: 'Learning routes',
      href: '/learning-paths',
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      icon: <Target className="h-5 w-5" />,
      label: 'Progress',
      description: 'Track learning',
      href: '/progress',
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50'
    }
  ];

  const handleActionClick = useCallback((action: typeof actions[0]) => {
    // Analytics tracking could be added here
    console.log(`Quick action clicked: ${action.label}`);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Star className="h-5 w-5 mr-2 text-yellow-500" />
        Quick Actions
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.href}
            onClick={() => handleActionClick(action)}
            className={`flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200 group ${action.bgColor} hover:scale-105`}
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow mb-3`}>
              <div className="text-white">
                {action.icon}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900 text-sm mb-1 group-hover:text-gray-700">
                {action.label}
              </div>
              <div className="text-xs text-gray-500 group-hover:text-gray-600">
                {action.description}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Today's Focus */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Today's Focus</h4>
          <Clock className="h-4 w-4 text-gray-400" />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 bg-blue-50 rounded-lg">
            <div className="text-sm font-bold text-blue-600">2</div>
            <div className="text-xs text-blue-600">Lessons</div>
          </div>
          <div className="p-2 bg-green-50 rounded-lg">
            <div className="text-sm font-bold text-green-600">30m</div>
            <div className="text-xs text-green-600">Study Time</div>
          </div>
          <div className="p-2 bg-purple-50 rounded-lg">
            <div className="text-sm font-bold text-purple-600">1</div>
            <div className="text-xs text-purple-600">Quiz</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuickActions);