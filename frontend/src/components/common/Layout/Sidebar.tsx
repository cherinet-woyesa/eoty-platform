import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Video, 
  MessageSquare, 
  Trophy, 
  BarChart2,
  Bot,
  ChevronLeft,
  ChevronRight,
  Users,
  Award,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'chapter_admin' || user?.role === 'platform_admin';
  
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      name: 'My Courses',
      href: '/courses',
      icon: BookOpen,
      badge: '3'
    },
    ...(isTeacher ? [{
      name: 'Create Course',
      href: '/courses/new',
      icon: Sparkles,
      badge: 'New'
    }] : []),
    ...(isTeacher ? [{
      name: 'Record Video',
      href: '/record',
      icon: Video,
      badge: null
    }] : []),
    {
      name: 'AI Assistant',
      href: '/ai-assistant',
      icon: Bot,
      badge: 'AI'
    },
    {
      name: 'Forums',
      href: '/forums',
      icon: MessageSquare,
      badge: '12'
    },
    {
      name: 'Achievements',
      href: '/achievements',
      icon: Trophy,
      badge: '5'
    },
    {
      name: 'Leaderboards',
      href: '/leaderboards',
      icon: Award,
      badge: null
    }
  ];

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-white to-blue-50/30 border-r border-gray-200/60 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-blue-200/50 bg-gradient-to-r from-blue-600 to-indigo-700">
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-white flex items-center">
            <LayoutDashboard className="mr-2 h-6 w-6" />
            EOTY Platform
          </h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg hover:bg-white/20 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-white" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-white" />
          )}
        </button>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 mx-2 relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-md border border-transparent hover:border-blue-200/50'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full" />
                )}
                
                <Icon
                  className={`flex-shrink-0 h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                  } ${isCollapsed ? '' : 'mr-3'}`}
                />
                
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    {item.name}
                    {item.badge && ` (${item.badge})`}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Stats Section */}
        {!isCollapsed && (
          <div className="mt-8 mx-4 p-4 bg-white/50 rounded-xl border border-blue-200/30">
            <div className="text-center">
              <div className="flex justify-center space-x-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-blue-600">12</div>
                  <div className="text-gray-500 text-xs">Courses</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-600">5</div>
                  <div className="text-gray-500 text-xs">Completed</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-600">3</div>
                  <div className="text-gray-500 text-xs">Badges</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
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
                {user?.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;