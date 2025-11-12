/**
 * CompositorUtils - Helper functions for video compositing
 * Provides utilities for aspect ratio calculations, layout validation,
 * coordinate transformations, and smooth transitions
 */

import type { CompositorLayout, SourceLayout } from '@/types/VideoCompositor';

/**
 * Calculate aspect ratio from width and height
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns Aspect ratio as a decimal (e.g., 1.777 for 16:9)
 */
export function calculateAspectRatio(width: number, height: number): number {
  if (height === 0) {
    throw new Error('Height cannot be zero when calculating aspect ratio');
  }
  return width / height;
}

/**
 * Get common aspect ratio name from decimal value
 * @param aspectRatio - Aspect ratio as decimal
 * @returns Human-readable aspect ratio name (e.g., "16:9", "4:3")
 */
export function getAspectRatioName(aspectRatio: number): string {
  const ratios: Record<string, number> = {
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '21:9': 21 / 9,
    '1:1': 1,
    '9:16': 9 / 16
  };

  // Find closest match (within 0.01 tolerance)
  for (const [name, value] of Object.entries(ratios)) {
    if (Math.abs(aspectRatio - value) < 0.01) {
      return name;
    }
  }

  return `${aspectRatio.toFixed(2)}:1`;
}

/**
 * Calculate dimensions that fit within bounds while preserving aspect ratio
 * @param sourceWidth - Original width
 * @param sourceHeight - Original height
 * @param maxWidth - Maximum width constraint
 * @param maxHeight - Maximum height constraint
 * @returns Object with fitted width and height
 */
export function fitToAspectRatio(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (sourceWidth === 0 || sourceHeight === 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = maxWidth / maxHeight;

  let width: number;
  let height: number;

  if (sourceAspect > targetAspect) {
    // Source is wider - fit to width
    width = maxWidth;
    height = maxWidth / sourceAspect;
  } else {
    // Source is taller - fit to height
    height = maxHeight;
    width = maxHeight * sourceAspect;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

/**
 * Calculate centered position for a source within bounds
 * @param sourceWidth - Width of source to center
 * @param sourceHeight - Height of source to center
 * @param containerWidth - Width of container
 * @param containerHeight - Height of container
 * @returns Object with x and y coordinates for centered position
 */
export function centerInBounds(
  sourceWidth: number,
  sourceHeight: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: Math.round((containerWidth - sourceWidth) / 2),
    y: Math.round((containerHeight - sourceHeight) / 2)
  };
}

/**
 * Validate that a layout configuration is valid
 * Checks canvas dimensions, source positions, and boundaries
 * @param layout - Layout to validate
 * @returns Object with isValid flag and array of error messages
 */
export function validateLayout(layout: CompositorLayout): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check canvas dimensions
  if (layout.canvas.width <= 0) {
    errors.push('Canvas width must be positive');
  }
  if (layout.canvas.height <= 0) {
    errors.push('Canvas height must be positive');
  }

  // Check that at least one source is defined
  if (!layout.sources.camera && !layout.sources.screen) {
    errors.push('Layout must have at least one source (camera or screen)');
  }

  // Validate each source
  for (const [sourceId, source] of Object.entries(layout.sources)) {
    if (!source) continue;

    const prefix = `Source '${sourceId}'`;

    // Check dimensions are positive
    if (source.width <= 0) {
      errors.push(`${prefix}: width must be positive`);
    }
    if (source.height <= 0) {
      errors.push(`${prefix}: height must be positive`);
    }

    // Check position is non-negative
    if (source.x < 0) {
      errors.push(`${prefix}: x position cannot be negative`);
    }
    if (source.y < 0) {
      errors.push(`${prefix}: y position cannot be negative`);
    }

    // Check source fits within canvas bounds
    if (source.x + source.width > layout.canvas.width) {
      errors.push(`${prefix}: exceeds canvas width (x: ${source.x}, width: ${source.width}, canvas: ${layout.canvas.width})`);
    }
    if (source.y + source.height > layout.canvas.height) {
      errors.push(`${prefix}: exceeds canvas height (y: ${source.y}, height: ${source.height}, canvas: ${layout.canvas.height})`);
    }

    // Check zIndex is non-negative
    if (source.zIndex < 0) {
      errors.push(`${prefix}: zIndex cannot be negative`);
    }

    // Validate border if present
    if (source.border) {
      if (source.border.width < 0) {
        errors.push(`${prefix}: border width cannot be negative`);
      }
      if (!source.border.color) {
        errors.push(`${prefix}: border color must be specified`);
      }
    }

    // Validate borderRadius if present
    if (source.borderRadius !== undefined && source.borderRadius < 0) {
      errors.push(`${prefix}: borderRadius cannot be negative`);
    }

    // Validate shadow if present
    if (source.shadow) {
      if (source.shadow.blur < 0) {
        errors.push(`${prefix}: shadow blur cannot be negative`);
      }
      if (!source.shadow.color) {
        errors.push(`${prefix}: shadow color must be specified`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if two layouts are equal
 * @param layout1 - First layout
 * @param layout2 - Second layout
 * @returns true if layouts are equal, false otherwise
 */
export function areLayoutsEqual(layout1: CompositorLayout, layout2: CompositorLayout): boolean {
  // Compare types
  if (layout1.type !== layout2.type) {
    return false;
  }

  // Compare canvas dimensions
  if (layout1.canvas.width !== layout2.canvas.width || layout1.canvas.height !== layout2.canvas.height) {
    return false;
  }

  // Compare sources
  const sources1Keys = Object.keys(layout1.sources).sort();
  const sources2Keys = Object.keys(layout2.sources).sort();

  if (sources1Keys.length !== sources2Keys.length) {
    return false;
  }

  for (let i = 0; i < sources1Keys.length; i++) {
    if (sources1Keys[i] !== sources2Keys[i]) {
      return false;
    }

    const key = sources1Keys[i] as 'camera' | 'screen';
    const source1 = layout1.sources[key];
    const source2 = layout2.sources[key];

    if (!source1 || !source2) {
      return source1 === source2;
    }

    if (!areSourceLayoutsEqual(source1, source2)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if two source layouts are equal
 * @param source1 - First source layout
 * @param source2 - Second source layout
 * @returns true if source layouts are equal, false otherwise
 */
function areSourceLayoutsEqual(source1: SourceLayout, source2: SourceLayout): boolean {
  return (
    source1.x === source2.x &&
    source1.y === source2.y &&
    source1.width === source2.width &&
    source1.height === source2.height &&
    source1.zIndex === source2.zIndex &&
    source1.borderRadius === source2.borderRadius
  );
}

/**
 * Convert layout coordinates to integer values for pixel-perfect rendering
 * @param layout - Layout with potentially fractional coordinates
 * @returns Layout with integer coordinates
 */
export function toIntegerCoordinates(layout: SourceLayout): SourceLayout {
  return {
    x: Math.round(layout.x),
    y: Math.round(layout.y),
    width: Math.round(layout.width),
    height: Math.round(layout.height),
    zIndex: layout.zIndex,
    borderRadius: layout.borderRadius ? Math.round(layout.borderRadius) : undefined,
    border: layout.border,
    shadow: layout.shadow
  };
}

/**
 * Scale a layout by a given factor
 * Useful for resolution changes or responsive sizing
 * @param layout - Layout to scale
 * @param scaleFactor - Scale factor (e.g., 0.5 for half size, 2.0 for double size)
 * @returns Scaled layout
 */
export function scaleLayout(layout: CompositorLayout, scaleFactor: number): CompositorLayout {
  if (scaleFactor <= 0) {
    throw new Error('Scale factor must be positive');
  }

  const scaledLayout: CompositorLayout = {
    type: layout.type,
    canvas: {
      width: Math.round(layout.canvas.width * scaleFactor),
      height: Math.round(layout.canvas.height * scaleFactor)
    },
    sources: {}
  };

  for (const [sourceId, source] of Object.entries(layout.sources)) {
    if (source) {
      scaledLayout.sources[sourceId as 'camera' | 'screen'] = {
        x: Math.round(source.x * scaleFactor),
        y: Math.round(source.y * scaleFactor),
        width: Math.round(source.width * scaleFactor),
        height: Math.round(source.height * scaleFactor),
        zIndex: source.zIndex,
        borderRadius: source.borderRadius ? Math.round(source.borderRadius * scaleFactor) : undefined,
        border: source.border ? {
          width: Math.round(source.border.width * scaleFactor),
          color: source.border.color
        } : undefined,
        shadow: source.shadow
      };
    }
  }

  return scaledLayout;
}

/**
 * Interpolate between two source layouts for smooth transitions
 * @param from - Starting layout
 * @param to - Ending layout
 * @param progress - Progress value between 0 and 1
 * @returns Interpolated layout
 */
export function interpolateSourceLayout(
  from: SourceLayout,
  to: SourceLayout,
  progress: number
): SourceLayout {
  // Clamp progress between 0 and 1
  const t = Math.max(0, Math.min(1, progress));

  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    width: from.width + (to.width - from.width) * t,
    height: from.height + (to.height - from.height) * t,
    zIndex: to.zIndex,
    borderRadius: to.borderRadius,
    border: to.border,
    shadow: to.shadow
  };
}

/**
 * Interpolate between two complete layouts for smooth transitions
 * @param from - Starting layout
 * @param to - Ending layout
 * @param progress - Progress value between 0 and 1
 * @returns Interpolated layout
 */
export function interpolateLayout(
  from: CompositorLayout,
  to: CompositorLayout,
  progress: number
): CompositorLayout {
  const interpolated: CompositorLayout = {
    type: to.type,
    canvas: to.canvas,
    sources: {}
  };

  // Interpolate each source that exists in both layouts
  for (const sourceId of ['camera', 'screen'] as const) {
    const fromSource = from.sources[sourceId];
    const toSource = to.sources[sourceId];

    if (fromSource && toSource) {
      interpolated.sources[sourceId] = interpolateSourceLayout(fromSource, toSource, progress);
    } else if (toSource) {
      // Source only in target - fade in
      interpolated.sources[sourceId] = toSource;
    }
    // If source only in 'from', it will fade out (not included in result)
  }

  return interpolated;
}

/**
 * Easing function: Cubic ease-in-out
 * Provides smooth acceleration and deceleration
 * @param t - Progress value between 0 and 1
 * @returns Eased progress value
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Easing function: Quadratic ease-in-out
 * Gentler than cubic easing
 * @param t - Progress value between 0 and 1
 * @returns Eased progress value
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Easing function: Exponential ease-in-out
 * More dramatic acceleration/deceleration
 * @param t - Progress value between 0 and 1
 * @returns Eased progress value
 */
export function easeInOutExpo(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

/**
 * Easing function: Linear (no easing)
 * @param t - Progress value between 0 and 1
 * @returns Same progress value
 */
export function linear(t: number): number {
  return t;
}

/**
 * Apply easing function to progress value
 * @param progress - Progress value between 0 and 1
 * @param easingType - Type of easing to apply
 * @returns Eased progress value
 */
export function applyEasing(
  progress: number,
  easingType: 'linear' | 'ease-in-out-quad' | 'ease-in-out-cubic' | 'ease-in-out-expo' = 'ease-in-out-cubic'
): number {
  switch (easingType) {
    case 'linear':
      return linear(progress);
    case 'ease-in-out-quad':
      return easeInOutQuad(progress);
    case 'ease-in-out-cubic':
      return easeInOutCubic(progress);
    case 'ease-in-out-expo':
      return easeInOutExpo(progress);
    default:
      return easeInOutCubic(progress);
  }
}

/**
 * Calculate the area of a source layout
 * @param source - Source layout
 * @returns Area in square pixels
 */
export function calculateSourceArea(source: SourceLayout): number {
  return source.width * source.height;
}

/**
 * Calculate the percentage of canvas covered by a source
 * @param source - Source layout
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @returns Percentage (0-100)
 */
export function calculateCoveragePercentage(
  source: SourceLayout,
  canvasWidth: number,
  canvasHeight: number
): number {
  const sourceArea = calculateSourceArea(source);
  const canvasArea = canvasWidth * canvasHeight;
  return (sourceArea / canvasArea) * 100;
}

/**
 * Check if two source layouts overlap
 * @param source1 - First source layout
 * @param source2 - Second source layout
 * @returns true if sources overlap, false otherwise
 */
export function doSourcesOverlap(source1: SourceLayout, source2: SourceLayout): boolean {
  return !(
    source1.x + source1.width <= source2.x ||
    source2.x + source2.width <= source1.x ||
    source1.y + source1.height <= source2.y ||
    source2.y + source2.height <= source1.y
  );
}

/**
 * Calculate the overlap area between two sources
 * @param source1 - First source layout
 * @param source2 - Second source layout
 * @returns Overlap area in square pixels (0 if no overlap)
 */
export function calculateOverlapArea(source1: SourceLayout, source2: SourceLayout): number {
  if (!doSourcesOverlap(source1, source2)) {
    return 0;
  }

  const overlapX = Math.max(0, Math.min(source1.x + source1.width, source2.x + source2.width) - Math.max(source1.x, source2.x));
  const overlapY = Math.max(0, Math.min(source1.y + source1.height, source2.y + source2.height) - Math.max(source1.y, source2.y));

  return overlapX * overlapY;
}

/**
 * Clamp a source layout to fit within canvas bounds
 * Adjusts position and size to ensure source stays within canvas
 * @param source - Source layout to clamp
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @returns Clamped source layout
 */
export function clampToCanvas(
  source: SourceLayout,
  canvasWidth: number,
  canvasHeight: number
): SourceLayout {
  const clamped = { ...source };

  // Clamp position to non-negative
  clamped.x = Math.max(0, source.x);
  clamped.y = Math.max(0, source.y);

  // Clamp size to fit within canvas
  clamped.width = Math.min(source.width, canvasWidth - clamped.x);
  clamped.height = Math.min(source.height, canvasHeight - clamped.y);

  // Ensure dimensions are positive
  clamped.width = Math.max(1, clamped.width);
  clamped.height = Math.max(1, clamped.height);

  return clamped;
}

/**
 * Create a deep copy of a layout
 * @param layout - Layout to clone
 * @returns Deep copy of the layout
 */
export function cloneLayout(layout: CompositorLayout): CompositorLayout {
  return JSON.parse(JSON.stringify(layout));
}

/**
 * Create a deep copy of a source layout
 * @param source - Source layout to clone
 * @returns Deep copy of the source layout
 */
export function cloneSourceLayout(source: SourceLayout): SourceLayout {
  return JSON.parse(JSON.stringify(source));
}

/**
 * Merge two layouts, with the second layout taking precedence
 * @param base - Base layout
 * @param override - Override layout
 * @returns Merged layout
 */
export function mergeLayouts(base: CompositorLayout, override: Partial<CompositorLayout>): CompositorLayout {
  const merged = cloneLayout(base);

  if (override.type) {
    merged.type = override.type;
  }

  if (override.canvas) {
    merged.canvas = { ...merged.canvas, ...override.canvas };
  }

  if (override.sources) {
    merged.sources = {
      ...merged.sources,
      ...override.sources
    };
  }

  return merged;
}
