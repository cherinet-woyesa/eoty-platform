import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft,
  ChevronRight,
  Crown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMetrics } from '@/services/api/systemConfig';
import { adminNavItems, adminNavSections } from '@/config/navigation';
import { filterNavItems } from '@/utils/navigationFilter';

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { user, permissions } = useAuth();
  const location = useLocation();
  const [isSystemConfigExpanded, setIsSystemConfigExpanded] = useState(false);

  // Fetch system config metrics for badge indicators
  const { data: metrics } = useQuery({
    queryKey: ['systemConfigMetrics'],
    queryFn: getMetrics,
    refetchInterval: false, // Disable auto-refetch to prevent excessive API calls
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    enabled: !!(user?.role === 'admin' || user?.role === 'chapter_admin'),
    retry: 1, // Only retry once on failure
  });

  // Calculate total inactive items
  const totalInactive = useMemo(() => {
    if (!metrics) return 0;
    return (
      metrics.categories.inactive +
      metrics.levels.inactive +
      metrics.durations.inactive +
      metrics.tags.inactive +
      metrics.chapters.inactive
    );
  }, [metrics]);

  // Auto-expand System Config menu if on a config page
  useEffect(() => {
    if (location.pathname.startsWith('/admin/config')) {
      setIsSystemConfigExpanded(true);
    }
  }, [location.pathname]);
  
  // Filter navigation items based on user role and permissions
  const filteredItems = useMemo(() => {
    const filtered = filterNavItems(adminNavItems, user?.role, permissions);
    
    // Separate System Config item from main items
    return filtered.filter(item => item.href !== '/admin/config');
  }, [user?.role, permissions]);

  // Get System Config item and its children separately
  const systemConfigItem = useMemo(() => {
    const filtered = filterNavItems(adminNavItems, user?.role, permissions);
    return filtered.find(item => item.href === '/admin/config');
  }, [user?.role, permissions]);

  // Group navigation items by section for clearer structure
  const sectionedItems = useMemo(() => {
    const sections: Record<string, typeof filteredItems> = {
      primary: [],
      content: [],
      system: [],
      reference: []
    };

    filteredItems.forEach(item => {
      const sectionKey = item.section || 'primary';
      if (!sections[sectionKey]) {
        sections[sectionKey] = [];
      }
      sections[sectionKey].push(item);
    });

    return sections;
  }, [filteredItems]);

  const isActive = (href: string) => {
    return location.pathname.startsWith(href);
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-50 via-amber-50/40 to-orange-50/30 border-r border-gray-200/60 shadow-lg transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header - Compact */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-orange-200/50 bg-gradient-to-r from-[#E74C3C] to-[#F39C12] shadow-md">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-sm font-bold text-white">Admin Panel</h1>
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
      <div className="flex-1 overflow-y-auto py-4 min-h-0 bg-gradient-to-b from-white/40 to-transparent">
        {/* Primary (high-frequency) items */}
        <nav className="space-y-2 px-2">
          {sectionedItems.primary.map((item) => {
            const active = isActive(item.href);
            const IconComponent = item.icon as React.ElementType;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-[#E74C3C]/10 to-[#F39C12]/10 text-[#E74C3C] shadow-sm border border-[#E74C3C]/30 backdrop-blur-sm'
                    : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-sm'
                }`}
                title={isCollapsed ? item.description : undefined}
              >
                <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${
                  active ? 'bg-gradient-to-br from-[#E74C3C]/20 to-[#F39C12]/20' : 'bg-white/80 group-hover:bg-white'
                } transition-all duration-200 shadow-sm`}>
                  <IconComponent className={`h-5 w-5 ${active ? 'text-[#E74C3C]' : 'text-gray-500 group-hover:text-gray-700'}`} />
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
        </nav>

        {/* Content management & configuration */}
        {(sectionedItems.content.length > 0 || systemConfigItem) && (
          <div className="mt-4">
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {adminNavSections.content.icon && (
                    <span className="mr-1.5">
                      {React.createElement(adminNavSections.content.icon as React.ElementType, {
                        className: 'h-3 w-3 text-gray-400'
                      })}
                    </span>
                  )}
                  {adminNavSections.content.title}
                </div>
              </div>
            )}

            {sectionedItems.content.length > 0 && (
              <nav className="space-y-1 px-2">
                {sectionedItems.content.map((item) => {
                  const active = isActive(item.href);
                  const IconComponent = item.icon as React.ElementType;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        active
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.description : undefined}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                        active ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-gray-200'
                      } transition-colors duration-200`}>
                        <IconComponent className={`h-4 w-4 ${active ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'}`} />
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
            )}

            {/* System Config Expandable Menu */}
            {systemConfigItem && (
              <div className="px-2 mt-1">
            <button
              onClick={() => setIsSystemConfigExpanded(!isSystemConfigExpanded)}
              className={`group w-full flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                location.pathname.startsWith('/admin/config')
                  ? 'bg-gradient-to-r from-[#E74C3C]/10 to-[#F39C12]/10 text-[#E74C3C] shadow-sm border border-[#E74C3C]/30 backdrop-blur-sm'
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-sm'
              }`}
              title={isCollapsed ? systemConfigItem.description : undefined}
            >
              <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                location.pathname.startsWith('/admin/config') ? 'bg-gradient-to-br from-[#E74C3C]/20 to-[#F39C12]/20' : 'bg-white/80 group-hover:bg-white'
              } transition-all duration-200 shadow-sm`}>
                {React.createElement(systemConfigItem.icon as React.ElementType, {
                  className: `h-4 w-4 ${location.pathname.startsWith('/admin/config') ? 'text-[#E74C3C]' : 'text-gray-500 group-hover:text-gray-700'}`
                })}
              </div>
              
              {!isCollapsed && (
                <div className="ml-3 flex-1 min-w-0 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{systemConfigItem.name}</span>
                      {totalInactive > 0 && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          {totalInactive}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{systemConfigItem.description}</p>
                  </div>
                  <div className="ml-2">
                    {isSystemConfigExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              )}
            </button>

            {/* System Config Sub-menu */}
            {!isCollapsed && isSystemConfigExpanded && systemConfigItem.children && (
              <div className="mt-1 ml-4 space-y-1">
                {systemConfigItem.children.map((subItem) => {
                  const active = isActive(subItem.href);
                  const SubIconComponent = subItem.icon as React.ElementType;
                  
                  // Get inactive count for this specific item
                  let inactiveCount = 0;
                  if (metrics) {
                    if (subItem.href.includes('categories')) inactiveCount = metrics.categories.inactive;
                    else if (subItem.href.includes('levels')) inactiveCount = metrics.levels.inactive;
                    else if (subItem.href.includes('durations')) inactiveCount = metrics.durations.inactive;
                    else if (subItem.href.includes('tags')) inactiveCount = metrics.tags.inactive;
                    else if (subItem.href.includes('chapters')) inactiveCount = metrics.chapters.inactive;
                  }
                  
                  return (
                    <Link
                      key={subItem.name}
                      to={subItem.href}
                      className={`group flex items-center px-2 py-2 text-sm rounded-lg transition-all duration-200 ${
                        active
                          ? 'bg-gradient-to-r from-[#E74C3C]/10 to-[#F39C12]/10 text-[#E74C3C]'
                          : 'text-gray-700 hover:bg-white/60 hover:text-gray-900'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                        active ? 'bg-gradient-to-br from-[#E74C3C]/20 to-[#F39C12]/20' : 'bg-white/80 group-hover:bg-white'
                      } transition-all duration-200 shadow-sm`}>
                        <SubIconComponent className={`h-4 w-4 ${active ? 'text-[#E74C3C]' : 'text-gray-500 group-hover:text-gray-700'}`} />
                      </div>
                      
                      <div className="ml-2 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate font-medium text-sm">{subItem.name}</span>
                          {inactiveCount > 0 && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              {inactiveCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{subItem.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
              </div>
            )}
          </div>
        )}

        {/* System tools */}
        {sectionedItems.system.length > 0 && (
          <div className="mt-4">
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {adminNavSections.system.icon && (
                    <span className="mr-1.5">
                      {React.createElement(adminNavSections.system.icon as React.ElementType, {
                        className: 'h-3 w-3 text-gray-400'
                      })}
                    </span>
                  )}
                  {adminNavSections.system.title}
                </div>
              </div>
            )}

            <nav className="space-y-1 px-2">
              {sectionedItems.system.map((item) => {
                const active = isActive(item.href);
                const IconComponent = item.icon as React.ElementType;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-slate-100 text-slate-800 border border-slate-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={isCollapsed ? item.description : undefined}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                      active ? 'bg-slate-200' : 'bg-gray-100 group-hover:bg-gray-200'
                    } transition-colors duration-200`}>
                      <IconComponent className={`h-4 w-4 ${active ? 'text-slate-800' : 'text-gray-500 group-hover:text-gray-700'}`} />
                    </div>

                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
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
        )}

        {/* Reference & logs */}
        {sectionedItems.reference.length > 0 && (
          <div className="mt-4 mb-2">
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {adminNavSections.reference.icon && (
                    <span className="mr-1.5">
                      {React.createElement(adminNavSections.reference.icon as React.ElementType, {
                        className: 'h-3 w-3 text-gray-400'
                      })}
                    </span>
                  )}
                  {adminNavSections.reference.title}
                </div>
              </div>
            )}

            <nav className="space-y-1 px-2">
              {sectionedItems.reference.map((item) => {
                const active = isActive(item.href);
                const IconComponent = item.icon as React.ElementType;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-gray-50 text-gray-800 border border-gray-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={isCollapsed ? item.description : undefined}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                      active ? 'bg-gray-200' : 'bg-gray-100 group-hover:bg-gray-200'
                    } transition-colors duration-200`}>
                      <IconComponent className={`h-4 w-4 ${active ? 'text-gray-800' : 'text-gray-500 group-hover:text-gray-700'}`} />
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
          </div>
        )}
      </div>

      {/* Footer - Compact Stats with Role Indicator */}
      {!isCollapsed && (
        <div className="px-3 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/50">
          <div className="space-y-2">
            {/* Role Indicator - Prominent */}
            <div className="flex items-center justify-between p-2 bg-blue-100 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-blue-700" />
                <span className="text-xs font-medium text-blue-700">Role</span>
              </div>
              <span className="text-xs font-bold text-blue-900 capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Total Users</span>
              <span className="font-semibold text-gray-900">{metrics?.categories?.total || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Active Courses</span>
              <span className="font-semibold text-gray-900">{metrics?.levels?.total || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Pending</span>
              <span className="font-semibold text-amber-600">{totalInactive}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AdminSidebar);