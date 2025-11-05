import { useEffect } from 'react';

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  message?: string;
}

/**
 * Custom hook to warn users about unsaved changes before navigation
 * @param options - Configuration options
 * 
 * Note: This simplified version only warns on browser close/refresh.
 * For in-app navigation blocking, you would need to use createBrowserRouter
 * with useBlocker instead of BrowserRouter.
 */
export function useUnsavedChanges({
  hasUnsavedChanges,
  message = 'You have unsaved changes. Are you sure you want to leave?',
}: UseUnsavedChangesOptions) {
  // Warn on browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);
}
