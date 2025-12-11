import React from 'react';
import { Clock } from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  color?: string;
}

interface RecentItemsProps {
  items: NavigationItem[];
  isCollapsed: boolean;
  onItemClick: (item: NavigationItem) => void;
}

const RecentItems: React.FC<RecentItemsProps> = ({
  items,
  isCollapsed,
  onItemClick
}) => {
  if (isCollapsed) {
    return (
      <div className="space-y-1 px-2">
        {items.slice(0, 3).map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={() => onItemClick(item)}
            className="flex items-center justify-center p-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white transition-colors duration-200 group relative"
            title={item.name}
          >
            <div className="text-white group-hover:text-white">
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
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={() => onItemClick(item)}
          className="flex items-center px-2 py-2 text-sm rounded-lg text-white/90 hover:bg-white/10 hover:text-white transition-colors duration-200 group"
        >
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-white/50">
            <Clock className="h-3 w-3" />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <span className="truncate font-medium">{item.name}</span>
            {item.description && (
              <p className="text-xs text-white/50 truncate mt-0.5">
                {item.description}
              </p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
};

export default React.memo(RecentItems);