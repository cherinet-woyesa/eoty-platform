// frontend/src/components/courses/KeyboardShortcuts.tsx
import { useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { Keyboard } from 'lucide-react';
import type { LayoutType } from '../../types/VideoCompositor';

interface KeyboardShortcutsProps {
  isRecording: boolean;
  isPaused: boolean;
  onPauseResume: () => void;
  onToggleScreen: () => void;
  onCycleLayout: () => void;
  onSelectLayout: (layout: LayoutType) => void;
  disabled?: boolean;
}

interface ShortcutHint {
  key: string;
  description: string;
  condition?: string;
}

const KeyboardShortcuts: FC<KeyboardShortcutsProps> = ({
  isRecording,
  isPaused,
  onPauseResume,
  onToggleScreen,
  onCycleLayout,
  onSelectLayout,
  disabled = false
}) => {
  // Layout mapping for number keys
  const layoutMap: Record<string, LayoutType> = {
    '1': 'picture-in-picture',
    '2': 'side-by-side',
    '3': 'presentation',
    '4': 'screen-only',
    '5': 'camera-only'
  };

  // Handle keyboard events
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts if user is typing in an input field
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      disabled
    ) {
      return;
    }

    // Prevent default for our shortcuts
    const key = event.key.toLowerCase();
    
    switch (key) {
      case ' ': // Space - Pause/Resume
        if (isRecording) {
          event.preventDefault();
          onPauseResume();
        }
        break;

      case 's': // S - Toggle screen share
        event.preventDefault();
        onToggleScreen();
        break;

      case 'l': // L - Cycle through layouts
        event.preventDefault();
        onCycleLayout();
        break;

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        // Number keys - Direct layout selection
        event.preventDefault();
        const layout = layoutMap[key];
        if (layout) {
          onSelectLayout(layout);
        }
        break;

      default:
        // No action for other keys
        break;
    }
  }, [
    isRecording,
    disabled,
    onPauseResume,
    onToggleScreen,
    onCycleLayout,
    onSelectLayout,
    layoutMap
  ]);

  // Register keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Shortcut hints
  const shortcuts: ShortcutHint[] = [
    {
      key: 'Space',
      description: isPaused ? 'Resume recording' : 'Pause recording',
      condition: isRecording ? undefined : 'Only during recording'
    },
    {
      key: 'S',
      description: 'Toggle screen sharing'
    },
    {
      key: 'L',
      description: 'Cycle through layouts'
    },
    {
      key: '1',
      description: 'Picture-in-Picture layout'
    },
    {
      key: '2',
      description: 'Side-by-Side layout'
    },
    {
      key: '3',
      description: 'Presentation layout'
    },
    {
      key: '4',
      description: 'Screen-Only layout'
    },
    {
      key: '5',
      description: 'Camera-Only layout'
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Keyboard className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-gray-900">Keyboard Shortcuts</h4>
      </div>
      
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono font-semibold text-gray-700 shadow-sm">
                {shortcut.key}
              </kbd>
              <span className="text-gray-600">{shortcut.description}</span>
            </div>
            
            {shortcut.condition && (
              <span className="text-xs text-gray-400 italic">
                {shortcut.condition}
              </span>
            )}
          </div>
        ))}
      </div>

      {disabled && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 italic">
            Keyboard shortcuts are currently disabled
          </p>
        </div>
      )}
    </div>
  );
};

export default KeyboardShortcuts;
