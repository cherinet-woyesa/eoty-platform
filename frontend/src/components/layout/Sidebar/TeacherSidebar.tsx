import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft,
  ChevronRight,
  Settings,
  Star,
  DollarSign,
  School
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { teacherNavItems } from '@/config/navigation';
import { filterNavItems } from '@/utils/navigationFilter';
import { brandColors } from '@/theme/brand';

interface TeacherSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { t } = useTranslation();
  const { user, permissions } = useAuth();
  const location = useLocation();

  const isChapterAdmin = user?.role === 'chapter_admin' || user?.role === 'admin';
  
  // Filter navigation items based on user role and permissions
  const navigationItems = useMemo(() => {
    return filterNavItems(teacherNavItems, user?.role, permissions);
  }, [user?.role, permissions]);

  // Admin-specific items for chapter_admin and admin
  const adminItems = useMemo(() => {
    if (!isChapterAdmin) return [];
    
    return [
      {
        name: 'nav.admin_panel',
        href: '/admin',
        icon: Settings,
        badge: null,
        description: 'nav.admin_panel_desc',
        color: 'text-gray-600'
      },
      {
        name: 'nav.revenue',
        href: '/revenue',
        icon: DollarSign,
        badge: null,
        description: 'nav.revenue_desc',
        color: 'text-green-600'
      }
    ];
  }, [isChapterAdmin]);

//   const quickStats = useMemo(() => [
//     {
//       label: 'Active Students',
//       value: '247',
//       change: '+12'
//     },
//     {
//       label: 'Courses',
//       value: '8',
//       change: '+2'
//     },
//     {
//       label: 'Rating',
//       value: '4.8',
//       change: '+0.2'
//     },
//     {
//       label: 'Completion',
//       value: '78%',
//       change: '+5%'
//     }
//   ], []);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-50 via-purple-50/50 to-indigo-50/30 border-r border-gray-200/60 shadow-lg transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header - Compact */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-slate-200 shadow-md" style={{ backgroundColor: brandColors.primaryHex }}>
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
              <School className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-sm font-bold text-white">Teacher Portal</h1>
            
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
      
      {/* Quick Stats - Only when expanded
      {!isCollapsed && (
        <div className="p-3 border-b border-gray-200/50 bg-white/50">
          <div className="grid grid-cols-2 gap-2">
            {quickStats.map((stat, index) => (
              <div key={index} className="text-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
                <div className="text-xs text-green-600 font-medium">{stat.change}</div>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* Navigation - Fills available space */}
      <div className="flex-1 overflow-y-auto py-4 bg-gradient-to-b from-white/40 to-transparent">
        <nav className="space-y-2 px-2">
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            const IconComponent = item.icon as React.ElementType;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-brand-primary/10 text-brand-primary shadow-sm border border-brand-primary/20'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:shadow-sm'
                }`}
                title={isCollapsed ? item.description : undefined}
              >
                <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${
                  active ? 'bg-brand-primary/20' : 'bg-white/80 group-hover:bg-white'
                } transition-all duration-200 shadow-sm`}>
                  <IconComponent className={`h-5 w-5 ${active ? 'text-brand-primary' : 'text-gray-500 group-hover:text-gray-700'}`} />
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
                    <p className="text-xs text-gray-500 truncate">{t(item.description)}</p>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Section */}
        {isChapterAdmin && adminItems.length > 0 && (
          <>
            <div className="px-2 py-4">
              <div className="border-t border-gray-200"></div>
            </div>
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('nav.admin_panel')}
                </h3>
              </div>
            )}
            <nav className="space-y-1 px-2">
              {adminItems.map((item) => {
                const active = isActive(item.href);
                const IconComponent = item.icon as React.ElementType;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-gray-100 text-gray-700 shadow-sm border border-gray-200/50'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={isCollapsed ? item.description : undefined}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                      active ? 'bg-gray-200' : 'bg-gray-100 group-hover:bg-gray-200'
                    } transition-colors duration-200`}>
                      <IconComponent className={`h-4 w-4 ${active ? item.color : 'text-gray-500 group-hover:text-gray-700'}`} />
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

      
      {!isCollapsed && (
        <div className="px-3 py-3 border-t border-gray-200/60 bg-gradient-to-r from-white/60 to-purple-50/60 backdrop-blur-sm">
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
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Revenue</span>
              <div className="flex items-center space-x-1">
                <DollarSign className="h-3 w-3 text-green-500" />
                <span className="font-semibold text-gray-900">$12.5K</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(TeacherSidebar);