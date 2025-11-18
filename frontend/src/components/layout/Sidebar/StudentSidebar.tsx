import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
  Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { studentNavItems } from '@/config/navigation';
import { filterNavItems } from '@/utils/navigationFilter';

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
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30 border-r border-gray-200/60 shadow-lg transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header - Compact */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-blue-200/50 bg-gradient-to-r from-[#27AE60] to-[#16A085] shadow-md">
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
      
    
     

      {/* Navigation - Fills available space */}
      <div className="flex-1 overflow-y-auto py-4 bg-gradient-to-b from-white/40 to-transparent">
        <nav className="space-y-2 px-2 h-full flex flex-col">
          {navigationItems.map((item, index) => {
            const active = isActive(item.href);
            const IconComponent = item.icon as React.ElementType;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 text-[#27AE60] shadow-sm border border-[#27AE60]/30 backdrop-blur-sm'
                    : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-sm'
                }`}
                title={isCollapsed ? item.description : undefined}
              >
                <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${
                  active ? 'bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20' : 'bg-white/80 group-hover:bg-white'
                } transition-all duration-200 shadow-sm`}>
                  <IconComponent className={`h-5 w-5 ${active ? item.color : 'text-gray-500 group-hover:text-gray-700'}`} />
                </div>
                
                {!isCollapsed && (
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-semibold">{item.name}</span>
                      {item.badge && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                  </div>
                )}
              </Link>
            );
          })}
          
          {/* Spacer to push items to distribute evenly */}
          <div className="flex-1"></div>
        </nav>
      </div>


    </div>
  );
};

export default React.memo(StudentSidebar);