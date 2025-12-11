import React, { useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Star,
  Clock,
  Home
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SidebarItem from './SidebarItem';
import SidebarSearch from './SidebarSearch';
import FavoriteItems from './FavoriteItems';
import RecentItems from './RecentItems';
import { brandColors } from '@/theme/brand';

import { useSidebar } from '@/hooks/useSidebar';

interface BaseSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number | null;
  description?: string;
  color?: string;
  roles?: string[];
  children?: NavigationItem[];
  isFavorite?: boolean;
}

const BaseSidebar: React.FC<BaseSidebarProps> = ({ 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const { favoriteHrefs, recentHrefs, toggleFavorite, addRecent, isFavorite } = useSidebar();

  // Base navigation items available to all roles
  const baseNavigationItems: NavigationItem[] = useMemo(() => [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="h-4 w-4" />,
      badge: null,
      description: 'Overview and metrics',
      color: 'text-blue-600'
    }
  ], []);

  // Role-specific navigation items
  const roleNavigationItems: NavigationItem[] = useMemo(() => {
    const items: NavigationItem[] = [];
    
    // Base members (user/legacy student)
    if (user?.role === 'user' || user?.role === 'student') {
      items.push(
        {
          name: 'My Courses',
          href: '/courses',
          icon: <span>📚</span>,
          badge: '5',
          description: 'Continue learning',
          color: 'text-green-600',
          roles: ['user', 'student']
        },
        {
          name: 'Bookmarks',
          href: '/bookmarks',
          icon: <Star className="h-4 w-4" />,
          badge: '12',
          description: 'Saved lessons',
          color: 'text-yellow-600',
          roles: ['user', 'student']
        },
        {
          name: 'Study Schedule',
          href: '/schedule',
          icon: <Clock className="h-4 w-4" />,
          badge: null,
          description: 'Plan your study',
          color: 'text-purple-600',
          roles: ['user', 'student']
        }
      );
    }

    if (user?.role === 'teacher' || user?.role === 'admin') {
      items.push(
        {
          name: 'My Courses',
          href: '/courses',
          icon: <span>📚</span>,
          badge: '8',
          description: 'Manage courses',
          color: 'text-green-600',
          roles: ['teacher', 'admin']
        },
        {
          name: 'Record Video',
          href: '/record',
          icon: <span>🎥</span>,
          badge: null,
          description: 'Create lessons',
          color: 'text-red-600',
          roles: ['teacher', 'admin']
        },
        {
          name: 'Students',
          href: '/students',
          icon: <span>👥</span>,
          badge: '247',
          description: 'Manage learners',
          color: 'text-indigo-600',
          roles: ['teacher', 'admin']
        }
      );
    }

    if (user?.role === 'admin') {
      items.push(
        {
          name: 'Analytics',
          href: '/analytics',
          icon: <span>📊</span>,
          badge: null,
          description: 'View reports',
          color: 'text-orange-600',
          roles: ['admin']
        },
        {
          name: 'User Management',
          href: '/admin/users',
          icon: <span>👤</span>,
          badge: '12',
          description: 'Manage users',
          color: 'text-blue-600',
          roles: ['admin']
        }
      );
    }

    // Common items for all roles
    items.push(
      {
        name: 'Discussions',
        href: '/forums',
        icon: <span>💬</span>,
        badge: '12',
        description: 'Community forums',
        color: 'text-pink-600'
      },
      {
        name: 'Achievements',
        href: '/achievements',
        icon: <span>🏆</span>,
        badge: '5',
        description: 'View badges',
        color: 'text-orange-600'
      },
      {
        name: 'AI Assistant',
        href: '/ai-assistant',
        icon: <span>🤖</span>,
        badge: 'AI',
        description: 'Get help',
        color: 'text-cyan-600'
      }
    );

    return items;
  }, [user?.role]);

  // Combine and filter navigation items based on user role
  const navigationItems = useMemo(() => {
    const allItems = [...baseNavigationItems, ...roleNavigationItems];
    return allItems.filter(item => 
      !item.roles || item.roles.includes(user?.role || '')
    ).map(item => ({
      ...item,
      isFavorite: isFavorite(item.href)
    }));
  }, [baseNavigationItems, roleNavigationItems, user?.role, isFavorite]);

  // Reconstruct favorites from IDs
  const favorites = useMemo(() => {
    return favoriteHrefs
      .map(href => navigationItems.find(item => item.href === href))
      .filter((item): item is NavigationItem => item !== undefined);
  }, [navigationItems, favoriteHrefs]);

  // Reconstruct recent items from IDs
  const recentItems = useMemo(() => {
    return recentHrefs
      .map(href => navigationItems.find(item => item.href === href))
      .filter((item): item is NavigationItem => item !== undefined);
  }, [navigationItems, recentHrefs]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return navigationItems;
    
    const query = searchQuery.toLowerCase();
    return navigationItems.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.href.toLowerCase().includes(query)
    );
  }, [navigationItems, searchQuery]);

  const handleItemClick = useCallback((item: NavigationItem) => {
    addRecent(item.href);
  }, [addRecent]);

  const handleFavoriteToggle = useCallback((item: NavigationItem, isFavorite: boolean) => {
    toggleFavorite(item.href);
  }, [toggleFavorite]);

  const hasFavorites = favorites.length > 0;
  const hasRecentItems = recentItems.length > 0;

  return (
    <div 
      className={`flex flex-col h-full border-r border-slate-200 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      style={{ backgroundColor: brandColors.primaryHex }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between h-12 px-3 border-b border-slate-200 bg-white"
      >
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/eoc.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-sm font-bold text-slate-900">EOTY Platform</h1>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md hover:bg-slate-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-slate-500" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-slate-500" />
          )}
        </button>
      </div>

      {/* Search Bar - Only show when expanded */}
      {!isCollapsed && (
        <div className="p-3 border-b border-white/10">
          <SidebarSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search navigation..."
          />
        </div>
      )}

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Favorites Section */}
        {!isCollapsed && hasFavorites && (
          <div className="mb-4">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Favorites
              </h3>
            </div>
            <FavoriteItems
              favorites={favorites}
              isCollapsed={isCollapsed}
              onItemClick={handleItemClick}
              onFavoriteToggle={handleFavoriteToggle}
            />
          </div>
        )}

        {/* Recent Items Section */}
        {!isCollapsed && hasRecentItems && searchQuery === '' && (
          <div className="mb-4">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Recent
              </h3>
            </div>
            <RecentItems
              items={recentItems}
              isCollapsed={isCollapsed}
              onItemClick={handleItemClick}
            />
          </div>
        )}

        {/* Main Navigation */}
        <nav className="space-y-1 px-2">
          {(searchQuery ? filteredItems : navigationItems).map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
              isActive={location.pathname === item.href}
              onItemClick={() => handleItemClick(item)}
              onFavoriteToggle={(isFavorite) => handleFavoriteToggle(item, isFavorite)}
            />
          ))}
        </nav>

        {/* Empty Search State */}
        {searchQuery && filteredItems.length === 0 && (
          <div className="px-3 py-8 text-center">
            <Search className="h-8 w-8 text-white/30 mx-auto mb-2" />
            <p className="text-sm text-white/70">No results found</p>
            <p className="text-xs text-white/50 mt-1">
              Try searching with different terms
            </p>
          </div>
        )}
      </div>

      {/* User Profile & Quick Stats */}
      {!isCollapsed && (
        <div className="p-3 border-t border-white/10 bg-white/10 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-md ring-2 ring-white/20">
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-white/70 capitalize truncate">
                {user?.role}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-white/70">Online</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(BaseSidebar);