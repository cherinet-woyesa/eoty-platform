import React, { useState } from 'react';
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
  Crown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isPlatformAdmin = user?.role === 'platform_admin';
  const isChapterAdmin = user?.role === 'chapter_admin';
  
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      roles: ['chapter_admin', 'platform_admin'],
      badge: null,
      description: 'Overview & metrics'
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: Users,
      roles: ['chapter_admin', 'platform_admin'],
      badge: '12',
      description: 'Manage users & roles'
    },
    {
      name: 'Content Management',
      href: '/admin/content',
      icon: FileText,
      roles: ['chapter_admin', 'platform_admin'],
      badge: '24',
      description: 'Courses & materials'
    },
    {
      name: 'Upload Queue',
      href: '/admin/uploads',
      icon: Upload,
      roles: ['chapter_admin', 'platform_admin'],
      badge: '5',
      description: 'Pending approvals'
    },
    {
      name: 'Moderation',
      href: '/admin/moderation',
      icon: Shield,
      roles: ['chapter_admin', 'platform_admin'],
      badge: '3',
      description: 'Content review'
    },
    {
      name: 'Tags & Categories',
      href: '/admin/tags',
      icon: Tag,
      roles: ['chapter_admin', 'platform_admin'],
      badge: null,
      description: 'Organize content'
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart2,
      roles: ['chapter_admin', 'platform_admin'],
      badge: 'New',
      description: 'Platform insights'
    },
    ...(isPlatformAdmin ? [{
      name: 'System Settings',
      href: '/admin/settings',
      icon: Settings,
      roles: ['platform_admin'],
      badge: null,
      description: 'Platform configuration'
    }] : [])
  ];

  const adminStats = {
    pendingApprovals: 5,
    flaggedContent: 3,
    activeUsers: 1247,
    newRegistrations: 12
  };

  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-gray-900 to-blue-900/90 border-r border-blue-700/30 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-blue-700/50 bg-gradient-to-r from-blue-800 to-purple-900">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin Panel</h1>
              <p className="text-xs text-blue-200 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-blue-200" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-blue-200" />
          )}
        </button>
      </div>
      
      {/* Quick Stats - Only show when expanded */}
      {!isCollapsed && (
        <div className="p-4 border-b border-blue-700/30 bg-blue-800/20">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-blue-700/30 rounded-lg p-2">
              <div className="flex items-center justify-center space-x-1 text-amber-300">
                <Clock className="h-3 w-3" />
                <span className="text-xs font-semibold">{adminStats.pendingApprovals}</span>
              </div>
              <div className="text-xs text-blue-200 mt-1">Pending</div>
            </div>
            <div className="bg-blue-700/30 rounded-lg p-2">
              <div className="flex items-center justify-center space-x-1 text-red-400">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs font-semibold">{adminStats.flaggedContent}</span>
              </div>
              <div className="text-xs text-blue-200 mt-1">Flagged</div>
            </div>
            <div className="bg-blue-700/30 rounded-lg p-2">
              <div className="flex items-center justify-center space-x-1 text-green-400">
                <Users className="h-3 w-3" />
                <span className="text-xs font-semibold">1.2K</span>
              </div>
              <div className="text-xs text-blue-200 mt-1">Active</div>
            </div>
            <div className="bg-blue-700/30 rounded-lg p-2">
              <div className="flex items-center justify-center space-x-1 text-purple-400">
                <Zap className="h-3 w-3" />
                <span className="text-xs font-semibold">{adminStats.newRegistrations}</span>
              </div>
              <div className="text-xs text-blue-200 mt-1">New</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 mx-2 relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white border border-transparent hover:border-blue-400/30'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-r-full shadow-lg shadow-amber-400/50" />
                )}
                
                <Icon
                  className={`flex-shrink-0 h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'text-white' : 'text-blue-300 group-hover:text-white'
                  } ${isCollapsed ? '' : 'mr-3'}`}
                />
                
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{item.name}</span>
                      {item.badge && (
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-blue-700 text-blue-200'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-blue-300/70 mt-1 truncate">
                      {item.description}
                    </p>
                  </div>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 shadow-xl border border-gray-700">
                    <div className="font-semibold">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-gray-300 mt-1">{item.description}</div>
                    )}
                    {item.badge && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                        {item.badge}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Quick Actions */}
        {!isCollapsed && (
          <div className="mt-6 mx-4 p-4 bg-blue-800/20 rounded-xl border border-blue-700/30">
            <h3 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
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
      </div>
      
      {/* User Profile */}
      <div className="border-t border-blue-700/30 p-4 bg-blue-800/20 backdrop-blur-sm">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex-shrink-0 relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-lg ring-2 ring-amber-200/50">
              <span className="text-white text-sm font-bold">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-blue-900"></div>
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

export default AdminSidebar;