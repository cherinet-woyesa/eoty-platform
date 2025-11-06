import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Bookmark, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Award,
  PlayCircle,
  MessageSquare,
  HelpCircle,
  Clock,
  Star,
  Target,
  Zap,
  Brain,
  MessageCircle,
  Users,
  BarChart3,
  FileText,
  Search
} from 'lucide-react';

interface StudentSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const location = useLocation();
  
  const navigationItems = useMemo(() => [
    {
      name: 'Dashboard',
      href: '/student/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      badge: null,
      description: 'Learning overview',
      color: 'text-blue-600'
    },
    {
      name: 'My Courses',
      href: '/courses',
      icon: <BookOpen className="h-4 w-4" />,
      badge: '5',
      description: 'Continue learning',
      color: 'text-green-600'
    },
    {
      name: 'Browse Courses',
      href: '/catalog',
      icon: <Search className="h-4 w-4" />,
      badge: null,
      description: 'Discover new courses',
      color: 'text-purple-600'
    },
    {
      name: 'Study Paths',
      href: '/learning-paths',
      icon: <Target className="h-4 w-4" />,
      badge: '3',
      description: 'Structured learning',
      color: 'text-purple-600'
    },
    {
      name: 'Bookmarks',
      href: '/bookmarks',
      icon: <Bookmark className="h-4 w-4" />,
      badge: '12',
      description: 'Saved lessons',
      color: 'text-yellow-600'
    },
    {
      name: 'Study Schedule',
      href: '/schedule',
      icon: <Calendar className="h-4 w-4" />,
      badge: null,
      description: 'Plan your study',
      color: 'text-indigo-600'
    },
    {
      name: 'Progress',
      href: '/progress',
      icon: <BarChart3 className="h-4 w-4" />,
      badge: null,
      description: 'Track learning',
      color: 'text-orange-600'
    },
    {
      name: 'Discussions',
      href: '/forums',
      icon: <MessageSquare className="h-4 w-4" />,
      badge: '3',
      description: 'Ask questions',
      color: 'text-pink-600'
    },
    {
      name: 'Study Groups',
      href: '/study-groups',
      icon: <Users className="h-4 w-4" />,
      badge: '2',
      description: 'Collaborate with peers',
      color: 'text-cyan-600'
    },
    {
      name: 'Achievements',
      href: '/achievements',
      icon: <Award className="h-4 w-4" />,
      badge: '7',
      description: 'View badges',
      color: 'text-amber-600'
    },
    {
      name: 'AI Assistant',
      href: '/ai-assistant',
      icon: <Brain className="h-4 w-4" />,
      badge: 'AI',
      description: 'Get help',
      color: 'text-emerald-600'
    },
    {
      name: 'Resources',
      href: '/resources',
      icon: <FileText className="h-4 w-4" />,
      badge: null,
      description: 'Study materials',
      color: 'text-gray-600'
    },
    {
      name: 'Help Center',
      href: '/help',
      icon: <HelpCircle className="h-4 w-4" />,
      badge: null,
      description: 'Get support',
      color: 'text-red-600'
    }
  ], []);

  const quickActions = useMemo(() => [
    {
      name: 'Continue Learning',
      href: '/continue',
      icon: <PlayCircle className="h-3 w-3" />,
      description: 'Last course: Theology 101'
    },
    {
      name: 'Due Soon',
      href: '/due',
      icon: <Clock className="h-3 w-3" />,
      description: '2 assignments due'
    },
    {
      name: 'Recommended',
      href: '/recommended',
      icon: <Star className="h-3 w-3" />,
      description: 'New courses for you'
    }
  ], []);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-white to-blue-50/30 border-r border-gray-200/60 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header - Compact */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-blue-200/50 bg-gradient-to-r from-blue-600 to-indigo-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-sm font-bold text-white">Student Portal</h1>
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
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200/50'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={isCollapsed ? item.description : undefined}
              >
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                  active ? 'bg-blue-200' : 'bg-gray-100 group-hover:bg-gray-200'
                } transition-colors duration-200`}>
                  <div className={active ? item.color : 'text-gray-500 group-hover:text-gray-700'}>
                    {item.icon}
                  </div>
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
      </div>

      {/* Study Stats - Only when expanded */}
      {!isCollapsed && (
        <div className="px-3 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/50">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Courses</span>
              <span className="font-semibold text-gray-900">5</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Completed</span>
              <span className="font-semibold text-gray-900">12 lessons</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Streak</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-green-500" />
                <span className="font-semibold text-gray-900">7 days</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Level</span>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="font-semibold text-gray-900">Intermediate</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(StudentSidebar);