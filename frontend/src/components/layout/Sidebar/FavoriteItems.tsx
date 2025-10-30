import React, { useCallback } from 'react';
import { Star, Link } from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  color?: string;
}

interface FavoriteItemsProps {
  favorites: NavigationItem[];
  isCollapsed: boolean;
  onItemClick: (item: NavigationItem) => void;
  onFavoriteToggle: (item: NavigationItem, isFavorite: boolean) => void;
}

const FavoriteItems: React.FC<FavoriteItemsProps> = ({
  favorites,
  isCollapsed,
  onItemClick,
  onFavoriteToggle
}) => {
  const handleFavoriteClick = useCallback((e: React.MouseEvent, item: NavigationItem) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle(item, false);
  }, [onFavoriteToggle]);

  if (isCollapsed) {
    return (
      <div className="space-y-1 px-2">
        {favorites.slice(0, 3).map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={() => onItemClick(item)}
            className="flex items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200 group relative"
            title={item.name}
          >
            <div className="text-gray-600 group-hover:text-gray-900">
              {item.icon}
            </div>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              {item.name}
            </div>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2">
      {favorites.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={() => onItemClick(item)}
          className="flex items-center px-2 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200 group"
        >
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-yellow-500">
            <Star className="h-3 w-3 fill-current" />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="truncate font-medium">{item.name}</span>
              <button
                onClick={(e) => handleFavoriteClick(e, item)}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-white/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Remove from favorites"
              >
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              </button>
            </div>
            {item.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {item.description}
              </p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
};

export default React.memo(FavoriteItems);