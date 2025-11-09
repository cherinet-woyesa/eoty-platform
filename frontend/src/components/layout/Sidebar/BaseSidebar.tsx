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
import { useAuth } from '../../../context/AuthContext';
import SidebarItem from './SidebarItem';
import SidebarSearch from './SidebarSearch';
import FavoriteItems from './FavoriteItems';
import RecentItems from './RecentItems';

import { useSidebar } from '../../../hooks/useSidebar';

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
  const { favorites, recentItems, addFavorite, removeFavorite, addRecent } = useSidebar();

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
    
    if (user?.role === 'student') {
      items.push(
        {
          name: 'My Courses',
          href: '/courses',
          icon: <span>📚</span>,
          badge: '5',
          description: 'Continue learning',
          color: 'text-green-600',
          roles: ['student']
        },
        {
          name: 'Bookmarks',
          href: '/bookmarks',
          icon: <Star className="h-4 w-4" />,
          badge: '12',
          description: 'Saved lessons',
          color: 'text-yellow-600',
          roles: ['student']
        },
        {
          name: 'Study Schedule',
          href: '/schedule',
          icon: <Clock className="h-4 w-4" />,
          badge: null,
          description: 'Plan your study',
          color: 'text-purple-600',
          roles: ['student']
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
      isFavorite: favorites.some(fav => fav.href === item.href)
    }));
  }, [baseNavigationItems, roleNavigationItems, user?.role, favorites]);

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
    addRecent(item);
  }, [addRecent]);

  const handleFavoriteToggle = useCallback((item: NavigationItem, isFavorite: boolean) => {
    if (isFavorite) {
      addFavorite(item);
    } else {
      removeFavorite(item.href);
    }
  }, [addFavorite, removeFavorite]);

  const hasFavorites = favorites.length > 0;
  const hasRecentItems = recentItems.length > 0;

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-white to-blue-50/30 border-r border-gray-200/60 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-blue-200/50 bg-gradient-to-r from-blue-600 to-indigo-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">E</span>
            </div>
            <h1 className="text-sm font-bold text-white">EOTY Platform</h1>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-white" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-white" />
          )}
        </button>
      </div>

      {/* Search Bar - Only show when expanded */}
      {!isCollapsed && (
        <div className="p-3 border-b border-gray-200/50">
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
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
            <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No results found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try searching with different terms
            </p>
          </div>
        )}
      </div>

      {/* User Profile & Quick Stats */}
      {!isCollapsed && (
        <div className="p-3 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-md ring-2 ring-white">
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-600 capitalize truncate">
                {user?.role}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500">Online</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(BaseSidebar);