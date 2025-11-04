import { useState, useEffect, useCallback } from 'react';

/**
 * Breakpoint definitions matching Tailwind CSS defaults
 */
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Device type based on screen size
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Orientation type
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * Responsive hook return type
 */
export interface UseResponsiveReturn {
  /** Current window width */
  width: number;
  /** Current window height */
  height: number;
  /** Current device type */
  deviceType: DeviceType;
  /** Current orientation */
  orientation: Orientation;
  /** Check if current width is at or above a breakpoint */
  isAbove: (breakpoint: Breakpoint) => boolean;
  /** Check if current width is below a breakpoint */
  isBelow: (breakpoint: Breakpoint) => boolean;
  /** Check if current width is between two breakpoints */
  isBetween: (min: Breakpoint, max: Breakpoint) => boolean;
  /** Check if device is mobile (< 768px) */
  isMobile: boolean;
  /** Check if device is tablet (768px - 1024px) */
  isTablet: boolean;
  /** Check if device is desktop (>= 1024px) */
  isDesktop: boolean;
  /** Check if orientation is portrait */
  isPortrait: boolean;
  /** Check if orientation is landscape */
  isLandscape: boolean;
}

/**
 * Get device type based on width
 */
const getDeviceType = (width: number): DeviceType => {
  if (width < breakpoints.md) return 'mobile';
  if (width < breakpoints.lg) return 'tablet';
  return 'desktop';
};

/**
 * Get orientation based on dimensions
 */
const getOrientation = (width: number, height: number): Orientation => {
  return height > width ? 'portrait' : 'landscape';
};

/**
 * Custom hook for responsive breakpoint detection and device information
 * @param debounceMs - Debounce delay for resize events (default: 150ms)
 * @returns Responsive state and utility functions
 */
export function useResponsive(debounceMs: number = 150): UseResponsiveReturn {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const [deviceType, setDeviceType] = useState<DeviceType>(
    getDeviceType(windowSize.width)
  );

  const [orientation, setOrientation] = useState<Orientation>(
    getOrientation(windowSize.width, windowSize.height)
  );

  /**
   * Handle window resize with debouncing
   */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        setWindowSize({
          width: newWidth,
          height: newHeight,
        });
        
        setDeviceType(getDeviceType(newWidth));
        setOrientation(getOrientation(newWidth, newHeight));
      }, debounceMs);
    };

    window.addEventListener('resize', handleResize);
    
    // Initial call to set correct values
    handleResize();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [debounceMs]);

  /**
   * Check if current width is at or above a breakpoint
   */
  const isAbove = useCallback(
    (breakpoint: Breakpoint): boolean => {
      return windowSize.width >= breakpoints[breakpoint];
    },
    [windowSize.width]
  );

  /**
   * Check if current width is below a breakpoint
   */
  const isBelow = useCallback(
    (breakpoint: Breakpoint): boolean => {
      return windowSize.width < breakpoints[breakpoint];
    },
    [windowSize.width]
  );

  /**
   * Check if current width is between two breakpoints
   */
  const isBetween = useCallback(
    (min: Breakpoint, max: Breakpoint): boolean => {
      return (
        windowSize.width >= breakpoints[min] &&
        windowSize.width < breakpoints[max]
      );
    },
    [windowSize.width]
  );

  return {
    width: windowSize.width,
    height: windowSize.height,
    deviceType,
    orientation,
    isAbove,
    isBelow,
    isBetween,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  };
}

/**
 * Hook to check if a specific breakpoint is active
 * @param breakpoint - The breakpoint to check
 * @returns Boolean indicating if breakpoint is active
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const { isAbove } = useResponsive();
  return isAbove(breakpoint);
}

/**
 * Hook to get current device type only
 * @returns Current device type
 */
export function useDeviceType(): DeviceType {
  const { deviceType } = useResponsive();
  return deviceType;
}
