import type { CompositorLayout, LayoutType } from '../types/VideoCompositor';

/**
 * Predefined layout configurations for video compositing
 * Supports picture-in-picture (4 corner positions), side-by-side, presentation, and single-source layouts
 */

// Canvas dimensions (1920x1080 - Full HD)
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

// Picture-in-picture camera dimensions
const PIP_CAMERA_WIDTH = 300;
const PIP_CAMERA_HEIGHT = 200;
const PIP_PADDING = 20;

/**
 * Picture-in-Picture Layout - Bottom Right (Default)
 * Screen fills entire canvas, camera overlays in bottom-right corner
 */
export const LAYOUT_PIP_BOTTOM_RIGHT: CompositorLayout = {
  type: 'picture-in-picture',
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  sources: {
    screen: {
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      zIndex: 0
    },
    camera: {
      x: CANVAS_WIDTH - PIP_CAMERA_WIDTH - PIP_PADDING,
      y: CANVAS_HEIGHT - PIP_CAMERA_HEIGHT - PIP_PADDING,
      width: PIP_CAMERA_WIDTH,
      height: PIP_CAMERA_HEIGHT,
      zIndex: 1,
      borderRadius: 8,
      border: { width: 3, color: '#ffffff' },
      shadow: { blur: 10, color: 'rgba(0,0,0,0.3)', offsetX: 0, offsetY: 2 }
    }
  }
};

/**
 * Picture-in-Picture Layout - Bottom Left
 * Screen fills entire canvas, camera overlays in bottom-left corner
 */
export const LAYOUT_PIP_BOTTOM_LEFT: CompositorLayout = {
  type: 'picture-in-picture',
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  sources: {
    screen: {
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      zIndex: 0
    },
    camera: {
      x: PIP_PADDING,
      y: CANVAS_HEIGHT - PIP_CAMERA_HEIGHT - PIP_PADDING,
      width: PIP_CAMERA_WIDTH,
      height: PIP_CAMERA_HEIGHT,
      zIndex: 1,
      borderRadius: 8,
      border: { width: 3, color: '#ffffff' },
      shadow: { blur: 10, color: 'rgba(0,0,0,0.3)', offsetX: 0, offsetY: 2 }
    }
  }
};

/**
 * Picture-in-Picture Layout - Top Right
 * Screen fills entire canvas, camera overlays in top-right corner
 */
export const LAYOUT_PIP_TOP_RIGHT: CompositorLayout = {
  type: 'picture-in-picture',
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  sources: {
    screen: {
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      zIndex: 0
    },
    camera: {
      x: CANVAS_WIDTH - PIP_CAMERA_WIDTH - PIP_PADDING,
      y: PIP_PADDING,
      width: PIP_CAMERA_WIDTH,
      height: PIP_CAMERA_HEIGHT,
      zIndex: 1,
      borderRadius: 8,
      border: { width: 3, color: '#ffffff' },
      shadow: { blur: 10, color: 'rgba(0,0,0,0.3)', offsetX: 0, offsetY: 2 }
    }
  }
};

/**
 * Picture-in-Picture Layout - Top Left
 * Screen fills entire canvas, camera overlays in top-left corner
 */
export const LAYOUT_PIP_TOP_LEFT: CompositorLayout = {
  type: 'picture-in-picture',
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  sources: {
    screen: {
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      zIndex: 0
    },
    camera: {
      x: PIP_PADDING,
      y: PIP_PADDING,
      width: PIP_CAMERA_WIDTH,
      height: PIP_CAMERA_HEIGHT,
      zIndex: 1,
      borderRadius: 8,
      border: { width: 3, color: '#ffffff' },
      shadow: { blur: 10, color: 'rgba(0,0,0,0.3)', offsetX: 0, offsetY: 2 }
    }
  }
};

/**
 * Side-by-Side Layout
 * Screen and camera split equally (50/50)
 */
export const LAYOUT_SIDE_BY_SIDE: CompositorLayout = {
  type: 'side-by-side',
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  sources: {
    screen: {
      x: 0,
      y: 0,
      width: CANVAS_WIDTH / 2,
      height: CANVAS_HEIGHT,
      zIndex: 0
    },
    camera: {
      x: CANVAS_WIDTH / 2,
      y: 0,
      width: CANVAS_WIDTH / 2,
      height: CANVAS_HEIGHT,
      zIndex: 0
    }
  }
};

/**
 * Presentation Layout
 * Screen takes 80% (left), camera takes 20% (right)
 */
export const LAYOUT_PRESENTATION: CompositorLayout = {
  type: 'presentation',
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  sources: {
    screen: {
      x: 0,
      y: 0,
      width: Math.floor(CANVAS_WIDTH * 0.8),
      height: CANVAS_HEIGHT,
      zIndex: 0
    },
    camera: {
      x: Math.floor(CANVAS_WIDTH * 0.8),
      y: 0,
      width: Math.floor(CANVAS_WIDTH * 0.2),
      height: CANVAS_HEIGHT,
      zIndex: 0
    }
  }
};

/**
 * Screen-Only Layout
 * Only screen is visible, camera is hidden
 */
export const LAYOUT_SCREEN_ONLY: CompositorLayout = {
  type: 'screen-only',
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  sources: {
    screen: {
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      zIndex: 0
    }
  }
};

/**
 * Camera-Only Layout
 * Only camera is visible, screen is hidden
 */
export const LAYOUT_CAMERA_ONLY: CompositorLayout = {
  type: 'camera-only',
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  sources: {
    camera: {
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      zIndex: 0
    }
  }
};

/**
 * Map of all available layouts by type
 */
export const LAYOUTS: Record<LayoutType, CompositorLayout> = {
  'picture-in-picture': LAYOUT_PIP_BOTTOM_RIGHT,
  'side-by-side': LAYOUT_SIDE_BY_SIDE,
  'presentation': LAYOUT_PRESENTATION,
  'screen-only': LAYOUT_SCREEN_ONLY,
  'camera-only': LAYOUT_CAMERA_ONLY
};

/**
 * Map of picture-in-picture corner positions
 */
export const PIP_POSITIONS = {
  'bottom-right': LAYOUT_PIP_BOTTOM_RIGHT,
  'bottom-left': LAYOUT_PIP_BOTTOM_LEFT,
  'top-right': LAYOUT_PIP_TOP_RIGHT,
  'top-left': LAYOUT_PIP_TOP_LEFT
};

/**
 * Validates a layout configuration
 * @param layout - The layout to validate
 * @returns true if valid, false otherwise
 */
export function validateLayout(layout: CompositorLayout): boolean {
  // Check canvas dimensions
  if (layout.canvas.width <= 0 || layout.canvas.height <= 0) {
    return false;
  }

  // Check that at least one source is defined
  if (!layout.sources.camera && !layout.sources.screen) {
    return false;
  }

  // Validate each source
  for (const source of Object.values(layout.sources)) {
    if (!source) continue;

    // Check dimensions are positive
    if (source.width <= 0 || source.height <= 0) {
      return false;
    }

    // Check position is within canvas bounds
    if (source.x < 0 || source.y < 0) {
      return false;
    }

    if (source.x + source.width > layout.canvas.width) {
      return false;
    }

    if (source.y + source.height > layout.canvas.height) {
      return false;
    }

    // Check zIndex is non-negative
    if (source.zIndex < 0) {
      return false;
    }

    // Validate border if present
    if (source.border && source.border.width < 0) {
      return false;
    }

    // Validate borderRadius if present
    if (source.borderRadius !== undefined && source.borderRadius < 0) {
      return false;
    }
  }

  return true;
}

/**
 * Gets a layout by type
 * @param type - The layout type
 * @returns The layout configuration
 */
export function getLayoutByType(type: LayoutType): CompositorLayout {
  return LAYOUTS[type];
}

/**
 * Gets all available layout types
 * @returns Array of layout types
 */
export function getAvailableLayoutTypes(): LayoutType[] {
  return Object.keys(LAYOUTS) as LayoutType[];
}
