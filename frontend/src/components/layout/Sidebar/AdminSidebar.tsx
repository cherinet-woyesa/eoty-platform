import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Shield, 
  Tag, 
  BarChart2, 
  Settings,
  Upload,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Crown,
  Database,
  Server,
  Globe,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

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

  const isPlatformAdmin = user?.role === 'platform_admin';
  const isChapterAdmin = user?.role === 'chapter_admin';
  
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
    },
    {
      name: 'Billing & Payments',
      href: '/admin/billing',
      icon: <CreditCard className="h-4 w-4" />,
      roles: ['platform_admin'],
      badge: null,
      description: 'Financial management'
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
    <div className={`flex flex-col h-full bg-gradient-to-b from-gray-900 to-blue-900/90 border-r border-blue-700/30 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-blue-700/50 bg-gradient-to-r from-blue-800 to-purple-900">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <Crown className="h-3 w-3 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Admin Panel</h1>
              <p className="text-xs text-blue-200 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-blue-200" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-blue-200" />
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
                    ? 'bg-blue-600 text-white shadow-sm border border-blue-500/50'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
                title={isCollapsed ? item.description : undefined}
              >
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                  active ? 'bg-blue-500' : 'bg-blue-700/50 group-hover:bg-blue-600/50'
                } transition-colors duration-200`}>
                  <div className={active ? 'text-white' : 'text-blue-300 group-hover:text-white'}>
                    {item.icon}
                  </div>
                </div>
                
                {!isCollapsed && (
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-semibold">{item.name}</span>
                      {item.badge && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-blue-300/70 truncate">{item.description}</p>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* System Section */}
        {filteredSystemItems.length > 0 && (
          <>
            <div className="px-2 py-4">
              <div className="border-t border-blue-700/30"></div>
            </div>
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
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
                        ? 'bg-purple-600 text-white shadow-sm border border-purple-500/50'
                        : 'text-purple-100 hover:bg-white/10 hover:text-white'
                    }`}
                    title={isCollapsed ? item.description : undefined}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                      active ? 'bg-purple-500' : 'bg-purple-700/50 group-hover:bg-purple-600/50'
                    } transition-colors duration-200`}>
                      <div className={active ? 'text-white' : 'text-purple-300 group-hover:text-white'}>
                        {item.icon}
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate font-semibold">{item.name}</span>
                          {item.badge && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-purple-300/70 truncate">{item.description}</p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Quick Actions - Only when expanded */}
      {!isCollapsed && (
        <div className="p-3 border-t border-blue-700/30 bg-blue-800/20">
          <div className="space-y-2">
            <button className="w-full flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
              <CheckCircle className="h-3 w-3 mr-2" />
              Approve All
            </button>
            <button className="w-full flex items-center justify-center px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors">
              <Shield className="h-3 w-3 mr-2" />
              Moderate
            </button>
          </div>
        </div>
      )}

      {/* User Profile */}
      <div className="border-t border-blue-700/30 p-3 bg-blue-800/20 backdrop-blur-sm">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex-shrink-0 relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-lg ring-2 ring-amber-200/50">
              <span className="text-white text-xs font-bold">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-green-400 rounded-full border-2 border-blue-900"></div>
          </div>
          {!isCollapsed && (
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-blue-300 capitalize truncate">
                {user?.role?.replace('_', ' ')} • Online
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(AdminSidebar);