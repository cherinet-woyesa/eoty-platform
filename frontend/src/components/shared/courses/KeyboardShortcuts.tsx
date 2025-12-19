// frontend/src/components/courses/KeyboardShortcuts.tsx
import { useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { Keyboard } from 'lucide-react';
import type { LayoutType } from '@/types/VideoCompositor';

interface KeyboardShortcutsProps {
  isRecording: boolean;
  isPaused: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
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
  onStartRecording,
  onStopRecording,
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

      case 'r': // R - Start Recording
        if (!isRecording) {
          event.preventDefault();
          onStartRecording();
        }
        break;

      case 'escape': // Esc - Stop Recording
        if (isRecording) {
          event.preventDefault();
          onStopRecording();
        }
        break;

      /* 
      // Removed less important shortcuts per user request
      case 's': // S - Toggle screen share
        event.preventDefault();
        onToggleScreen();
        break;

      case 'l': // L - Cycle through layouts
        event.preventDefault();
        onCycleLayout();
        break;
      */

      default:
        // No action for other keys
        break;
    }
  }, [
    isRecording,
    disabled,
    onStartRecording,
    onStopRecording,
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
      key: 'R',
      description: 'Start Recording',
      condition: !isRecording ? 'visible' : 'hidden'
    },
    {
      key: 'Space',
      description: isPaused ? 'Resume Recording' : 'Pause Recording',
      condition: isRecording ? 'visible' : 'hidden'
    },
    {
      key: 'Esc',
      description: 'Stop Recording',
      condition: isRecording ? 'visible' : 'hidden'
    }
  ];

  // Filter visible shortcuts
  const visibleShortcuts = shortcuts.filter(s => s.condition !== 'hidden');

  if (visibleShortcuts.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Keyboard className="h-5 w-5 text-indigo-600" />
        <h4 className="font-semibold text-gray-900">Keyboard Shortcuts</h4>
      </div>
      
      <div className="space-y-2">
        {visibleShortcuts.map((shortcut, index) => (
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
