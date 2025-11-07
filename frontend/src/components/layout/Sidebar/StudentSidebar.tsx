import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
  Zap
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { studentNavItems } from '../../../config/navigation';
import { filterNavItems } from '../../../utils/navigationFilter';

interface StudentSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { user, permissions } = useAuth();
  const location = useLocation();
  
  // Filter navigation items based on user role and permissions
  const navigationItems = useMemo(() => {
    return filterNavItems(studentNavItems, user?.role, permissions);
  }, [user?.role, permissions]);

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
            const IconComponent = item.icon as React.ElementType;
            
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
                  <IconComponent className={`h-4 w-4 ${active ? item.color : 'text-gray-500 group-hover:text-gray-700'}`} />
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