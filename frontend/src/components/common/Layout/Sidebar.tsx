import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Video, 
  MessageSquare, 
  Trophy, 
  BarChart2,
  Bot
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isTeacher = user?.role === 'teacher' || user?.role === 'chapter_admin' || user?.role === 'platform_admin';
  
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'My Courses',
      href: '/courses',
      icon: BookOpen
    },
    ...(isTeacher ? [{
      name: 'Create Course',
      href: '/courses/new',
      icon: BookOpen
    }] : []),
    ...(isTeacher ? [{
      name: 'Record Video',
      href: '/record',
      icon: Video
    }] : []),
    {
      name: 'AI Assistant',
      href: '/ai-assistant',
      icon: Bot
    },
    {
      name: 'Forums',
      href: '/forums',
      icon: MessageSquare
    },
    {
      name: 'Achievements',
      href: '/achievements',
      icon: Trophy
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-16 px-4 border-b border-blue-200 bg-gradient-to-r from-blue-300 to-indigo-400">
        <h1 className="text-xl font-bold text-white flex items-center">
          <LayoutDashboard className="mr-2 h-6 w-6" />
          EOTY Platform
        </h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 bg-gradient-to-b from-blue-50 to-indigo-50">
        <nav className="px-2 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 mx-2 ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-700 hover:bg-blue-100 hover:text-blue-800'
                }`}
              >
                <Icon
                  className={`mr-3 flex-shrink-0 h-5 w-5 ${
                    isActive ? 'text-white' : 'text-gray-500'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="border-t border-blue-200 p-4 bg-gradient-to-r from-blue-100 to-indigo-100">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-800">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-600 capitalize">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;