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
    <div className="flex flex-wrap gap-1">
      {layouts.map(layout => {
        const Icon = layout.icon;
        const isActive = currentLayout === layout.type;
        
        return (
          <button
            key={layout.type}
            onClick={() => !disabled && onLayoutChange(layout.type)}
            disabled={disabled}
            className={`
              group relative flex items-center justify-center p-1.5 rounded-md
              transition-all duration-200
              ${isActive
                ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
                : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-transparent'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={layout.name}
          >
            <Icon className="w-4 h-4" />
            
            {/* Hover preview tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {layout.name}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          </button>
        );
      })}
      
      {/* Compositing indicator */}
      {isCompositing && (
        <div className="flex items-center justify-center p-1.5 bg-green-50 text-green-600 rounded-md" title="Live Composite Active">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default LayoutSelector;