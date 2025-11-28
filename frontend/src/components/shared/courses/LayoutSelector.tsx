// frontend/src/components/courses/LayoutSelector.tsx
import type { FC } from 'react';
import { 
  PictureInPicture, 
  Split, 
  Monitor, 
  Camera,
  Presentation
} from 'lucide-react';
import type { LayoutType } from '@/types/VideoCompositor';

interface LayoutOption {
  type: LayoutType;
  name: string;
  icon: typeof PictureInPicture;
  description: string;
}

interface LayoutSelectorProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  disabled?: boolean;
  isCompositing: boolean;
}

const LayoutSelector: FC<LayoutSelectorProps> = ({
  currentLayout,
  onLayoutChange,
  disabled = false,
  isCompositing
}) => {
  const layouts: LayoutOption[] = [
    {
      type: 'picture-in-picture',
      name: 'Picture-in-Picture',
      icon: PictureInPicture,
      description: 'Camera overlay on screen'
    },
    {
      type: 'side-by-side',
      name: 'Side by Side',
      icon: Split,
      description: 'Equal split view'
    },
    {
      type: 'presentation',
      name: 'Presentation',
      icon: Presentation,
      description: 'Large screen, small camera'
    },
    {
      type: 'screen-only',
      name: 'Screen Only',
      icon: Monitor,
      description: 'Hide camera'
    },
    {
      type: 'camera-only',
      name: 'Camera Only',
      icon: Camera,
      description: 'Hide screen'
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {layouts.map(layout => {
        const Icon = layout.icon;
        const isActive = currentLayout === layout.type;
        
        return (
          <button
            key={layout.type}
            onClick={() => !disabled && onLayoutChange(layout.type)}
            disabled={disabled}
            className={`
              group relative flex items-center gap-2 px-4 py-2 rounded-lg
              transition-all duration-200
              ${isActive
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={layout.description}
          >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-medium">{layout.name}</span>
            
            {/* Hover preview tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {layout.description}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          </button>
        );
      })}
      
      {/* Compositing indicator */}
      {isCompositing && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Live Composite</span>
        </div>
      )}
    </div>
  );
};

export default LayoutSelector;