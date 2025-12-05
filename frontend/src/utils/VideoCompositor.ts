// VideoCompositor - Core class for real-time video compositing
import type {
  CompositorLayout,
  SourceConfig,
  PerformanceMetrics,
  SourceLayout,
  LayoutType
} from '@/types/VideoCompositor';
import { getLayoutByType, getAvailableLayoutTypes } from './CompositorLayouts';
import { AudioMixer, type AudioSourceConfig } from './AudioMixer';

interface VideoSourceData {
  element: HTMLVideoElement;
  config: SourceConfig;
}

export class VideoCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElements: Map<string, VideoSourceData>;
  private currentLayout: CompositorLayout;
  private animationFrameId: number | null;
  private outputStream: MediaStream | null;
  private isRunning: boolean;
  
  // Performance monitoring
  private frameCount: number;
  private droppedFrames: number;
  private lastFrameTime: number;
  private renderTimes: number[];
  private fpsUpdateTime: number;
  private currentFps: number;
  private totalFramesRendered: number;
  private performanceStartTime: number;
  private lastMemoryCheck: number;
  private memoryUsageHistory: number[];
  
  // Layout transition state
  private isTransitioning: boolean;
  private transitionStartTime: number;
  private transitionDuration: number;
  private previousLayout: CompositorLayout | null;
  
  // Adaptive quality system
  private performanceDegradationCount: number;
  private lastPerformanceCheck: number;
  private originalResolution: { width: number; height: number };
  private currentQualityLevel: 'high' | 'medium' | 'low';
  private visualEffectsEnabled: boolean;
  private performanceWarningCallback: ((message: string) => void) | null;
  
  // Canvas rendering optimization
  private dirtyRegions: Set<string>;
  private lastCanvasState: {
    globalAlpha?: number;
    shadowBlur?: number;
    shadowColor?: string;
    strokeStyle?: string;
    lineWidth?: number;
  };
  
  // Audio mixing
  private audioMixer: AudioMixer | null;
  private audioEnabled: boolean;
  
  // Hidden container for video elements to ensure they render
  private hiddenContainer: HTMLDivElement;

  constructor(width: number, height: number, enableAudio: boolean = true) {
    // Initialize canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Create hidden container for video elements to ensure they render
    this.hiddenContainer = document.createElement('div');
    this.hiddenContainer.style.position = 'absolute';
    this.hiddenContainer.style.width = '10px';
    this.hiddenContainer.style.height = '10px';
    this.hiddenContainer.style.overflow = 'hidden';
    this.hiddenContainer.style.opacity = '0.01'; // Not 0 to avoid optimization
    this.hiddenContainer.style.pointerEvents = 'none';
    this.hiddenContainer.style.zIndex = '-1000';
    this.hiddenContainer.style.top = '0';
    this.hiddenContainer.style.left = '0';
    document.body.appendChild(this.hiddenContainer);
    
    const context = this.canvas.getContext('2d', { 
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    
    this.ctx = context;
    this.videoElements = new Map();
    this.animationFrameId = null;
    this.outputStream = null;
    this.isRunning = false;
    
    // Initialize performance metrics
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.lastFrameTime = performance.now();
    this.renderTimes = [];
    this.fpsUpdateTime = performance.now();
    this.currentFps = 0;
    this.totalFramesRendered = 0;
    this.performanceStartTime = performance.now();
    this.lastMemoryCheck = performance.now();
    this.memoryUsageHistory = [];
    
    // Initialize transition state
    this.isTransitioning = false;
    this.transitionStartTime = 0;
    this.transitionDuration = 500; // 500ms transition
    this.previousLayout = null;
    
    // Initialize adaptive quality system
    this.performanceDegradationCount = 0;
    this.lastPerformanceCheck = performance.now();
    this.originalResolution = { width, height };
    this.currentQualityLevel = 'high';
    this.visualEffectsEnabled = true;
    this.performanceWarningCallback = null;
    
    // Initialize canvas rendering optimization
    this.dirtyRegions = new Set();
    this.lastCanvasState = {};
    
    // Initialize audio mixing
    this.audioEnabled = enableAudio;
    this.audioMixer = null;
    if (enableAudio) {
      try {
        this.audioMixer = new AudioMixer({ sampleRate: 48000 });
        console.log('AudioMixer initialized for compositor');
      } catch (error) {
        console.warn('Failed to initialize AudioMixer:', error);
        this.audioEnabled = false;
      }
    }
    
    // Set default layout (will be overridden when sources are added)
    this.currentLayout = {
      type: 'picture-in-picture',
      canvas: { width, height },
      sources: {}
    };
    
    console.log('VideoCompositor initialized', { width, height, audioEnabled: this.audioEnabled });
  }

  /**
   * Add a video source to the compositor with enhanced readiness handling
   */
  addVideoSource(id: string, stream: MediaStream, config: Partial<SourceConfig>): void {
    console.log(`Adding video source: ${id}`, {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
      streamActive: stream.active,
      trackStates: stream.getVideoTracks().map(t => ({ 
        label: t.label, 
        readyState: t.readyState, 
        enabled: t.enabled 
      }))
    });
    
    // CRITICAL: Check if source already exists - if so, remove it first to avoid conflicts
    if (this.videoElements.has(id)) {
      const existingSource = this.videoElements.get(id);
      
      // Check if it's the same stream to avoid unnecessary re-initialization
      if (existingSource && existingSource.element.srcObject === stream) {
        console.log(`Video source ${id} already exists with same stream - updating config only`);
        existingSource.config = { ...existingSource.config, ...config };
        
        // Ensure it's playing just in case
        if (existingSource.element.paused) {
          existingSource.element.play().catch(err => console.warn(`Failed to resume existing source ${id}:`, err));
        }
        return;
      }

      console.log(`Video source ${id} already exists - removing old source before adding new one`);
      if (existingSource) {
        // Pause and clear existing video element
        existingSource.element.pause();
        existingSource.element.srcObject = null;
        // Remove from audio mixer if it was added
        if (this.audioMixer && (id === 'camera' || id === 'screen')) {
          this.audioMixer.removeAudioSource(id);
        }
      }
      this.videoElements.delete(id);
    }
    
    // Validate stream is active
    if (!stream.active) {
      console.error(`Stream is not active for source: ${id} - cannot add to compositor`);
      return;
    }
    
    // Validate stream has active video tracks
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.error(`No video tracks in stream for source: ${id}`);
      return;
    }
    
    // Check if tracks are active
    const activeTracks = videoTracks.filter(t => t.readyState === 'live' && t.enabled);
    if (activeTracks.length === 0) {
      console.warn(`No active video tracks for source: ${id} - tracks may not be ready yet`);
      // Don't return - allow it to be added and wait for tracks to become active
    }
    
    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true; // Mute to avoid echo
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true'); // iOS compatibility
    
    // Append to hidden container to ensure browser renders frames
    this.hiddenContainer.appendChild(video);

    // Ensure browsers render screen-only video frames even when hidden.
    // Some browsers optimize away rendering for fully-hidden elements; make
    // the screen video element minimally visible but offscreen so frames
    // continue to be painted and captureStream / canvas draw receive frames.
    if (id === 'screen') {
      video.style.position = 'absolute';
      video.style.left = '-9999px';
      video.style.top = '0px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01'; // not 0 to avoid rendering optimizations
      video.style.display = 'block';
      video.style.pointerEvents = 'none';
    } else {
      // Keep camera/video elements hidden normally to avoid UI clutter
      video.style.display = 'none';
      video.style.opacity = '0';
    }

    // Enhanced metadata handler
    video.onloadedmetadata = () => {
      console.log(`Video source ${id} metadata loaded`, {
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState,
        duration: video.duration,
        srcObject: !!video.srcObject,
        streamActive: (video.srcObject as MediaStream)?.active
      });
      
      // CRITICAL: For screen sharing, dimensions might be wrong initially
      // Check if we have a valid stream
      if (id === 'screen' && (video.videoWidth <= 2 || video.videoHeight <= 2)) {
        console.warn(`Screen video has invalid dimensions (${video.videoWidth}x${video.videoHeight}), waiting for actual dimensions...`);
        // Wait a bit more and check again
        setTimeout(() => {
          if (video.videoWidth > 2 && video.videoHeight > 2) {
            console.log(`Screen video dimensions updated: ${video.videoWidth}x${video.videoHeight}`);
          } else {
            console.warn(`Screen video still has invalid dimensions after wait`);
          }
        }, 1000);
      }
      
      // Ensure video is playing
      if (video.paused) {
        video.play().catch(err => {
          console.error(`Failed to play video source ${id}:`, err);
        });
      }
    };
    
    // Handle video playing state
    video.onplaying = () => {
      console.log(`Video source ${id} is now playing`);
      videoReady = true;
    };
    
    // Handle video errors
    video.onerror = (error) => {
      console.error(`Video source ${id} error:`, error, {
        errorCode: video.error?.code,
        errorMessage: video.error?.message
      });
    };
    
    // CRITICAL FIX: Ensure video is playing and ready before use
    let videoReady = false;
    const ensureVideoReady = async () => {
      try {
        // Wait for metadata to load with longer timeout for screen sharing
        if (video.readyState < 2) {
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              // Don't reject - just resolve and continue (screen sharing can take longer)
              console.warn(`Video metadata load timeout for ${id}, continuing anyway`);
              resolve(undefined);
            }, 10000); // Increased to 10 seconds for screen sharing
            
            const existingHandler = video.onloadedmetadata;
            video.onloadedmetadata = (event) => {
              clearTimeout(timeout);
              if (existingHandler) {
                if (typeof existingHandler === 'function') {
                  existingHandler.call(video, event);
                }
              }
              resolve();
            };
            
            video.onerror = (error) => {
              clearTimeout(timeout);
              // Don't reject - just log and continue
              console.warn(`Video source ${id} error during initialization:`, error);
              resolve();
            };
          });
        }
        
        // Explicitly play the video to ensure frames are being rendered
        if (video.paused) {
          try {
            await video.play();
          } catch (playError) {
            console.warn(`Failed to play video ${id} initially:`, playError);
            // Try again after a delay
            setTimeout(async () => {
              try {
                await video.play();
              } catch (e) {
                console.error(`Failed to play video ${id} on retry:`, e);
              }
            }, 500);
          }
        }
        
        // Wait a bit for first frame (longer for screen sharing)
        await new Promise(resolve => setTimeout(resolve, id === 'screen' ? 500 : 100));
        
        // Verify video is actually rendering
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          videoReady = true;
          console.log(`Video source ${id} is ready and playing`, {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused
          });
        } else {
          console.warn(`Video source ${id} metadata loaded but no dimensions yet - will continue anyway`);
          // For screen sharing, dimensions might be 2x2 initially, continue anyway
          videoReady = true;
          
          // Force a retry check for dimensions
          if (id === 'screen') {
            const checkInterval = setInterval(() => {
              if (video.videoWidth > 2 && video.videoHeight > 2) {
                console.log(`Screen video dimensions finally updated: ${video.videoWidth}x${video.videoHeight}`);
                clearInterval(checkInterval);
              } else if (!video.srcObject || !(video.srcObject as MediaStream).active) {
                clearInterval(checkInterval);
              }
            }, 500);
          }
        }
      } catch (error) {
        console.error(`Failed to prepare video source ${id}:`, error);
        // Always continue - video might still work even if preparation had issues
        videoReady = true;
      }
    };
    
    // Start preparing video immediately (don't wait for it to complete)
    ensureVideoReady().catch(err => {
      console.warn(`Error ensuring video ready for ${id}:`, err);
      // Don't throw - video might still work
      videoReady = true;
    });
    
    // Create default source config
    const defaultLayout: SourceLayout = {
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
      zIndex: 0
    };
    
    const sourceConfig: SourceConfig = {
      layout: config.layout || defaultLayout,
      visible: config.visible !== undefined ? config.visible : true,
      opacity: config.opacity !== undefined ? config.opacity : 1.0
    };
    
    this.videoElements.set(id, {
      element: video,
      config: sourceConfig
    });
    
    // Add audio source to mixer if audio is enabled
    if (this.audioEnabled && this.audioMixer && stream.getAudioTracks().length > 0) {
      const audioConfig: AudioSourceConfig = {
        id,
        stream,
        volume: 1.0,
        muted: false,
        label: id === 'camera' ? 'Camera Audio' : 'Screen Audio'
      };
      
      const added = this.audioMixer.addAudioSource(audioConfig);
      if (added) {
        console.log(`Audio source ${id} added to mixer`);
      }
    }
    
    console.log(`Video source ${id} added successfully`, {
      videoReady,
      isRunning: this.isRunning,
      willBeVisible: sourceConfig.visible
    });
  }

  /**
   * Remove a video source from the compositor with proper cleanup
   */
  removeVideoSource(id: string): void {
    const sourceData = this.videoElements.get(id);
    if (sourceData) {
      console.log(`Removing video source: ${id}`);
      
      // Remove audio source from mixer
      if (this.audioMixer) {
        this.audioMixer.removeAudioSource(id);
        console.log(`Audio source ${id} removed from mixer`);
      }
      
      // Pause video
      sourceData.element.pause();
      
      // Remove event listeners
      sourceData.element.onloadedmetadata = null;
      sourceData.element.onerror = null;
      
      // Stop all tracks in the stream
      if (sourceData.element.srcObject) {
        const stream = sourceData.element.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          console.log(`Stopping track: ${track.kind} - ${track.label}`);
          track.stop();
        });
      }
      
      // Clear source object
      sourceData.element.srcObject = null;
      
      // Remove from DOM if attached
      if (sourceData.element.parentNode) {
        sourceData.element.remove();
      }
      
      // Remove from map
      this.videoElements.delete(id);
      
      console.log(`Video source ${id} removed and cleaned up`);
    }
  }

  /**
   * Update configuration for a video source
   */
  updateVideoSource(id: string, config: Partial<SourceConfig>): void {
    const sourceData = this.videoElements.get(id);
    if (sourceData) {
      sourceData.config = {
        ...sourceData.config,
        ...config
      };
      console.log(`Video source ${id} updated`, config);
    }
  }

  /**
   * Set the layout configuration with smooth transition
   */
  setLayout(layout: CompositorLayout, enableTransition: boolean = true): void {
    // Force layout canvas to compositor canvas to avoid mismatches
    layout.canvas.width = this.canvas.width;
    layout.canvas.height = this.canvas.height;

    // Clamp sources into canvas bounds to avoid hard errors
    const clampToCanvas = (l: CompositorLayout): CompositorLayout => {
      const clamped = JSON.parse(JSON.stringify(l)) as CompositorLayout;
      const cw = this.canvas.width;
      const ch = this.canvas.height;
      for (const [, src] of Object.entries(clamped.sources)) {
        if (!src) continue;
        // Ensure positive dimensions
        src.width = Math.max(1, Math.min(src.width, cw));
        src.height = Math.max(1, Math.min(src.height, ch));
        // Clamp position
        src.x = Math.max(0, Math.min(src.x, cw - src.width));
        src.y = Math.max(0, Math.min(src.y, ch - src.height));
      }
      return clamped;
    };
    layout = clampToCanvas(layout);

    // Validate layout before applying (post-clamp should pass)
    if (!this.validateLayoutBounds(layout)) {
      console.error('Invalid layout after clamp: sources exceed canvas bounds');
      // As a safety, fall back to camera-only full canvas if present
      const fallback = {
        type: 'camera-only',
        canvas: { width: this.canvas.width, height: this.canvas.height },
        sources: {
          camera: { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height },
          screen: undefined as any
        }
      } as CompositorLayout;
      layout = fallback;
    }
    
    // Preserve aspect ratios in layout
    const adjustedLayout = this.preserveAspectRatios(layout);
    
    // Avoid forcing a black fill on layout change to prevent flicker during source readiness
    // The subsequent draw pass will paint full-frame backgrounds for active layouts
    
    // Enable smooth transition if requested and we have a previous layout
    if (enableTransition && this.currentLayout.sources && Object.keys(this.currentLayout.sources).length > 0) {
      this.previousLayout = JSON.parse(JSON.stringify(this.currentLayout));
      this.isTransitioning = true;
      this.transitionStartTime = performance.now();
    } else {
      // If no transition, immediately clear transition state
      this.isTransitioning = false;
      this.previousLayout = null;
    }
    
    // Ensure adjustedLayout canvas matches compositor canvas
    adjustedLayout.canvas.width = this.canvas.width;
    adjustedLayout.canvas.height = this.canvas.height;
    this.currentLayout = adjustedLayout;

    console.log('Layout updated (final)', {
      canvas: `${this.currentLayout.canvas.width}x${this.currentLayout.canvas.height}`,
      type: this.currentLayout.type,
      camera: this.currentLayout.sources.camera
        ? `${this.currentLayout.sources.camera.width}x${this.currentLayout.sources.camera.height}@(${this.currentLayout.sources.camera.x},${this.currentLayout.sources.camera.y})`
        : 'none',
      screen: this.currentLayout.sources.screen
        ? `${this.currentLayout.sources.screen.width}x${this.currentLayout.sources.screen.height}@(${this.currentLayout.sources.screen.x},${this.currentLayout.sources.screen.y})`
        : 'none'
    });
    
    // Update source configurations based on layout
    // CRITICAL: Update visibility based on whether source exists in new layout
    if (adjustedLayout.sources.camera) {
      if (this.videoElements.has('camera')) {
        this.updateVideoSource('camera', {
          layout: adjustedLayout.sources.camera,
          visible: true
        });
      }
    } else {
      // Hide camera if not in layout
      if (this.videoElements.has('camera')) {
        this.updateVideoSource('camera', {
          visible: false
        });
      }
    }
    
    if (adjustedLayout.sources.screen) {
      if (this.videoElements.has('screen')) {
        this.updateVideoSource('screen', {
          layout: adjustedLayout.sources.screen,
          visible: true
        });
      }
    } else {
      // Hide screen if not in layout
      if (this.videoElements.has('screen')) {
        this.updateVideoSource('screen', {
          visible: false
        });
      }
    }
    
    console.log('Layout updated', { 
      type: adjustedLayout.type, 
      transition: enableTransition,
      hasCamera: !!adjustedLayout.sources.camera,
      hasScreen: !!adjustedLayout.sources.screen
    });
  }
  
  /**
   * Validate that all sources fit within canvas bounds
   */
  private validateLayoutBounds(layout: CompositorLayout): boolean {
    const { canvas, sources } = layout;
    
    for (const [sourceId, sourceLayout] of Object.entries(sources)) {
      if (!sourceLayout) continue;
      
      // Check if source is within canvas bounds
      if (sourceLayout.x < 0 || sourceLayout.y < 0) {
        console.warn(`Source ${sourceId} has negative position`);
        return false;
      }
      
      if (sourceLayout.x + sourceLayout.width > canvas.width) {
        console.warn(`Source ${sourceId} exceeds canvas width`);
        return false;
      }
      
      if (sourceLayout.y + sourceLayout.height > canvas.height) {
        console.warn(`Source ${sourceId} exceeds canvas height`);
        return false;
      }
      
      // Check dimensions are positive
      if (sourceLayout.width <= 0 || sourceLayout.height <= 0) {
        console.warn(`Source ${sourceId} has invalid dimensions`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Preserve aspect ratios of video sources in layout
   * CRITICAL: For screen sources, use "cover" mode (fill space, crop if needed) to avoid black bars
   * For camera sources, use "contain" mode (fit within space, preserve aspect)
   */
  private preserveAspectRatios(layout: CompositorLayout): CompositorLayout {
    const adjustedLayout = JSON.parse(JSON.stringify(layout)) as CompositorLayout;
    
    for (const [sourceId, sourceLayout] of Object.entries(adjustedLayout.sources)) {
      if (!sourceLayout) continue;
      
      const sourceData = this.videoElements.get(sourceId);
      if (!sourceData) continue;
      
      const video = sourceData.element;
      if (video.videoWidth === 0 || video.videoHeight === 0) continue;
      
      const videoAspect = video.videoWidth / video.videoHeight;
      const layoutAspect = sourceLayout.width / sourceLayout.height;
      
      // CRITICAL: For screen sources, always fill the space completely - no black bars
      // Don't adjust layout dimensions - we'll stretch to fill in drawImage
      if (sourceId === 'screen') {
        // Screen: Keep layout dimensions as-is, will be stretched to fill completely
        // This ensures no black spaces - content will fill entire allocated space
        continue; // Skip aspect ratio adjustment for screen
      }
      
      // Camera: Use object-cover behavior (match CSS object-fit: cover)
      // This crops from top-center to match preview behavior
      if (Math.abs(videoAspect - layoutAspect) > 0.01) {
        if (videoAspect > layoutAspect) {
          // Video is wider - fit to width, crop height from top (like CSS object-cover)
          const newHeight = sourceLayout.width / videoAspect;
          sourceLayout.height = newHeight;
          // CRITICAL: Don't center vertically - keep at top (like CSS object-cover)
          // This matches the preview which uses object-cover
          // sourceLayout.y stays the same (crop from top, not center)
        } else {
          // Video is taller - fit to height, adjust width
          const newWidth = sourceLayout.height * videoAspect;
          const widthDiff = sourceLayout.width - newWidth;
          sourceLayout.width = newWidth;
          sourceLayout.x += widthDiff / 2; // Center horizontally
        }
      }
    }
    
    return adjustedLayout;
  }

  /**
   * Start the compositor and return the output stream with mixed audio
   */
  start(): MediaStream {
    if (this.isRunning) {
      console.warn('Compositor already running');
      return this.outputStream!;
    }
    
    // Capture video stream from canvas at 30 FPS
    const videoStream = this.canvas.captureStream(30);
    
    // Create output stream with video tracks
    this.outputStream = new MediaStream(videoStream.getVideoTracks());
    
    // Add mixed audio tracks if audio is enabled
    if (this.audioEnabled && this.audioMixer) {
      // Resume audio context if suspended
      this.audioMixer.resume().catch(error => {
        console.warn('Failed to resume audio context:', error);
      });
      
      const audioStream = this.audioMixer.getOutputStream();
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        audioTracks.forEach(track => {
          this.outputStream!.addTrack(track);
        });
        console.log(`Added ${audioTracks.length} mixed audio track(s) to output stream`);
      }
    }
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = performance.now();
    
    // Start render loop
    this.render();
    
    console.log('Compositor started', {
      videoTracks: this.outputStream.getVideoTracks().length,
      audioTracks: this.outputStream.getAudioTracks().length,
      totalTracks: this.outputStream.getTracks().length
    });
    
    return this.outputStream;
  }



  /**
   * Pause the compositor
   */
  pause(): void {
    if (this.isRunning) {
      this.isRunning = false;
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      console.log('Compositor paused');
    }
  }

  /**
   * Resume the compositor
   */
  resume(): void {
    if (!this.isRunning && this.outputStream) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.render();
      console.log('Compositor resumed');
    }
  }

  /**
   * Main render loop - called via requestAnimationFrame
   */
  private render = (): void => {
    if (!this.isRunning) {
      return;
    }
    
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    const renderStartTime = now;
    
    // Target 30 FPS (33.33ms per frame)
    const targetFrameTime = 1000 / 30;
    
    if (elapsed >= targetFrameTime) {
      // CRITICAL: Always clear the entire canvas first to prevent black areas
      // Use save/restore to ensure clean state
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
      
      // Draw video sources in z-index order
      this.drawSources();
      
      // Update performance metrics
      this.frameCount++;
      this.totalFramesRendered++;
      this.lastFrameTime = now;
      
      // Track render time for performance monitoring
      const renderTime = performance.now() - renderStartTime;
      this.renderTimes.push(renderTime);
      if (this.renderTimes.length > 30) {
        this.renderTimes.shift();
      }
      
      // Update FPS calculation every second
      if (now - this.fpsUpdateTime >= 1000) {
        this.currentFps = this.frameCount / ((now - this.fpsUpdateTime) / 1000);
        this.fpsUpdateTime = now;
        this.frameCount = 0;
        
        // Check for performance degradation
        this.checkPerformanceDegradation();
      }
    } else {
      // Frame came too early
      this.droppedFrames++;
    }
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.render);
  };

  /**
   * Draw all video sources according to their layout configuration
   * Optimized with integer coordinates, state change minimization, and batching
   */
  private drawSources(): void {
    // DEBUG: Log current sources and transition state periodically
    if (Math.random() < 0.02) {
      const srcSummary = Array.from(this.videoElements.entries()).map(([id, data]) => ({
        id,
        readyState: data.element.readyState,
        vw: data.element.videoWidth,
        vh: data.element.videoHeight,
        visible: data.config.visible,
        z: data.config.layout?.zIndex,
        layout: {
          x: data.config.layout?.x,
          y: data.config.layout?.y,
          w: data.config.layout?.width,
          h: data.config.layout?.height
        }
      }));
      console.debug('[Compositor Debug] drawSources snapshot', {
        isTransitioning: this.isTransitioning,
        transitionProgress: this.isTransitioning ? Math.min((performance.now() - this.transitionStartTime) / this.transitionDuration, 1.0) : 1.0,
        sources: srcSummary
      });
    }
    // Calculate transition progress if transitioning
    let transitionProgress = 1.0;
    if (this.isTransitioning) {
      const elapsed = performance.now() - this.transitionStartTime;
      transitionProgress = Math.min(elapsed / this.transitionDuration, 1.0);
      
      // Use easing function for smooth transition
      transitionProgress = this.easeInOutCubic(transitionProgress);
      
      // End transition when complete
      if (transitionProgress >= 1.0) {
        this.isTransitioning = false;
        this.previousLayout = null;
      }
    }
    
    // Sort sources by z-index for correct layering
    const sortedSources = Array.from(this.videoElements.entries())
      .sort((a, b) => a[1].config.layout.zIndex - b[1].config.layout.zIndex);
    
    // Batch drawing operations by grouping similar operations
    const videosToDrawDirect: Array<{ video: HTMLVideoElement; layout: SourceLayout; opacity: number; sourceId: string }> = [];
    const videosToDrawRounded: Array<{ video: HTMLVideoElement; layout: SourceLayout; opacity: number; sourceId: string }> = [];
    const bordersToDrawDirect: Array<{ layout: SourceLayout }> = [];
    const bordersToDrawRounded: Array<{ layout: SourceLayout }> = [];
    
    // First pass: categorize drawing operations
    for (const [sourceId, sourceData] of sortedSources) {
      if (!sourceData.config.visible) {
        // CRITICAL: Skip invisible sources to prevent black areas
        continue;
      }
      
      const video = sourceData.element;
      // CRITICAL: Get layout from current layout config, not just source config
      // This ensures layout changes are immediately reflected
      let layout = sourceData.config.layout;
      
      // Validate layout exists and has valid dimensions
      if (!layout || layout.width <= 0 || layout.height <= 0) {
        console.warn(`Invalid layout for source ${sourceId}:`, layout);
        continue;
      }
      
      // ENHANCED: Better handling of video readiness
      // For screen sharing, we need to be more lenient as it may take time to start
      if (video.readyState < 2) {
        // If video has dimensions, it's likely ready even if readyState < 2
        // For screen sharing, dimensions might be 2x2 initially, so check if we have srcObject
        const hasValidDimensions = video.videoWidth > 2 && video.videoHeight > 2;
        const hasSrcObject = !!video.srcObject;
        const streamActive = hasSrcObject && (video.srcObject as MediaStream)?.active;
        if (Math.random() < 0.05) {
          console.debug('[Compositor Debug] readiness', {
            sourceId,
            readyState: video.readyState,
            hasValidDimensions,
            vw: video.videoWidth,
            vh: video.videoHeight,
            hasSrcObject,
            streamActive
          });
        }
        
        if (!hasValidDimensions && !hasSrcObject) {
          // Only skip if we have no dimensions AND no srcObject
          if (video.readyState === 0) {
            continue; // Haven't started loading yet
          }
        }
        
        // For screen sharing with srcObject, try to draw even if dimensions are small
        if (sourceId === 'screen' && hasSrcObject && streamActive) {
          // Continue - screen might have small dimensions initially but will update
          console.log(`Drawing screen source with initial dimensions: ${video.videoWidth}x${video.videoHeight}`);
        } else if (!hasValidDimensions && !hasSrcObject) {
          // For readyState 1 (HAVE_METADATA), try to draw anyway if we have srcObject
          if (video.readyState === 1 && !hasSrcObject) {
            continue;
          }
        }
      }
      
      // Ensure video is playing if it has a source
      if (video.srcObject) {
        if (video.paused) {
          // Don't require readyState >= 2 for screen sharing
          if (sourceId === 'screen' || video.readyState >= 2) {
            video.play().catch(err => {
              // Only log occasionally to avoid spam
              if (Math.random() < 0.01) {
                console.warn(`Failed to play video during render for ${sourceId}:`, err);
              }
            });
          }
        }
        
        // Force load if stuck in HAVE_NOTHING
        if (video.readyState === 0) {
           // Use a custom property to avoid spamming load()
           const lastLoad = parseInt(video.getAttribute('data-last-load') || '0');
           const now = Date.now();
           if (now - lastLoad > 2000) {
              console.warn(`Video source ${sourceId} stuck in HAVE_NOTHING, forcing load()`);
              video.load();
              video.setAttribute('data-last-load', now.toString());
              // Re-apply mute/playsinline just in case
              video.muted = true;
              video.playsInline = true;
           }
        }
      }
      
      // Interpolate layout during transition
      if (this.isTransitioning && this.previousLayout) {
        const prevSourceLayout = this.previousLayout.sources[sourceId as 'camera' | 'screen'];
        if (prevSourceLayout) {
          layout = this.interpolateLayout(prevSourceLayout, layout, transitionProgress);
        } else {
          // If source wasn't in previous layout but is in new layout, fade in from center
          // This prevents black areas during transitions
          const centerX = this.canvas.width / 2 - layout.width / 2;
          const centerY = this.canvas.height / 2 - layout.height / 2;
          layout = {
            ...layout,
            x: centerX + (layout.x - centerX) * transitionProgress,
            y: centerY + (layout.y - centerY) * transitionProgress,
            width: layout.width * transitionProgress,
            height: layout.height * transitionProgress
          };
        }
      }
      
      // Use integer coordinates for pixel-perfect rendering
      const intLayout = this.toIntegerCoordinates(layout);
      
      // Categorize by drawing type
      if (this.visualEffectsEnabled && intLayout.borderRadius && intLayout.borderRadius > 0) {
        videosToDrawRounded.push({ video, layout: intLayout, opacity: sourceData.config.opacity, sourceId });
        if (intLayout.border) {
          bordersToDrawRounded.push({ layout: intLayout });
        }
      } else {
        videosToDrawDirect.push({ video, layout: intLayout, opacity: sourceData.config.opacity, sourceId });
        if (this.visualEffectsEnabled && intLayout.border) {
          bordersToDrawDirect.push({ layout: intLayout });
        }
      }
    }
    
    // Second pass: batch draw operations to minimize state changes
    
    // Draw direct videos (no rounded corners)
    if (videosToDrawDirect.length > 0) {
      this.ctx.save();
      for (const { video, layout, opacity, sourceId } of videosToDrawDirect) {
        // Only change state if different from last
        if (this.lastCanvasState.globalAlpha !== opacity) {
          this.ctx.globalAlpha = opacity;
          this.lastCanvasState.globalAlpha = opacity;
        }
        
        // Apply shadow if configured
        if (this.visualEffectsEnabled && layout.shadow) {
          this.applyCanvasShadow(layout.shadow);
        }
        
        // CRITICAL: For screen sources, ALWAYS fill the entire layout space completely
        // Use zoom + stretch to ensure no black/white spaces
        // For camera sources, use normal drawImage (which will respect aspect ratio from layout)
        if (sourceId === 'screen') {
          // Screen: Use contain for screen-only (show whole screen), cover elsewhere (PiP/presentation)
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            const sourceAspect = video.videoWidth / video.videoHeight;
            const targetAspect = layout.width / layout.height;
            const useCover = this.currentLayout?.type !== 'screen-only';

            if (useCover) {
              // Object-cover: crop source to fill destination completely
              let sourceX = 0;
              let sourceY = 0;
              let sourceW = video.videoWidth;
              let sourceH = video.videoHeight;
              if (Math.abs(sourceAspect - targetAspect) > 0.01) {
                if (sourceAspect > targetAspect) {
                  sourceH = video.videoHeight;
                  sourceW = sourceH * targetAspect;
                  sourceX = (video.videoWidth - sourceW) / 2;
                  sourceY = 0;
                } else {
                  sourceW = video.videoWidth;
                  sourceH = sourceW / targetAspect;
                  sourceX = 0;
                  sourceY = (video.videoHeight - sourceH) / 2;
                }
              }
              this.ctx.drawImage(
                video,
                sourceX, sourceY, sourceW, sourceH,
                layout.x, layout.y, layout.width, layout.height
              );
              if (Math.random() < 0.05) {
                console.debug('[Compositor Debug] screen draw cover', {
                  sourceAspect: Number(sourceAspect.toFixed(3)),
                  targetAspect: Number(targetAspect.toFixed(3)),
                  video: `${video.videoWidth}x${video.videoHeight}`,
                  layout: `${layout.width}x${layout.height}`,
                  crop: { x: Math.round(sourceX), y: Math.round(sourceY), w: Math.round(sourceW), h: Math.round(sourceH) }
                });
              }
            } else {
              // Object-contain: letter/pillarbox to show whole screen
              let drawWidth = layout.width;
              let drawHeight = layout.height;
              let drawX = layout.x;
              let drawY = layout.y;
              if (Math.abs(sourceAspect - targetAspect) > 0.01) {
                if (sourceAspect > targetAspect) {
                  drawHeight = layout.width / sourceAspect;
                  drawY = layout.y + (layout.height - drawHeight) / 2;
                } else {
                  drawWidth = layout.height * sourceAspect;
                  drawX = layout.x + (layout.width - drawWidth) / 2;
                }
              }
              this.ctx.drawImage(
                video,
                0, 0, video.videoWidth, video.videoHeight,
                drawX, drawY, drawWidth, drawHeight
              );
              if (Math.random() < 0.05) {
                console.debug('[Compositor Debug] screen draw contain', {
                  sourceAspect: Number(sourceAspect.toFixed(3)),
                  targetAspect: Number(targetAspect.toFixed(3)),
                  video: `${video.videoWidth}x${video.videoHeight}`,
                  layout: `${layout.width}x${layout.height}`,
                  dest: { x: Math.round(drawX), y: Math.round(drawY), w: Math.round(drawWidth), h: Math.round(drawHeight) }
                });
              }
            }
          } else {
            // If screen dimensions are not ready, draw nothing to avoid visual flash or overlays
            if (Math.random() < 0.01) {
               console.warn(`Screen source ${sourceId} has invalid dimensions: ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState}, paused: ${video.paused}, srcObject: ${!!video.srcObject}`);
            }
            
            // Force play if paused and dimensions are 0
            if (video.paused && video.srcObject) {
                video.play().catch(() => {});
            }
          }
        } else {
          // Camera: Use object-cover behavior to match preview
          // Preview uses CSS object-cover which crops from top-center
          const videoAspect = video.videoWidth / video.videoHeight;
          const layoutAspect = layout.width / layout.height;
          
          // If aspect ratios don't match, crop to fill (like CSS object-cover)
          if (Math.abs(videoAspect - layoutAspect) > 0.01) {
            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = video.videoWidth;
            let sourceHeight = video.videoHeight;
            
            if (videoAspect > layoutAspect) {
              // Video is wider - crop width, use full height (crop from center horizontally)
              sourceHeight = video.videoHeight;
              sourceWidth = sourceHeight * layoutAspect;
              sourceX = (video.videoWidth - sourceWidth) / 2; // Center horizontally
              sourceY = (video.videoHeight - sourceHeight) / 2; // Center vertically
            } else {
              // Video is taller - crop height, use full width (crop from center vertically)
              sourceWidth = video.videoWidth;
              sourceHeight = sourceWidth / layoutAspect;
              sourceX = 0;
              sourceY = (video.videoHeight - sourceHeight) / 2; // Center vertically
            }
            
            // DEBUG LOGGING for Direct Draw
            if (Math.random() < 0.05) {
                console.log(`[Compositor Debug Direct] Source: ${sourceId}`, {
                    video: `${video.videoWidth}x${video.videoHeight}`,
                    layout: `${layout.width}x${layout.height}`,
                    crop: `x:${Math.round(sourceX)} y:${Math.round(sourceY)} w:${Math.round(sourceWidth)} h:${Math.round(sourceHeight)}`,
                    aspects: `v:${videoAspect.toFixed(2)} l:${layoutAspect.toFixed(2)}`
                });
            }

            this.ctx.drawImage(
              video,
              sourceX, sourceY, sourceWidth, sourceHeight, // Source crop (top-center)
              layout.x, layout.y, layout.width, layout.height // Destination fill
            );
          } else {
            // Aspect ratios match - draw normally
            // DEBUG LOGGING for Direct Draw (No Crop)
            if (Math.random() < 0.05) {
                console.log(`[Compositor Debug Direct] Source: ${sourceId} (No Crop)`, {
                    video: `${video.videoWidth}x${video.videoHeight}`,
                    layout: `${layout.width}x${layout.height}`,
                    aspects: `v:${videoAspect.toFixed(2)} l:${layoutAspect.toFixed(2)}`
                });
            }
            
            this.ctx.drawImage(
              video,
              layout.x,
              layout.y,
              layout.width,
              layout.height
            );
          }
        }
      }
      this.ctx.restore();
      this.lastCanvasState = {}; // Reset state tracking after restore
    }
    
    // Draw rounded videos
    if (videosToDrawRounded.length > 0) {
      this.ctx.save();
      for (const { video, layout, opacity, sourceId } of videosToDrawRounded) {
        // Only change state if different from last
        if (this.lastCanvasState.globalAlpha !== opacity) {
          this.ctx.globalAlpha = opacity;
          this.lastCanvasState.globalAlpha = opacity;
        }
        
        // Apply shadow if configured
        if (layout.shadow) {
          this.applyCanvasShadow(layout.shadow);
        }
        
        this.drawRoundedVideo(video, layout, sourceId);
      }
      this.ctx.restore();
      this.lastCanvasState = {}; // Reset state tracking after restore
    }
    
    // Draw direct borders
    if (bordersToDrawDirect.length > 0) {
      this.ctx.save();
      for (const { layout } of bordersToDrawDirect) {
        if (layout.border) {
          // Only change state if different from last
          if (this.lastCanvasState.strokeStyle !== layout.border.color) {
            this.ctx.strokeStyle = layout.border.color;
            this.lastCanvasState.strokeStyle = layout.border.color;
          }
          if (this.lastCanvasState.lineWidth !== layout.border.width) {
            this.ctx.lineWidth = layout.border.width;
            this.lastCanvasState.lineWidth = layout.border.width;
          }
          
          this.ctx.strokeRect(layout.x, layout.y, layout.width, layout.height);
        }
      }
      this.ctx.restore();
      this.lastCanvasState = {}; // Reset state tracking after restore
    }
    
    // Draw rounded borders
    if (bordersToDrawRounded.length > 0) {
      this.ctx.save();
      for (const { layout } of bordersToDrawRounded) {
        if (layout.border && layout.borderRadius) {
          // Only change state if different from last
          if (this.lastCanvasState.strokeStyle !== layout.border.color) {
            this.ctx.strokeStyle = layout.border.color;
            this.lastCanvasState.strokeStyle = layout.border.color;
          }
          if (this.lastCanvasState.lineWidth !== layout.border.width) {
            this.ctx.lineWidth = layout.border.width;
            this.lastCanvasState.lineWidth = layout.border.width;
          }
          
          this.drawRoundedRect(
            layout.x,
            layout.y,
            layout.width,
            layout.height,
            layout.borderRadius
          );
          this.ctx.stroke();
        }
      }
      this.ctx.restore();
      this.lastCanvasState = {}; // Reset state tracking after restore
    }
  }
  
  /**
   * Convert layout coordinates to integers for pixel-perfect rendering
   */
  private toIntegerCoordinates(layout: SourceLayout): SourceLayout {
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
   * Apply canvas shadow with state change minimization
   */
  private applyCanvasShadow(shadow: { blur: number; color: string; offsetX: number; offsetY: number }): void {
    if (this.lastCanvasState.shadowBlur !== shadow.blur) {
      this.ctx.shadowBlur = shadow.blur;
      this.lastCanvasState.shadowBlur = shadow.blur;
    }
    if (this.lastCanvasState.shadowColor !== shadow.color) {
      this.ctx.shadowColor = shadow.color;
      this.lastCanvasState.shadowColor = shadow.color;
    }
    this.ctx.shadowOffsetX = shadow.offsetX;
    this.ctx.shadowOffsetY = shadow.offsetY;
  }
  
  /**
   * Interpolate between two layouts for smooth transitions
   */
  private interpolateLayout(from: SourceLayout, to: SourceLayout, progress: number): SourceLayout {
    // Ensure progress is clamped between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    return {
      x: from.x + (to.x - from.x) * clampedProgress,
      y: from.y + (to.y - from.y) * clampedProgress,
      width: from.width + (to.width - from.width) * clampedProgress,
      height: from.height + (to.height - from.height) * clampedProgress,
      zIndex: to.zIndex,
      borderRadius: to.borderRadius,
      border: to.border,
      shadow: to.shadow
    };
  }
  
  /**
   * Easing function for smooth transitions (cubic ease-in-out)
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Draw video with rounded corners
   */
  private drawRoundedVideo(video: HTMLVideoElement, layout: SourceLayout, sourceId?: string): void {
    if (!layout.borderRadius) return;
    
    // Create clipping path
    this.ctx.beginPath();
    this.drawRoundedRect(
      layout.x,
      layout.y,
      layout.width,
      layout.height,
      layout.borderRadius
    );
    this.ctx.clip();
    
    // CRITICAL: For screen sources, ALWAYS fill the entire layout space completely
    // Use zoom + stretch to ensure no black/white spaces
    // For camera sources, use normal drawImage
    if (sourceId === 'screen') {
      // Screen: preserve aspect ratio (object-contain) to avoid zooming
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const sourceAspect = video.videoWidth / video.videoHeight;
        const targetAspect = layout.width / layout.height;

        let drawWidth = layout.width;
        let drawHeight = layout.height;
        let drawX = layout.x;
        let drawY = layout.y;

        if (Math.abs(sourceAspect - targetAspect) > 0.01) {
          if (sourceAspect > targetAspect) {
            drawHeight = layout.width / sourceAspect;
            drawY = layout.y + (layout.height - drawHeight) / 2;
          } else {
            drawWidth = layout.height * sourceAspect;
            drawX = layout.x + (layout.width - drawWidth) / 2;
          }
        }

        this.ctx.drawImage(
          video,
          0, 0, video.videoWidth, video.videoHeight,
          drawX, drawY, drawWidth, drawHeight
        );
      } else {
        // Draw loading placeholder if dimensions are not ready
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(layout.x, layout.y, layout.width, layout.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Initializing Screen Share...', layout.x + layout.width/2, layout.y + layout.height/2);
      }
    } else {
      // Camera: Use object-cover behavior to match preview
      const videoAspect = video.videoWidth / video.videoHeight;
      const layoutAspect = layout.width / layout.height;
      
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = video.videoWidth;
      let sourceHeight = video.videoHeight;

      // Calculate crop if aspect ratios differ significantly
      if (Math.abs(videoAspect - layoutAspect) > 0.01) {
        if (videoAspect > layoutAspect) {
          // Video is wider - crop width
          sourceHeight = video.videoHeight;
          sourceWidth = sourceHeight * layoutAspect;
          sourceX = (video.videoWidth - sourceWidth) / 2;
          sourceY = (video.videoHeight - sourceHeight) / 2;
        } else {
          // Video is taller - crop height
          sourceWidth = video.videoWidth;
          sourceHeight = sourceWidth / layoutAspect;
          sourceX = 0;
          sourceY = (video.videoHeight - sourceHeight) / 2;
        }
      }

      // DEBUG LOGGING
      if (Math.random() < 0.05) { // Increased to 5% for better visibility during debug
          console.log(`[Compositor Debug Rounded] Source: ${sourceId}`, {
              video: `${video.videoWidth}x${video.videoHeight}`,
              layout: `${layout.width}x${layout.height}`,
              crop: `x:${Math.round(sourceX)} y:${Math.round(sourceY)} w:${Math.round(sourceWidth)} h:${Math.round(sourceHeight)}`,
              aspects: `v:${videoAspect.toFixed(2)} l:${layoutAspect.toFixed(2)}`
          });
      }

      this.ctx.drawImage(
        video,
        sourceX, sourceY, sourceWidth, sourceHeight,
        layout.x, layout.y, layout.width, layout.height
      );
    }
  }

  /**
   * Draw rounded rectangle path
   */
  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * Get current performance metrics with enhanced tracking
   */
  getPerformanceMetrics(): PerformanceMetrics {
    // Calculate average render time from recent samples
    const averageRenderTime = this.renderTimes.length > 0
      ? this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length
      : 0;
    
    // Monitor memory usage
    const memoryUsage = this.calculateMemoryUsage();
    
    // Calculate performance health score (0-100)
    const performanceHealthScore = this.calculatePerformanceHealthScore();
    
    // Performance is good if FPS >= 25, render time < 30ms, and health score > 70
    const isPerformanceGood = this.currentFps >= 25 && averageRenderTime < 30 && performanceHealthScore > 70;
    
    return {
      fps: this.currentFps,
      droppedFrames: this.droppedFrames,
      averageRenderTime,
      memoryUsage,
      isPerformanceGood
    };
  }
  
  /**
   * Calculate memory usage with browser memory API when available
   */
  private calculateMemoryUsage(): number {
    const now = performance.now();
    
    // Check memory every 2 seconds to avoid performance impact
    if (now - this.lastMemoryCheck < 2000 && this.memoryUsageHistory.length > 0) {
      return this.memoryUsageHistory[this.memoryUsageHistory.length - 1];
    }
    
    this.lastMemoryCheck = now;
    
    let memoryUsage = 0;
    
    // Try to use browser memory API if available
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize || 0;
    } else {
      // Fallback: estimate based on canvas and video elements
      // Canvas memory: width * height * 4 bytes (RGBA)
      const canvasMemory = this.canvas.width * this.canvas.height * 4;
      
      // Video elements memory: rough estimate based on resolution
      const videoMemory = Array.from(this.videoElements.values()).reduce((sum, sourceData) => {
        const video = sourceData.element;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          // Estimate: video dimensions * 4 bytes * 2 (double buffering)
          return sum + (video.videoWidth * video.videoHeight * 4 * 2);
        }
        return sum;
      }, 0);
      
      memoryUsage = canvasMemory + videoMemory;
    }
    
    // Store in history (keep last 30 samples)
    this.memoryUsageHistory.push(memoryUsage);
    if (this.memoryUsageHistory.length > 30) {
      this.memoryUsageHistory.shift();
    }
    
    return memoryUsage;
  }
  
  /**
   * Calculate performance health score (0-100)
   * Based on FPS, dropped frames ratio, render time, and memory usage
   */
  private calculatePerformanceHealthScore(): number {
    let score = 100;
    
    // FPS score (40% weight)
    // Target: 30 FPS, acceptable: 25 FPS, poor: < 20 FPS
    const fpsScore = Math.min(100, (this.currentFps / 30) * 100);
    score = score * 0.4 + fpsScore * 0.4;
    
    // Dropped frames score (30% weight)
    // Calculate dropped frame ratio
    const totalFrames = this.totalFramesRendered + this.droppedFrames;
    const droppedRatio = totalFrames > 0 ? this.droppedFrames / totalFrames : 0;
    const droppedScore = Math.max(0, 100 - (droppedRatio * 200)); // Penalize heavily
    score = score * 0.7 + droppedScore * 0.3;
    
    // Render time score (20% weight)
    // Target: < 16ms (60fps), acceptable: < 33ms (30fps), poor: > 50ms
    const avgRenderTime = this.renderTimes.length > 0
      ? this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length
      : 0;
    const renderTimeScore = avgRenderTime < 33 
      ? 100 
      : Math.max(0, 100 - ((avgRenderTime - 33) * 2));
    score = score * 0.8 + renderTimeScore * 0.2;
    
    // Memory usage score (10% weight)
    // Check if memory is growing rapidly
    if (this.memoryUsageHistory.length >= 10) {
      const recentMemory = this.memoryUsageHistory.slice(-10);
      const memoryGrowth = recentMemory[recentMemory.length - 1] - recentMemory[0];
      const memoryGrowthRate = memoryGrowth / recentMemory[0];
      
      // Penalize if memory growing > 20% in recent samples
      const memoryScore = memoryGrowthRate > 0.2 ? 50 : 100;
      score = score * 0.9 + memoryScore * 0.1;
    }
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Get the canvas element (for preview)
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get the current layout
   */
  getCurrentLayout(): CompositorLayout {
    return this.currentLayout;
  }
  
  /**
   * Get all available layout types
   */
  getAvailableLayouts(): LayoutType[] {
    return getAvailableLayoutTypes();
  }
  
  /**
   * Apply a layout by type
   */
  applyLayoutByType(layoutType: LayoutType, enableTransition: boolean = true): void {
    const layout = getLayoutByType(layoutType);
    this.setLayout(layout, enableTransition);
  }

  /**
   * Set callback for performance warnings
   */
  setPerformanceWarningCallback(callback: (message: string) => void): void {
    this.performanceWarningCallback = callback;
  }
  
  /**
   * Check for performance degradation and apply adaptive quality adjustments
   */
  private checkPerformanceDegradation(): void {
    const now = performance.now();
    
    // Check performance every 5 seconds
    if (now - this.lastPerformanceCheck < 5000) {
      return;
    }
    
    this.lastPerformanceCheck = now;
    
    // Detect performance degradation (FPS < 20)
    if (this.currentFps < 20 && this.currentFps > 0) {
      this.performanceDegradationCount++;
      console.warn('Performance degradation detected:', {
        fps: this.currentFps,
        droppedFrames: this.droppedFrames,
        count: this.performanceDegradationCount
      });
      
      // Apply adaptive quality after 2 consecutive degradation detections
      if (this.performanceDegradationCount >= 2) {
        this.applyAdaptiveQuality();
      }
    } else if (this.currentFps >= 25) {
      // Reset counter if performance recovers
      this.performanceDegradationCount = 0;
    }
  }
  
  /**
   * Apply adaptive quality adjustments based on performance
   */
  private applyAdaptiveQuality(): void {
    console.log('Applying adaptive quality adjustments', {
      currentLevel: this.currentQualityLevel,
      fps: this.currentFps,
      droppedFrames: this.droppedFrames
    });
    
    // Step 1: Disable visual effects (shadows, borders)
    if (this.visualEffectsEnabled && this.currentQualityLevel === 'high') {
      this.visualEffectsEnabled = false;
      this.currentQualityLevel = 'medium';
      
      const message = 'Performance degraded. Visual effects disabled to maintain frame rate.';
      console.warn(message);
      if (this.performanceWarningCallback) {
        this.performanceWarningCallback(message);
      }
      
      // Reset counter to give time for adjustment to take effect
      this.performanceDegradationCount = 0;
      return;
    }
    
    // Step 2: Reduce resolution
    if (!this.visualEffectsEnabled && this.currentQualityLevel === 'medium') {
      this.reduceResolution();
      this.currentQualityLevel = 'low';
      
      const message = 'Performance critically low. Resolution reduced to maintain recording.';
      console.warn(message);
      if (this.performanceWarningCallback) {
        this.performanceWarningCallback(message);
      }
      
      // Reset counter
      this.performanceDegradationCount = 0;
      return;
    }
    
    // Step 3: Already at lowest quality - just warn
    if (this.currentQualityLevel === 'low') {
      const message = 'Performance remains low. Consider closing other applications or reducing video quality.';
      console.warn(message);
      if (this.performanceWarningCallback) {
        this.performanceWarningCallback(message);
      }
    }
  }
  
  /**
   * Reduce canvas resolution to improve performance
   */
  private reduceResolution(): void {
    const currentWidth = this.canvas.width;
    const currentHeight = this.canvas.height;
    
    // Reduce by 25% (to ~720p from 1080p, or ~480p from 720p)
    const newWidth = Math.floor(currentWidth * 0.75);
    const newHeight = Math.floor(currentHeight * 0.75);
    
    console.log('Reducing resolution:', {
      from: `${currentWidth}x${currentHeight}`,
      to: `${newWidth}x${newHeight}`
    });
    
    // Update canvas size
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    
    // Update layout to match new canvas size
    if (this.currentLayout) {
      const scaleFactor = newWidth / currentWidth;
      const scaledLayout = this.scaleLayout(this.currentLayout, scaleFactor);
      this.currentLayout = scaledLayout;
      
      // Update source configurations
      for (const [sourceId, sourceData] of this.videoElements.entries()) {
        const layoutKey = sourceId as 'camera' | 'screen';
        if (scaledLayout.sources[layoutKey]) {
          sourceData.config.layout = scaledLayout.sources[layoutKey]!;
        }
      }
    }
  }
  
  /**
   * Scale layout to match new canvas dimensions
   */
  private scaleLayout(layout: CompositorLayout, scaleFactor: number): CompositorLayout {
    const scaledLayout: CompositorLayout = {
      type: layout.type,
      canvas: {
        width: Math.floor(layout.canvas.width * scaleFactor),
        height: Math.floor(layout.canvas.height * scaleFactor)
      },
      sources: {}
    };
    
    for (const [sourceId, sourceLayout] of Object.entries(layout.sources)) {
      if (sourceLayout) {
        scaledLayout.sources[sourceId as 'camera' | 'screen'] = {
          x: Math.floor(sourceLayout.x * scaleFactor),
          y: Math.floor(sourceLayout.y * scaleFactor),
          width: Math.floor(sourceLayout.width * scaleFactor),
          height: Math.floor(sourceLayout.height * scaleFactor),
          zIndex: sourceLayout.zIndex,
          borderRadius: sourceLayout.borderRadius ? Math.floor(sourceLayout.borderRadius * scaleFactor) : undefined,
          border: sourceLayout.border,
          shadow: sourceLayout.shadow
        };
      }
    }
    
    return scaledLayout;
  }
  
  /**
   * Get current quality level
   */
  getCurrentQualityLevel(): 'high' | 'medium' | 'low' {
    return this.currentQualityLevel;
  }
  
  /**
   * Check if visual effects are enabled
   */
  areVisualEffectsEnabled(): boolean {
    return this.visualEffectsEnabled;
  }
  
  /**
   * Set volume for a specific audio source
   */
  setAudioVolume(sourceId: string, volume: number): boolean {
    if (!this.audioMixer) {
      console.warn('Audio mixer not available');
      return false;
    }
    return this.audioMixer.setVolume(sourceId, volume);
  }
  
  /**
   * Mute/unmute a specific audio source
   */
  setAudioMuted(sourceId: string, muted: boolean): boolean {
    if (!this.audioMixer) {
      console.warn('Audio mixer not available');
      return false;
    }
    return this.audioMixer.setMuted(sourceId, muted);
  }
  
  /**
   * Get volume for a specific audio source
   */
  getAudioVolume(sourceId: string): number {
    if (!this.audioMixer) {
      return 0;
    }
    return this.audioMixer.getVolume(sourceId);
  }
  
  /**
   * Check if audio source is muted
   */
  isAudioMuted(sourceId: string): boolean {
    if (!this.audioMixer) {
      return false;
    }
    return this.audioMixer.isMuted(sourceId);
  }
  
  /**
   * Get all audio source IDs
   */
  getAudioSourceIds(): string[] {
    if (!this.audioMixer) {
      return [];
    }
    return this.audioMixer.getAudioSourceIds();
  }
  
  /**
   * Check if audio is enabled
   */
  isAudioEnabled(): boolean {
    return this.audioEnabled;
  }
  
  /**
   * Get audio level for a specific source
   */
  getAudioLevel(sourceId: string): number {
    if (!this.audioMixer) {
      return 0;
    }
    return this.audioMixer.getAudioLevel(sourceId);
  }
  
  /**
   * Get audio levels for all sources
   */
  getAllAudioLevels(): import('./AudioMixer').AudioLevelData[] {
    if (!this.audioMixer) {
      return [];
    }
    return this.audioMixer.getAllAudioLevels();
  }
  
  /**
   * Start monitoring audio levels
   */
  startAudioLevelMonitoring(callback: (levels: import('./AudioMixer').AudioLevelData[]) => void, intervalMs?: number): void {
    if (!this.audioMixer) {
      console.warn('Audio mixer not available');
      return;
    }
    this.audioMixer.startLevelMonitoring(callback, intervalMs);
  }
  
  /**
   * Stop monitoring audio levels
   */
  stopAudioLevelMonitoring(): void {
    if (!this.audioMixer) {
      return;
    }
    this.audioMixer.stopLevelMonitoring();
  }
  
  /**
   * Clean up all resources with comprehensive memory management
   */
  dispose(): void {
    console.log('Disposing VideoCompositor with comprehensive cleanup');
    
    // Stop rendering and cancel animation frames
    this.stop();
    
    // Ensure animation frame is cancelled
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Dispose audio mixer
    if (this.audioMixer) {
      this.audioMixer.dispose();
      this.audioMixer = null;
      console.log('AudioMixer disposed');
    }
    
    // Clean up video elements properly
    // CRITICAL: Don't stop the source stream tracks!
    // The source streams (camera, screen) are owned by useVideoRecorder, not the compositor.
    // Stopping them would break the preview video elements that also use these streams.
    this.videoElements.forEach((sourceData, sourceId) => {
      console.log(`Cleaning up video source: ${sourceId} (preserving source stream)`);
      
      // Pause video element
      sourceData.element.pause();
      
      // Remove all event listeners
      sourceData.element.onloadedmetadata = null;
      sourceData.element.onerror = null;
      sourceData.element.onplaying = null;
      
      // CRITICAL FIX: Don't stop the source stream tracks!
      // The streams are shared with preview video elements and useVideoRecorder.
      // Only clear the srcObject reference, but leave the stream tracks running.
      // if (sourceData.element.srcObject) {
      //   const stream = sourceData.element.srcObject as MediaStream;
      //   stream.getTracks().forEach(track => {
      //     track.stop(); // DON'T DO THIS - streams are owned by useVideoRecorder
      //   });
      // }
      
      // Clear source object reference (but don't stop the stream)
      sourceData.element.srcObject = null;
      
      // Remove from DOM if attached
      if (sourceData.element.parentNode) {
        sourceData.element.remove();
      }
    });
    this.videoElements.clear();
    
    // Remove hidden container
    if (this.hiddenContainer && this.hiddenContainer.parentNode) {
      this.hiddenContainer.remove();
    }
    
    // Stop output stream tracks
    if (this.outputStream) {
      this.outputStream.getTracks().forEach(track => {
        track.stop();
      });
      this.outputStream = null;
    }
    
    // Clear canvas completely
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Reset canvas to minimal size to free memory
    this.canvas.width = 1;
    this.canvas.height = 1;
    
    // Clear all performance tracking arrays
    this.renderTimes = [];
    this.memoryUsageHistory = [];
    this.dirtyRegions.clear();
    
    // Reset all counters
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.totalFramesRendered = 0;
    this.performanceDegradationCount = 0;
    
    // Reset state objects
    this.lastCanvasState = {};
    this.previousLayout = null;
    this.performanceWarningCallback = null;
    
    // Reset flags
    this.isRunning = false;
    this.isTransitioning = false;
    this.visualEffectsEnabled = true;
    
    console.log('VideoCompositor disposed - all resources cleaned up');
  }
  
  /**
   * Stop the compositor with proper stream cleanup
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Stop output stream tracks properly
    if (this.outputStream) {
      this.outputStream.getTracks().forEach(track => {
        console.log(`Stopping output track: ${track.kind} - ${track.label}`);
        track.stop();
      });
      // Don't set to null here - let dispose() handle it
    }
    
    console.log('Compositor stopped', {
      totalFrames: this.totalFramesRendered,
      droppedFrames: this.droppedFrames,
      finalFPS: this.currentFps
    });
  }
}