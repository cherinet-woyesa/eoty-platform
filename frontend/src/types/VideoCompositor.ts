/**
 * TypeScript type definitions for VideoCompositor
 * 
 * This module provides comprehensive type definitions for the video compositing system,
 * including layouts, configurations, performance metrics, and state management.
 * 
 * @module VideoCompositor
 */

/**
 * Available layout types for video compositing
 * 
 * - `picture-in-picture`: Screen fills canvas, camera overlays in corner
 * - `side-by-side`: Screen and camera split equally (50/50)
 * - `screen-only`: Only screen is visible
 * - `camera-only`: Only camera is visible
 * - `presentation`: Screen takes 80%, camera takes 20%
 */
export type LayoutType = 
  | 'picture-in-picture'
  | 'side-by-side'
  | 'screen-only'
  | 'camera-only'
  | 'presentation';

/**
 * Picture-in-picture corner position options
 */
export type PipPosition = 
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Quality levels for adaptive performance
 */
export type QualityLevel = 'high' | 'medium' | 'low';

/**
 * Easing function types for smooth transitions
 */
export type EasingType = 
  | 'linear'
  | 'ease-in-out-quad'
  | 'ease-in-out-cubic'
  | 'ease-in-out-expo';

/**
 * Border configuration for video sources
 */
export interface BorderConfig {
  /** Border width in pixels */
  width: number;
  /** Border color (CSS color string) */
  color: string;
}

/**
 * Shadow configuration for video sources
 */
export interface ShadowConfig {
  /** Shadow blur radius in pixels */
  blur: number;
  /** Shadow color (CSS color string with alpha) */
  color: string;
  /** Horizontal shadow offset in pixels */
  offsetX: number;
  /** Vertical shadow offset in pixels */
  offsetY: number;
}

/**
 * Layout configuration for a single video source
 * 
 * Defines the position, size, and visual styling of a video source
 * within the compositor canvas.
 */
export interface SourceLayout {
  /** X coordinate (left edge) in pixels */
  x: number;
  /** Y coordinate (top edge) in pixels */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Z-index for layering (higher values appear on top) */
  zIndex: number;
  /** Optional border radius for rounded corners in pixels */
  borderRadius?: number;
  /** Optional border configuration */
  border?: BorderConfig;
  /** Optional shadow configuration */
  shadow?: ShadowConfig;
}

/**
 * Canvas dimensions configuration
 */
export interface CanvasConfig {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
}

/**
 * Complete layout configuration for the compositor
 * 
 * Defines how all video sources are arranged on the canvas,
 * including their positions, sizes, and visual effects.
 */
export interface CompositorLayout {
  /** Layout type identifier */
  type: LayoutType;
  /** Canvas dimensions */
  canvas: CanvasConfig;
  /** Source layouts (camera and/or screen) */
  sources: {
    /** Camera video source layout (optional) */
    camera?: SourceLayout;
    /** Screen capture source layout (optional) */
    screen?: SourceLayout;
  };
}

/**
 * Configuration options for compositor initialization
 */
export interface CompositorConfig {
  /** Output canvas width in pixels */
  width: number;
  /** Output canvas height in pixels */
  height: number;
  /** Target frame rate (frames per second) */
  frameRate: number;
  /** Background color (CSS color string) */
  backgroundColor: string;
  /** Enable audio mixing (default: true) */
  enableAudio?: boolean;
  /** Enable smooth layout transitions (default: true) */
  enableTransitions?: boolean;
  /** Transition duration in milliseconds (default: 500) */
  transitionDuration?: number;
}

/**
 * Configuration for a video source
 * 
 * Controls the visibility, opacity, and layout of a video source.
 */
export interface SourceConfig {
  /** Layout configuration for this source */
  layout: SourceLayout;
  /** Whether the source is visible */
  visible: boolean;
  /** Opacity level (0.0 to 1.0) */
  opacity: number;
}

/**
 * Performance metrics for monitoring compositor health
 * 
 * Provides real-time performance data including frame rate,
 * dropped frames, render times, and memory usage.
 */
export interface PerformanceMetrics {
  /** Current frames per second */
  fps: number;
  /** Total number of dropped frames */
  droppedFrames: number;
  /** Average render time per frame in milliseconds */
  averageRenderTime: number;
  /** Current memory usage in bytes */
  memoryUsage: number;
  /** Overall performance health indicator */
  isPerformanceGood: boolean;
  /** Performance health score (0-100) */
  healthScore?: number;
  /** Current quality level */
  qualityLevel?: QualityLevel;
}

/**
 * Current state of the compositor
 * 
 * Tracks initialization status, running state, active layout,
 * connected sources, and performance metrics.
 */
export interface CompositorState {
  /** Whether the compositor has been initialized */
  isInitialized: boolean;
  /** Whether the compositor is currently running */
  isRunning: boolean;
  /** Current active layout type */
  currentLayout: LayoutType;
  /** IDs of currently active video sources */
  activeSources: string[];
  /** Current performance metrics */
  performanceMetrics: PerformanceMetrics;
  /** Whether audio mixing is enabled */
  audioEnabled?: boolean;
  /** Whether visual effects are enabled */
  visualEffectsEnabled?: boolean;
}

/**
 * Transition configuration for layout changes
 */
export interface TransitionConfig {
  /** Enable smooth transition animation */
  enabled: boolean;
  /** Transition duration in milliseconds */
  duration: number;
  /** Easing function type */
  easing: EasingType;
}

/**
 * Validation result for layout configurations
 */
export interface LayoutValidationResult {
  /** Whether the layout is valid */
  isValid: boolean;
  /** Array of validation error messages */
  errors: string[];
  /** Array of validation warning messages */
  warnings?: string[];
}

/**
 * Aspect ratio information
 */
export interface AspectRatioInfo {
  /** Aspect ratio as decimal (e.g., 1.777 for 16:9) */
  ratio: number;
  /** Human-readable name (e.g., "16:9", "4:3") */
  name: string;
  /** Width component */
  width: number;
  /** Height component */
  height: number;
}

/**
 * Dimensions with width and height
 */
export interface Dimensions {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Position with x and y coordinates
 */
export interface Position {
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
}

/**
 * Rectangle with position and dimensions
 */
export interface Rectangle extends Position, Dimensions {}

/**
 * Audio source configuration for the compositor
 */
export interface AudioSourceConfig {
  /** Unique identifier for the audio source */
  id: string;
  /** Media stream containing audio tracks */
  stream: MediaStream;
  /** Volume level (0.0 to 1.0) */
  volume: number;
  /** Whether the source is muted */
  muted: boolean;
  /** Human-readable label for the source */
  label: string;
}

/**
 * Audio level data for visualization
 */
export interface AudioLevelData {
  /** Source identifier */
  sourceId: string;
  /** Audio level (0.0 to 1.0) */
  level: number;
  /** Whether the source is muted */
  isMuted: boolean;
  /** Source label */
  label: string;
}

/**
 * Compositor event types
 */
export type CompositorEventType =
  | 'initialized'
  | 'started'
  | 'stopped'
  | 'paused'
  | 'resumed'
  | 'layout-changed'
  | 'source-added'
  | 'source-removed'
  | 'source-updated'
  | 'performance-warning'
  | 'quality-changed'
  | 'error';

/**
 * Compositor event data
 */
export interface CompositorEvent {
  /** Event type */
  type: CompositorEventType;
  /** Event timestamp */
  timestamp: number;
  /** Event-specific data */
  data?: any;
  /** Error information (for error events) */
  error?: Error;
}

/**
 * Compositor event listener callback
 */
export type CompositorEventListener = (event: CompositorEvent) => void;

/**
 * Recording state
 */
export type RecordingState = 
  | 'idle'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'error';

/**
 * Recording options
 */
export interface RecordingOptions {
  /** Video MIME type (e.g., 'video/webm') */
  mimeType?: string;
  /** Video bitrate in bits per second */
  videoBitsPerSecond?: number;
  /** Audio bitrate in bits per second */
  audioBitsPerSecond?: number;
  /** Time slice for data availability in milliseconds */
  timeSlice?: number;
}

/**
 * Recording metadata
 */
export interface RecordingMetadata {
  /** Recording start time */
  startTime: number;
  /** Recording end time */
  endTime?: number;
  /** Recording duration in milliseconds */
  duration: number;
  /** Total file size in bytes */
  fileSize: number;
  /** Video codec used */
  videoCodec?: string;
  /** Audio codec used */
  audioCodec?: string;
  /** Layout type used during recording */
  layoutType: LayoutType;
}


