import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, ChevronRight } from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number | null;
  description?: string;
  color?: string;
  isFavorite?: boolean;
  children?: NavigationItem[];
}

interface SidebarItemProps {
  item: NavigationItem;
  isCollapsed: boolean;
  isActive: boolean;
  onItemClick: () => void;
  onFavoriteToggle: (isFavorite: boolean) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  isCollapsed,
  isActive,
  onItemClick,
  onFavoriteToggle
}) => {
  const hasChildren = item.children && item.children.length > 0;

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle(!item.isFavorite);
  }, [item.isFavorite, onFavoriteToggle]);

  const handleItemClick = useCallback(() => {
    onItemClick();
  }, [onItemClick]);

  return (
    <div className="group relative">
      <Link
        to={item.href}
        onClick={handleItemClick}
        className={`flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200/50'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        } ${hasChildren ? 'pr-8' : ''}`}
        title={isCollapsed ? item.description : undefined}
      >
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
          isActive ? 'bg-blue-200' : 'bg-gray-100 group-hover:bg-gray-200'
        } transition-colors duration-200`}>
          <div className={item.color || 'text-gray-600'}>
            {item.icon}
          </div>
        </div>
        
        {/* Content - Only show when expanded */}
        {!isCollapsed && (
          <div className="ml-3 flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="truncate font-medium">{item.name}</span>
              <div className="flex items-center space-x-2">
                {item.badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {item.badge}
                  </span>
                )}
                {/* Favorite Star */}
                <button
                  onClick={handleFavoriteClick}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-white/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={`h-3 w-3 ${
                      item.isFavorite 
                        ? 'text-yellow-500 fill-current' 
                        : 'text-gray-400'
                    }`}
                  />
                </button>
              </div>
            </div>
            {item.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {item.description}
              </p>
            )}
          </div>
        )}

        {/* Collapsed state tooltip */}
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

        {/* Expand indicator for items with children */}
        {hasChildren && !isCollapsed && (
          <ChevronRight className="h-4 w-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2" />
        )}
      </Link>

      {/* Nested children - Only show when expanded and active */}
      {hasChildren && !isCollapsed && isActive && (
        <div className="ml-8 mt-1 space-y-1">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              to={child.href}
              className="flex items-center px-2 py-1.5 text-xs rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {child.icon}
              </div>
              <span className="ml-2 truncate">{child.name}</span>
              {child.badge && (
                <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                  {child.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(SidebarItem);