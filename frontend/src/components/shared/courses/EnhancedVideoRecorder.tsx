
import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import { coursesApi } from '@/services/api';

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// videoApi import removed - Mux uploads handled by MuxVideoUploader component
import { dataCache } from '@/hooks/useRealTimeData';
import { videoDraftStorage, type VideoDraft } from '@/utils/videoDraftStorage';
import { formatErrorForDisplay } from '@/utils/errorHandler';
import ErrorAlert from '@/components/common/ErrorAlert';
import VideoTimelineEditor from './VideoTimelineEditor';
import SlideManager from './SlideManager';
import VideoProcessingStatus from './VideoProcessingStatus';
import LayoutSelector from './LayoutSelector';
import CompositorPreview from './CompositorPreview';
import SourceControlIndicators from './SourceControlIndicators';
import KeyboardShortcuts from './KeyboardShortcuts';
import NotificationContainer, { type Notification } from './NotificationContainer';
import { AudioLevelIndicators } from './AudioLevelIndicators';
import MuxVideoUploader from './MuxVideoUploader';
import RecordingQualitySettings from './RecordingQualitySettings';
import RecordingPresetsManager from './RecordingPresetsManager';
import VideoPreviewPlayer from './VideoPreviewPlayer';
import { recordingPresetsApi, type RecordingPreset } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import type { LayoutType } from '@/types/VideoCompositor';
import type { AudioLevelData } from '@/utils/AudioMixer';
import {
  Video, Circle, Square, Pause, Play,
  Upload, RotateCcw, Camera,
  CheckCircle, Loader, AlertCircle,
  Settings, Cloud,
  Mic, MicOff, VideoIcon, Timer,
  Zap, Download,
  Sparkles, Star,
  Monitor, Save, FolderOpen, Scissors,
  FileText, Clock, Keyboard, XCircle,
  BookOpen
} from 'lucide-react';

interface VideoRecorderProps {
  onRecordingComplete?: (videoUrl: string) => void;
  onUploadComplete?: (lessonId: string, videoUrl: string) => void;
  courseId?: string;
  lessonId?: string;
  // UI customization props
  liveHeight?: string; // e.g. '70vh' for live recording preview
  playbackHeight?: string; // e.g. '55vh' for recorded playback preview
  useAspectRatio?: boolean; // enforce 16:9 playback when true
  pipSize?: string; // e.g. '28%' for picture-in-picture camera overlay
}

interface Course {
  id: string;
  title: string;
  description?: string;
  category?: string;
}


// S3 upload helper functions removed - all uploads use Mux direct upload

const VideoRecorder: FC<VideoRecorderProps> = ({ 
  onRecordingComplete, 
  onUploadComplete,
  courseId,
  lessonId,
  liveHeight = '70vh',
  playbackHeight = '55vh',
  useAspectRatio = false,
  pipSize = '28%'
}) => {
  const isMobile = useIsMobile();
  
  // Enhanced video recorder hook with production features
  const {
    isRecording,
    recordedVideo,
    videoBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    stream,
    initializeCamera,
    closeCamera,
    recordingSources,
    currentLayout,
    setLayout,
    changeLayout,
    startScreenShare,
    stopScreenShare,
    addScreenShare,
    removeScreenShare,
    isScreenSharing,
    currentSession,
    isPaused,
    recordingTime,
    setRecordingTime: setRecordingTimeState,
    saveSession,
    loadSession,
    getSavedSessions,
    // NEW: Compositor properties (Task 3.1)
    compositorInstance,
    isCompositing,
    compositorLayout,
    performanceMetrics,
    // NEW: Enhanced features
    recordingStats,
    setRecordingStats,
    exportSession,
    // NEW: Slide integration
    recordSlideChange,
    // NEW: Editing capabilities
    editRecording,
    // Task 8.2: Audio mixing controls
    setAudioVolume,
    setAudioMuted,
    getAudioVolume,
    isAudioMuted,
    startAudioLevelMonitoring,
    stopAudioLevelMonitoring,
    options,
    setOptions
  } = useVideoRecorder();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStoppingRef = useRef(false);
  
  // Core UI State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Course/Lesson State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState(courseId || '');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [isCreatingCourseLoading, setIsCreatingCourseLoading] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [showLessonForm, setShowLessonForm] = useState(false);
  
  // Error/Success State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const persistentSuccessMessageRef = useRef<string | null>(null);
  // Debug helper: transient message to confirm getDisplayMedia invocation
  const [debugDisplayMediaMessage, setDebugDisplayMediaMessage] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');

  // Enhanced recording state
  const [recordingQuality, setRecordingQuality] = useState<'480p' | '720p' | '1080p'>('720p');
  const [frameRate, setFrameRate] = useState<number>(30);
  const [bitrate, setBitrate] = useState<number>(2500); // kbps
  const [autoAdjustQuality, setAutoAdjustQuality] = useState<boolean>(false);
  const [enableAudio, setEnableAudio] = useState(true);
  const [autoStopTimer, setAutoStopTimer] = useState<number>(0);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showPresetsManager, setShowPresetsManager] = useState(false);
  const [showEnhancedPreview, setShowEnhancedPreview] = useState(false);
  // Simple vs advanced mode toggle - default to simple for most teachers
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  
  // Mux upload state - Mux is now the default and only upload method
  const [useMuxUpload] = useState(true); // Always use Mux - no longer configurable
  const [showMuxUploader, setShowMuxUploader] = useState(false);
  const [muxUploadLessonId, setMuxUploadLessonId] = useState<string | null>(null);
  
  // Session management state
  const [savedSessions, setSavedSessions] = useState<string[]>([]);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  
  // NEW: UI state for integrated components (Task 7.1)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showCompositorPreview, setShowCompositorPreview] = useState(false);
  
  // Task 8.2: Audio level monitoring state
  const [audioLevels, setAudioLevels] = useState<AudioLevelData[]>([]);
  const [showAudioLevels, setShowAudioLevels] = useState(false);
  
  // NEW: Loading states (Task 7.2)
  const [isInitializingCompositor, setIsInitializingCompositor] = useState(false);
  const [layoutChangeNotification, setLayoutChangeNotification] = useState<string | null>(null);
  // Debug sizes overlay
  const [showDebugSizes, setShowDebugSizes] = useState(false);
  const [debugSizes, setDebugSizes] = useState<any>(null);
  
  // NEW: Notification system (Task 7.3)
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // NEW: Integrated Features State
  const [showTimelineEditor, setShowTimelineEditor] = useState(false);
  const [showSlideManager, setShowSlideManager] = useState(false);
  const [showProcessingStatus, setShowProcessingStatus] = useState(false);
  const [processingLessonId, setProcessingLessonId] = useState<string | null>(null);
  const [currentSlides, setCurrentSlides] = useState<any[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // NEW: Enhanced state for production features
  const [, setRecordingStatus] = useState<'idle' | 'countdown' | 'recording' | 'paused' | 'processing'>('idle');
  
  
  // Auto-save drafts state
  const [autoSaveDraftId, setAutoSaveDraftId] = useState<string | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<VideoDraft[]>([]);
  const [showDraftsList, setShowDraftsList] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number | null>(null);

  // Load default preset on mount
  const { data: defaultPreset } = useQuery<RecordingPreset | null>({
    queryKey: ['recordingPresets', 'default'],
    queryFn: async () => {
      try {
        return await recordingPresetsApi.getDefaultPreset();
      } catch (error) {
        console.error('Failed to load default preset:', error);
        return null;
      }
    },
    enabled: true
  });



  // Apply default preset when loaded
  useEffect(() => {
    if (defaultPreset && !isRecording) {
      setRecordingQuality(defaultPreset.quality);
      setFrameRate(defaultPreset.frame_rate);
      if (defaultPreset.bitrate) {
        setBitrate(defaultPreset.bitrate);
      }
      setAutoAdjustQuality(defaultPreset.auto_adjust_quality);
      if (defaultPreset.video_device_id) {
        // Device selection would be handled separately
      }
      if (defaultPreset.audio_device_id) {
        // Device selection would be handled separately
      }
      if (defaultPreset.layout && ['picture-in-picture', 'side-by-side', 'screen-only', 'camera-only'].includes(defaultPreset.layout)) {
        setLayout(defaultPreset.layout as 'picture-in-picture' | 'side-by-side' | 'screen-only' | 'camera-only');
      }
    }
  }, [defaultPreset, isRecording, setLayout]);




  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldStartAfterInit = useRef(false);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStatsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sessions on component mount
  useEffect(() => {
    const sessions = getSavedSessions();
    setSavedSessions(sessions);
  }, [getSavedSessions]);

  // Enhanced cleanup - ONLY runs on actual component unmount
  useEffect(() => {
    return () => {
      console.log('VideoRecorder unmounting - cleaning up');
      closeCamera();
      
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      if (recordingStatsIntervalRef.current) {
        clearInterval(recordingStatsIntervalRef.current);
      }
      
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  // Recording tips
  useEffect(() => {
    const tips = [
      "Ensure good lighting facing you",
      "Use a quiet environment for clear audio",
      "Look directly at the camera",
      "Keep your background professional",
      "Test your microphone before recording",
      "Use a tripod or stable surface",
      "Speak clearly and at a moderate pace",
      "Close unnecessary applications before screen sharing",
      "Check your internet connection for stable recording",
      "Use the countdown timer to prepare",
      "Enable screen sharing for presentation mode",
      "Use the slide manager for structured content"
    ];
  }, []);

  // Update video elements when streams change - Enhanced for screen sharing
  useEffect(() => {
    if (videoRef.current && recordingSources.camera) {
      // Only update if stream changed to avoid unnecessary re-initialization
      if (videoRef.current.srcObject !== recordingSources.camera) {
        videoRef.current.srcObject = recordingSources.camera;
        console.log('Camera video srcObject updated');
      }
    }
    
    // ENHANCED: Better screen video initialization with persistence during restart
    if (screenVideoRef.current && recordingSources.screen) {
      const screenVideo = screenVideoRef.current;
      const screenStream = recordingSources.screen;
      
      // Only update if stream changed to avoid clearing during restart
      if (screenVideo.srcObject !== screenStream) {
        console.log('Setting screen video srcObject');
        screenVideo.srcObject = screenStream;
      }
      
      // Ensure video is playing - retry if needed
      const ensurePlaying = async () => {
        try {
          // Check if stream is still active
          const videoTracks = screenStream.getVideoTracks();
          const activeTracks = videoTracks.filter(t => t.readyState === 'live' && t.enabled);
          
          if (activeTracks.length === 0) {
            console.warn('No active video tracks in screen stream');
            return;
          }
          
          // Ensure video element has the stream
          if (!screenVideo.srcObject) {
            screenVideo.srcObject = screenStream;
          }
          
          // Play if paused
          if (screenVideo.paused) {
            await screenVideo.play();
            console.log('Screen video started playing');
          }
          
          console.log('Screen stream is active:', {
            activeTracks: activeTracks.length,
            totalTracks: videoTracks.length,
            trackLabels: activeTracks.map(t => t.label),
            videoWidth: screenVideo.videoWidth,
            videoHeight: screenVideo.videoHeight,
            readyState: screenVideo.readyState,
            paused: screenVideo.paused
          });
        } catch (error) {
          console.error('Failed to play screen video:', error);
          // Retry after a delay
          setTimeout(async () => {
            try {
              if (screenVideoRef.current && recordingSources.screen) {
                await screenVideoRef.current.play();
              }
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              setErrorMessage('Screen sharing video failed to start. Please try again.');
            }
          }, 500);
        }
      };
      
      // Wait for metadata then play
      if (screenVideo.readyState >= 2) {
        ensurePlaying();
      } else {
        // Remove old handler to avoid duplicates
        screenVideo.onloadedmetadata = () => {
          console.log('Screen video metadata loaded');
          ensurePlaying();
        };
        
        // Also try to play immediately if stream is already active
        if (screenStream.active) {
          ensurePlaying();
        }
      }
    } else if (screenVideoRef.current && !recordingSources.screen) {
      // Only clear if we're not restarting (to avoid clearing during restart)
      // Check if recording is active - if so, might be restarting
      if (!isRecording) {
        screenVideoRef.current.srcObject = null;
        setScreenReady(false);
        console.log('Screen video srcObject cleared');
      }
    }
    
    // Audio analysis setup
    if (stream && enableAudio) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioAnalyserRef.current = analyser;
        audioContextRef.current = audioCtx;

        // Update mic level periodically
        const updateMicLevel = () => {
          if (audioAnalyserRef.current) {
            const dataArray = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
            audioAnalyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          }
        };

        const micInterval = setInterval(updateMicLevel, 100);
        return () => clearInterval(micInterval);
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    }
    
    return () => {
      audioAnalyserRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, [stream, recordingSources, enableAudio]);

  // UI ready states to avoid black flicker and enable smooth crossfades
  const [cameraReady, setCameraReady] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
  const [recordedReady, setRecordedReady] = useState(false);

  // NEW: Recording stats monitoring with performance alerts (Task 7.3)
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingStatsIntervalRef.current = setInterval(() => {
        // Simulate recording stats (in real app, get from MediaRecorder)
        setRecordingStats(prev => ({
          ...prev,
          fileSize: prev.fileSize + (1024 * 1024), // Simulate 1MB per second
          bitrate: Math.random() * 2000000 + 1000000, // 1-3 Mbps
          framesDropped: prev.framesDropped + (Math.random() > 0.9 ? 1 : 0),
          networkQuality: Math.random() > 0.8 ? 'poor' : Math.random() > 0.5 ? 'fair' : 'good'
        }));
      }, 1000);
    } else {
      if (recordingStatsIntervalRef.current) {
        clearInterval(recordingStatsIntervalRef.current);
      }
    }

    return () => {
      if (recordingStatsIntervalRef.current) {
        clearInterval(recordingStatsIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Reset recorded-ready when a new recorded URL is set so it can fade in when ready
  useEffect(() => {
    setRecordedReady(false);
  }, [recordedVideo]);

  // Option to match preview layout to live layout
  const [matchLiveLayout, setMatchLiveLayout] = useState(true);

  // Sync compositor draw fit when user toggles match-live option
  useEffect(() => {
    try {
      if (compositorInstance) {
        const fitMode = matchLiveLayout && currentLayout === 'picture-in-picture' ? 'cover' : 'contain';
        compositorInstance.updateVideoSource && compositorInstance.updateVideoSource('camera', { fit: fitMode } as any);
      }
    } catch (e) {
      console.warn('Failed to update compositor fit mode:', e);
    }
  }, [matchLiveLayout, currentLayout, compositorInstance]);

  // Sync recordedVideo URL to the recorded video element so we get a reliable loadedmetadata event
  useEffect(() => {
    const el = recordedVideoRef.current;
    if (!el) return;

    const handleLoaded = () => setRecordedReady(true);

    // reset
    setRecordedReady(false);
    try {
      if (recordedVideo) {
        el.src = recordedVideo;
      }
      el.addEventListener('loadedmetadata', handleLoaded);
      el.addEventListener('canplay', handleLoaded);
    } catch (err) {
      console.error('Failed to set recorded video src:', err);
    }

    return () => {
      el.removeEventListener('loadedmetadata', handleLoaded);
      el.removeEventListener('canplay', handleLoaded);
    };
  }, [recordedVideo]);

  // Reset camera ready flag when camera source is removed/added so we prewarm correctly
  useEffect(() => {
    if (recordingSources.camera) {
      setCameraReady(false);
    } else {
      setCameraReady(false);
    }
  }, [recordingSources.camera]);

  // Show preview when video blob becomes available after recording stops
  useEffect(() => {
    // When recording stops and video blob becomes available, show preview
    // This handles the case where videoBlob is set asynchronously by MediaRecorder's onstop handler
    // Also handle the case where recordingStatus is 'processing' (waiting for blob)
    if (!isRecording && (videoBlob || recordedVideo) && !showPreview && !showLessonForm && !uploading) {
      console.log('Video blob ready, showing preview', { 
        hasBlob: !!videoBlob, 
        hasUrl: !!recordedVideo, 
        blobSize: videoBlob?.size
      });
      setShowPreview(true);
      setShowLessonForm(false);
      setRecordingStatus('idle'); // Ensure status is idle when preview is shown
      setSuccessMessage('Recording completed! Review your video below.');
      
      // Now that blob is ready, it's safe to close camera
      // This ensures cleanup happens after blob is created
      setTimeout(() => {
        closeCamera();
      }, 500);
    }
  }, [isRecording, videoBlob, recordedVideo, showPreview, showLessonForm, uploading, closeCamera]);

  // Auto-save drafts during recording
  useEffect(() => {
    if (isRecording && videoBlob && videoBlob.size > 0) {
      // Start auto-saving
      const draftId = videoDraftStorage.startAutoSave(
        () => videoBlob,
        () => ({
          title: lessonTitle || 'Untitled Recording',
          description: lessonDescription,
          courseId: selectedCourse,
          lessonId: undefined,
          duration: recordingTime,
          quality: recordingQuality,
          timestamp: Date.now(),
          fileSize: videoBlob.size
        }),
        (savedId) => {
          setLastAutoSaveTime(Date.now());
          console.log('💾 Auto-saved draft:', savedId);
        }
      );
      setAutoSaveDraftId(draftId);
    } else {
      // Stop auto-saving
      videoDraftStorage.stopAutoSave();
      setAutoSaveDraftId(null);
    }

    return () => {
      videoDraftStorage.stopAutoSave();
    };
  }, [isRecording, videoBlob, recordingTime, lessonTitle, lessonDescription, selectedCourse, recordingQuality]);

  // Load saved drafts on mount
  useEffect(() => {
    const loadDrafts = async () => {
      try {
        const drafts = await videoDraftStorage.getAllDrafts();
        setSavedDrafts(drafts);
      } catch (error) {
        console.error('Failed to load drafts:', error);
      }
    };
    loadDrafts();
  }, []);

  // NEW: Layout class mapping
  const getLayoutClass = () => {
    switch (currentLayout) {
      case 'picture-in-picture':
        return 'pip-layout';
      case 'side-by-side':
        return 'side-by-side-layout';
      case 'screen-only':
        return 'screen-only-layout';
      case 'camera-only':
        return 'camera-only-layout';
      default:
        return 'pip-layout';
    }
  };

  // NEW: Slide management functions
  const handleSlidesChange = (newSlides: any[]) => {
    setCurrentSlides(newSlides);
    console.log('Slides updated:', newSlides);
  };

  const handleSlideAdvance = (slideIndex: number) => {
    setCurrentSlideIndex(slideIndex);
    recordSlideChange(slideIndex);
    console.log(`Advanced to slide ${slideIndex + 1}`);
  };

  // NEW: Enhanced video editing functions
  const handleEditComplete = async (editedBlob: Blob) => {
    try {
      setRecordingStatus('processing');
      
      // Update the video blob with edited version
      if (editRecording) {
        await editRecording(editedBlob);
      }
      
      // Create new URLs for the edited video
      const newVideoUrl = URL.createObjectURL(editedBlob);
      
      setSuccessMessage('Video edited successfully! Ready to upload.');
      setShowTimelineEditor(false);
      setShowPreview(false);
      setShowLessonForm(true); // Go back to upload form after editing
      setRecordingStatus('idle');
      
      // Update preview if needed
      if (recordedVideoRef.current) {
        recordedVideoRef.current.src = newVideoUrl;
      }
    } catch (error) {
      console.error('Video editing failed:', error);
      setErrorMessage('Failed to apply edits. Please try again.');
      setRecordingStatus('idle');
    }
  };

  // NEW: Notification management functions (Task 7.3)
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string,
    recoveryAction?: Notification['recoveryAction'],
    autoHide: boolean = true
  ) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const notification: Notification = {
      id,
      type,
      title,
      message,
      recoveryAction,
      autoHide,
      autoHideDelay: 5000
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after delay if autoHide is true
    if (autoHide) {
      setTimeout(() => {
        dismissNotification(id);
      }, 5000);
    }
  }, [dismissNotification]);

  // NEW: Performance degradation handler (Task 7.3)
  // User requested not to surface performance warnings; keep this a no-op to avoid noisy logs
  const handlePerformanceDegradation = useCallback(() => {
    // Intentionally left blank
  }, []);

  // NEW: Source loss handler (Task 7.3)
  const handleSourceLossNotification = useCallback((sourceType: 'camera' | 'screen') => {
    const title = sourceType === 'camera' ? 'Camera Lost' : 'Screen Share Lost';
    const message = sourceType === 'camera' 
      ? 'Your camera connection was lost. Recording continues with remaining sources.'
      : 'Screen sharing was stopped. Recording continues with camera only.';
    
    addNotification(
      'warning',
      title,
      message,
      {
        label: sourceType === 'camera' ? 'Reconnect Camera' : 'Start Screen Share',
        onClick: () => {
          if (sourceType === 'camera') {
            initializeCamera();
          } else {
            handleStartScreenShare();
          }
        }
      },
      false // Don't auto-hide, let user dismiss
    );
  }, [addNotification, initializeCamera]);

  // NEW: Monitor performance metrics and show alerts (Task 7.3)
  useEffect(() => {
    if (performanceMetrics && isRecording) {
      // Alert if FPS drops below 20
      if (performanceMetrics.fps < 20 && performanceMetrics.fps > 0) {
        handlePerformanceDegradation();
      }
      
      // Frames dropped notification disabled per UX request
    }
  }, [performanceMetrics?.fps, performanceMetrics?.droppedFrames, isRecording, handlePerformanceDegradation, addNotification]);

  // Task 8.2: Audio level monitoring effect
  useEffect(() => {
    if (isRecording && isCompositing && showAudioLevels) {
      // Start monitoring audio levels
      startAudioLevelMonitoring((levels) => {
        setAudioLevels(levels);
      });

      return () => {
        // Stop monitoring when recording stops or component unmounts
        stopAudioLevelMonitoring();
      };
    } else {
      // Clear audio levels when not recording
      setAudioLevels([]);
    }
  }, [isRecording, isCompositing, showAudioLevels, startAudioLevelMonitoring, stopAudioLevelMonitoring]);

  // NEW: Layout change with feedback (Task 7.2)
  const handleLayoutChange = useCallback((layout: LayoutType) => {
    if (changeLayout) {
      // @ts-ignore - changeLayout accepts LayoutType including 'presentation'
      changeLayout(layout);
      
      // Show feedback notification
      const layoutNames: Record<LayoutType, string> = {
        'picture-in-picture': 'Picture-in-Picture',
        'side-by-side': 'Side-by-Side',
        'presentation': 'Presentation',
        'screen-only': 'Screen Only',
        'camera-only': 'Camera Only'
      };
      
      setLayoutChangeNotification(`Layout changed to ${layoutNames[layout]}`);
      setTimeout(() => setLayoutChangeNotification(null), 2000);
    }
  }, [changeLayout]);

  // NEW: Layout cycling function for keyboard shortcuts (Task 7.2)
  const cycleLayout = useCallback(() => {
    const layouts: LayoutType[] = [
      'picture-in-picture',
      'side-by-side',
      'presentation',
      'screen-only',
      'camera-only'
    ];
    const currentIndex = layouts.indexOf(currentLayout as LayoutType);
    const nextIndex = (currentIndex + 1) % layouts.length;
    const nextLayout = layouts[nextIndex];
    
    handleLayoutChange(nextLayout);
  }, [currentLayout, handleLayoutChange]);

  // NEW: Enhanced recording with multi-source support
  const startCountdownAndRecording = useCallback(async () => {
    try {
      setRecordingStatus('countdown');
      
      await new Promise<void>((resolve) => {
        let n = 3;
        countdownIntervalRef.current = setInterval(() => {
          n -= 1;
          
          if (n <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            resolve();
          }
        }, 1000);
      });
      
      setRecordingStatus('recording');
      await startRecording();
      
      // Start auto-stop timer if set
      if (autoStopTimer > 0) {
        autoStopTimerRef.current = setTimeout(() => {
          if (isRecording) {
            handleStopRecording();
            setSuccessMessage(`Recording automatically stopped after ${autoStopTimer} minutes`);
          }
        }, autoStopTimer * 60 * 1000);
      }
    } catch (error: any) {
      console.error('Error during countdown or recording start:', error);
      setErrorMessage(formatErrorForDisplay(error) || 'Failed to start recording.');
      setRecordingStatus('idle');
      resetRecording();
    }
  }, [startRecording, resetRecording, autoStopTimer, isRecording]);

  useEffect(() => {
    if (shouldStartAfterInit.current && stream) {
      shouldStartAfterInit.current = false;
      startCountdownAndRecording();
    }
  }, [stream, startCountdownAndRecording]);

  // Load teacher's courses
  useEffect(() => {
    let isMounted = true;
    
    const loadCourses = async () => {
      try {
        setErrorMessage(null);
        const response = await coursesApi.getCourses();
        
        if (isMounted) {
          setCourses(response.data.courses || []);
          if (courseId) {
            setSelectedCourse(courseId);
          }
        }
      } catch (error: any) {
        console.error('Failed to load courses:', error);
        if (isMounted) {
          // Don't show error for 401 - let the auth system handle it
          // Only show error for other types of failures
          if (error?.response?.status === 401) {
            // Authentication issue - don't set error message, let auth system handle redirect
            console.warn('Authentication required to load courses');
            return;
          }
          setErrorMessage('Failed to load courses. You can still record videos without selecting a course.');
        }
      }
    };
    
    loadCourses();
    
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Load lesson data when lessonId is provided
  useEffect(() => {
    if (!lessonId) return;
    
    let isMounted = true;
    
    const loadLesson = async () => {
      try {
        // Get the course ID from the lesson - we need to find which course this lesson belongs to
        // First, try to get lessons from the selected course or courseId
        const targetCourseId = selectedCourse || courseId;
        if (!targetCourseId) {
          // If no course selected, we need to find the lesson's course
          // Try loading from all courses (this is a bit inefficient but works)
          const response = await coursesApi.getCourses();
          const allCourses = response.data.courses || [];
          
          // Search through courses to find the lesson
          for (const course of allCourses) {
            try {
              const lessonsResponse = await coursesApi.getLessons(course.id);
              const lessons = lessonsResponse.data.lessons || [];
              const lesson = lessons.find((l: any) => l.id === lessonId || l.id === parseInt(lessonId));
              
              if (lesson) {
                if (isMounted) {
                  setSelectedCourse(course.id);
                  setLessonTitle(lesson.title || '');
                  setLessonDescription(lesson.description || '');
                  setShowLessonForm(true);
                }
                return;
              }
            } catch (err) {
              // Continue searching
              console.warn(`Failed to load lessons for course ${course.id}:`, err);
            }
          }
        } else {
          // Course is known, just load the lesson
          const lessonsResponse = await coursesApi.getLessons(targetCourseId);
          const lessons = lessonsResponse.data.lessons || [];
          const lesson = lessons.find((l: any) => l.id === lessonId || l.id === parseInt(lessonId));
          
          if (lesson && isMounted) {
            setLessonTitle(lesson.title || '');
            setLessonDescription(lesson.description || '');
            setShowLessonForm(true);
          }
        }
      } catch (error: any) {
        console.error('Failed to load lesson:', error);
        if (isMounted) {
          setErrorMessage('Failed to load lesson data. You can still record a new video.');
        }
      }
    };
    
    loadLesson();
    
    return () => {
      isMounted = false;
    };
  }, [lessonId, courseId, selectedCourse]);

  const handleCreateCourseInline = async () => {
    if (!newCourseTitle.trim()) {
      setErrorMessage('Please enter a course title.');
      return;
    }
    try {
      setIsCreatingCourseLoading(true);
      setErrorMessage(null);
      const response = await coursesApi.createCourse({
        title: newCourseTitle.trim(),
        description: '',
        category: 'faith',
      });

      const createdCourse = response.data?.course;
      if (createdCourse) {
        // Prepend new course to list and select it
        setCourses(prev => [createdCourse, ...prev]);
        setSelectedCourse(String(createdCourse.id));
        setNewCourseTitle('');
        setIsCreatingCourse(false);
        setSuccessMessage('Course created. You can now save this lesson into it.');
      } else {
        setErrorMessage('Course was created but no course data was returned.');
      }
    } catch (error: any) {
      console.error('Failed to create course inline:', error);
      setErrorMessage(
        error?.response?.data?.message ||
        'Failed to create course. Please try again or create it from My Courses.'
      );
    } finally {
      setIsCreatingCourseLoading(false);
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setErrorMessage('Please select a valid video file.');
        return;
      }
      
      if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB
        setErrorMessage('Video file must be less than 2GB.');
        return;
      }

      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }

      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setShowPreview(true);
      setShowLessonForm(false); // Show preview first, not the form
      setRecordingDuration(0); // Will be calculated from video metadata
      setErrorMessage(null);
      setActiveTab('upload');
      setSuccessMessage('Video file selected! Preview it before uploading.');
    }
  }, [filePreview]);

  // Enhanced: Start recording with multi-source initialization
  const handleStartRecording = async () => {
    try {
      setRecordingTimeState(0);
      setRecordingDuration(0);
      setUploadSuccess(false);
      setErrorMessage(null);
      // Don't clear processing completion success message
      if (!persistentSuccessMessageRef.current) {
        setSuccessMessage(null);
      }
      setRecordingStats({
        fileSize: 0,
        bitrate: 0,
        framesDropped: 0,
        networkQuality: 'good',
        recordingQuality: recordingQuality,
        duration: 0
      });
      
      if (!recordingSources.camera && !recordingSources.screen) {
        shouldStartAfterInit.current = true;
        await initializeCamera();
      } else {
        await startCountdownAndRecording();
      }
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setErrorMessage(formatErrorForDisplay(error) || 'Failed to start recording.');
      setRecordingStatus('idle');
      resetRecording();
    }
  };

  const handleStopRecording = async () => {
    // Prevent multiple simultaneous stop calls
    if (isStoppingRef.current) {
      console.log('Stop already in progress, ignoring duplicate call');
      return;
    }
    
    if (!isRecording) {
      console.log('Not recording, ignoring stop call');
      return;
    }
    
    isStoppingRef.current = true;
    
    try {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      
      // Check minimum recording duration
      if (recordingTime < 1) {
        setErrorMessage('Recording too short. Please record for at least 1 second.');
        isStoppingRef.current = false;
        isStoppingRef.current = false;
        return;
      }
      
      // IMPORTANT: Capture the recording time BEFORE stopping (as stopRecording may reset it)
      const capturedDuration = recordingTime;
      console.log('Stopping recording with duration:', capturedDuration);
      
      setRecordingStatus('processing');
      
      // Call stopRecording - this is synchronous and will trigger onstop handler
      stopRecording();
      
      // Note: stopRecording() is synchronous, but the blob creation happens in onstop handler
      // We don't need to await it, but we should wait a moment to ensure it's called
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setRecordingStatus('idle');
      setRecordingDuration(capturedDuration); // Use captured value BEFORE closing camera
      
      // Don't set showPreview to false - let the useEffect handle it when blob is ready
      // This ensures preview shows even if blob creation is delayed
      setShowLessonForm(false); // Don't show form until user clicks "Upload"
      setSuccessMessage('Processing recording...');
      
      // Don't close camera immediately - let the useEffect handle it when blob is ready
      // This ensures the blob is created before cleanup happens
      // The useEffect that watches for videoBlob will call closeCamera() when ready
      console.log('Waiting for blob to be created before closing camera...');
      
      // Reset stopping flag after a delay to allow blob creation
      setTimeout(() => {
        isStoppingRef.current = false;
        isStoppingRef.current = false;
      }, 2000);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      setErrorMessage('Failed to stop recording.');
      setRecordingStatus('idle');
      isStoppingRef.current = false;
    }
  };

  // NEW: Enhanced session management
  const handleSaveSession = () => {
    if (currentSession && videoBlob) {
      const sessionId = Date.now().toString();
      saveSession(sessionId);
      setSavedSessions(getSavedSessions());
      setSuccessMessage('Recording session saved successfully');
    }
  };

  // NEW: Load saved session
  const handleLoadSession = (sessionId: string) => {
    const success = loadSession(sessionId);
    if (success) {
      setSuccessMessage('Session loaded successfully');
      setShowSessionMenu(false);
      setShowPreview(true);
    } else {
      setErrorMessage('Failed to load session');
    }
  };

  // NEW: Export session
  const handleExportSession = () => {
    if (exportSession && currentSession) {
      exportSession(currentSession);
      setSuccessMessage('Session exported successfully');
    }
  };

  // Enhanced reset function
  const handleReset = useCallback(() => {
    console.log('Resetting recorder state');
    
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    
    resetRecording();
    setRecordingTimeState(0);
    setRecordingDuration(0);
    setShowLessonForm(false);
    setShowPreview(false);
    setLessonTitle('');
    setLessonDescription('');
    setSelectedCourse(courseId || '');
    setUploadProgress(0);
    setUploadSuccess(false);
    setErrorMessage(null);
    // Don't clear processing completion success message
    if (!successMessage || !successMessage.includes('Video processing completed successfully')) {
      setSuccessMessage(null);
    }
    setSelectedFile(null);
    setAutoStopTimer(0);
    setRecordingStatus('idle');
    setShowTimelineEditor(false);
    setShowSlideManager(false);
    setShowProcessingStatus(false);
    setProcessingLessonId(null);
    setCurrentSlides([]);
    setCurrentSlideIndex(0);
    setShowMuxUploader(false);
    setMuxUploadLessonId(null);
    setRecordingStats({
      fileSize: 0,
      bitrate: 0,
      framesDropped: 0,
      networkQuality: 'good',
      recordingQuality: recordingQuality,
      duration: 0
    });
    
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetRecording, courseId, filePreview]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreviewPlay = () => {
    if (recordedVideoRef.current) {
      if (isPlaying) {
        recordedVideoRef.current.pause();
      } else {
        recordedVideoRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (recordedVideoRef.current) {
      recordedVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // FIXED: Enhanced upload function with WebM header analysis and Mux support
  const handleUpload = async () => {
    if (!selectedCourse || !lessonTitle.trim()) {
      setErrorMessage('Please select a course and enter a lesson title.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setErrorMessage(null);

      if (activeTab === 'record' && (!videoBlob || videoBlob.size === 0)) {
        throw new Error('Recorded video is empty or invalid. Please record again.');
      }

      if (activeTab === 'record' && videoBlob && videoBlob.size < 5000) {
        throw new Error('Recorded video is too small (less than 5KB). Please record a longer video.');
      }

      if (activeTab === 'record' && recordingDuration < 1) {
        throw new Error('Recording duration is too short. Please record for at least 1 second.');
      }

      if (activeTab === 'upload' && !selectedFile) {
        throw new Error('No video file selected. Please choose a file.');
      }

      // Update existing lesson or create new one
      let targetLessonId: string;
      
      if (lessonId) {
        // Update existing lesson
        await coursesApi.updateLesson(lessonId, {
          title: lessonTitle.trim(),
          description: lessonDescription.trim() || 'Video lesson'
        });
        targetLessonId = lessonId;
      } else {
        // Create new lesson
        const lessonResponse = await coursesApi.createLesson(selectedCourse, {
          title: lessonTitle.trim(),
          description: lessonDescription.trim() || 'Video lesson',
          order: 0
        });
        targetLessonId = lessonResponse.data.lesson.id;
      }

      setProcessingLessonId(targetLessonId);
      setUploadProgress(30);

      // Clear the teacher dashboard cache to force a refresh of lesson counts
      if (dataCache && typeof dataCache.delete === 'function') {
        dataCache.delete('teacher_dashboard');
      }

      // All uploads now use Mux direct upload (bypasses server)
      setMuxUploadLessonId(targetLessonId);
      setShowMuxUploader(true);
      setUploading(false);
      setShowLessonForm(false);
      return;
    } catch (error: any) {
      console.error(`Failed to ${lessonId ? 'update' : 'create'} lesson:`, error);
      setErrorMessage(error.response?.data?.message || error.message || `Failed to ${lessonId ? 'update' : 'create'} lesson. Please try again.`);
      setUploading(false);
      setShowLessonForm(false);
    }
  };

  // NEW: Handle processing completion
  const handleProcessingComplete = (transcodedVideoUrl?: string) => {
    setShowProcessingStatus(false);
    
    // Show prominent success message that persists
    const persistentMessage = '🎉 Video processing completed successfully! Your video is now available for viewing.';
    persistentSuccessMessageRef.current = persistentMessage;
    setSuccessMessage(persistentMessage);
    
    // If we have a transcoded video URL, notify parent components
    if (transcodedVideoUrl && processingLessonId) {
      console.log('Processing complete with transcoded URL:', transcodedVideoUrl);
      // The video player will read from the database, which should have the updated URL
      // But we can notify parent components if needed
      onUploadComplete?.(processingLessonId, transcodedVideoUrl);
    }
    
    // Don't auto-reset - let user see the success message
    // They can manually reset or navigate away
  };

  // NEW: Handle Mux upload completion
  const handleMuxUploadComplete = useCallback((lessonId: string) => {
    console.log('Mux upload complete for lesson:', lessonId);
    setUploadSuccess(true);
    setSuccessMessage('Video uploaded to Mux successfully! Processing will begin shortly.');
    
    // Hide Mux uploader and show processing status
    setShowMuxUploader(false);
    setMuxUploadLessonId(null);
    
    // Show processing status component - it will wait for webhooks/WebSocket updates
    setProcessingLessonId(lessonId);
    setShowProcessingStatus(true);
    
    // Note: assetId and playbackId will come via webhooks and be updated in the database
    // The VideoProcessingStatus component will listen for WebSocket updates
  }, []);

  // NEW: Handle Mux upload error
  const handleMuxUploadError = useCallback((error: Error) => {
    console.error('Mux upload error:', error);
    setErrorMessage(error.message || 'Failed to upload video to Mux');
    setShowMuxUploader(false);
    setMuxUploadLessonId(null);
  }, []);

  // NEW: Handle Mux upload cancel
  const handleMuxUploadCancel = useCallback(() => {
    setShowMuxUploader(false);
    setMuxUploadLessonId(null);
    setShowLessonForm(true);
  }, []);

  // NEW: Enhanced screen share handlers with feedback
  const handleStartScreenShare = async () => {
    try {
      setErrorMessage(null);
      
      // If we're recording and have a camera source, we want to add screen share to existing recording
      if (isRecording && recordingSources.camera) {
        setSuccessMessage('Adding screen to recording... This will briefly pause and restart.');
        await addScreenShare(); // Use addScreenShare for dynamic addition during recording
        // Automatically switch to picture-in-picture to show both
        if (currentLayout === 'camera-only') {
          changeLayout('picture-in-picture');
        }
        // Success message will be set after restart completes
        setTimeout(() => {
          setSuccessMessage('Screen sharing added to recording! Both camera and screen are now being recorded.');
          // Don't clear processing completion message
          if (!persistentSuccessMessageRef.current) {
            setTimeout(() => setSuccessMessage(null), 5000);
          }
        }, 2000);
      } else {
        await startScreenShare(); // Use startScreenShare for initial screen sharing
        // When screen sharing starts without camera, switch to screen-only layout
        if (!recordingSources.camera) {
          changeLayout('screen-only');
        } else if (currentLayout === 'camera-only') {
          changeLayout('picture-in-picture');
        }
        
        setSuccessMessage('Screen sharing started! Your screen is now being shared.');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error) {
      console.error('Failed to start screen share:', error);
      setErrorMessage('Failed to start screen sharing. Please try again.');
      // Don't clear processing completion success message
      if (!persistentSuccessMessageRef.current) {
        setSuccessMessage(null);
      }
    }
  };

  const handleStopScreenShare = async () => {
    // If we're recording, we want to remove screen share from existing recording
    if (isRecording && recordingSources.screen) {
      await removeScreenShare(); // Use removeScreenShare for dynamic removal during recording
    } else {
      await stopScreenShare(); // Use stopScreenShare for stopping initial screen sharing
    }
    
    if (isRecording) {
      setSuccessMessage('Switched back to camera! Recording continues seamlessly.');
    } else {
      setSuccessMessage('Screen sharing stopped. You are no longer sharing your screen.');
    }
    setErrorMessage(null);
  };

  // Debug helper: directly call getDisplayMedia to confirm chooser behavior
  const handleDebugGetDisplayMedia = async () => {
    try {
      setDebugDisplayMediaMessage('Requesting screen-share chooser...');
      console.log('Debug: calling navigator.mediaDevices.getDisplayMedia from EnhancedVideoRecorder');

      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
        throw new Error('getDisplayMedia not supported in this browser/context');
      }

      const s = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
      console.log('Debug: getDisplayMedia resolved, stream tracks:', s.getTracks());
      setDebugDisplayMediaMessage('Chooser returned a stream. Check console for details. Stopping test stream.');

      // Stop tracks immediately since this is only a diagnostics test
      try {
        s.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      } catch (e) {
        console.warn('Debug: failed to stop tracks cleanly', e);
      }

      setTimeout(() => setDebugDisplayMediaMessage(null), 3500);
    } catch (err: any) {
      console.error('Debug getDisplayMedia error:', err);
      const name = err?.name || err?.message || 'UnknownError';
      let msg = `getDisplayMedia error: ${name}`;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        msg += ' — permission denied or chooser blocked. Try clicking the page, disable extensions, or use a secure context.';
      } else if (name === 'AbortError') {
        msg += ' — chooser dismissed by user.';
      } else if (name === 'NotFoundError') {
        msg += ' — no capture sources available.';
      }
      setDebugDisplayMediaMessage(msg);
      setTimeout(() => setDebugDisplayMediaMessage(null), 7000);
    }
  };

  const handleDeleteRecording = () => {
    if (confirm('Are you sure you want to delete this recording?')) {
      handleReset();
    }
  };

  const downloadRecording = () => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Recording downloaded successfully');
    }
  };

  const getFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleTabChange = (tab: 'record' | 'upload') => {
    if (activeTab === 'record' && tab === 'upload') {
      closeCamera();
      setShowSlideManager(false);
    }
    setActiveTab(tab);
  };

  // NEW: Enhanced recording stats display
  const renderRecordingStats = () => {
    if (!isRecording) return null;

    return (
      <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-lg text-xs space-y-1 z-20">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            recordingStats.networkQuality === 'good' ? 'bg-green-500' :
            recordingStats.networkQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span>Network: {recordingStats.networkQuality}</span>
        </div>
        <div>Size: {getFileSize(recordingStats.fileSize)}</div>
        <div>Bitrate: {(recordingStats.bitrate / 1000000).toFixed(1)} Mbps</div>
        {recordingStats.framesDropped > 0 && (
          <div className="text-yellow-400">
            Dropped frames: {recordingStats.framesDropped}
          </div>
        )}
      </div>
    );
  };

  // NEW: Enhanced preview rendering with slide support
  const renderPreview = () => {
    if (activeTab === 'record') {
      if (recordedVideo) {
        // For recorded playback, show the full recorded frame (no extra zoom),
        // so it matches what was actually captured during recording.
        // Recorded playback should be an intermediate size: larger than normal players
        // but smaller than the live recording area so users can compare without crowding.
        return (
          <div className="relative w-full bg-black rounded-lg overflow-hidden">
            <video
              ref={recordedVideoRef}
              src={recordedVideo}
              className={`w-full ${matchLiveLayout && currentLayout === 'picture-in-picture' ? 'object-cover' : 'object-contain'} bg-black transition-opacity duration-200 ${recordedReady ? 'opacity-100' : 'opacity-0'}`}
              style={{ maxHeight: '60vh', transition: 'opacity 200ms ease-in-out' }}
              controls
              controlsList="nodownload"
              preload="metadata"
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                if (video.duration && video.duration > 0 && (!recordingDuration || recordingDuration === 0)) {
                  const duration = Math.floor(video.duration);
                  setRecordingDuration(duration);
                }

                // Don't force container aspect ratio (causes zoom). Let object-contain do its job.
                console.log('Recorded video metadata:', video.videoWidth, 'x', video.videoHeight);
                setRecordedReady(true);
              }}
              onError={(e) => {
                const video = e.currentTarget;
                const error = video.error;
                let errorMessage = 'Failed to load video. ';

                if (error) {
                  switch (error.code) {
                    case MediaError.MEDIA_ERR_ABORTED:
                      errorMessage += 'Video loading was aborted.';
                      break;
                    case MediaError.MEDIA_ERR_NETWORK:
                      errorMessage += 'Network error occurred while loading video.';
                      break;
                    case MediaError.MEDIA_ERR_DECODE:
                      errorMessage += 'Video decoding failed. The file may be corrupted.';
                      break;
                    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                      errorMessage += 'Video format not supported. Please try a different format.';
                      break;
                    default:
                      errorMessage += 'Unknown error occurred.';
                  }
                }

                console.error('Video playback error:', error, errorMessage);
                setErrorMessage(errorMessage);
                if (!successMessage || !successMessage.includes('Video processing completed successfully')) {
                  setSuccessMessage(null);
                }
                setRecordedReady(false);
              }}
              onLoadStart={() => {
                setErrorMessage(null);
                setRecordedReady(false);
              }}
              onCanPlay={() => {
                // Video is ready to play
                setErrorMessage(null);
                setRecordedReady(true);
              }}
            >
              Your browser does not support the video tag.
            </video>

            {/* Match live layout toggle */}
            <button
              onClick={() => setMatchLiveLayout(prev => !prev)}
              className={`absolute top-3 right-3 z-30 px-2 py-1 text-xs rounded-md border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors`}
              title="Toggle preview to match live layout"
            >
              {matchLiveLayout ? 'Match Live' : 'Preview Fit'}
            </button>
          </div>
        );
      } else {
        // Special handling for side-by-side layout using simple flex so both camera and screen share space cleanly
        if (
          currentLayout === 'side-by-side' &&
          recordingSources.camera &&
          recordingSources.screen
        ) {
          return (
            <div className="w-full flex bg-transparent" style={{ height: liveHeight }}>
              <div className="w-1/2 h-full overflow-hidden bg-black/5">
                <div className="relative w-full h-full">
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-contain bg-transparent transition-opacity duration-200 ${screenReady ? 'opacity-100' : 'opacity-0'}`}
                    onLoadedMetadata={() => setScreenReady(true)}
                    onCanPlay={() => setScreenReady(true)}
                  />
                  {!screenReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="w-10 h-10 border-t-4 border-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>
              <div className="w-1/2 h-full relative overflow-hidden bg-black/5">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain bg-transparent"
                />
                <div className="absolute top-2 left-2 bg-black/40 text-white px-2 py-1 rounded text-xs">
                  Camera
                </div>
              </div>
              {renderRecordingStats()}
            </div>
          );
        }

        return (
          <div className={`w-full relative ${getLayoutClass()}`} style={{ height: liveHeight }}>
            {/* Screen Share Preview - Show FIRST when available (priority) */}
            {/* When screen sharing is active, prioritize showing screen content */}
            {recordingSources.screen && (
              <div 
                className="screen-preview" 
                style={{ 
                  zIndex: currentLayout === 'screen-only' ? 20 : 10,
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                  display: currentLayout === 'camera-only' ? 'none' : 'block',
                  backgroundColor: 'transparent'
                }}
              >
                <video
                  ref={screenVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover rounded-lg bg-black transition-opacity duration-200 ${screenReady ? 'opacity-100' : 'opacity-0'}`}
                  onLoadedMetadata={() => {
                    const video = screenVideoRef.current;
                    if (video) {
                      console.log('Screen video ready:', {
                        width: video.videoWidth,
                        height: video.videoHeight,
                        readyState: video.readyState,
                        paused: video.paused
                      });

                      // Ensure video is playing (prewarm)
                      if (video.paused) {
                        video.play().catch(err => {
                          console.error('Failed to play screen video:', err);
                          setErrorMessage('Screen sharing video failed to play. Please try again.');
                        });
                      }
                      setScreenReady(true);
                    }
                  }}
                  onPlaying={() => {
                    console.log('Screen video is now playing');
                    setErrorMessage(null);
                    setScreenReady(true);
                  }}
                  onError={(e) => {
                    const video = e.currentTarget;
                    console.error('Screen video error:', video.error);
                    setErrorMessage('Screen sharing video error. Please restart screen sharing.');
                    setScreenReady(false);
                  }}
                />
                <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 shadow-lg">
                  <Monitor className="h-3 w-3" />
                  <span>Screen Sharing</span>
                  {screenVideoRef.current && screenVideoRef.current.readyState >= 2 && (
                    <div className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Screen capture active" />
                  )}
                </div>
              </div>
            )}
            
            {/* Camera Preview - Show SECOND (lower priority when screen is active) */}
            {recordingSources.camera && (
              <div
                className={`camera-preview ${currentLayout === 'screen-only' ? 'hidden' : ''} transition-all duration-300 ease-in-out`}
                style={ currentLayout === 'picture-in-picture' && recordingSources.screen
                  ? { position: 'absolute', width: pipSize, height: pipSize, bottom: '1rem', right: '1rem', zIndex: 30, borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.25)', transform: cameraReady ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.98)', opacity: cameraReady ? 1 : 0.92 }
                  : { zIndex: recordingSources.screen ? 5 : 10 }
                }
              >
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-contain rounded-lg bg-transparent transition-opacity duration-200 ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
                    onLoadedMetadata={() => {
                      const v = videoRef.current;
                      if (v) {
                        // ensure consistent sizing and mark ready
                        setCameraReady(true);
                      }
                    }}
                    onCanPlay={() => setCameraReady(true)}
                    onError={() => setCameraReady(false)}
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-8 h-8 border-t-4 border-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {currentLayout !== 'picture-in-picture' && (
                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    Camera
                  </div>
                )}
              </div>
            )}
            
            {/* No sources message */}
            {!recordingSources.camera && !recordingSources.screen && (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <Camera className="h-16 w-16 mx-auto mb-4" />
                  <p>Click "Start Recording" to begin</p>
                  {!enableAudio && (
                    <div className="mt-2 flex items-center justify-center space-x-1 text-yellow-400">
                      <MicOff className="h-4 w-4" />
                      <span className="text-sm">Audio disabled</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recording Stats */}
            {renderRecordingStats()}
          </div>
        );
      }
    } else {
      return (
        <div className="w-full h-full flex items-center justify-center">
          {filePreview ? (
            <video src={filePreview} className="w-full h-full object-cover bg-black" controls />
          ) : (
            <div className="text-center p-8">
              <Cloud className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Video File</h3>
              <p className="text-gray-600 text-sm mb-4">Supported formats: MP4, WebM, MOV, AVI, MPEG</p>
              <p className="text-gray-500 text-xs mb-4">Maximum file size: 2GB</p>
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Upload className="h-4 w-4" />
                <span>Choose Video File</span>
              </button>
            </div>
          )}
        </div>
      );
    }
  };


  return (
    <div className="h-full bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
      <NotificationContainer
        notifications={notifications}
        onDismiss={dismissNotification}
      />
      <div className="flex h-full">
        {/* Main Content Area */}
        <div className="flex-1 relative min-w-0 h-full overflow-hidden">
        {import.meta.env.MODE !== 'production' && (
          <div className="absolute top-4 right-4 z-40 text-xs bg-black/70 text-white px-2 py-1 rounded-lg">
            <div className="leading-tight">live: {liveHeight}</div>
            <div className="leading-tight">playback: {playbackHeight}</div>
            <div className="leading-tight">pip: {pipSize}</div>
          </div>
        )}
          {debugDisplayMediaMessage && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-3 py-2 bg-black/80 text-white rounded-lg text-sm max-w-xl text-center">
              {debugDisplayMediaMessage}
            </div>
          )}
          {showDebugSizes && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 px-3 py-2 bg-black/80 text-white rounded-lg text-xs max-w-xl text-center">
              <div className="flex items-center justify-center space-x-4">
                <div>Canvas: <strong>{compositorInstance ? `${compositorInstance.getCanvas().width}x${compositorInstance.getCanvas().height}` : 'n/a'}</strong></div>
                <div>Camera: <strong>{(() => {
                  try {
                    const info = compositorInstance?.getSourceInfo('camera');
                    if (info) return `${info.videoWidth}x${info.videoHeight} (${info.fit || 'n/a'})`;
                    if (videoRef.current) return `${videoRef.current.videoWidth || 0}x${videoRef.current.videoHeight || 0}`;
                    return 'n/a';
                  } catch (e) { return 'n/a'; }
                })()}</strong></div>
                <div>Recorded: <strong>{recordedVideoRef.current ? `${recordedVideoRef.current.videoWidth}x${recordedVideoRef.current.videoHeight}` : 'n/a'}</strong></div>
              </div>
            </div>
          )}
      {/* Error Alert */}
      {errorMessage && (
        <div className="px-6 pt-4">
          <ErrorAlert
            error={{ message: errorMessage, code: 'ERROR' }}
            onDismiss={() => setErrorMessage(null)}
            className="mb-0"
          />
        </div>
      )}

      {/* Header - Light beige/silver theme */}
      <div className="px-6 py-4 border-b border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white/70 backdrop-blur-sm border border-slate-200/50">
              <Video className="h-5 w-5 text-slate-700" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Recording Studio</h3>
          </div>
          <div className="flex items-center space-x-2">
            {/* Auto-save Indicator */}
            {isRecording && lastAutoSaveTime && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50/50 border border-green-200/50 rounded-lg">
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-600">
                  Auto-saved {Math.floor((Date.now() - lastAutoSaveTime) / 1000)}s ago
                </span>
              </div>
            )}

            {/* Saved Drafts Button (advanced) */}
            {showAdvancedTools && savedDrafts.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowDraftsList(!showDraftsList)}
                  className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-50/50 rounded-lg transition-colors"
                  title={`${savedDrafts.length} saved draft(s)`}
                >
                  <Save className="h-5 w-5" />
                  {savedDrafts.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {savedDrafts.length}
                    </span>
                  )}
                </button>
                {showDraftsList && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl z-50 border border-slate-200/50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
                      <h3 className="font-semibold text-slate-700">Saved Drafts</h3>
                      <p className="text-xs text-slate-500 mt-1">Click to load a draft</p>
                    </div>
                    <div className="p-2">
                      {savedDrafts.map((draft) => (
                        <div
                          key={draft.id}
                          className="p-3 mb-2 bg-slate-50/50 rounded-lg border border-slate-200/50 hover:bg-slate-100/50 transition-colors cursor-pointer"
                          onClick={async () => {
                            try {
                              const loadedDraft = await videoDraftStorage.loadDraft(draft.id);
                              if (loadedDraft) {
                                // Create object URL for the loaded blob
                                const videoUrl = URL.createObjectURL(loadedDraft.blob);
                                // Store blob in a way that can be used for upload
                                // Note: videoBlob and recordedVideo come from the hook, so we'll use local state
                                setSelectedFile(new File([loadedDraft.blob], `draft_${draft.id}.webm`, { type: 'video/webm' }));
                                setFilePreview(videoUrl);
                                setLessonTitle(loadedDraft.metadata.title || '');
                                setLessonDescription(loadedDraft.metadata.description || '');
                                if (loadedDraft.metadata.courseId) {
                                  setSelectedCourse(loadedDraft.metadata.courseId);
                                }
                                setShowDraftsList(false);
                                setShowPreview(true);
                                setActiveTab('upload');
                                setSuccessMessage('Draft loaded successfully! You can now upload it.');
                              }
                            } catch (error) {
                              setErrorMessage('Failed to load draft');
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-700 text-sm">
                                {draft.metadata.title || 'Untitled Recording'}
                              </h4>
                              <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500">
                                <span>{new Date(draft.metadata.timestamp).toLocaleString()}</span>
                                <span>•</span>
                                <span>{(draft.metadata.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                                {draft.metadata.duration > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{Math.floor(draft.metadata.duration / 60)}:{(draft.metadata.duration % 60).toString().padStart(2, '0')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await videoDraftStorage.deleteDraft(draft.id);
                                  const drafts = await videoDraftStorage.getAllDrafts();
                                  setSavedDrafts(drafts);
                                } catch (error) {
                                  setErrorMessage('Failed to delete draft');
                                }
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Delete draft"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Session Management Button (advanced) */}
            {showAdvancedTools && savedSessions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSessionMenu(!showSessionMenu)}
                  className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-50/50 rounded-lg transition-colors"
                  title="Saved Sessions"
                >
                  <FolderOpen className="h-5 w-5" />
                </button>
                {showSessionMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-slate-200/50">
                    <div className="p-2 text-xs text-slate-500 border-b border-slate-200/50">
                      Saved Sessions
                    </div>
                    {savedSessions.map(sessionId => (
                      <button
                        key={sessionId}
                        onClick={() => handleLoadSession(sessionId)}
                        className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Session {sessionId.slice(-8)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Simple vs advanced toggle */}
            <button
              onClick={() => setShowAdvancedTools(prev => !prev)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200/70 bg-white/80 text-slate-600 hover:bg-slate-50/80"
            >
              {showAdvancedTools ? 'Hide advanced tools' : 'Show advanced tools'}
            </button>

            {/* Advanced-only settings shortcuts */}
            {showAdvancedTools && (
              <>
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Advanced Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Tips & guidance"
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Enhanced Tab Navigation - Light theme with neon accents - Mobile optimized */}
        <div className={`flex space-x-1 mt-4 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/50 ${isMobile ? 'p-0.5' : 'p-1'}`}>
          <button
            onClick={() => handleTabChange('record')}
            className={`flex-1 rounded-lg transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'record' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                : 'hover:bg-slate-50/50 text-slate-600'
            } ${isMobile ? 'py-1.5 px-2' : 'py-2 px-3'}`}>
            <VideoIcon className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            <span className={isMobile ? 'text-xs' : ''}>Record</span>
          </button>
          <button
            onClick={() => handleTabChange('upload')}
            className={`flex-1 rounded-lg transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'upload' 
                ? 'bg-gradient-to-r from-[#00D4FF]/90 to-[#00B8E6]/90 text-white shadow-lg' 
                : 'hover:bg-slate-50/50 text-slate-600'
            } ${isMobile ? 'py-1.5 px-2' : 'py-2 px-3'}`}>
            <Cloud className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            <span className={isMobile ? 'text-xs' : ''}>Upload Video</span>
          </button>
        </div>
      </div>

      {/* NEW: Screen Sharing Banner - Light theme */}
      {isScreenSharing && activeTab === 'record' && !recordedVideo && (
        <div className="px-6 py-3 border-b border-slate-200/50 bg-white/85 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <Monitor className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">You are sharing your screen</span>
              </div>
            </div>
            <button
              onClick={handleStopScreenShare}
              className="px-4 py-2 bg-gradient-to-r from-[#FF6B35]/90 to-[#FF8C42]/90 text-white rounded-lg hover:from-[#FF5722] hover:to-[#FF7043] transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-md"
            >
              <Square className="h-4 w-4" />
              <span>Stop Sharing</span>
            </button>
          </div>
        </div>
      )}

      {/* NEW: Multi-source Controls with integrated components (Task 7.1) - Light theme */}
      {activeTab === 'record' && !recordedVideo && (
        <div className="px-6 py-3 border-b border-slate-200/50 bg-white/85 backdrop-blur-sm">
          <div className="space-y-3">
            {/* Source Control Indicators */}
            <div className="flex items-center justify-between">
              <SourceControlIndicators
                recordingSources={recordingSources}
                onToggleCamera={() => recordingSources.camera ? closeCamera() : initializeCamera()}
                onToggleScreen={() => isScreenSharing ? handleStopScreenShare() : handleStartScreenShare()}
                disabled={false}
                isRecording={isRecording}
              />
              
              {/* Additional controls */}
              <div className="flex items-center space-x-2">
                {/* Slide Manager Toggle */}
                <button
                  onClick={() => setShowSlideManager(!showSlideManager)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors border ${
                    showSlideManager 
                      ? 'bg-gradient-to-r from-[#FF6B9D]/20 to-[#FF8E9B]/20 text-[#FF6B9D] border-[#FF6B9D]/30' 
                      : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-1" />
                  Slides
                </button>
                
                {/* Keyboard Shortcuts Toggle */}
                <button
                  onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors border ${
                    showKeyboardShortcuts 
                      ? 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 text-[#FFD700] border-[#FFD700]/30' 
                      : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                  }`}
                  title="Show keyboard shortcuts"
                >
                  <Keyboard className="h-4 w-4 inline mr-1" />
                  Shortcuts
                </button>
                
                {/* Compositor Preview Toggle */}
                {isCompositing && (
                  <button
                    onClick={() => setShowCompositorPreview(!showCompositorPreview)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors border ${
                      showCompositorPreview 
                        ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300' 
                        : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                    }`}
                    title="Show compositor preview"
                  >
                    <Monitor className="h-4 w-4 inline mr-1" />
                    Preview
                  </button>
                )}
                
                {/* Audio Levels Toggle (Task 8.2) */}
                {isCompositing && options.enableAudio && (
                  <button
                    onClick={() => setShowAudioLevels(!showAudioLevels)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors border ${
                      showAudioLevels 
                        ? 'bg-gradient-to-r from-[#00D4FF]/20 to-[#00B8E6]/20 text-[#00D4FF] border-[#00D4FF]/30' 
                        : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                    }`}
                    title="Show audio levels"
                  >
                    <Mic className="h-4 w-4 inline mr-1" />
                    Audio
                  </button>
                )}
                {/* Debug: direct getDisplayMedia tester (dev only) */}
                <button
                  onClick={handleDebugGetDisplayMedia}
                  className="px-3 py-1 rounded-lg text-sm font-medium transition-colors border bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50"
                  title="Debug getDisplayMedia chooser"
                >
                  <Monitor className="h-4 w-4 inline mr-1" />
                  Debug Screen Share
                </button>
                {/* Debug sizes toggle */}
                <button
                  onClick={() => setShowDebugSizes(prev => !prev)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors border ${showDebugSizes ? 'bg-slate-900 text-white' : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'}`}
                  title="Toggle compositor debug sizes"
                >
                  <Timer className="h-4 w-4 inline mr-1" />
                  Sizes
                </button>
              </div>
            </div>
            
            {/* Layout Selector */}
            <div>
              <LayoutSelector
                currentLayout={currentLayout as LayoutType}
                onLayoutChange={handleLayoutChange}
                disabled={false}
                isCompositing={isCompositing}
              />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Panel - Light theme (advanced only) */}
      {showAdvancedTools && showAdvancedSettings && (
        <div className="px-6 py-4 border-b border-slate-200/50 bg-white/85 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-700 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-[#FFD700]" />
              Advanced Recording Settings
            </h4>
            <button
              onClick={() => setShowPresetsManager(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-[#4FC3F7]/90 to-[#00D4FF]/90 text-white rounded-lg hover:from-[#00B8E6] hover:to-[#0099CC] transition-all text-xs font-medium flex items-center space-x-1"
              title="Manage recording presets"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Presets</span>
            </button>
          </div>
          
          {/* Recording Quality Settings Component */}
          <div className="mb-4">
            <RecordingQualitySettings
              currentQuality={recordingQuality}
              currentFrameRate={frameRate}
              onQualityChange={(quality) => {
                setRecordingQuality(quality);
                // Update options in hook
                setOptions({ ...options, resolution: quality });
              }}
              onFrameRateChange={(fps) => {
                setFrameRate(fps);
                setOptions({ ...options, frameRate: fps });
              }}
              onBitrateChange={(bitrate) => {
                setBitrate(bitrate);
              }}
              autoAdjust={autoAdjustQuality}
              onAutoAdjustChange={setAutoAdjustQuality}
            />
          </div>

          {/* Additional Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/50">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Auto-stop Timer (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={autoStopTimer}
                onChange={(e) => setAutoStopTimer(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white/90 text-slate-700 focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent"
                placeholder="0 = no auto-stop"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enable-audio"
                checked={enableAudio}
                onChange={(e) => {
                  setEnableAudio(e.target.checked);
                  setOptions({ ...options, enableAudio: e.target.checked });
                }}
                className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500/50"
              />
              <label htmlFor="enable-audio" className="ml-2 text-sm text-slate-700">
                Enable Audio Recording
              </label>
            </div>
          </div>
        </div>
      )}


      {/* Main Preview Area */}
      <div
        className="relative"
        style={{
          height: liveHeight,
          backgroundColor: 'black',
          aspectRatio: useAspectRatio ? '16/9' : undefined
        }}
      >
        {/* Use our custom preview logic (handles side-by-side, PiP, etc.) so framing stays predictable */}
        {renderPreview()}
        
        {/* Optional: Show compositor preview overlay if enabled (for debugging when not recording) */}
        {showCompositorPreview && !isRecording && isCompositing && compositorInstance && (
          <div className="absolute inset-0 pointer-events-none opacity-50 z-10">
            <CompositorPreview
              compositor={compositorInstance}
              isCompositing={isCompositing}
              performanceMetrics={performanceMetrics}
            />
          </div>
        )}
        
        {/* Loading state during compositor initialization (Task 7.2) */}
        {isInitializingCompositor && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
            <div className="text-center text-white">
              <Loader className="h-12 w-12 mx-auto mb-4 animate-spin" />
              <p className="text-lg font-semibold">Initializing Compositor...</p>
              <p className="text-sm text-gray-300 mt-2">Setting up multi-source recording</p>
            </div>
          </div>
        )}
        
        {/* Compositor status indicator (Task 7.2) */}
        {isCompositing && !isRecording && (
          <div className="absolute top-4 right-4 z-20 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 shadow-lg">
            <CheckCircle className="h-4 w-4" />
            <span>Compositor Ready</span>
          </div>
        )}

        {/* NEW: Slide Indicator */}
        {currentSlides.length > 0 && activeTab === 'record' && (
          <div className="absolute top-4 left-4 z-30 bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
            Slide {currentSlideIndex + 1}/{currentSlides.length}
          </div>
        )}

        {/* Countdown Overlay - Mobile optimized */}
        {false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className={`text-white font-bold ${isMobile ? 'text-5xl' : 'text-6xl'}`}>3</div>
          </div>
        )}

        {/* Recording Status - Neon colors - Mobile optimized */}
        {isRecording && activeTab === 'record' && (
          <div className={`absolute flex items-center z-30 ${isMobile ? 'top-2 left-2 space-x-1.5 flex-wrap' : 'top-4 left-4 space-x-3'}`}>
            <div className={`flex items-center bg-gradient-to-r from-[#FF6B35]/90 to-[#FF8C42]/90 text-white rounded-full shadow-lg backdrop-blur-sm border border-[#FF6B35]/30 ${
                isMobile ? 'space-x-1 px-2 py-0.5' : 'space-x-2 px-3 py-1'
              }`}>
              <div className={`bg-white rounded-full animate-pulse ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
              <span className={`font-semibold ${isMobile ? 'text-xs' : ''}`}>REC</span>
            </div>
            <div className={`bg-black/70 backdrop-blur-sm text-white rounded-full border border-white/20 ${
                isMobile ? 'px-2 py-0.5' : 'px-3 py-1'
              }`}>
              <span className={`font-medium ${isMobile ? 'text-xs' : ''}`}>{formatTime(recordingTime)}</span>
            </div>
            {isPaused && (
              <div className={`bg-gradient-to-r from-[#FFD700]/90 to-[#FFA500]/90 text-white rounded-full shadow-lg backdrop-blur-sm border border-[#FFD700]/30 ${
                  isMobile ? 'px-2 py-0.5' : 'px-3 py-1'
                }`}>
                <span className={`font-semibold ${isMobile ? 'text-xs' : ''}`}>PAUSED</span>
              </div>
            )}
            {autoStopTimer > 0 && (
              <div className={`bg-gradient-to-r from-[#00D4FF]/90 to-[#00B8E6]/90 text-white rounded-full flex items-center shadow-lg backdrop-blur-sm border border-[#00D4FF]/30 ${
                  isMobile ? 'space-x-0.5 px-2 py-0.5' : 'space-x-1 px-3 py-1'
                }`}>
                <Timer className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                <span className={`font-medium ${isMobile ? 'text-xs' : ''}`}>Auto-stop: {autoStopTimer}m</span>
              </div>
            )}
          </div>
        )}
        
        {/* Task 8.2: Audio Level Indicators */}
        {showAudioLevels && audioLevels.length > 0 && isRecording && (
          <div className="absolute bottom-4 right-4 z-30">
            <AudioLevelIndicators
              audioLevels={audioLevels}
              onVolumeChange={setAudioVolume}
              onMuteToggle={setAudioMuted}
              getMutedState={isAudioMuted}
              getVolume={getAudioVolume}
            />
          </div>
        )}



        {/* Recording Controls - Neon colors - Mobile optimized */}
        {activeTab === 'record' && !recordedVideo && (
          <div className={`absolute left-1/2 -translate-x-1/2 z-30 ${isMobile ? 'bottom-4' : 'bottom-6'}`}>
            {!isRecording ? (
              <div className="text-center">
                <button
                  onClick={handleStartRecording}
                  disabled={!recordingSources.camera && !recordingSources.screen}
                  className={`flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm border border-blue-500/30 transform hover:scale-105 ${
                    isMobile ? 'px-6 py-3' : 'px-8 py-4'
                  }`}
                >
                  <Circle className={isMobile ? 'h-5 w-5' : 'h-6 w-6'} />
                  <span className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>
                    Start Recording
                  </span>
                </button>
                <p className={`text-white backdrop-blur-sm ${isMobile ? 'text-xs mt-1' : 'text-sm mt-2'} opacity-75`}>
                  Minimum recording time: 1 second
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className={`flex items-center justify-center mb-2 ${isMobile ? 'space-x-2' : 'space-x-4'}`}>
                  {/* Session Save Button */}
                  <button
                    onClick={handleSaveSession}
                    className={`bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm border border-indigo-500/30 ${
                        isMobile ? 'p-3' : 'p-4'
                      }`}
                    title="Save Session"
                  >
                    <Save className={isMobile ? 'h-5 w-5' : 'h-6 w-6'} />
                  </button>

                  {/* Pause/Resume Button */}
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className={`bg-gradient-to-r from-[#FFD700]/90 to-[#FFA500]/90 text-white rounded-2xl hover:from-[#FFC107] hover:to-[#FF8C00] transition-all duration-200 shadow-lg hover:shadow-[#FFD700]/40 backdrop-blur-sm border border-[#FFD700]/30 ${
                        isMobile ? 'p-3' : 'p-4'
                      }`}
                  >
                    {isPaused ? <Play className={isMobile ? 'h-5 w-5' : 'h-6 w-6'} /> : <Pause className={isMobile ? 'h-5 w-5' : 'h-6 w-6'} />}
                  </button>

                  {/* Stop Button */}
                  <button
                    onClick={handleStopRecording}
                    disabled={recordingTime < 1 || isStoppingRef.current || !isRecording}
                    className={`bg-gradient-to-r from-[#FF6B35]/90 to-[#FF8C42]/90 text-white rounded-2xl hover:from-[#FF5722] hover:to-[#FF7043] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-[#FF6B35]/40 backdrop-blur-sm border border-[#FF6B35]/30 ${
                        isMobile ? 'p-3' : 'p-4'
                      }`}
                    title={recordingTime < 1 ? 'Record for at least 1 second' : 'Stop Recording'}
                  >
                    <Square className={isMobile ? 'h-5 w-5' : 'h-6 w-6'} />
                  </button>
                </div>
                {recordingTime < 1 && (
                  <p className={`text-[#FFD700] backdrop-blur-sm font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Record for at least 1 second to stop
                  </p>
                )}
              </div>
            )}
          </div>
        )}


      </div>

      {/* NEW: Slide Manager (advanced only) */}
      {showAdvancedTools && showSlideManager && (
        <div className="absolute top-4 right-4 z-40 w-96">
          <SlideManager
            onSlidesChange={handleSlidesChange}
            onSlideAdvance={handleSlideAdvance}
          />
        </div>
      )}
      
      {/* NEW: Keyboard Shortcuts Panel (Task 7.1, 7.2) - advanced only */}
      {showAdvancedTools && showKeyboardShortcuts && (
        <div className="absolute top-4 left-4 z-40 w-80">
          <KeyboardShortcuts
            isRecording={isRecording}
            isPaused={isPaused}
            onPauseResume={() => isPaused ? resumeRecording() : pauseRecording()}
            onToggleScreen={() => isScreenSharing ? handleStopScreenShare() : handleStartScreenShare()}
            onCycleLayout={cycleLayout}
            onSelectLayout={handleLayoutChange}
            disabled={false}
          />
        </div>
      )}
      
      {/* Layout change notification (Task 7.2) */}
      {layoutChangeNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {layoutChangeNotification}
        </div>
      )}

      {/* Recording Stats (Task 7.1 - Updated recording status indicators) - advanced only */}
      {showAdvancedTools && activeTab === 'record' && recordedVideo && videoBlob && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Duration: {formatTime(recordingDuration)}</span>
              <span>Size: {getFileSize(videoBlob.size)}</span>
              <span>Quality: {recordingQuality}</span>
              <span>Layout: {currentLayout}</span>
              <span>Sources: {[
                ...(recordingSources.camera ? ['Camera'] : []),
                ...(recordingSources.screen ? ['Screen'] : [])
              ].join(' + ')}</span>
              {isCompositing && (
                <span className="text-green-600 font-medium">
                  ✓ Composited
                </span>
              )}
              {currentSlides.length > 0 && (
                <span>Slides: {currentSlides.length}</span>
              )}
            </div>
            {!enableAudio && (
              <div className="flex items-center space-x-1 text-orange-600">
                <MicOff className="h-4 w-4" />
                <span>No audio</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success/Error Messages - Light theme */}
      {successMessage && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-600 text-slate-700 flex items-center justify-between space-x-2 backdrop-blur-sm shadow-lg rounded-lg mx-4 my-2">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-base">{successMessage}</span>
          </div>
          <button
            onClick={() => {
              persistentSuccessMessageRef.current = null;
              setSuccessMessage('');
            }}
            className="text-emerald-700 hover:text-emerald-900 transition-colors"
            aria-label="Dismiss"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {errorMessage && (
        <div className="p-3 bg-red-50/80 border-l-4 border-red-300 text-red-700 flex items-center space-x-2 backdrop-blur-sm">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Upload Progress - Light theme with neon accent */}
      {uploading && (
        <div className="p-4 bg-white/85 backdrop-blur-sm border-b border-slate-200/50">
          <div className="flex justify-between mb-1 text-sm text-slate-700">
            <span className="font-medium">Uploading video...</span>
            <span className="font-semibold">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#00D4FF] to-[#00B8E6] h-2 rounded-full transition-all duration-300 shadow-sm" 
              style={{ width: `${uploadProgress}%` }} 
            />
          </div>
        </div>
      )}

      {/* Quick Actions Bar - Shown when previewing - Light theme */}
      {(recordedVideo || selectedFile) && !uploading && !uploadSuccess && !showLessonForm && showPreview && (
        <div className="mt-4 p-4 border-t border-slate-200/50 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm">
          <div className="flex flex-col space-y-4">
            {/* Video Info Row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{formatTime(recordingDuration)}</span>
                </div>
                {videoBlob && (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{getFileSize(videoBlob.size)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons Row - Responsive Grid */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowEnhancedPreview(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-md"
                title="Enhanced Preview with Controls"
              >
                <Play className="h-4 w-4" />
                <span>Preview</span>
              </button>
              {activeTab === 'record' && videoBlob && (
                <>
                  <button 
                    onClick={downloadRecording}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-md"
                    title="Download Recording"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowTimelineEditor(true);
                      setShowPreview(false);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-md"
                  >
                    <Scissors className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                </>
              )}
              {(recordedVideo || selectedFile) && (
                <button
                  onClick={handleExportSession}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:from-cyan-700 hover:to-cyan-800 transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-md"
                  title="Export Session"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              )}
              <button 
                onClick={handleReset}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-all duration-200 flex items-center space-x-2 text-sm font-medium text-slate-700 shadow-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{activeTab === 'record' ? 'Record Again' : 'New File'}</span>
              </button>
              <button 
                onClick={() => {
                  setShowPreview(false);
                  setShowLessonForm(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-md"
              >
                <Upload className="h-4 w-4" />
                <span>Continue to Upload</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Video Preview Modal */}
      {showEnhancedPreview && (recordedVideo || filePreview || videoBlob) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <VideoPreviewPlayer
              videoBlob={activeTab === 'record' ? videoBlob || null : null}
              videoUrl={activeTab === 'record' ? recordedVideo : filePreview}
              onUpload={() => {
                setShowEnhancedPreview(false);
                setShowPreview(false);
                setShowLessonForm(true);
              }}
              onEdit={activeTab === 'record' && videoBlob ? () => {
                setShowEnhancedPreview(false);
                setShowTimelineEditor(true);
                setShowPreview(false);
              } : undefined}
              onCancel={() => setShowEnhancedPreview(false)}
              title={activeTab === 'record' ? 'Recorded Video' : selectedFile?.name || 'Video Preview'}
              duration={recordingDuration}
            />
          </div>
        </div>
      )}

      {/* Mux Uploader Modal */}
      {showMuxUploader && muxUploadLessonId && (
        <div className="p-6 border-t bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2 mb-2">
              <Cloud className="h-5 w-5 text-blue-600" />
              <span>Upload to Mux</span>
            </h3>
            <p className="text-sm text-gray-600">
              Your lesson has been created. Now upload your video to Mux for optimized streaming.
            </p>
          </div>
          <MuxVideoUploader
            lessonId={muxUploadLessonId}
            videoBlob={videoBlob || undefined}
            onUploadComplete={handleMuxUploadComplete}
            onError={handleMuxUploadError}
            onCancel={handleMuxUploadCancel}
          />
        </div>
      )}

      {/* Lesson Form - Light theme */}
      {showLessonForm && (recordedVideo || selectedFile) && (
        <div className="p-6 border-t border-slate-200/50 bg-white/85 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2 text-slate-700">
              <Star className="h-5 w-5 text-[#FFD700]" />
              <span>Save Your {activeTab === 'record' ? 'Recording' : 'Video'}</span>
            </h3>
            {activeTab === 'record' && recordedVideo && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setShowPreview(true);
                    setShowLessonForm(false);
                  }}
                  className="px-3 py-2 border border-slate-300/50 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white hover:border-slate-400/50 transition-all duration-200 flex items-center space-x-2 text-sm shadow-sm text-slate-700"
                >
                  <Play className="h-4 w-4" />
                  <span>Preview Video</span>
                </button>
                <div className="relative group">
                  <button
                    onClick={() => {
                      setShowTimelineEditor(true);
                      setShowLessonForm(false);
                    }}
                    className="px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-200 flex items-center space-x-2 text-sm shadow-md"
                  >
                    <Scissors className="h-4 w-4" />
                    <span>Edit Video</span>
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    Trim your video to remove unwanted parts
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                  </div>
                </div>

              </div>
           )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Select Course *</label>
              <div className="flex flex-col gap-2">
                <select 
                  value={selectedCourse} 
                  onChange={(e) => setSelectedCourse(e.target.value)} 
                  className="w-full p-3 border border-slate-300 rounded-xl bg-white/90 text-slate-700 focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent"
                  disabled={uploading || isCreatingCourseLoading}
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
                {!isCreatingCourse && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCourse(true);
                      setNewCourseTitle('');
                    }}
                    className="inline-flex items-center text-xs text-sky-700 hover:text-sky-900 self-start px-2 py-1 rounded-md hover:bg-sky-50 transition-colors"
                    disabled={uploading}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Create new course from here
                  </button>
                )}
                {isCreatingCourse && (
                  <div className="mt-1 space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      New course title
                    </label>
                    <input
                      type="text"
                      value={newCourseTitle}
                      onChange={(e) => setNewCourseTitle(e.target.value)}
                      placeholder="e.g. Introduction to Orthodox Liturgy"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-transparent"
                      disabled={isCreatingCourseLoading}
                    />
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isCreatingCourseLoading) {
                            setIsCreatingCourse(false);
                            setNewCourseTitle('');
                          }
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-white"
                        disabled={isCreatingCourseLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateCourseInline}
                        className="px-3 py-1.5 text-xs rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60 flex items-center"
                        disabled={isCreatingCourseLoading || !newCourseTitle.trim()}
                      >
                        {isCreatingCourseLoading ? (
                          <>
                            <Loader className="h-3.5 w-3.5 mr-1 animate-spin" />
                            Creating…
                          </>
                        ) : (
                          <>
                            <BookOpen className="h-3.5 w-3.5 mr-1" />
                            Create & Select
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      We’ll create a new draft course and attach this lesson to it automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Lesson Title *</label>
              <input 
                type="text" 
                value={lessonTitle} 
                onChange={(e) => setLessonTitle(e.target.value)} 
                placeholder="Enter lesson title..." 
                className="w-full p-3 border border-slate-300 rounded-xl bg-white/90 text-slate-700 focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent" 
                disabled={uploading} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Description (Optional)</label>
              <textarea 
                value={lessonDescription} 
                onChange={(e) => setLessonDescription(e.target.value)} 
                placeholder="Brief description..." 
                rows={3} 
                className="w-full p-3 border border-slate-300 rounded-xl bg-white/90 text-slate-700 focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent" 
                disabled={uploading} 
              />
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleReset} 
                disabled={uploading}
                className="flex-1 px-4 py-3 border border-slate-300/50 rounded-xl bg-white/90 backdrop-blur-sm hover:bg-white hover:border-slate-400/50 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 text-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{activeTab === 'record' ? 'Record Again' : 'Upload New'}</span>
              </button>
              <button 
                onClick={handleUpload} 
                disabled={uploading || uploadSuccess || !selectedCourse || !lessonTitle.trim()}
                className="flex-1 px-4 py-3 border border-transparent rounded-xl bg-gradient-to-r from-[#00D4FF]/90 to-[#00B8E6]/90 text-white hover:from-[#00B8E6] hover:to-[#0099CC] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 shadow-md backdrop-blur-sm border border-[#00D4FF]/30"
              >
                {uploading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : uploadSuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Uploaded!</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Save Lesson</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Video Timeline Editor Modal */}
      {showTimelineEditor && videoBlob && recordedVideo && (
        <VideoTimelineEditor
          videoBlob={videoBlob}
          videoUrl={recordedVideo}
          onEditComplete={handleEditComplete}
          onCancel={() => {
            setShowTimelineEditor(false);
            setShowPreview(false);
            setShowLessonForm(true); // Go back to upload form on cancel
          }}
        />
      )}

      {/* NEW: Video Processing Status */}
      {showProcessingStatus && processingLessonId && (
        <VideoProcessingStatus
          lessonId={processingLessonId}
          isOpen={showProcessingStatus}
          onClose={() => setShowProcessingStatus(false)}
          onProcessingComplete={handleProcessingComplete}
          videoProvider="mux"
        />
      )}

      {/* Recording Presets Manager Modal (advanced only) */}
      {showAdvancedTools && (
        <RecordingPresetsManager
          currentSettings={{
            quality: recordingQuality,
            frameRate: frameRate,
            bitrate: bitrate,
            autoAdjustQuality: autoAdjustQuality,
            videoDeviceId: recordingSources.camera?.getVideoTracks()[0]?.getSettings().deviceId,
            audioDeviceId: recordingSources.microphone?.getAudioTracks()[0]?.getSettings().deviceId,
            enableScreen: isScreenSharing,
            layout: currentLayout
          }}
          onPresetSelect={() => {}}
          onClose={() => setShowPresetsManager(false)}
          isOpen={showPresetsManager}
        />
      )}

    </div>

          {/* Right Side Controls Panel */}
        <div className="w-72 border-l border-slate-200/50 bg-gradient-to-b from-slate-50/50 to-white/50 backdrop-blur-sm flex-shrink-0 h-full">
          <div className="p-3 space-y-3 h-full overflow-y-auto">

            {/* Sources Section */}
            <div className="bg-white/70 rounded-lg border border-slate-200/50 p-2">
              <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center">
                <Monitor className="h-3 w-3 mr-1" />
                Sources
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Camera className="h-4 w-4 text-slate-600" />
                    <span className="text-sm text-slate-700">Camera</span>
                  </div>
                  <button
                    onClick={() => recordingSources.camera ? closeCamera() : initializeCamera()}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                      recordingSources.camera
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {recordingSources.camera ? 'Active' : 'Start camera'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Monitor className="h-4 w-4 text-slate-600" />
                    <span className="text-sm text-slate-700">Screen</span>
                  </div>
                  <button
                    onClick={() => isScreenSharing ? handleStopScreenShare() : handleStartScreenShare()}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                      isScreenSharing
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isScreenSharing ? 'Active' : 'Start screen sharing'}
                  </button>
                </div>

                <div className="text-xs text-slate-500 mt-2">
                  {recordingSources.camera || isScreenSharing ? (
                    <span className="text-green-600">✓ Sources active</span>
                  ) : (
                    <span>(No sources)</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <span className="text-sm text-slate-700">Slides</span>
                  </div>
                  <button
                    onClick={() => setShowSlideManager(!showSlideManager)}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                      currentSlides.length > 0
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {currentSlides.length > 0 ? `${currentSlides.length}` : 'Manage'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Keyboard className="h-4 w-4 text-slate-600" />
                    <span className="text-sm text-slate-700">Shortcuts</span>
                  </div>
                  <button
                    onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                    className="px-3 py-1 text-xs rounded-full font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>

            {/* Layout Options */}
            <div className="bg-white/70 rounded-lg border border-slate-200/50 p-2">
              <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center">
                <Square className="h-3 w-3 mr-1" />
                Layout
              </h3>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => changeLayout('picture-in-picture')}
                  className={`p-1.5 text-xs rounded border transition-colors ${
                    currentLayout === 'picture-in-picture'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-5 h-3 bg-slate-300 rounded mb-1 mx-auto relative">
                      <div className="absolute inset-0.5 bg-slate-600 rounded-sm"></div>
                      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-slate-400 rounded-sm"></div>
                    </div>
                    <div className="text-[10px] leading-tight">PIP</div>
                  </div>
                </button>

                <button
                  onClick={() => changeLayout('side-by-side')}
                  className={`p-1.5 text-xs rounded border transition-colors ${
                    currentLayout === 'side-by-side'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-5 h-3 bg-slate-300 rounded mb-1 mx-auto flex">
                      <div className="w-1/2 bg-slate-600 rounded-l-sm"></div>
                      <div className="w-1/2 bg-slate-400 rounded-r-sm"></div>
                    </div>
                    <div className="text-[10px] leading-tight">Side</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    // @ts-ignore - changeLayout accepts LayoutType including 'presentation'
                    changeLayout('presentation');
                  }}
                  className={`p-1.5 text-xs rounded border transition-colors ${
                    currentLayout === 'presentation'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-5 h-3 bg-slate-300 rounded mb-1 mx-auto relative">
                      <div className="w-full h-1 bg-slate-600 rounded-sm mb-0.5"></div>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-slate-400 rounded-sm"></div>
                    </div>
                    <div className="text-[10px] leading-tight">Pres</div>
                  </div>
                </button>

                <button
                  onClick={() => changeLayout('screen-only')}
                  className={`p-1.5 text-xs rounded border transition-colors ${
                    currentLayout === 'screen-only'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-5 h-3 bg-slate-300 rounded mb-1 mx-auto">
                      <div className="w-full h-full bg-slate-600 rounded-sm"></div>
                    </div>
                    <div className="text-[10px] leading-tight">Screen</div>
                  </div>
                </button>

                <button
                  onClick={() => changeLayout('camera-only')}
                  className={`p-1.5 text-xs rounded border transition-colors col-span-2 ${
                    currentLayout === 'camera-only'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-5 h-3 bg-slate-300 rounded mb-1 mx-auto">
                      <div className="w-2.5 h-2.5 bg-slate-400 rounded-full mx-auto mt-0.5"></div>
                    </div>
                    <div className="text-[10px] leading-tight">Camera</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-white/70 rounded-lg border border-slate-200/50 p-2">
              <h3 className="text-xs font-semibold text-slate-700 mb-2">Status</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Recording:</span>
                  <span className={isRecording ? 'text-green-600 font-medium' : 'text-slate-500'}>
                    {isRecording ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Layout:</span>
                  <span className="text-slate-700 font-medium capitalize">
                    {currentLayout.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Sources:</span>
                  <span className="text-slate-700">
                    {[
                      ...(recordingSources.camera ? ['Camera'] : []),
                      ...(isScreenSharing ? ['Screen'] : [])
                    ].join(' + ') || 'None'}
                  </span>
                </div>
                {isRecording && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Duration:</span>
                    <span className="text-slate-700 font-medium">{formatTime(recordingTime)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div> {/* Close flex container */}
      </div> {/* Close main container */}
    </div>
  );
}
export default VideoRecorder;