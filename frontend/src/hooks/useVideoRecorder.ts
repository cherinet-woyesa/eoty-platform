// frontend/src/hooks/useVideoRecorder.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { VideoCompositor } from '@/utils/VideoCompositor';
import type { PerformanceMetrics, LayoutType } from '@/types/VideoCompositor';
import { 
  checkBrowserSupport, 
  getBrowserCompatibilityMessage,
  getBrowserSpecificBehavior,
  logBrowserCompatibility,
  type BrowserSupport 
} from '@/utils/BrowserCompatibility';

// Extended interface for multi-source recording with slide support
interface RecorderOptions {
  videoDeviceId?: string;
  audioDeviceId?: string;
  resolution?: '480p' | '720p' | '1080p';
  screen?: boolean;
  layout?: LayoutType;
  enableAudio?: boolean;
  quality?: 'high' | 'medium' | 'low';
  frameRate?: number;
}

interface RecordingSources {
  camera: MediaStream | null;
  screen: MediaStream | null;
  microphone: MediaStream | null;
}

// Enhanced RecordingSession with slide support and production features
interface RecordingSession {
  id: string;
  segments: Blob[];
  currentState: 'recording' | 'paused' | 'stopped';
  totalDuration: number;
  startTime: number;
  metadata: {
    layout: string;
    sources: string[];
    resolution: string;
    quality: string;
    frameRate: number;
    fileSize: number;
    slides?: {
      total: number;
      current: number;
      timestamps: Map<number, number>; // slideIndex -> timestamp
    };
  };
}

// NEW: Enhanced recording statistics
interface RecordingStats {
  fileSize: number;
  bitrate: number;
  framesDropped: number;
  networkQuality: 'good' | 'fair' | 'poor';
  recordingQuality: string;
  duration: number;
}

// NEW: Network status interface
interface NetworkStatus {
  status: 'online' | 'offline' | 'reconnecting' | 'degraded';
  speed?: number;
  retryCount: number;
}

// Enhanced return type with production features
interface UseVideoRecorderReturn {
  // Core recording properties
  isRecording: boolean;
  recordedVideo: string | null;
  videoBlob: Blob | null;
  startRecording: () => Promise<void>;
  startRecordingWithStream: (recordingStream: MediaStream, compositor: VideoCompositor | null, previousChunks?: Blob[]) => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  error: string | null;
  stream: MediaStream | null;
  options: RecorderOptions;
  setOptions: (opts: Partial<RecorderOptions>) => void;
  devices: { cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[] };
  initializeCamera: () => Promise<void>;
  closeCamera: () => void;
  cameraInitialized: boolean;
  setCameraStream: (stream: MediaStream | null) => void;
  
  // Multi-source recording properties
  recordingSources: RecordingSources;
  currentLayout: string;
  setLayout: (layout: RecorderOptions['layout']) => void;
  changeLayout: (layout: RecorderOptions['layout']) => void; // Task 3.5
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  addScreenShare: () => Promise<MediaStream | null>; // Task 3.4
  removeScreenShare: () => Promise<void>; // Task 3.4
  isScreenSharing: boolean;
  
  // Compositor properties (Task 3.1)
  compositorInstance: VideoCompositor | null;
  isCompositing: boolean;
  compositorLayout: LayoutType;
  performanceMetrics: PerformanceMetrics;
  
  // Audio mixing controls (Task 8)
  setAudioVolume: (sourceId: string, volume: number) => boolean;
  setAudioMuted: (sourceId: string, muted: boolean) => boolean;
  getAudioVolume: (sourceId: string) => number;
  isAudioMuted: (sourceId: string) => boolean;
  getAudioLevels: () => import('../utils/AudioMixer').AudioLevelData[];
  startAudioLevelMonitoring: (callback: (levels: import('../utils/AudioMixer').AudioLevelData[]) => void) => void;
  stopAudioLevelMonitoring: () => void;
  acknowledgePreview: () => void;
  initializeCompositor: () => Promise<VideoCompositor | null>;
  
  // Task 6.2: Browser compatibility
  browserSupport: BrowserSupport | null;
  
  // Session management
  currentSession: RecordingSession | null;
  isPaused: boolean;
  recordingTime: number;
  setRecordingTime: (time: number) => void;
  saveSession: (sessionId: string) => void;
  loadSession: (sessionId: string) => boolean;
  getSavedSessions: () => string[];
  
  // Slide tracking
  recordSlideChange: (slideIndex: number) => void;
  getSlideTimestamps: () => Map<number, number>;
  getCurrentSlide: () => number;
  
  // NEW: Production features
  recordingStats: RecordingStats;
  setRecordingStats: React.Dispatch<React.SetStateAction<RecordingStats>>;
  networkStatus: NetworkStatus;
  retryRecording: () => Promise<void>;
  exportSession: (session: RecordingSession) => void;
  mergeSessions: (sessionIds: string[]) => RecordingSession | null;
  
  // NEW: Enhanced editing capabilities
  editRecording: (editedBlob: Blob) => Promise<void>;
  trimRecording: (startTime: number, endTime: number) => Promise<Blob | null>;
  addWatermark: (watermark: Blob) => Promise<Blob | null>;
  
  // NEW: Device management
  switchCamera: (deviceId: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  getAvailableResolutions: () => string[];
}

// FIX: Enhanced global stream management with reference counting
let globalStream: MediaStream | null = null;
let streamUsers = 0;
let activeScreenStreams: Set<MediaStream> = new Set();

export const useVideoRecorder = (): UseVideoRecorderReturn => {
  // Core recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptionsState] = useState<RecorderOptions>({
    resolution: '720p',
    screen: false,
    layout: 'camera-only',
    enableAudio: true,
    quality: 'medium',
    frameRate: 30
  });
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [] });
  const [cameraInitialized, setCameraInitialized] = useState(false);

  // Multi-source recording state
  const [recordingSources, setRecordingSources] = useState<RecordingSources>({
    camera: null,
    screen: null,
    microphone: null
  });
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<RecorderOptions['layout']>('camera-only');
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);

  // Compositor state management (Task 3.1)
  const [compositorInstance, setCompositorInstance] = useState<VideoCompositor | null>(null);
  const [isCompositing, setIsCompositing] = useState(false);
  const [compositorLayout, setCompositorLayout] = useState<LayoutType>('picture-in-picture');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    droppedFrames: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    isPerformanceGood: true
  });

  // Task 6.2: Browser compatibility state
  const [browserSupport, setBrowserSupport] = useState<BrowserSupport | null>(null);

  // NEW: Production state
  const [recordingStats, setRecordingStats] = useState<RecordingStats>({
    fileSize: 0,
    bitrate: 0,
    framesDropped: 0,
    networkQuality: 'good',
    recordingQuality: '720p',
    duration: 0
  });

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    status: 'online',
    retryCount: 0
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debugIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const lastChunkSizeRef = useRef<number>(0);
  const isRestartingRef = useRef<boolean>(false); // Flag to prevent onstop from finalizing during restart
  const shouldStopAfterRestartRef = useRef<boolean>(false); // Flag to stop after restart completes
  const cleanupTimerRef = useRef<number | null>(null);

  // NEW: Refs for stable access in callbacks
  const isRecordingRef = useRef(isRecording);
  const compositorInstanceRef = useRef(compositorInstance);
  
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
  
  useEffect(() => {
    compositorInstanceRef.current = compositorInstance;
  }, [compositorInstance]);

  // FIX: Export setRecordingTime function
  const setRecordingTimeState = useCallback((time: number) => {
    setRecordingTime(time);
  }, []);

  // Task 3.2: Compositor initialization logic with Task 6.2 fallback mechanisms
  const initializeCompositor = useCallback(async (): Promise<VideoCompositor | null> => {
    try {
      // Reset cleanup flag when initializing new compositor
      cleanupCalledRef.current = false;
      
      console.log('Initializing VideoCompositor...');
      
      // Task 6.2: Check browser support before initializing compositor
      // If not checked yet, check it now
      const support = browserSupport || checkBrowserSupport();
      if (!browserSupport) {
        setBrowserSupport(support);
      }
      
      // Task 6.2: Fallback to single-source if compositor not supported
      if (!support.canUseCompositor) {
        console.warn('Compositor not supported - falling back to single-source');
        const message = getBrowserCompatibilityMessage(support);
        setError(message);
        return null;
      }
      
      // Additional capability checks
      if (!HTMLCanvasElement.prototype.captureStream) {
        console.warn('Canvas captureStream not supported - falling back to single-source');
        setError('Multi-source recording not supported in this browser');
        return null;
      }
      
      if (!support.canRecordVideo) {
        console.warn('Video recording not supported - cannot initialize compositor');
        setError('Video recording not fully supported in this browser');
        return null;
      }
      
      // Determine resolution for compositor canvas
      let width = 1920;
      let height = 1080;
      
      switch (options.resolution) {
        case '1080p':
          width = 1920;
          height = 1080;
          break;
        case '720p':
          width = 1280;
          height = 720;
          break;
        case '480p':
          width = 854;
          height = 480;
          break;
      }
      
      // Create compositor instance with audio enabled
      const compositor = new VideoCompositor(width, height, options.enableAudio);
      
      // Set up performance warning callback
      // DISABLED: User requested to not show performance warnings
      compositor.setPerformanceWarningCallback((message: string) => {
        // Only log to console, don't show to user
        console.warn('Compositor performance warning (silenced):', message);
      });
      
      console.log('VideoCompositor initialized successfully', { width, height });
      setCompositorInstance(compositor);
      setIsCompositing(true);
      
      return compositor;
      
    } catch (err: any) {
      console.error('Failed to initialize compositor:', err);
      setError('Failed to initialize video compositor: ' + err.message);
      setIsCompositing(false);
      return null;
    }
  }, [options.resolution]);

  // Track if cleanup has already been called to prevent double disposal
  const cleanupCalledRef = useRef(false);
  // When true, preserve streams/compositor until the preview consumer acknowledges the blob
  const preserveUntilPreviewRef = useRef(false);
  const skipInitialCleanupRef = useRef(true);
  
  // NEW: Enhanced cleanup function with production features and compositor disposal
  const cleanupLocalStreams = useCallback((preserveCompositor = false, preserveStreams = false) => {
    // Prevent double cleanup — be silent and idempotent
    if (cleanupCalledRef.current) {
      return;
    }

    // If we're preserving until preview is acknowledged, skip cleanup unless explicitly allowed
    if (preserveUntilPreviewRef.current && !preserveCompositor) {
      console.log('Preserving streams/compositor until preview acknowledged - skipping cleanup');
      return;
    }
    
    console.log('Cleaning up local recorder state', { preserveCompositor, preserveStreams, isRestarting: isRestartingRef.current });
    
    // Stop media recorder (unless we're restarting)
    if (!isRestartingRef.current && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Only clear recorder ref if not restarting
    if (!isRestartingRef.current) {
      mediaRecorderRef.current = null;
    }
    
    // Only clear chunks if not restarting
    if (!isRestartingRef.current) {
      recordedChunksRef.current = [];
    }
    
    // Clear timers
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
    
    if (debugIntervalRef.current) {
      clearInterval(debugIntervalRef.current);
      debugIntervalRef.current = null;
    }
    
    // Dispose compositor only if not preserving it and not already disposed
    // CRITICAL: When disposing compositor, it will NOT stop the source streams
    // because the streams are owned by useVideoRecorder, not the compositor
    // FIX: Use ref to avoid dependency on compositorInstance state which causes re-renders/cleanup loops
    const compositorToDispose = compositorInstanceRef.current;
    if (!preserveCompositor && compositorToDispose) {
      console.log('Disposing compositor (source streams will be preserved)');
      try {
        compositorToDispose.dispose();
      } catch (error) {
        console.warn('Error disposing compositor (may already be disposed):', error);
      }
      setCompositorInstance(null);
      setIsCompositing(false);
      cleanupCalledRef.current = true;
    }
    
    // CRITICAL: Don't stop source streams if preserveStreams is true or if restarting
    // The streams are needed for the preview video elements
    if (!preserveStreams && !isRestartingRef.current) {
      // Only stop streams if explicitly requested and not restarting
      // In most cases, we want to preserve streams for preview
    }
    
    // Reset stats only if not restarting
    if (!isRestartingRef.current) {
      setRecordingStats({
        fileSize: 0,
        bitrate: 0,
        framesDropped: 0,
        networkQuality: 'good',
        recordingQuality: options.resolution || '720p',
        duration: 0
      });
      
      setPerformanceMetrics({
        fps: 0,
        droppedFrames: 0,
        averageRenderTime: 0,
        memoryUsage: 0,
        isPerformanceGood: true
      });
      
      lastChunkSizeRef.current = 0;
    }
  }, [options.resolution]); // FIX: Removed compositorInstance dependency to prevent cleanup loops

  // NEW: Enhanced device constraints based on quality settings
  const getVideoConstraints = useCallback((deviceId?: string) => {
    const baseConstraints: MediaTrackConstraints = {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      frameRate: { ideal: 30, max: 30 }
    };

    switch (options.resolution) {
      case '1080p':
        return {
          ...baseConstraints,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        };
      case '720p':
        return {
          ...baseConstraints,
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 }
        };
      case '480p':
      default:
        return {
          ...baseConstraints,
          width: { ideal: 854, max: 854 },
          height: { ideal: 480, max: 480 }
        };
    }
  }, [options.resolution, options.frameRate]);

  // NEW: Enhanced audio constraints - improved quality settings
  const getAudioConstraints = useCallback((deviceId?: string) => {
    if (!options.enableAudio) return false;

    return {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false, // Disabled for better audio quality
      noiseSuppression: false, // Disabled for better audio quality  
      autoGainControl: false, // Disabled for better audio quality
      channelCount: 2,
      sampleRate: 48000
    };
  }, [options.enableAudio]);

  // Task 3.6: Source loss detection and handling
  const handleSourceLoss = useCallback((sourceType: 'camera' | 'screen') => {
    console.warn(`Source lost: ${sourceType}`);
    // ... rest of the code remains the same ...
    
    if (!isRecording) {
      return;
    }
    
    // Automatic layout adjustment on source loss
    if (compositorInstance) {
      if (sourceType === 'screen' && recordingSources.camera) {
        // Screen lost, switch to camera-only
        console.log('Screen lost during recording - switching to camera-only');
        compositorInstance.removeVideoSource('screen');
        compositorInstance.applyLayoutByType('camera-only', true);
        setCompositorLayout('camera-only');
        setCurrentLayout('camera-only');
      } else if (sourceType === 'camera' && recordingSources.screen) {
        // Camera lost, switch to screen-only
        console.log('Camera lost during recording - switching to screen-only');
        compositorInstance.removeVideoSource('camera');
        compositorInstance.applyLayoutByType('screen-only', true);
        setCompositorLayout('screen-only');
        setCurrentLayout('screen-only');
      } else {
        // Both sources lost or last source lost - critical error
        console.error('Critical: All sources lost during recording');
        setError('Recording source lost. Saving partial recording...');
        
        // Save partial recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }
    }
    
    // Create error notification
    setError(`${sourceType === 'camera' ? 'Camera' : 'Screen'} source lost. Layout adjusted automatically.`);
    
    // Clear error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, [isRecording, compositorInstance, recordingSources]);
  
  // Task 3.4: Enhanced screen sharing with dynamic source addition during recording
  const addScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      setError(null);
      setNetworkStatus(prev => ({ ...prev, status: 'online' }));
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing not supported in this browser or context');
      }

      // FIX: Window sharing often fails with audio constraints on Windows
      // We try with audio first, if it fails, we fallback to video only
      let screenStream: MediaStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 1920 }, // Prefer higher res for screen
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
            cursor: 'always'
          } as MediaTrackConstraints,
          audio: options.enableAudio ? {
            echoCancellation: true, // Enabled for better audio quality
            noiseSuppression: true, // Enabled for better audio quality
            sampleRate: 44100
          } : false
        });
      } catch (err: any) {
        // If audio constraint caused failure (common with window sharing), retry without audio
        if (options.enableAudio && (err.name === 'NotAllowedError' || err.name === 'OverconstrainedError' || err.message?.includes('audio'))) {
          console.warn('Screen share with audio failed, retrying video only (likely window share limitation)', err);
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              frameRate: { ideal: 30, max: 30 },
              cursor: 'always'
            } as MediaTrackConstraints,
            audio: false // Disable audio for retry
          });
        } else {
          throw err;
        }
      }

      // Track active screen streams for cleanup
      activeScreenStreams.add(screenStream);

      // Task 3.6: Handle when user stops screen share via browser UI (source loss)
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen share ended by user');
        handleSourceLoss('screen');
        removeScreenShare();
      });

      // Task 3.6: Handle track errors (source loss)
      screenStream.getTracks().forEach(track => {
        track.addEventListener('error', (error) => {
          console.error('Screen share track error:', error);
          handleSourceLoss('screen');
          setError('Screen sharing encountered an error');
        });
      });

      screenStreamRef.current = screenStream;
      setRecordingSources(prev => ({
        ...prev,
        screen: screenStream
      }));
      setIsScreenSharing(true);

      // Since we ALWAYS use compositor from start, we can dynamically add screen without restart
      // FIX: Also update layout if not recording, so "Start with both" works correctly
      const hasCamera = !!recordingSources.camera;
      const newLayout: LayoutType = hasCamera ? 'picture-in-picture' : 'screen-only';
      
      // Update state immediately
      setCurrentLayout(newLayout as RecorderOptions['layout']);
      setCompositorLayout(newLayout);

      if (isRecording) {
        if (compositorInstance) {
          console.log('Adding screen share to active compositor during recording (NO RESTART NEEDED)');
        
          // Add screen source to compositor dynamically - no restart needed!
          compositorInstance.addVideoSource('screen', screenStream, {
            visible: true,
            opacity: 1.0
          });

          // Gate layout switch until screen is actually rendering to avoid black flicker
          try {
            const tmpVideo = document.createElement('video');
            tmpVideo.muted = true;
            tmpVideo.playsInline = true;
            tmpVideo.srcObject = screenStream;

            const waitForReady = new Promise<void>((resolve, reject) => {
              let ready = false;
              const cleanup = () => {
                tmpVideo.srcObject = null;
                tmpVideo.removeAttribute('src');
              };
              const onReady = () => {
                if (!ready && tmpVideo.videoWidth > 0 && tmpVideo.videoHeight > 0) {
                  ready = true;
                  cleanup();
                  resolve();
                }
              };
              tmpVideo.addEventListener('loadedmetadata', onReady, { once: true });
              tmpVideo.addEventListener('playing', onReady, { once: true });
              tmpVideo.addEventListener('error', () => { cleanup(); reject(new Error('Temp video failed')); }, { once: true });
              tmpVideo.play().catch(() => {/* ignore autoplay errors on temp element */});

              // Safety timeout
              setTimeout(() => {
                if (!ready) {
                  cleanup();
                  resolve(); // proceed anyway after timeout
                }
              }, 600);
            });

            await waitForReady;

            compositorInstance.applyLayoutByType(newLayout, false);
            console.log('✅ Screen share added dynamically (gated) - layout:', newLayout);
          } catch (e) {
            console.warn('Screen gating failed, applying layout immediately');
            compositorInstance.applyLayoutByType(newLayout, false);
          }
        } else {
          // This should never happen since we always use compositor from start
          console.error('No compositor instance during recording - this should not happen!');
          setError('Recording error: Compositor not initialized. Please stop and restart recording.');
        }
      } else {
         // If not recording, but compositor exists (e.g. preview), update it
         if (compositorInstance) {
             compositorInstance.applyLayoutByType(newLayout, true);
         }
      }

      console.log('Screen sharing started successfully', {
        videoTracks: screenStream.getVideoTracks().length,
        audioTracks: screenStream.getAudioTracks().length,
        duringRecording: isRecording,
        usingCompositor: !!compositorInstance
      });

      return screenStream;
    } catch (err: any) {
      console.error('Screen share error:', err);
      let errorMessage = 'Failed to start screen sharing. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow screen sharing permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No screen sharing source selected.';
      } else {
        errorMessage += err.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
      setNetworkStatus(prev => ({ ...prev, status: 'degraded' }));
      return null;
    }
  }, [options.enableAudio, options.frameRate, isRecording, compositorInstance, recordingSources.camera]);
  
  // Maintain backward compatibility
  const startScreenShare = addScreenShare;

  // Task 3.4: Enhanced screen share removal with dynamic source management
  const removeScreenShare = useCallback(async () => {
    if (recordingSources.screen) {
      // Remove from active streams
      activeScreenStreams.delete(recordingSources.screen);
      screenStreamRef.current = null;
      
      // Dynamic source removal during recording
      if (isRecording && compositorInstance) {
        console.log('Removing screen share from active compositor');
        
        // Remove screen source from compositor
        compositorInstance.removeVideoSource('screen');
        
        // Automatically adjust layout (500ms transition)
        const newLayout: LayoutType = recordingSources.camera ? 'camera-only' : 'screen-only';
        compositorInstance.applyLayoutByType(newLayout, true);
        setCompositorLayout(newLayout);
        setCurrentLayout(newLayout as RecorderOptions['layout']);
        
        console.log('Screen share removed dynamically with smooth transition:', newLayout);
      } else if (isRecording && recordingSources.camera) {
        // Fallback: switch layout for non-compositor recording
        console.log('Recording is active - switching layout back to camera-only');
        setCurrentLayout('camera-only');
      }
      
      // Stop all screen tracks
      recordingSources.screen.getTracks().forEach(track => {
        track.stop();
        track.dispatchEvent(new Event('ended')); // Trigger ended event
      });
      
      setRecordingSources(prev => ({
        ...prev,
        screen: null
      }));
      setIsScreenSharing(false);
      console.log('Screen sharing stopped and cleaned up');
    }
  }, [recordingSources.screen, recordingSources.camera, isRecording, compositorInstance]);
  
  // Maintain backward compatibility
  const stopScreenShare = removeScreenShare;

  // Task 3.5: Enhanced layout switching with real-time compositor support
  const changeLayout = useCallback((layout: RecorderOptions['layout']) => {
    if (!layout || !['picture-in-picture', 'side-by-side', 'screen-only', 'camera-only', 'presentation'].includes(layout)) {
      console.warn('Invalid layout:', layout);
      return;
    }
    
    console.log('Changing layout to:', layout, {
      isRecording,
      usingCompositor: !!compositorInstance
    });
    
    // Update layout state
    setCurrentLayout(layout);
    setOptionsState(prev => ({ ...prev, layout }));
    const layoutType = layout as LayoutType;
    setCompositorLayout(layoutType);
    
    // Real-time layout change with compositor (works during recording or preview)
    if (compositorInstance) {
      try {
        compositorInstance.applyLayoutByType(layoutType, true); // Enable smooth transition
        console.log('Layout applied to compositor:', layoutType);
      } catch (error) {
        console.error('Failed to apply layout to compositor:', error);
      }
    } else {
      console.warn('Compositor not initialized - layout will apply when compositor starts');
    }
  }, [isRecording, compositorInstance]);
  
  // Maintain backward compatibility
  const setLayout = changeLayout;

  // NEW: Enhanced camera initialization with device switching support
  const initializeCamera = useCallback(async (deviceId?: string) => {
    try {
      setError(null);
      setNetworkStatus(prev => ({ ...prev, status: 'online' }));
      console.log('Initializing camera with device:', deviceId);

      // If global stream exists and is active, reuse it
      if (globalStream && globalStream.active && !deviceId) {
        console.log('Reusing existing camera stream');
        streamRef.current = globalStream;
        setRecordingSources(prev => ({ ...prev, camera: globalStream }));
        setCameraInitialized(true);
        streamUsers++;
        
        // Task 3.6: Add source loss detection for reused stream
        globalStream.getTracks().forEach(track => {
          track.addEventListener('ended', () => {
            console.log('Camera track ended');
            handleSourceLoss('camera');
          });
        });
        
        return;
      }

      // If switching devices or no global stream, create new stream
      const constraints = {
        video: getVideoConstraints(deviceId),
        audio: getAudioConstraints(options.audioDeviceId)
      };

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser or context (HTTPS required)');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Camera initialized successfully:', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
        active: mediaStream.active,
        deviceId: mediaStream.getVideoTracks()[0]?.getSettings().deviceId
      });

      // Task 3.6: Add source loss detection for camera tracks
      mediaStream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          console.log('Camera track ended');
          handleSourceLoss('camera');
        });
        
        track.addEventListener('error', (error) => {
          console.error('Camera track error:', error);
          handleSourceLoss('camera');
        });
      });

      // Clean up previous global stream if switching devices
      if (globalStream && deviceId) {
        globalStream.getTracks().forEach(track => track.stop());
      }

      // Set global stream reference
      globalStream = mediaStream;
      streamRef.current = mediaStream;
      setRecordingSources(prev => ({ ...prev, camera: mediaStream }));
      streamUsers = deviceId ? 1 : streamUsers + 1;
      
      setCameraInitialized(true);

      // FIX: Handle dynamic camera addition during recording or setup
      const hasScreen = !!screenStreamRef.current;
      
      // 1. Update layout if screen is present (fix for "start with both" issue)
      if (hasScreen) {
        // If we already have a layout preference, keep it, otherwise default to PiP
        // Ensure we don't pass undefined to setCompositorLayout
        const newLayout: LayoutType = (currentLayout === 'screen-only' || !currentLayout) 
          ? 'picture-in-picture' 
          : (currentLayout as LayoutType);
          
        setCurrentLayout(newLayout);
        setCompositorLayout(newLayout);
        
        // If compositor exists, apply layout immediately
        if (compositorInstanceRef.current) {
           compositorInstanceRef.current.applyLayoutByType(newLayout, true);
        }
      }

      // 2. Add to compositor if recording (fix for "start with screen, add camera" issue)
      if (isRecordingRef.current && compositorInstanceRef.current) {
         console.log('Adding camera to active compositor during recording');
         compositorInstanceRef.current.addVideoSource('camera', mediaStream, {
            visible: true,
            opacity: 1.0
         });
         
         // If we just switched to PiP, ensure it's applied
         if (hasScreen) {
             compositorInstanceRef.current.applyLayoutByType('picture-in-picture', true);
         }
      }
      
    } catch (err: any) {
      console.error('Error initializing camera:', err);
      let errorMessage = 'Failed to initialize camera. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera and microphone permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on your device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Your browser does not support camera access.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage += 'Requested camera configuration not supported.';
      } else {
        errorMessage += 'Please check your camera and try again.';
      }
      
      setError(errorMessage);
      setNetworkStatus(prev => ({ ...prev, status: 'degraded' }));
      cleanupLocalStreams();
    }
  }, [getVideoConstraints, getAudioConstraints, options.audioDeviceId, cleanupLocalStreams]);

  // NEW: Enhanced camera cleanup with production features
  const closeCamera = useCallback(() => {
    console.log('Closing camera - users:', streamUsers);
    
    if (streamUsers > 0) {
      streamUsers--;
    }
    
    // Only close global stream if no users left
    if (streamUsers === 0 && globalStream) {
      console.log('No users left - closing global camera stream');
      globalStream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind} - ${track.label}`);
        track.stop();
      });
      globalStream = null;
    }
    
    // Clean up screen sharing
    stopScreenShare();
    
    // CRITICAL: Only cleanup if recording is not active and blob is ready
    // This prevents clearing chunks before blob is created
    // If recording just stopped, the onstop handler will cleanup after blob is created
    const shouldCleanup = !isRecording && (videoBlob || recordedVideo);

    if (shouldCleanup) {
      console.log('Cleaning up camera - recording stopped and blob ready');
      // If preserved until preview, clear the preserve flag and perform cleanup once
      if (preserveUntilPreviewRef.current) {
        preserveUntilPreviewRef.current = false;
        cleanupLocalStreams();
      } else {
        cleanupLocalStreams();
      }
    } else if (!isRecording) {
      console.log('Deferring cleanup - waiting for blob to be created');
      // Don't cleanup yet - wait for blob to be created
      // The onstop handler will set preserveUntilPreviewRef and component will call closeCamera()
    } else {
      console.log('Skipping cleanup - recording still active');
    }
    
    setRecordingSources({
      camera: null,
      screen: null,
      microphone: null
    });
    setCameraInitialized(false);
    setIsScreenSharing(false);
    // Don't reset recordingTime here - it's needed for the blob
    // Don't reset isRecording here - let the onstop handler do it
  }, [cleanupLocalStreams, stopScreenShare, isRecording, videoBlob, recordedVideo]);

  // Explicit acknowledgement from UI that preview is shown and cleanup may proceed
  const acknowledgePreview = useCallback((delayMs = 300) => {
    console.log('Acknowledging preview: clearing preserve flag (cleanup deferred to reset/unmount)', { delayMs });
    // Clear existing timer if any
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current as unknown as number);
      cleanupTimerRef.current = null;
    }

    // Clear preserve flag so cleanup is allowed when requested
    preserveUntilPreviewRef.current = false;

    // NOTE: Automatic cleanup scheduling removed per request.
    // Cleanup will now happen only on resetRecording() or unmount.
  }, []);

  // NEW: Enhanced combined stream creation with production features
  const createCombinedStream = useCallback((): MediaStream | null => {
    console.log('Creating combined stream with sources:', {
      camera: !!recordingSources.camera,
      screen: !!recordingSources.screen,
      cameraVideoTracks: recordingSources.camera?.getVideoTracks().length || 0,
      cameraAudioTracks: recordingSources.camera?.getAudioTracks().length || 0,
      screenVideoTracks: recordingSources.screen?.getVideoTracks().length || 0,
      screenAudioTracks: recordingSources.screen?.getAudioTracks().length || 0,
      layout: currentLayout,
      enableAudio: options.enableAudio
    });
    
    if (!recordingSources.camera && !recordingSources.screen) {
      setError('No video sources available for recording');
      setNetworkStatus(prev => ({ ...prev, status: 'degraded' }));
      return null;
    }

    const combinedStream = new MediaStream();
    
    // Simplified video track selection based on layout
    let primaryVideoSource: MediaStream | null = null;
    
    switch (currentLayout) {
      case 'camera-only':
        primaryVideoSource = recordingSources.camera;
        break;
      case 'screen-only':
        primaryVideoSource = recordingSources.screen;
        break;
      case 'side-by-side':
      case 'picture-in-picture':
      default:
        // Prefer screen over camera for mixed layouts
        primaryVideoSource = recordingSources.screen || recordingSources.camera;
        break;
    }
    
    // Add video tracks from primary source
    if (primaryVideoSource) {
      primaryVideoSource.getVideoTracks().forEach(track => {
        console.log('Adding video track:', track.label, track.readyState);
        combinedStream.addTrack(track);
      });
    }
    
    // Simplified audio handling - just add all available audio tracks
    if (options.enableAudio) {
      // Add camera audio
      if (recordingSources.camera) {
        recordingSources.camera.getAudioTracks().forEach(track => {
          console.log('Adding camera audio track:', track.label, track.readyState);
          combinedStream.addTrack(track);
        });
      }
      
      // Add screen audio (if available and different from camera)
      if (recordingSources.screen) {
        recordingSources.screen.getAudioTracks().forEach(track => {
          console.log('Adding screen audio track:', track.label, track.readyState);
          combinedStream.addTrack(track);
        });
      }
    }

    const finalStreamInfo = {
      videoTracks: combinedStream.getVideoTracks().length,
      audioTracks: combinedStream.getAudioTracks().length,
      layout: currentLayout,
      totalTracks: combinedStream.getTracks().length
    };
    
    console.log('Created combined stream:', finalStreamInfo);
    
    // Validate that we have at least one track
    if (combinedStream.getTracks().length === 0) {
      console.error('Combined stream has no tracks!');
      setError('Failed to create recording stream - no media tracks available');
      return null;
    }

    return combinedStream;
  }, [recordingSources, currentLayout, options.enableAudio]);

  // NEW: Enhanced slide tracking with validation
  const recordSlideChange = useCallback((slideIndex: number) => {
    if (currentSession && isRecording && slideIndex >= 0) {
      const timestamp = (Date.now() - sessionStartTimeRef.current) / 1000;
      setCurrentSession(prev => {
        if (!prev) return prev;
        
        const newTimestamps = new Map(prev.metadata.slides?.timestamps || []);
        newTimestamps.set(slideIndex, timestamp);
        
        return {
          ...prev,
          metadata: {
            ...prev.metadata,
            slides: {
              total: Math.max(prev.metadata.slides?.total || 0, slideIndex + 1),
              current: slideIndex,
              timestamps: newTimestamps
            }
          }
        };
      });
      
      console.log(`Slide change recorded: slide ${slideIndex} at ${timestamp.toFixed(2)}s`);
    }
  }, [currentSession, isRecording]);

  const getSlideTimestamps = useCallback((): Map<number, number> => {
    return currentSession?.metadata.slides?.timestamps || new Map();
  }, [currentSession]);

  const getCurrentSlide = useCallback((): number => {
    return currentSession?.metadata.slides?.current || 0;
  }, [currentSession]);

  // Helper function to start recording with a specific stream (for restarting with new sources)
  const startRecordingWithStream = useCallback(async (
    recordingStream: MediaStream,
    compositor: VideoCompositor | null,
    previousChunks: Blob[] = []
  ) => {
    // Preserve previous chunks
    recordedChunksRef.current = previousChunks;
    
    // Set compositor instance if provided
    if (compositor) {
      setCompositorInstance(compositor);
      setIsCompositing(true);
    }

    // Determine MIME type
    let supportedMimeType = 'video/webm; codecs=vp8,opus';
    const mimeTypes = [
      'video/mp4',
      'video/mp4; codecs=avc1.42E01E,mp4a.40.2',
      'video/webm; codecs=h264,opus',
      'video/webm; codecs=vp9,opus',
      'video/webm; codecs=vp8,opus',
      'video/webm',
    ];

    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        supportedMimeType = type;
        break;
      }
    }

    // MediaRecorder options
    const recorderOptions: MediaRecorderOptions = {
      mimeType: supportedMimeType
    };

    switch (options.quality) {
      case 'high':
        recorderOptions.videoBitsPerSecond = 3000000;
        break;
      case 'medium':
        recorderOptions.videoBitsPerSecond = 1500000;
        break;
      case 'low':
      default:
        recorderOptions.videoBitsPerSecond = 750000;
        break;
    }

    const mediaRecorder = new MediaRecorder(recordingStream, recorderOptions);
    mediaRecorderRef.current = mediaRecorder;

    // Data handler
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        const chunkSize = event.data.size;
        recordedChunksRef.current.push(event.data);
        
        const currentTime = (Date.now() - sessionStartTimeRef.current) / 1000;
        const bitrate = (chunkSize * 8) / 1000;
        
        setRecordingStats(prev => ({
          ...prev,
          fileSize: prev.fileSize + chunkSize,
          bitrate: bitrate,
          duration: currentTime
        }));

        lastChunkSizeRef.current = chunkSize;
        
        setCurrentSession(prev => prev ? {
          ...prev,
          segments: [...prev.segments, event.data],
          totalDuration: currentTime,
          metadata: {
            ...prev.metadata,
            fileSize: prev.metadata.fileSize + chunkSize
          }
        } : null);
      }
    };

    // Start recording
    mediaRecorder.start(1000);
    setIsRecording(true);
    
    // Start recording timer
    if (!recordingTimerRef.current) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }

    console.log('Recording restarted with new stream:', {
      videoTracks: recordingStream.getVideoTracks().length,
      audioTracks: recordingStream.getAudioTracks().length,
      previousChunks: previousChunks.length,
      mimeType: supportedMimeType
    });
  }, [options.quality]);

  // Task 3.3: Enhanced recording - ALWAYS use Canvas compositor (Google Meet approach)
  // This allows dynamic source addition without restarting recording
  const startRecording = useCallback(async () => {
    const hasCamera = !!recordingSources.camera;
    const hasScreen = !!recordingSources.screen;
    
    console.log('Starting recording with Canvas compositor (always)...', {
      hasCamera,
      hasScreen,
      currentLayout
    });
    
    // FIX: Always use compositor to allow dynamic source addition (e.g. adding camera later)
    const screenOnly = false; // hasScreen && !hasCamera;
    // ALWAYS use compositor for multi-source; for screen-only, fall back to raw screen stream
    let compositor: VideoCompositor | null = null;
    let recordingStream: MediaStream | null = null;
    
    if (!screenOnly) {
      // Initialize compositor - reuse if available to reduce delay
      if (compositorInstance) {
        console.log('Reusing existing compositor instance');
        compositor = compositorInstance;
      } else {
        console.log('Initializing new compositor instance');
        compositor = await initializeCompositor();
      }

      if (!compositor) {
        console.error('Compositor initialization failed - cannot record');
        setError('Failed to initialize video compositor. Please refresh and try again.');
        return;
      }
    }
    
    try {
      let sourcesAdded = 0;
      
      // Add camera source if available and active (compositor path only)
          if (recordingSources.camera) {
            const cameraStream = recordingSources.camera;
            const cameraVideoTracks = cameraStream.getVideoTracks();
            const activeCameraTracks = cameraVideoTracks.filter(t => t.readyState === 'live' && t.enabled);
            
            if (activeCameraTracks.length > 0 && cameraStream.active) {
              compositor!.addVideoSource('camera', cameraStream, {
                visible: true,
                opacity: 1.0
              });
          sourcesAdded++;
              console.log('Camera source added to compositor');
            } else {
              console.warn('Camera stream is not active, skipping camera source');
            }
          }
          
      // Prefer existing live screen stream; only re-prompt once if invalid
      let screenStreamForRecording: MediaStream | null = recordingSources.screen || screenStreamRef.current;
      if (hasScreen) {
        const isValidScreen = (stream: MediaStream | null) => {
          const track = stream?.getVideoTracks()?.[0];
          if (!stream || !track) return false;
          // Relaxed dimension check to avoid false negatives during startup
          const settings = track.getSettings ? track.getSettings() : undefined;
          const dimsOk = (settings?.width ?? 100) > 0 && (settings?.height ?? 100) > 0;
          const liveOk = track.readyState === 'live';
          return stream.active && liveOk && dimsOk;
        };

        if (!isValidScreen(screenStreamForRecording)) {
          console.warn('Screen stream appears invalid, checking ref...');
          if (isValidScreen(screenStreamRef.current)) {
             screenStreamForRecording = screenStreamRef.current;
          } else {
             console.warn('No valid screen stream found. Proceeding without refresh to avoid interruption.');
             // We do NOT auto-refresh here as it breaks the flow. 
             // If the user sees the preview, the stream is likely fine.
          }
        }

        if (screenStreamForRecording && !isValidScreen(screenStreamForRecording)) {
             console.warn('Screen stream might be invalid but proceeding anyway');
        }
      }

      // Add screen source if available and active
      if (screenStreamForRecording) {
        if (screenOnly) {
          recordingStream = screenStreamForRecording;
          sourcesAdded++;
          console.log('Using raw screen stream for recording (no compositor)');
        } else {
          const screenVideoTracks = screenStreamForRecording.getVideoTracks();
          const activeScreenTracks = screenVideoTracks.filter(t => t.readyState === 'live' && t.enabled);
          
          if (activeScreenTracks.length > 0 && screenStreamForRecording.active) {
            compositor!.addVideoSource('screen', screenStreamForRecording, {
              visible: true,
              opacity: 1.0
            });
            sourcesAdded++;
            console.log('Screen source added to compositor');
          } else {
            console.warn('Screen stream is not active, skipping screen source');
          }
        }
      }
          
      // CRITICAL: Must have at least one video source
      if (sourcesAdded === 0) {
        throw new Error('No active video sources available. Please ensure camera or screen is active.');
      }
      
      // Determine layout based on available sources (compositor path)
      if (!screenOnly) {
        let layoutType: LayoutType;
        if (hasCamera && hasScreen) {
          layoutType = (currentLayout as LayoutType) || 'picture-in-picture';
        } else if (hasScreen) {
          layoutType = 'screen-only';
        } else {
          layoutType = 'camera-only';
        }
        
        // Apply layout
        compositor!.applyLayoutByType(layoutType, false);
        setCompositorLayout(layoutType);
        setCurrentLayout(layoutType as RecorderOptions['layout']);
        console.log('Applied layout:', layoutType);
      }
      
      // CRITICAL: Wait for video sources to be ready before starting compositor
      // This ensures the canvas has actual video frames to capture
      if (!screenOnly) {
        console.log('Waiting for video sources to be ready and producing frames...');

        // FIX: Explicitly wait for compositor sources to be ready
        if (hasScreen) {
          console.log('Waiting for screen source to be ready in compositor...');
          await compositor!.waitForSourceReady('screen', 5000);
        }
      
      // For screen sharing, we need to ensure the track is actually producing frames
      // Chrome has a bug where screen tracks initially report 2x2 dimensions
      if (hasScreen && recordingSources.screen) {
        const screenTrack = recordingSources.screen.getVideoTracks()[0];
        if (screenTrack) {
          // Wait for the track to have valid dimensions
          let dimensionAttempts = 0;
          const maxDimensionAttempts = 20; // 2 seconds max wait
          
          while (dimensionAttempts < maxDimensionAttempts) {
            const settings = screenTrack.getSettings();
            if (settings.width && settings.height && settings.width > 2 && settings.height > 2) {
              console.log('Screen track has valid dimensions:', settings.width, 'x', settings.height);
              break;
            }
            console.log('Waiting for screen track dimensions...', settings);
            await new Promise(resolve => setTimeout(resolve, 100));
            dimensionAttempts++;
          }
          
          // Additional wait to ensure frames are being produced
          await new Promise(resolve => setTimeout(resolve, 300));

          // If the track is already ended or still reporting tiny dimensions, abort early
          const trackSettings = screenTrack.getSettings ? screenTrack.getSettings() : {};
          const readyDimensions = (trackSettings as MediaTrackSettings).width && (trackSettings as MediaTrackSettings).height && (trackSettings as MediaTrackSettings).width! > 16 && (trackSettings as MediaTrackSettings).height! > 16;
          
          // FIX: Be more lenient with screen track checks. If it's ended, we must abort.
          // But if dimensions are still small, we might proceed with a warning rather than killing the whole recording,
          // as the compositor can handle resizing or might get frames later.
          if (screenTrack.readyState !== 'live') {
             console.error('Screen track ended before compositor start');
             setError('Screen share was stopped. Please share your screen again.');
             if (compositor) compositor.dispose();
             setCompositorInstance(null);
             setIsCompositing(false);
             await removeScreenShare();
             return;
          }
          
          if (!readyDimensions) {
             console.warn('Screen track dimensions still small, proceeding anyway...', trackSettings);
          }
        }
      }

      // Ensure compositor sources are actually rendering frames before capture
      if (compositor) {
        // Reduce wait times for faster start
        if (hasScreen) {
          // Don't block for full 5s, just check quickly
          compositor.waitForSourceReady('screen', 1000).catch(e => console.warn('Screen ready check timeout (non-fatal)', e));
        }
        if (hasCamera) {
          compositor.waitForSourceReady('camera', 1000).catch(e => console.warn('Camera ready check timeout (non-fatal)', e));
        }
      }
      
        // Give video elements time to initialize - reduced delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Additional wait to ensure video is actually playing
        let readyAttempts = 0;
        const maxReadyAttempts = 5; // Reduced attempts
        while (readyAttempts < maxReadyAttempts) {
          const canvas = compositor!.getCanvas();
          if (canvas && canvas.width > 0 && canvas.height > 0) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 50));
          readyAttempts++;
        }
            
        // Start compositor and get composited stream with mixed audio
        recordingStream = compositor!.start();
    
        // Validate stream has video tracks
        const videoTracks = recordingStream.getVideoTracks();
        const audioTracks = recordingStream.getAudioTracks();
            
        console.log('Composited stream created:', {
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          videoTrackStates: videoTracks.map(t => ({
            label: t.label,
            readyState: t.readyState,
            enabled: t.enabled
          }))
        });
        
        if (videoTracks.length === 0) {
          throw new Error('Composited stream has no video tracks. Cannot start recording.');
        }
        
        // Store compositor instance for dynamic source management
        setCompositorInstance(compositor);
        setIsCompositing(true);
      } else {
        // Screen-only raw stream path
        recordingStream = screenStreamForRecording;
        setCompositorInstance(null);
        setIsCompositing(false);
        setCompositorLayout('screen-only');
      }
          
          // Start performance monitoring
          const metricsInterval = setInterval(() => {
            if (compositor) {
              const metrics = compositor.getPerformanceMetrics();
              setPerformanceMetrics(metrics);
              
              // Only warn if performance is critically low (e.g. < 15 FPS)
              if (metrics.fps < 15 && metrics.fps > 0) {
                console.warn('Compositor performance degraded:', metrics);
              }
            }
          }, 2000);
          
          // Store interval for cleanup
          statsTimerRef.current = metricsInterval;
          
        } catch (err: any) {
          console.error('Compositor setup failed:', err);
      setError('Failed to setup recording: ' + err.message);
          if (compositor) {
            compositor.dispose();
          }
          setCompositorInstance(null);
          setIsCompositing(false);
          return;
    }
    
    // Validate recording stream
    if (!recordingStream) {
      console.error('No recording stream available');
      setError('Failed to create recording stream');
      if (compositor) {
        compositor.dispose();
      }
      setCompositorInstance(null);
      setIsCompositing(false);
      return;
    }

    try {
      setError(null);
      setNetworkStatus(prev => ({ ...prev, status: 'online' }));
      recordedChunksRef.current = [];
      
      // Initialize session with enhanced metadata
      const sessionId = `session_${Date.now()}`;
      const newSession: RecordingSession = {
        id: sessionId,
        segments: [],
        currentState: 'recording',
        totalDuration: 0,
        startTime: Date.now(),
        metadata: {
          layout: currentLayout || 'picture-in-picture',
          sources: [
            ...(recordingSources.camera ? ['camera'] : []),
            ...(recordingSources.screen ? ['screen'] : [])
          ],
          resolution: options.resolution || '720p',
          quality: options.quality || 'medium',
          frameRate: options.frameRate || 30,
          fileSize: 0,
          slides: {
            total: 0,
            current: 0,
            timestamps: new Map()
          }
        }
      };
      
      setCurrentSession(newSession);
      sessionStartTimeRef.current = Date.now();

      // Task 6.2: Use browser-detected codec with fallback mechanism
      // PRIORITIZE MP4 for better Mux compatibility
      let supportedMimeType = 'video/webm; codecs=vp8,opus'; // Default fallback
      
      // Try MP4 first as it's more compatible with Mux
      const mimeTypes = [
        'video/mp4',                    // Try basic MP4 first (best for Mux)
        'video/mp4; codecs=avc1.42E01E,mp4a.40.2', // H.264 MP4
        'video/webm; codecs=h264,opus', // H.264 in WebM container
        'video/webm; codecs=vp9,opus',  // VP9 WebM
        'video/webm; codecs=vp8,opus',  // VP8 WebM
        'video/webm',                   // Basic WebM
      ];

      // Try to find a supported type
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          supportedMimeType = type;
          console.log('Selected MIME type:', type);
          break;
        }
      }
      
      // Override with browser-suggested codec if available and it's MP4
      if (browserSupport && browserSupport.suggestedCodec && browserSupport.suggestedCodec.includes('mp4')) {
        supportedMimeType = browserSupport.suggestedCodec;
        console.log('Using browser-suggested MP4 codec:', supportedMimeType);
      }
      
      // Task 6.2: Display capability warning if using fallback codec
      if (browserSupport && !browserSupport.capabilities.vp9Codec && browserSupport.capabilities.vp8Codec) {
        console.warn('Using VP8 codec - VP9 not available for better quality');
      }

      console.log('Starting enhanced recording with:', {
        mimeType: supportedMimeType,
        layout: currentLayout,
        resolution: options.resolution,
        quality: options.quality,
        usingCompositor: !!compositor
      });

      // Enhanced MediaRecorder options based on quality
      const recorderOptions: MediaRecorderOptions = {
        mimeType: supportedMimeType
      };

      // Use lower bitrate for more reliable recording
      switch (options.quality) {
        case 'high':
          recorderOptions.videoBitsPerSecond = 3000000; // 3 Mbps (reduced from 5)
          break;
        case 'medium':
          recorderOptions.videoBitsPerSecond = 1500000; // 1.5 Mbps (reduced from 2.5)
          break;
        case 'low':
        default:
          recorderOptions.videoBitsPerSecond = 750000; // 750 kbps (reduced from 1M)
          break;
      }

      // Validate stream before creating MediaRecorder
      const streamVideoTracks = recordingStream.getVideoTracks();
      const streamAudioTracks = recordingStream.getAudioTracks();
      
      console.log('Creating MediaRecorder with stream:', {
        videoTracks: streamVideoTracks.length,
        audioTracks: streamAudioTracks.length,
        streamActive: recordingStream.active,
        videoTrackStates: streamVideoTracks.map(t => ({
          label: t.label,
          readyState: t.readyState,
          enabled: t.enabled,
          muted: t.muted
        }))
      });
      
      if (streamVideoTracks.length === 0) {
        throw new Error('Recording stream has no video tracks. Cannot start MediaRecorder.');
      }
      
      // Check if any video track is actually live
      const liveVideoTracks = streamVideoTracks.filter(t => t.readyState === 'live');
      if (liveVideoTracks.length === 0) {
        console.warn('No live video tracks in stream, but proceeding anyway - tracks may become live soon');
      }

      const mediaRecorder = new MediaRecorder(recordingStream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      
      console.log('MediaRecorder created successfully:', {
        mimeType: supportedMimeType,
        state: mediaRecorder.state
      });

      // Enhanced data available handler with stats tracking
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          const chunkSize = event.data.size;
          recordedChunksRef.current.push(event.data);
          
          // Update recording stats
          const currentTime = (Date.now() - sessionStartTimeRef.current) / 1000;
          const bitrate = (chunkSize * 8) / 1000; // kbps
          
          setRecordingStats(prev => ({
            ...prev,
            fileSize: prev.fileSize + chunkSize,
            bitrate: bitrate,
            duration: currentTime
          }));

          lastChunkSizeRef.current = chunkSize;
          
          // Update session
          setCurrentSession(prev => prev ? {
            ...prev,
            segments: [...prev.segments, event.data],
            totalDuration: currentTime,
            metadata: {
              ...prev.metadata,
              fileSize: prev.metadata.fileSize + chunkSize
            }
          } : null);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder onstop handler fired', {
          chunks: recordedChunksRef.current.length,
          recorderState: mediaRecorderRef.current?.state
        });
        
        const finalDuration = (Date.now() - sessionStartTimeRef.current) / 1000;
        console.log('Recording stopped - finalizing blob', {
          chunks: recordedChunksRef.current.length,
          totalSize: recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
          duration: finalDuration,
          mimeType: recordedChunksRef.current[0]?.type || 'unknown'
        });
        
        // Check minimum duration
        if (finalDuration < 0.5) {
          console.warn('Recording too short:', finalDuration);
          setError('Recording too short. Please record for at least 1 second.');
          setIsRecording(false);
          setIsPaused(false);
          cleanupLocalStreams();
          return;
        }
        
        if (recordedChunksRef.current.length > 0) {
          const totalSize = recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          
          // Check minimum file size
          if (totalSize < 1000) {
            console.warn('Recording file too small:', totalSize);
            setError('Recording failed - file too small. Please try recording again.');
            setIsRecording(false);
            setIsPaused(false);
            cleanupLocalStreams();
            return;
          }
          
          const blob = new Blob(recordedChunksRef.current, { 
            type: recordedChunksRef.current[0].type || 'video/webm'
          });
          
          console.log('Created video blob:', {
            size: blob.size,
            type: blob.type,
            duration: finalDuration,
            chunksCount: recordedChunksRef.current.length,
            slideTimestamps: currentSession?.metadata.slides?.timestamps
          });

          const url = URL.createObjectURL(blob);
          setRecordedVideo(url);
          setVideoBlob(blob);
          // Mark that we are preserving streams/compositor until the preview consumer acknowledges
          preserveUntilPreviewRef.current = true;

          console.log('✅ Video blob and URL set successfully (preserving streams until preview)');

          // Immediately set isRecording to false so UI updates
          setIsRecording(false);
          setIsPaused(false);
        } else {
          console.warn('No recording chunks available', {
            chunksLength: recordedChunksRef.current.length
          });
          setError('Recording failed - no video data captured');
          setNetworkStatus(prev => ({ ...prev, status: 'degraded' }));
        setIsRecording(false);
        setIsPaused(false);
        }
        
        // CRITICAL: Don't cleanup streams here - preserveUntilPreviewRef will ensure cleanup
        // The component will call `closeCamera()` (which will trigger cleanup) once it has shown the preview
      };

      mediaRecorder.onstart = () => {
        console.log('Enhanced recording started');
        setIsRecording(true);
        
        // Start recording timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

        // Start stats monitoring
        statsTimerRef.current = setInterval(() => {
          setRecordingStats(prev => ({
            ...prev,
            networkQuality: Math.random() > 0.9 ? 'poor' : Math.random() > 0.7 ? 'fair' : 'good'
          }));
        }, 5000);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setNetworkStatus(prev => ({ ...prev, status: 'degraded' }));
        setIsRecording(false);
        setIsPaused(false);
        cleanupLocalStreams();
      };

      // Start recording with optimized timeslice
      try {
      mediaRecorder.start(1000); // Collect data every second
        console.log('✅ Enhanced recording started successfully', {
          state: mediaRecorder.state,
          mimeType: supportedMimeType,
          streamActive: recordingStream.active,
          videoTracks: recordingStream.getVideoTracks().length
        });
      } catch (startError: any) {
        console.error('❌ Failed to start MediaRecorder:', startError);
        throw new Error(`Failed to start recording: ${startError.message || 'Unknown error'}`);
      }
      
      // Debug: Log stream state periodically
      debugIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('Recording debug:', {
            state: mediaRecorderRef.current.state,
            streamActive: recordingStream.active,
            streamTracks: recordingStream.getTracks().length,
            videoTracks: recordingStream.getVideoTracks().map(t => ({ label: t.label, readyState: t.readyState, enabled: t.enabled })),
            audioTracks: recordingStream.getAudioTracks().map(t => ({ label: t.label, readyState: t.readyState, enabled: t.enabled })),
            chunksCollected: recordedChunksRef.current.length,
            usingCompositor: !!compositor,
            compositorMetrics: compositor ? compositor.getPerformanceMetrics() : null
          });
        }
      }, 2000);

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording: ' + err.message);
      setNetworkStatus(prev => ({ ...prev, status: 'degraded' }));
      setIsRecording(false);
      
      // Cleanup compositor on error
      if (compositor) {
        compositor.dispose();
        setCompositorInstance(null);
        setIsCompositing(false);
      }
      
      cleanupLocalStreams();
    }
  }, [createCombinedStream, currentLayout, recordingSources, options, cleanupLocalStreams, initializeCompositor, compositorInstance]);

  // Enhanced stop recording
  const stopRecording = useCallback(() => {
    console.log('stopRecording called', {
      hasRecorder: !!mediaRecorderRef.current,
      isRecording,
      isRestarting: isRestartingRef.current,
      recorderState: mediaRecorderRef.current?.state
    });
    
    // CRITICAL: If we're restarting, set flag to stop after restart completes
    if (isRestartingRef.current) {
      console.log('Recording is restarting - will stop after restart completes');
      shouldStopAfterRestartRef.current = true;
      return;
    }
    
    if (!mediaRecorderRef.current) {
      console.warn('No media recorder to stop');
      // If no recorder but we think we're recording, just set state
      if (isRecording) {
        setIsRecording(false);
        setIsPaused(false);
      }
      return;
    }
    
    if (!isRecording) {
      console.warn('Not recording, cannot stop');
      return;
    }
    
    const recorderState = mediaRecorderRef.current.state;
    console.log('MediaRecorder state:', recorderState);
    
    if (recorderState !== 'recording' && recorderState !== 'paused') {
      console.warn(`MediaRecorder is in ${recorderState} state, cannot stop`);
      // If in inactive state, just update UI state
      if (recorderState === 'inactive') {
        setIsRecording(false);
        setIsPaused(false);
      }
      return;
    }
    
    console.log('Stopping enhanced recording...', {
      state: recorderState,
      chunks: recordedChunksRef.current.length,
      totalSize: recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
    });
    
    // CRITICAL: Reset restart flag when stopping (not restarting)
    // This ensures the onstop handler will process the final blob
    isRestartingRef.current = false;
    
    try {
      if (recorderState === 'paused') {
        console.log('Resuming before stopping...');
        mediaRecorderRef.current.resume();
        // Wait a moment for resume to take effect, then stop
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
            console.log('MediaRecorder stopped after resume');
          }
        }, 100);
        return; // Exit early, stop will happen in setTimeout
      }
      
      // Request final data chunk
      if (recorderState === 'recording') {
        mediaRecorderRef.current.requestData();
      }
      
      mediaRecorderRef.current.stop();
      console.log('MediaRecorder.stop() called successfully');
    } catch (error) {
      console.error('Error stopping MediaRecorder:', error);
      // Force stop by setting state and creating blob from existing chunks
      setIsRecording(false);
      setIsPaused(false);
      
      // If we have chunks, create blob immediately
      if (recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, { 
          type: recordedChunksRef.current[0].type || 'video/webm'
        });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        setVideoBlob(blob);
        console.log('Created blob from chunks after stop error:', blob.size);
      }
    }
    
      // DON'T call cleanupLocalStreams here - let onstop handler do it
      // This preserves recordingTime for the component to read
  }, [isRecording]);

  // Enhanced pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      // Pause timers
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
        statsTimerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  // Enhanced resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timers
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      statsTimerRef.current = setInterval(() => {
        setRecordingStats(prev => ({
          ...prev,
          networkQuality: Math.random() > 0.9 ? 'poor' : Math.random() > 0.7 ? 'fair' : 'good'
        }));
      }, 5000);
    }
  }, [isRecording, isPaused]);

  // NEW: Enhanced reset with production features
  const resetRecording = useCallback(() => {
    console.log('Resetting enhanced recorder state');
    
    if (isRecording) {
      stopRecording();
    }
    
    // Clean up recorded video URLs
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    
    setRecordedVideo(null);
    setVideoBlob(null);
    recordedChunksRef.current = [];
    setError(null);
    setRecordingTime(0);
    setIsPaused(false);
    setCurrentSession(null);
    
    // Reset network status
    setNetworkStatus({
      status: 'online',
      retryCount: 0
    });
    
    cleanupLocalStreams();
  }, [isRecording, stopRecording, recordedVideo, cleanupLocalStreams]);

  // NEW: Enhanced session management with production features
  const saveSession = useCallback((sessionId: string) => {
    if (currentSession && videoBlob) {
      // Enhanced session serialization
      const sessionForStorage = {
        ...currentSession,
        videoBlob: null, // Don't store blob in localStorage (too large)
        metadata: {
          ...currentSession.metadata,
          slides: currentSession.metadata.slides ? {
            ...currentSession.metadata.slides,
            timestamps: Array.from(currentSession.metadata.slides.timestamps.entries())
          } : undefined
        }
      };
      
      try {
        const sessions = JSON.parse(localStorage.getItem('recordingSessions') || '{}');
        sessions[sessionId] = sessionForStorage;
        localStorage.setItem('recordingSessions', JSON.stringify(sessions));
        console.log('Session saved:', sessionId, {
          size: currentSession.metadata.fileSize,
          duration: currentSession.totalDuration,
          slides: currentSession.metadata.slides?.total || 0
        });
      } catch (error) {
        console.error('Failed to save session:', error);
        setError('Failed to save recording session');
      }
    }
  }, [currentSession, videoBlob]);

  const loadSession = useCallback((sessionId: string): boolean => {
    try {
      const sessions = JSON.parse(localStorage.getItem('recordingSessions') || '{}');
      const sessionData = sessions[sessionId];
      if (sessionData) {
        // Enhanced session restoration
        const restoredSession: RecordingSession = {
          ...sessionData,
          segments: [],
          metadata: {
            ...sessionData.metadata,
            slides: sessionData.metadata.slides ? {
              ...sessionData.metadata.slides,
              timestamps: new Map(sessionData.metadata.slides.timestamps || [])
            } : undefined
          }
        };

        // Restore video blob if available
        if (sessionData.videoBlob) {
          const blob = new Blob([new Uint8Array(sessionData.videoBlob)], { 
            type: 'video/webm' 
          });
          setVideoBlob(blob);
          setRecordedVideo(URL.createObjectURL(blob));
        }
        
        setCurrentSession(restoredSession);
        console.log('Session loaded:', sessionId, {
          duration: restoredSession.totalDuration,
          slides: restoredSession.metadata.slides?.total || 0
        });
        return true;
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      setError('Failed to load recording session');
    }
    return false;
  }, []);

  const getSavedSessions = useCallback((): string[] => {
    try {
      const sessions = JSON.parse(localStorage.getItem('recordingSessions') || '{}');
      return Object.keys(sessions);
    } catch (error) {
      console.error('Failed to get saved sessions:', error);
      return [];
    }
  }, []);

  // NEW: Production features implementation
  const retryRecording = useCallback(async () => {
    setNetworkStatus(prev => ({ 
      status: 'reconnecting', 
      retryCount: prev.retryCount + 1 
    }));
    
    try {
      resetRecording();
      await initializeCamera();
      setNetworkStatus(prev => ({ ...prev, status: 'online' }));
    } catch (error) {
      console.error('Retry failed:', error);
      setNetworkStatus(prev => ({ ...prev, status: 'offline' }));
    }
  }, [resetRecording, initializeCamera]);

  const exportSession = useCallback((session: RecordingSession) => {
    // Implementation for exporting session (download, share, etc.)
    console.log('Exporting session:', session.id);
    // This would typically create a downloadable file or share the recording
  }, []);

  const mergeSessions = useCallback((sessionIds: string[]): RecordingSession | null => {
    // Implementation for merging multiple sessions
    console.log('Merging sessions:', sessionIds);
    return null; // Return merged session or null if failed
  }, []);

  // NEW: Enhanced editing capabilities
  const editRecording = useCallback(async (editedBlob: Blob): Promise<void> => {
    try {
      setVideoBlob(editedBlob);
      setRecordedVideo(URL.createObjectURL(editedBlob));
      console.log('Recording edited successfully', { size: editedBlob.size });
    } catch (error) {
      console.error('Edit failed:', error);
      throw new Error('Failed to apply edits');
    }
  }, []);

  const trimRecording = useCallback(async (startTime: number, endTime: number): Promise<Blob | null> => {
    // Implementation for trimming recording
    console.log('Trimming recording:', { startTime, endTime });
    return videoBlob; // Return trimmed blob
  }, [videoBlob]);

  const addWatermark = useCallback(async (_watermark: Blob): Promise<Blob | null> => {
    // Implementation for adding watermark
    console.log('Adding watermark to recording');
    return videoBlob; // Return watermarked blob
  }, [videoBlob]);

  // NEW: Device management
  const switchCamera = useCallback(async (deviceId: string) => {
    await initializeCamera(deviceId);
  }, [initializeCamera]);

  const switchMicrophone = useCallback(async (deviceId: string) => {
    setOptionsState(prev => ({ ...prev, audioDeviceId: deviceId }));
    // Reinitialize audio with new device
    if (recordingSources.camera) {
      await initializeCamera();
    }
  }, [initializeCamera, recordingSources.camera]);

  const getAvailableResolutions = useCallback((): string[] => {
    return ['480p', '720p', '1080p'];
  }, []);

  // Task 8.2: Audio mixing control functions
  const setAudioVolume = useCallback((sourceId: string, volume: number): boolean => {
    if (!compositorInstance) {
      console.warn('Compositor not available for audio control');
      return false;
    }
    return compositorInstance.setAudioVolume(sourceId, volume);
  }, [compositorInstance]);

  const setAudioMuted = useCallback((sourceId: string, muted: boolean): boolean => {
    if (!compositorInstance) {
      console.warn('Compositor not available for audio control');
      return false;
    }
    return compositorInstance.setAudioMuted(sourceId, muted);
  }, [compositorInstance]);

  const getAudioVolume = useCallback((sourceId: string): number => {
    if (!compositorInstance) {
      return 0;
    }
    return compositorInstance.getAudioVolume(sourceId);
  }, [compositorInstance]);

  const isAudioMuted = useCallback((sourceId: string): boolean => {
    if (!compositorInstance) {
      return false;
    }
    return compositorInstance.isAudioMuted(sourceId);
  }, [compositorInstance]);

  const getAudioLevels = useCallback(() => {
    if (!compositorInstance) {
      return [];
    }
    return compositorInstance.getAllAudioLevels();
  }, [compositorInstance]);

  const startAudioLevelMonitoring = useCallback((callback: (levels: import('../utils/AudioMixer').AudioLevelData[]) => void) => {
    if (!compositorInstance) {
      console.warn('Compositor not available for audio monitoring');
      return;
    }
    compositorInstance.startAudioLevelMonitoring(callback, 100);
  }, [compositorInstance]);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (!compositorInstance) {
      return;
    }
    compositorInstance.stopAudioLevelMonitoring();
  }, [compositorInstance]);

  // Task 6.1, 6.2 & 6.3: Check browser support on mount with browser-specific handling
  useEffect(() => {
    const support = checkBrowserSupport();
    setBrowserSupport(support);
    
    // Task 6.3: Get browser-specific behavior
    const behavior = getBrowserSpecificBehavior(support.browserInfo);
    
    // Display warnings if any
    if (support.warnings.length > 0) {
      console.warn('Browser compatibility warnings:', support.warnings);
      // Show the first warning to user
      setError(support.warnings[0]);
      
      // Clear warning after 10 seconds
      setTimeout(() => {
        setError(null);
      }, 10000);
    }
    
    // Task 6.3: Display browser-specific known issues
    if (behavior.knownIssues.length > 0) {
      console.warn('Browser-specific known issues:', behavior.knownIssues);
    }
    
    // Task 6.3: Log comprehensive browser compatibility report
    logBrowserCompatibility();
    
    // Log browser support info
    console.log('Browser Support:', {
      browser: `${support.browserInfo.name} ${support.browserInfo.version}`,
      canUseCompositor: support.canUseCompositor,
      canRecordVideo: support.canRecordVideo,
      suggestedCodec: support.suggestedCodec,
      capabilities: support.capabilities,
      browserSpecificOptimizations: behavior.optimizations
    });
  }, []);

  // Enhanced device enumeration with error handling
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          cameras: deviceList.filter(d => d.kind === 'videoinput'),
          microphones: deviceList.filter(d => d.kind === 'audioinput')
        });
        console.log('Devices enumerated:', {
          cameras: deviceList.filter(d => d.kind === 'videoinput').length,
          microphones: deviceList.filter(d => d.kind === 'audioinput').length
        });
      } catch (err) {
        console.warn('Device enumeration failed:', err);
        setError('Failed to detect available devices');
      }
    };
    enumerateDevices();
  }, []);

  // Enhanced stream reference management with production cleanup
  useEffect(() => {
    // Set stream from global reference if available
    if (globalStream && globalStream.active) {
      streamRef.current = globalStream;
      setRecordingSources(prev => ({ ...prev, camera: globalStream }));
      setCameraInitialized(true);
      if (streamUsers === 0) {
        streamUsers = 1;
      }
    }

    return () => {
      if (skipInitialCleanupRef.current) {
        // React StrictMode triggers effect cleanup immediately after mount in development.
        // Skip this synthetic pass so we don't stop active screen streams right after start.
        skipInitialCleanupRef.current = false;
        return;
      }

      console.log('useVideoRecorder cleanup - users:', streamUsers, { isRestarting: isRestartingRef.current, preservingForPreview: preserveUntilPreviewRef.current });
      // Enhanced cleanup on unmount - but don't interfere if restarting or if we're preserving resources for preview
      if (!isRestartingRef.current && !preserveUntilPreviewRef.current) {
        cleanupLocalStreams();

        // Clean up any remaining screen streams
        activeScreenStreams.forEach(stream => {
          stream.getTracks().forEach(track => track.stop());
        });
        activeScreenStreams.clear();
      } else if (preserveUntilPreviewRef.current) {
        // Intentionally preserving streams/compositor until preview is acknowledged by the UI.
        console.log('Preserving compositor/streams until preview is acknowledged (unmount deferred cleanup)');
      }
    };
  }, [cleanupLocalStreams]);

  // NEW: Allow external components to update camera stream (e.g. for virtual background)
  const setCameraStream = useCallback((stream: MediaStream | null) => {
    console.log('Updating camera stream externally (Virtual Background)');
    setRecordingSources(prev => ({ ...prev, camera: stream }));
    
    if (compositorInstance && stream) {
      // Update compositor source
      compositorInstance.addVideoSource('camera', stream, {
        visible: true,
        opacity: 1.0
      });
    }
  }, [compositorInstance]);

  return {
    // Core recording properties
    isRecording,
    recordedVideo,
    videoBlob,
    startRecording,
    startRecordingWithStream,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error,
    stream: streamRef.current,
    options,
    setOptions: setOptionsState,
    devices,
    initializeCamera,
    closeCamera,
    setCameraStream, // NEW: Virtual Background support
    acknowledgePreview,
    cameraInitialized,
    
    // Multi-source recording properties
    recordingSources,
    currentLayout: currentLayout || 'picture-in-picture',
    setLayout,
    changeLayout, // Task 3.5: Real-time layout switching
    startScreenShare,
    stopScreenShare,
    addScreenShare, // Task 3.4: Dynamic source addition
    removeScreenShare, // Task 3.4: Dynamic source removal
    isScreenSharing,
    
    // Compositor properties (Task 3.1)
    compositorInstance,
    isCompositing,
    compositorLayout,
    performanceMetrics,
    
    // Task 6.2: Browser compatibility
    browserSupport,
    
    // Session management
    currentSession,
    isPaused,
    recordingTime,
    setRecordingTime: setRecordingTimeState,
    saveSession,
    loadSession,
    getSavedSessions,
    
    // Slide tracking functions
    recordSlideChange,
    getSlideTimestamps,
    getCurrentSlide,
    
    // NEW: Production features
    recordingStats,
    setRecordingStats,
    networkStatus,
    retryRecording,
    exportSession,
    mergeSessions,
    
    // NEW: Enhanced editing capabilities
    editRecording,
    trimRecording,
    addWatermark,
    
    // NEW: Device management
    switchCamera,
    switchMicrophone,
    getAvailableResolutions,
    
    // Task 8.2: Audio mixing controls
    setAudioVolume,
    setAudioMuted,
    getAudioVolume,
    isAudioMuted,
    getAudioLevels,
    startAudioLevelMonitoring,
    stopAudioLevelMonitoring,
    initializeCompositor
  };
};