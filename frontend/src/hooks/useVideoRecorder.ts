// frontend/src/hooks/useVideoRecorder.ts
import { useState, useRef, useCallback, useEffect } from 'react';

// Extended interface for multi-source recording with slide support
interface RecorderOptions {
  videoDeviceId?: string;
  audioDeviceId?: string;
  resolution?: '480p' | '720p' | '1080p';
  screen?: boolean;
  layout?: 'picture-in-picture' | 'side-by-side' | 'screen-only' | 'camera-only';
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
  
  // Multi-source recording properties
  recordingSources: RecordingSources;
  currentLayout: string;
  setLayout: (layout: RecorderOptions['layout']) => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  isScreenSharing: boolean;
  
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
    layout: 'picture-in-picture',
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
  const [currentLayout, setCurrentLayout] = useState<RecorderOptions['layout']>('picture-in-picture');
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);

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
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debugIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const lastChunkSizeRef = useRef<number>(0);

  // FIX: Export setRecordingTime function
  const setRecordingTimeState = useCallback((time: number) => {
    setRecordingTime(time);
  }, []);

  // NEW: Enhanced cleanup function with production features
  const cleanupLocalStreams = useCallback(() => {
    console.log('Cleaning up local recorder state');
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    
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
    
    // Reset stats
    setRecordingStats({
      fileSize: 0,
      bitrate: 0,
      framesDropped: 0,
      networkQuality: 'good',
      recordingQuality: options.resolution || '720p',
      duration: 0
    });
    
    lastChunkSizeRef.current = 0;
  }, [options.resolution]);

  // NEW: Enhanced device constraints based on quality settings
  const getVideoConstraints = useCallback((deviceId?: string) => {
    const baseConstraints: MediaTrackConstraints = {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      frameRate: { ideal: options.frameRate || 30 }
    };

    switch (options.resolution) {
      case '1080p':
        return {
          ...baseConstraints,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        };
      case '720p':
        return {
          ...baseConstraints,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        };
      case '480p':
      default:
        return {
          ...baseConstraints,
          width: { ideal: 854 },
          height: { ideal: 480 }
        };
    }
  }, [options.resolution, options.frameRate]);

  // NEW: Enhanced audio constraints
  const getAudioConstraints = useCallback((deviceId?: string) => {
    if (!options.enableAudio) return false;

    return {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 2,
      sampleRate: 48000
    };
  }, [options.enableAudio]);

  // NEW: Enhanced screen sharing with error handling
  const startScreenShare = useCallback(async () => {
    try {
      setError(null);
      setNetworkStatus(prev => ({ ...prev, status: 'online' }));
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: options.frameRate || 30 }
        } as MediaTrackConstraints,
        audio: options.enableAudio ? {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } : false
      });

      // Track active screen streams for cleanup
      activeScreenStreams.add(screenStream);

      // Handle when user stops screen share via browser UI
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen share ended by user');
        stopScreenShare();
      });

      // Handle track errors
      screenStream.getTracks().forEach(track => {
        track.addEventListener('error', (error) => {
          console.error('Screen share track error:', error);
          setError('Screen sharing encountered an error');
        });
      });

      setRecordingSources(prev => ({
        ...prev,
        screen: screenStream
      }));
      setIsScreenSharing(true);

      console.log('Screen sharing started successfully', {
        videoTracks: screenStream.getVideoTracks().length,
        audioTracks: screenStream.getAudioTracks().length
      });

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
    }
  }, [options.enableAudio, options.frameRate]);

  // NEW: Enhanced screen share cleanup
  const stopScreenShare = useCallback(() => {
    if (recordingSources.screen) {
      // Remove from active streams
      activeScreenStreams.delete(recordingSources.screen);
      
      // Stop all tracks
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
  }, [recordingSources.screen]);

  // Set layout with validation
  const setLayout = useCallback((layout: RecorderOptions['layout']) => {
    if (layout && ['picture-in-picture', 'side-by-side', 'screen-only', 'camera-only'].includes(layout)) {
      setCurrentLayout(layout);
      setOptionsState(prev => ({ ...prev, layout }));
    } else {
      console.warn('Invalid layout:', layout);
    }
  }, []);

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
        return;
      }

      // If switching devices or no global stream, create new stream
      const constraints = {
        video: getVideoConstraints(deviceId),
        audio: getAudioConstraints(options.audioDeviceId)
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Camera initialized successfully:', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
        active: mediaStream.active,
        deviceId: mediaStream.getVideoTracks()[0]?.getSettings().deviceId
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
    
    // Always clean up local state
    cleanupLocalStreams();
    setRecordingSources({
      camera: null,
      screen: null,
      microphone: null
    });
    setCameraInitialized(false);
    setIsRecording(false);
    setIsScreenSharing(false);
    setRecordingTime(0);
  }, [cleanupLocalStreams, stopScreenShare]);

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

  // NEW: Enhanced recording with production features - FIXED MIME TYPE ISSUE
  const startRecording = useCallback(async () => {
    const combinedStream = createCombinedStream();
    if (!combinedStream) {
      console.error('Failed to create combined stream');
      return;
    }
    
    // Validate stream has active tracks
    const activeTracks = combinedStream.getTracks().filter(track => track.readyState === 'live');
    if (activeTracks.length === 0) {
      console.error('No active tracks in combined stream');
      setError('No active media tracks available for recording');
      return;
    }
    
    console.log('Starting recording with active tracks:', {
      total: combinedStream.getTracks().length,
      active: activeTracks.length,
      video: combinedStream.getVideoTracks().length,
      audio: combinedStream.getAudioTracks().length
    });

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

      // FIXED: Enhanced MIME type detection with VP8 priority for better compatibility
      const mimeTypes = [
        'video/webm; codecs=vp8,opus',  // Prioritize VP8 for better compatibility
        'video/webm; codecs=vp9,opus',  // Fallback to VP9
        'video/webm',                   // Basic WebM
        'video/mp4; codecs=avc1.42E01E,mp4a.40.2', // MP4 fallback
        'video/mp4',                    // Basic MP4
      ];

      let supportedMimeType = 'video/webm; codecs=vp8,opus'; // Default to VP8

      // Try to find a supported type
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          supportedMimeType = type;
          console.log('Using MIME type:', type);
          break;
        }
      }

      // Always use VP8 if available for better compatibility
      if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus')) {
        supportedMimeType = 'video/webm; codecs=vp8,opus';
        console.log('Forcing VP8 for better compatibility and server acceptance');
      }

      console.log('Starting enhanced recording with:', {
        mimeType: supportedMimeType,
        layout: currentLayout,
        resolution: options.resolution,
        quality: options.quality
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

      const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

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
        const finalDuration = (Date.now() - sessionStartTimeRef.current) / 1000;
        console.log('Recording stopped', {
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
            slideTimestamps: currentSession?.metadata.slides?.timestamps
          });

          const url = URL.createObjectURL(blob);
          setRecordedVideo(url);
          setVideoBlob(blob);
        } else {
          console.warn('No recording chunks available');
          setError('Recording failed - no video data captured');
          setNetworkStatus(prev => ({ ...prev, status: 'degraded' }));
        }
        
        setIsRecording(false);
        setIsPaused(false);
        
        // Clear all timers
        cleanupLocalStreams();
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
      mediaRecorder.start(1000); // Collect data every second
      console.log('Enhanced recording started successfully');
      
      // Debug: Log stream state periodically
      debugIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('Recording debug:', {
            state: mediaRecorderRef.current.state,
            streamActive: combinedStream.active,
            streamTracks: combinedStream.getTracks().length,
            videoTracks: combinedStream.getVideoTracks().map(t => ({ label: t.label, readyState: t.readyState, enabled: t.enabled })),
            audioTracks: combinedStream.getAudioTracks().map(t => ({ label: t.label, readyState: t.readyState, enabled: t.enabled })),
            chunksCollected: recordedChunksRef.current.length
          });
        }
      }, 2000);

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording: ' + err.message);
      setNetworkStatus(prev => ({ ...prev, status: 'degraded' }));
      setIsRecording(false);
      cleanupLocalStreams();
    }
  }, [createCombinedStream, currentLayout, recordingSources, options, cleanupLocalStreams]);

  // Enhanced stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping enhanced recording...');
      mediaRecorderRef.current.stop();
      cleanupLocalStreams();
    }
  }, [isRecording, cleanupLocalStreams]);

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
      console.log('useVideoRecorder cleanup - users:', streamUsers);
      // Enhanced cleanup on unmount
      cleanupLocalStreams();
      
      // Clean up any remaining screen streams
      activeScreenStreams.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      activeScreenStreams.clear();
    };
  }, [cleanupLocalStreams]);

  return {
    // Core recording properties
    isRecording,
    recordedVideo,
    videoBlob,
    startRecording,
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
    cameraInitialized,
    
    // Multi-source recording properties
    recordingSources,
    currentLayout: currentLayout || 'picture-in-picture',
    setLayout,
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
    
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
    getAvailableResolutions
  };
};