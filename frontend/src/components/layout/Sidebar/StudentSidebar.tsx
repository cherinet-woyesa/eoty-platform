import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { studentNavItems } from '@/config/navigation';
import { filterNavItems } from '@/utils/navigationFilter';
import { brandColors } from '@/theme/brand';

interface StudentSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { t } = useTranslation();
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
      <div className="flex items-center justify-between h-12 px-3 border-b border-slate-200 shadow-md" style={{ backgroundColor: brandColors.primaryHex }}>
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-sm font-bold text-white">{t('nav.member_portal', 'Member Portal')}</h1>
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
        <nav className={`space-y-2 ${isCollapsed ? 'px-1' : 'px-2'} h-full flex flex-col`}>
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            const IconComponent = item.icon as React.ElementType;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-brand-primary/10 text-brand-primary shadow-sm border border-brand-primary/20'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:shadow-sm'
                }`}
                title={isCollapsed ? t(item.description) : undefined}
              >
                <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${
                  active ? 'bg-brand-primary/15' : 'bg-white'
                } transition-all duration-200 shadow-sm`}>
                  <IconComponent className={`h-5 w-5 ${active ? 'text-brand-primary' : 'text-slate-500 group-hover:text-slate-700'}`} />
                </div>
                
                {!isCollapsed && (
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-semibold">{t(item.name)}</span>
                      {item.badge && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{t(item.description)}</p>
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