import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Shield, 
  Tag, 
  BarChart2, 
  Settings,
  Upload,
  ChevronLeft,
  ChevronRight,
  Crown,
  Database,
  Server,
  Globe,
  ChevronDown,
  ChevronUp,
  FolderTree,
  Layers,
  Timer,
  Hash,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getMetrics } from '../../../services/api/systemConfig';

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isSystemConfigExpanded, setIsSystemConfigExpanded] = useState(false);

  // Fetch system config metrics for badge indicators
  const { data: metrics } = useQuery({
    queryKey: ['systemConfigMetrics'],
    queryFn: getMetrics,
    refetchInterval: false, // Disable auto-refetch to prevent excessive API calls
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    enabled: !!(user?.role === 'chapter_admin' || user?.role === 'platform_admin'),
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
  
  const navigationItems = useMemo(() => [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      roles: ['chapter_admin', 'platform_admin'],
      badge: null,
      description: 'Overview & metrics'
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: <Users className="h-4 w-4" />,
      roles: ['chapter_admin', 'platform_admin'],
      badge: '12',
      description: 'Manage users & roles'
    },
    {
      name: 'Content Management',
      href: '/admin/content',
      icon: <FileText className="h-4 w-4" />,
      roles: ['chapter_admin', 'platform_admin'],
      badge: '24',
      description: 'Courses & materials'
    },
    {
      name: 'Upload Queue',
      href: '/admin/uploads',
      icon: <Upload className="h-4 w-4" />,
      roles: ['chapter_admin', 'platform_admin'],
      badge: '5',
      description: 'Pending approvals'
    },
    {
      name: 'Moderation',
      href: '/admin/moderation',
      icon: <Shield className="h-4 w-4" />,
      roles: ['chapter_admin', 'platform_admin'],
      badge: '3',
      description: 'Content review'
    },
    {
      name: 'Tags & Categories',
      href: '/admin/tags',
      icon: <Tag className="h-4 w-4" />,
      roles: ['chapter_admin', 'platform_admin'],
      badge: null,
      description: 'Organize content'
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: <BarChart2 className="h-4 w-4" />,
      roles: ['chapter_admin', 'platform_admin'],
      badge: 'New',
      description: 'Platform insights'
    }

  ], []);

  const systemConfigItems = useMemo(() => [
    {
      name: 'Categories',
      href: '/admin/config/categories',
      icon: <FolderTree className="h-4 w-4" />,
      description: 'Course categories'
    },
    {
      name: 'Levels',
      href: '/admin/config/levels',
      icon: <Layers className="h-4 w-4" />,
      description: 'Difficulty levels'
    },
    {
      name: 'Durations',
      href: '/admin/config/durations',
      icon: <Timer className="h-4 w-4" />,
      description: 'Course durations'
    },
    {
      name: 'Tags',
      href: '/admin/config/tags',
      icon: <Hash className="h-4 w-4" />,
      description: 'Content tags'
    },
    {
      name: 'Chapters',
      href: '/admin/config/chapters',
      icon: <BookOpen className="h-4 w-4" />,
      description: 'Chapter management'
    }
  ], []);

  const systemItems = useMemo(() => [
    {
      name: 'System Settings',
      href: '/admin/settings',
      icon: <Settings className="h-4 w-4" />,
      roles: ['platform_admin'],
      badge: null,
      description: 'Platform configuration'
    },
    {
      name: 'Database',
      href: '/admin/database',
      icon: <Database className="h-4 w-4" />,
      roles: ['platform_admin'],
      badge: null,
      description: 'Data management'
    },
    {
      name: 'Server Status',
      href: '/admin/status',
      icon: <Server className="h-4 w-4" />,
      roles: ['platform_admin'],
      badge: 'Healthy',
      description: 'System health'
    },
    {
      name: 'Global Settings',
      href: '/admin/global',
      icon: <Globe className="h-4 w-4" />,
      roles: ['platform_admin'],
      badge: null,
      description: 'Multi-tenant config'
    }
  ], []);

  

  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const filteredSystemItems = systemItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const isActive = (href: string) => {
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
      
      

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="space-y-1 px-2">
          {filteredItems.map((item) => {
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
                  <div className={active ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'}>
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

        {/* System Config Expandable Menu */}
        <div className="px-2 mt-1">
          <button
            onClick={() => setIsSystemConfigExpanded(!isSystemConfigExpanded)}
            className={`group w-full flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.pathname.startsWith('/admin/config')
                ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200/50'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={isCollapsed ? 'System Configuration' : undefined}
          >
            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
              location.pathname.startsWith('/admin/config') ? 'bg-blue-200' : 'bg-gray-100 group-hover:bg-gray-200'
            } transition-colors duration-200`}>
              <Settings className={`h-4 w-4 ${
                location.pathname.startsWith('/admin/config') ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'
              }`} />
            </div>
            
            {!isCollapsed && (
              <div className="ml-3 flex-1 min-w-0 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate">System Config</span>
                    {totalInactive > 0 && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {totalInactive}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">Manage system options</p>
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
          {!isCollapsed && isSystemConfigExpanded && (
            <div className="mt-1 ml-4 space-y-1">
              {systemConfigItems.map((subItem) => {
                const active = isActive(subItem.href);
                
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
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                      active ? 'bg-blue-200' : 'bg-gray-100 group-hover:bg-gray-200'
                    } transition-colors duration-200`}>
                      {React.cloneElement(subItem.icon, { 
                        className: `h-4 w-4 ${active ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'}` 
                      })}
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

        {/* System Section */}
        {filteredSystemItems.length > 0 && (
          <>
            <div className="px-2 py-4">
              <div className="border-t border-gray-200"></div>
            </div>
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                System
              </h3>
            </div>
            <nav className="space-y-1 px-2">
              {filteredSystemItems.map((item) => {
                const active = isActive(item.href);
                
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
                      <div className={active ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-700'}>
                        {item.icon}
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Admin</span>
              <span className="font-semibold text-gray-900 capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AdminSidebar);