import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  Trophy, 
  Award, 
  Bot,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Star,
  Bookmark,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const StudentSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
      description: 'Your learning overview'
    },
    {
      name: 'My Courses',
      href: '/courses',
      icon: BookOpen,
      badge: '3',
      description: 'Continue learning'
    },
    {
      name: 'Bookmarks',
      href: '/bookmarks',
      icon: Bookmark,
      badge: '12',
      description: 'Saved content'
    },
    {
      name: 'AI Assistant',
      href: '/ai-assistant',
      icon: Bot,
      badge: 'AI',
      description: 'Get help & answers'
    },
    {
      name: 'Forums',
      href: '/forums',
      icon: MessageSquare,
      badge: '12',
      description: 'Community discussions'
    },
    {
      name: 'Achievements',
      href: '/achievements',
      icon: Trophy,
      badge: '5',
      description: 'Your progress'
    },
    {
      name: 'Leaderboards',
      href: '/leaderboards',
      icon: Award,
      badge: null,
      description: 'See rankings'
    },
    {
      name: 'Study Schedule',
      href: '/schedule',
      icon: Clock,
      badge: null,
      description: 'Plan your learning'
    },
    {
      name: 'Help Center',
      href: '/help',
      icon: HelpCircle,
      badge: null,
      description: 'Get support'
    }
  ];

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-blue-50 to-indigo-50 border-r border-blue-200/60 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-blue-200/50 bg-gradient-to-r from-blue-500 to-indigo-600">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Student Portal</h1>
              <p className="text-xs text-blue-100">Learning Dashboard</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-white" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-white" />
          )}
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'}`} />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        item.badge === 'AI' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {item.description}
                  </p>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Quick Stats */}
      {!isCollapsed && (
        <div className="px-4 py-4 border-t border-blue-200/50 bg-white/50 backdrop-blur-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Courses Completed</span>
              <span className="font-semibold text-blue-600">3/12</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Current Streak</span>
              <span className="font-semibold text-green-600">7 days</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Points Earned</span>
              <span className="font-semibold text-purple-600">1,250</span>
            </div>
          </div>
        </div>
      )}
      
      {/* User Profile */}
      <div className="border-t border-blue-200/50 p-4 bg-white/50 backdrop-blur-sm">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-md ring-2 ring-white">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
          </div>
          {!isCollapsed && (
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-600 capitalize truncate">
                Student
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentSidebar;
