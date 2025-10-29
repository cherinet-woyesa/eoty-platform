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
  Sparkles,
  FileText,
  Upload,
  Settings,
  Clock,
  Star,
  HelpCircle,
  Zap,
  Target
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface TeacherSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { user } = useAuth();
  const location = useLocation();

  const isChapterAdmin = user?.role === 'chapter_admin' || user?.role === 'platform_admin';
  
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
      description: 'Teaching overview',
      color: 'text-blue-600'
    },
    {
      name: 'My Courses',
      href: '/courses',
      icon: BookOpen,
      badge: '8',
      description: 'Manage courses',
      color: 'text-green-600'
    },
    {
      name: 'Record Video',
      href: '/record',
      icon: Video,
      badge: null,
      description: 'Create lessons',
      color: 'text-red-600'
    },
    {
      name: 'Create Course',
      href: '/courses/new',
      icon: Sparkles,
      badge: null,
      description: 'New course',
      color: 'text-purple-600'
    },
    {
      name: 'Students',
      href: '/community', // Using community hub as it's the closest to student management
      icon: Users,
      badge: '247',
      description: 'Manage learners',
      color: 'text-indigo-600'
    },
    {
      name: 'Analytics',
      href: '/analytics', // Changed from '/admin/analytics' to '/analytics' to use the teacher-specific route
      icon: BarChart2,
      badge: null,
      description: 'View reports',
      color: 'text-orange-600'
    },
    {
      name: 'Discussions',
      href: '/forums',
      icon: MessageSquare,
      badge: '12',
      description: 'Student chats',
      color: 'text-pink-600'
    },
    {
      name: 'AI Assistant',
      href: '/ai-assistant',
      icon: Bot,
      badge: null,
      description: 'Get help',
      color: 'text-cyan-600'
    },
    {
      name: 'Resources',
      href: '/resources',
      icon: FileText,
      badge: null,
      description: 'Upload files',
      color: 'text-emerald-600'
    },
    {
      name: 'Achievements',
      href: '/achievements',
      icon: Trophy,
      badge: null,
      description: 'View badges',
      color: 'text-yellow-600'
    }
  ];

  const adminItems = [
    {
      name: 'Admin Panel',
      href: '/admin',
      icon: Settings,
      badge: null,
      description: 'System management',
      color: 'text-gray-600'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-white to-blue-50/30 border-r border-gray-200/60 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Header - Compact */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-blue-200/50 bg-gradient-to-r from-blue-600 to-indigo-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-sm font-bold text-white">EOTY</h1>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md hover:bg-white/20 transition-colors duration-200"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-white" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-white" />
          )}
        </button>
      </div>
      
      {/* Navigation - Compact */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="space-y-1 px-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={isCollapsed ? item.description : undefined}
              >
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                  active ? 'bg-blue-200' : 'bg-gray-100 group-hover:bg-gray-200'
                } transition-colors duration-200`}>
                  <Icon className={`h-4 w-4 ${active ? item.color : 'text-gray-500 group-hover:text-gray-700'}`} />
                </div>
                
                {!isCollapsed && (
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Section */}
        {isChapterAdmin && (
          <>
            <div className="px-2 py-2">
              <div className="border-t border-gray-200"></div>
            </div>
            <nav className="space-y-1 px-2">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-gray-100 text-gray-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={isCollapsed ? item.description : undefined}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                      active ? 'bg-gray-200' : 'bg-gray-100 group-hover:bg-gray-200'
                    } transition-colors duration-200`}>
                      <Icon className={`h-4 w-4 ${active ? item.color : 'text-gray-500 group-hover:text-gray-700'}`} />
                    </div>
                    
                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Footer - Compact Stats */}
      {!isCollapsed && (
        <div className="px-3 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/50">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Active Students</span>
              <span className="font-semibold text-gray-900">247</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Courses</span>
              <span className="font-semibold text-gray-900">8</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Rating</span>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="font-semibold text-gray-900">4.8</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSidebar;