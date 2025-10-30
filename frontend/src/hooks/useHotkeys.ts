import { useEffect, useRef } from 'react';

interface HotkeyConfig {
  keys: string[];
  callback: () => void;
  description?: string;
  enabled?: boolean;
}

export const useHotkeys = (hotkeys: HotkeyConfig[]) => {
  const hotkeysRef = useRef(hotkeys);

  useEffect(() => {
    hotkeysRef.current = hotkeys;
  }, [hotkeys]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = 
        activeElement?.tagName === 'INPUT' || 
        activeElement?.tagName === 'TEXTAREA' || 
        activeElement?.getAttribute('contenteditable') === 'true';

      // Don't trigger hotkeys when user is typing
      if (isInputFocused) return;

      for (const hotkey of hotkeysRef.current) {
        if (hotkey.enabled === false) continue;

        const { keys } = hotkey;
        const mainKey = keys[keys.length - 1].toLowerCase();
        const requiresCtrl = keys.includes('ctrl') || keys.includes('control');
        const requiresShift = keys.includes('shift');
        const requiresAlt = keys.includes('alt') || keys.includes('option');

        const ctrlPressed = event.ctrlKey || event.metaKey;
        const shiftPressed = event.shiftKey;
        const altPressed = event.altKey;

        if (
          event.key.toLowerCase() === mainKey &&
          ctrlPressed === requiresCtrl &&
          shiftPressed === requiresShift &&
          altPressed === requiresAlt
        ) {
          event.preventDefault();
          hotkey.callback();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};