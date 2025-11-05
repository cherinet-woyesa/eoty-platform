import { useEffect, useRef, useState } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  interval?: number; // milliseconds
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  saveNow: () => Promise<void>;
}

/**
 * Custom hook for auto-saving data at regular intervals
 * @param options - Configuration options
 * @returns Auto-save state and methods
 */
export function useAutoSave<T>({
  data,
  onSave,
  interval = 30000, // 30 seconds default
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const dataRef = useRef<T>(data);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const saveNow = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(dataRef.current);
      setLastSaved(new Date());
    } catch (err) {
      setError(err as Error);
      console.error('Auto-save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Set up auto-save interval
    timerRef.current = setInterval(() => {
      saveNow();
    }, interval);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, interval]);

  return {
    isSaving,
    lastSaved,
    error,
    saveNow,
  };
}
