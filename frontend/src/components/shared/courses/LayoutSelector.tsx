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
  // Limit to the three requested layouts with clear labels
  const layouts: LayoutOption[] = [
    {
      type: 'picture-in-picture',
      name: 'Picture in Picture',
      icon: PictureInPicture,
      description: 'Camera overlay on screen'
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
              group relative flex items-center justify-center px-2 py-1.5 rounded-md
              transition-all duration-200
              ${isActive
                ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-700 border border-transparent'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={layout.name}
          >
            <div className="flex items-center gap-1">
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{layout.name}</span>
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