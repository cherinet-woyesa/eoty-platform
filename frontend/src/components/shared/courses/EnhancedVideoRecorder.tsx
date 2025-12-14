/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import SimpleTrimEditor from './SimpleTrimEditor';
import SlideManager from './SlideManager';
import VideoProcessingStatus from './VideoProcessingStatus';
import SuccessNotificationModal from './SuccessNotificationModal';
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
  BookOpen, ArrowRight
} from 'lucide-react';

interface VideoRecorderProps {
  onRecordingComplete?: (videoUrl: string) => void;
  onUploadComplete?: (lessonId: string, videoUrl: string) => void;
  courseId?: string;
  lessonId?: string;
  variant?: 'default' | 'clean' | 'embedded';
  onToggleTips?: () => void;
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
  variant = 'default',
  onToggleTips
}) => {
  const navigate = useNavigate();
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
    ,
    acknowledgePreview
  } = useVideoRecorder();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const previewAcknowledgedRef = useRef(false);

  // Reset acknowledgement flag when a new blob/url is set so we can acknowledge next preview
  useEffect(() => {
    previewAcknowledgedRef.current = false;
  }, [videoBlob, recordedVideo]);
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
  // Always show lesson form by default for better UX
  const [showLessonForm, setShowLessonForm] = useState(true);
  
  // Error/Success State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const persistentSuccessMessageRef = useRef<string | null>(null);

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
  const [countdownValue, setCountdownValue] = useState(3);
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
  
  // NEW: Notification system (Task 7.3)
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Success/Progress Modal Notification State
  const [modalNotification, setModalNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info' | 'loading';
    title: string;
    message: string;
    progress?: number;
    autoCloseDelay?: number;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    autoCloseDelay: 5000
  });


  // NEW: Integrated Features State
  const [showTimelineEditor, setShowTimelineEditor] = useState(false);
  const [showSlideManager, setShowSlideManager] = useState(false);
  const [showProcessingStatus, setShowProcessingStatus] = useState(false);
  const [processingLessonId, setProcessingLessonId] = useState<string | null>(null);
  const [currentSlides, setCurrentSlides] = useState<any[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // NEW: Enhanced state for production features
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'countdown' | 'recording' | 'paused' | 'processing'>('idle');
  
  
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
        // Silently fail and use default settings
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
      // Component unmounting, cleaning up
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
        // Camera video stream updated
      }
    }
    
    // ENHANCED: Better screen video initialization with persistence during restart
    if (screenVideoRef.current && recordingSources.screen) {
      const screenVideo = screenVideoRef.current;
      const screenStream = recordingSources.screen;
      
      // Only update if stream changed to avoid clearing during restart
      if (screenVideo.srcObject !== screenStream) {
        // Setting screen video stream
        screenVideo.srcObject = screenStream;
      }
      
      // Ensure video is playing - retry if needed
      const ensurePlaying = async () => {
        try {
          // Check if stream is still active
          const videoTracks = screenStream.getVideoTracks();
          const activeTracks = videoTracks.filter(t => t.readyState === 'live' && t.enabled);
          
          if (activeTracks.length === 0) {
            // No active video tracks in screen stream
            return;
          }
          
          // Ensure video element has the stream
          if (!screenVideo.srcObject) {
            screenVideo.srcObject = screenStream;
          }
          
          // Play if paused
          if (screenVideo.paused) {
            await screenVideo.play();
            // Screen video started playing
          }
          
        } catch (error) {
          // Failed to play screen video
          // Retry after a delay
          setTimeout(async () => {
            try {
              if (screenVideoRef.current && recordingSources.screen) {
                await screenVideoRef.current.play();
              }
            } catch (retryError) {
              // Retry failed
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
          // Screen video metadata loaded
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
        // Screen video stream cleared
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
        // Audio context not supported
      }
    }
    
    return () => {
      audioAnalyserRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [stream, recordingSources, enableAudio]);

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

  // Show preview when video blob becomes available after recording stops
  useEffect(() => {
    // When recording stops and video blob becomes available, show preview
    if (!isRecording && (videoBlob || recordedVideo) && !showPreview && !showLessonForm && !uploading) {
      // Direct to lesson form instead of preview step
      setShowLessonForm(true);
      setShowPreview(false);
      setRecordingStatus('idle');
      
      // Do NOT acknowledge preview here — wait until the preview video element has loaded metadata
      // The preview's onLoadedMetadata will call acknowledgePreview() to allow the hook to cleanup
    }
  }, [isRecording, videoBlob, recordedVideo, showPreview, showLessonForm, uploading]);
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
          // Auto-saved draft
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
        // Failed to load drafts
      }
    };
    loadDrafts();
  }, []);



  // NEW: Slide management functions
  const handleSlidesChange = (newSlides: any[]) => {
    setCurrentSlides(newSlides);
    // Slides updated
  };

  const handleSlideAdvance = (slideIndex: number) => {
    setCurrentSlideIndex(slideIndex);
    recordSlideChange(slideIndex);
    // Advanced to slide
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
      // Video editing failed
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

  // Funnel success and error messages to toast notifications
  useEffect(() => {
    if (successMessage) {
      addNotification('success', 'Success', successMessage, undefined, true);
      if (!persistentSuccessMessageRef.current) {
        setSuccessMessage(null);
      }
    }
  }, [successMessage, addNotification]);

  useEffect(() => {
    if (errorMessage) {
      addNotification('error', 'Error', errorMessage, undefined, false);
      // Keep the inline errorMessage state for potential programmatic flows,
      // but don’t render a persistent inline banner
      // Clear after a short delay to prevent duplicate toasts on re-render
      setTimeout(() => setErrorMessage(null), 50);
    }
  }, [errorMessage, addNotification]);

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
      setCountdownValue(3);
      
      await new Promise<void>((resolve) => {
        let n = 3;
        countdownIntervalRef.current = setInterval(() => {
          n -= 1;
          setCountdownValue(n);
          
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
      // Error during countdown or recording start
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

  // Do NOT auto-initialize camera on mount; open only on user action (Start Recording or toggle)
  useEffect(() => {
    // Keep default layout predictable without requesting camera permissions automatically
    const hasCamera = !!recordingSources.camera;
    const hasScreen = !!recordingSources.screen;
    
    // Only reset layout if we have NO sources and are not recording
    // This prevents overriding the user's layout choice (e.g. screen-only) when they stop sharing
    if (!hasCamera && !hasScreen && !isRecording) {
      handleLayoutChange('camera-only');
    }
  }, [recordingSources.camera, recordingSources.screen, isRecording, handleLayoutChange]);

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
        // Failed to load courses
        if (isMounted) {
          // Don't show error for 401 - let the auth system handle it
          // Only show error for other types of failures
          if (error?.response?.status === 401) {
            // Authentication issue - don't set error message, let auth system handle redirect
            // Authentication required to load courses
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
              // Failed to load lessons for course
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
        // Failed to load lesson
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
      // Failed to create course inline
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
    setSuccessMessage(null);
    const hasExistingStreams = recordingSources.camera || recordingSources.screen;
    if (!hasExistingStreams) {
      // No existing streams - initialize camera
      // No existing streams - initializing camera
      await initializeCamera();
    } else {
      // We have existing streams - reuse them
      // Reusing existing streams for recording
      // No action needed; existing sources will be used by startRecording()
    }
    
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
      // Error starting recording
      setErrorMessage(formatErrorForDisplay(error) || 'Failed to start recording.');
      setRecordingStatus('idle');
      resetRecording();
    }
  };

  const handleStopRecording = async () => {
    // Prevent multiple simultaneous stop calls
    if (isStoppingRef.current) {
      // Stop already in progress, ignoring duplicate call
      return;
    }
    
    if (!isRecording) {
      // Not recording, ignoring stop call
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
      // Stopping recording
      
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
      
      // Don't close camera immediately - let the useEffect handle it when blob is ready
      // This ensures the blob is created before cleanup happens
      // The useEffect that watches for videoBlob will call closeCamera() when ready
      // Waiting for blob to be created before closing camera
      
      // Fallback: if preview acknowledgement hasn't happened, close camera after a short delay
      setTimeout(() => {
        try {
          if (!isRecording && !previewAcknowledgedRef.current) {
            // Fallback closing camera after stop
            closeCamera();
          }
        } catch (e) {
          // Fallback closeCamera error
        }
      }, 3000);
      
      // Reset stopping flag after a delay to allow blob creation
      setTimeout(() => {
        isStoppingRef.current = false;
        isStoppingRef.current = false;
      }, 2000);
      
    } catch (error) {
      // Error stopping recording
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
  // Resetting recorder state - cleaning up streams
  acknowledgePreview();
    
    if (autoStopTimerRef.current) {
    clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = null;
  }
    
    resetRecording();
  setRecordingTimeState(0);
  setRecordingDuration(0);
  setShowLessonForm(true); // Keep form visible after reset
  setShowPreview(false);
  setLessonTitle('');
  setLessonDescription('');
  setSelectedCourse(courseId || '');
  setUploadProgress(0);
  setUploadSuccess(false);
  setErrorMessage(null);
  
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
  
  if (filePreview) {
    URL.revokeObjectURL(filePreview);
    setFilePreview(null);
  }
  
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
  
}, [resetRecording, courseId, filePreview, successMessage, setRecordingTimeState, acknowledgePreview]);
    

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
        recordedVideoRef.current.play().catch(() => {
          setErrorMessage('Unable to play the preview video.');
        });
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
      // Failed to create/update lesson
      setErrorMessage(error.response?.data?.message || error.message || `Failed to ${lessonId ? 'update' : 'create'} lesson. Please try again.`);
      setUploading(false);
      setShowLessonForm(false);
    }
  };

  // NEW: Handle processing completion
  const handleProcessingComplete = (transcodedVideoUrl?: string) => {
    // Don't close the modal immediately - let the user see the success state and click "Done"
    // setShowProcessingStatus(false);
    
    // Show prominent success message that persists
    const persistentMessage = '🎉 Video processing completed successfully! Your video is now available for viewing.';
    persistentSuccessMessageRef.current = persistentMessage;
    setSuccessMessage(persistentMessage);
    try {
      // Also show a visible toast popup
      addNotification(
        'success',
        'Success',
        persistentMessage,
        undefined,
        true // auto-hide
      );
    } catch {}
    
    // If we have a transcoded video URL, notify parent components
    if (processingLessonId) {
      // Processing complete
      // The video player will read from the database, which should have the updated URL
      // But we can notify parent components if needed
      // Pass empty string if URL is not provided, as parent might only need the ID
      onUploadComplete?.(processingLessonId, transcodedVideoUrl || '');
    }
    
    // Don't auto-reset - let user see the success message
    // They can manually reset or navigate away
  };

  // NEW: Handle Mux upload completion
  const handleMuxUploadComplete = useCallback((lessonId: string) => {
    // Mux upload complete
    setUploadSuccess(true);
    setSuccessMessage('Video uploaded to Mux successfully! Processing will begin shortly.');
    
    // Hide Mux uploader and show processing status
    setShowMuxUploader(false);
    setMuxUploadLessonId(null);
    
    // Show processing status component - it will wait for webhooks/WebSocket updates
    setProcessingLessonId(lessonId);
    setShowProcessingStatus(true);
    
    // Note: We do NOT navigate away here anymore. 
    // We wait for processing to complete so the user sees the success status.
    // Navigation can happen manually or after processing is confirmed.
    
    // Note: assetId and playbackId will come via webhooks and be updated in the database
    // The VideoProcessingStatus component will listen for WebSocket updates
  }, [courseId, navigate]);

  // NEW: Handle Mux upload error
  const handleMuxUploadError = useCallback((error: Error) => {
    // Mux upload error
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
        await addScreenShare(); // Use addScreenShare for dynamic addition during recording
        // Automatically switch to picture-in-picture to show both
        if (currentLayout === 'camera-only') {
          changeLayout('picture-in-picture');
        }
        // Success modal removed per UX request
      } else {
        await startScreenShare(); // Use startScreenShare for initial screen sharing
        // When screen sharing starts without camera, switch to screen-only layout
        if (!recordingSources.camera) {
          changeLayout('screen-only');
        } else if (currentLayout === 'camera-only') {
          changeLayout('picture-in-picture');
        }
        
        // Success modal removed per UX request
      }
    } catch (error) {
      // Show error modal
      setModalNotification({
        isOpen: true,
        type: 'error',
        title: '❌ Screen Sharing Failed',
        message: 'Failed to start screen sharing. Please check your permissions and try again.',
        autoCloseDelay: 5000
      });
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
      setModalNotification({
        isOpen: true,
        type: 'info',
        title: '📹 Camera Only',
        message: 'Switched back to camera-only mode. Recording continues.',
        autoCloseDelay: 3000
      });
    } else {
      setModalNotification({
        isOpen: true,
        type: 'info',
        title: '⏹️ Screen Sharing Stopped',
        message: 'You are no longer sharing your screen.',
        autoCloseDelay: 3000
      });
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
      setModalNotification({
        isOpen: true,
        type: 'success',
        title: '✅ Download Complete',
        message: 'Your recording has been downloaded successfully.',
        autoCloseDelay: 3000
      });
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

  // Helper callbacks for attaching streams to video elements
  const handleCameraRef = useCallback((el: HTMLVideoElement | null) => {
    // Update the ref for other uses
    if (videoRef) (videoRef as any).current = el;
    
    // Attach stream if element exists
    if (el && recordingSources.camera) {
      el.srcObject = recordingSources.camera;
      el.play().catch(() => {
        setErrorMessage('Camera preview failed to start.');
      });
    }
  }, [recordingSources.camera]);

  const handleScreenRef = useCallback((el: HTMLVideoElement | null) => {
    // Update the ref for other uses
    if (screenVideoRef) (screenVideoRef as any).current = el;
    
    // Attach stream if element exists
    if (el && recordingSources.screen) {
      el.srcObject = recordingSources.screen;
      el.play().catch(() => {
        setErrorMessage('Screen preview failed to start.');
      });
    }
  }, [recordingSources.screen]);

  // NEW: Enhanced preview rendering with slide support
  const renderPreview = () => {
    // 1. Playback Mode (Recorded Video or Uploaded File)
    if (recordedVideo || (activeTab === 'upload' && filePreview)) {
       const src = activeTab === 'record' ? recordedVideo : filePreview;
       return (
          <div className="relative w-full h-full bg-black flex items-center justify-center group">
            <video
              key={src}
              ref={recordedVideoRef}
              src={src || undefined}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              controls
              playsInline
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                // Update duration state if needed, but avoid unnecessary re-renders
                if (video.duration && video.duration > 0 && Math.floor(video.duration) !== recordingDuration) {
                   setRecordingDuration(Math.floor(video.duration));
                }
                
                // Acknowledge preview once when metadata has loaded and video is ready
                if (!previewAcknowledgedRef.current) {
                  previewAcknowledgedRef.current = true;
                  try {
                    acknowledgePreview();
                  } catch (err) {
                    setErrorMessage('Unable to finalize preview state.');
                  }
                  
                  // Close camera after a short delay to ensure preview is stable
                  // This fixes the issue where camera remains active after recording stops
                  setTimeout(() => {
                    try { closeCamera(); } catch (e) { setErrorMessage('Camera cleanup encountered an issue.'); }
                  }, 1000);
                }
              }}
            />
          </div>
       );
    }

    // 2. Upload Tab Empty State
    if (activeTab === 'upload' && !filePreview) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-2xl">
             <div className="text-center p-8">
              <Cloud className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Video File</h3>
              <p className="text-gray-600 text-sm mb-4">Supported formats: MP4, WebM, MOV, AVI, MPEG</p>
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="px-6 py-3 bg-indigo-900 text-white rounded-xl hover:bg-indigo-800 transition-colors flex items-center space-x-2 mx-auto shadow-md"
              >
                <Upload className="h-4 w-4" />
                <span>Choose Video File</span>
              </button>
            </div>
        </div>
      );
    }

    // 3. Live Recording Preview
    // Helper to attach stream safely
    const attachStream = (el: HTMLVideoElement | null, stream: MediaStream | null) => {
        if (el && stream && el.srcObject !== stream) {
            el.srcObject = stream;
        }
    };

    const hasCamera = !!recordingSources.camera;
    const hasScreen = !!recordingSources.screen;

    // No sources
    if (!hasCamera && !hasScreen) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white rounded-2xl">
                <div className="text-center">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Camera className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-base font-medium mb-1">Ready to Record</h3>
                  <p className="text-slate-400 text-xs mb-4">Start recording to activate camera or screen share</p>
                  {!enableAudio && (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                      <MicOff className="h-3 w-3 mr-1.5" />
                      Audio disabled
                    </div>
                  )}
                </div>
            </div>
        );
    }

    // Layout Logic
    // Side-by-Side
    if (currentLayout === 'side-by-side' && hasCamera && hasScreen) {
        return (
            <div className="w-full h-full flex bg-black rounded-2xl overflow-hidden">
                <div className="w-1/2 h-full relative border-r border-slate-800">
                    <video 
                        ref={handleScreenRef}
                        autoPlay muted playsInline 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">Screen</div>
                </div>
                <div className="w-1/2 h-full relative">
                    <video 
                        ref={handleCameraRef}
                        autoPlay muted playsInline 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">Camera</div>
                </div>
                {renderRecordingStats()}
            </div>
        );
    }

    // Picture-in-Picture (Default for 2 sources)
    if ((currentLayout === 'picture-in-picture' || !currentLayout) && hasCamera && hasScreen) {
        return (
            <div className="w-full h-full relative bg-black rounded-2xl overflow-hidden">
                {/* Main Content (Screen) */}
                <video 
                    ref={handleScreenRef}
                    autoPlay muted playsInline 
                    className="w-full h-full object-contain" 
                />
                
                {/* Overlay (Camera) - Responsive Position Bottom Right */}
                <div className="absolute bottom-4 right-4 w-[20%] min-w-[120px] max-w-[240px] aspect-video rounded-lg overflow-hidden shadow-xl border border-white/20 bg-slate-900 z-20 transition-all hover:scale-105 group">
                    <video 
                        ref={handleCameraRef}
                        autoPlay muted playsInline 
                        className="w-full h-full object-contain" 
                    />
                    {/* Drag handle hint could go here */}
                </div>
                {renderRecordingStats()}
            </div>
        );
    }

    // Presentation Layout (Screen 70%, Camera 30% Side-by-Side)
    if (currentLayout === 'presentation' && hasCamera && hasScreen) {
        return (
            <div className="w-full h-full flex bg-black rounded-2xl overflow-hidden">
                <div className="w-[70%] h-full relative border-r border-slate-800">
                    <video 
                        ref={handleScreenRef}
                        autoPlay muted playsInline 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">Screen</div>
                </div>
                <div className="w-[30%] h-full relative bg-slate-900">
                    <video 
                        ref={handleCameraRef}
                        autoPlay muted playsInline 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">Camera</div>
                </div>
                {renderRecordingStats()}
            </div>
        );
    }

    // Screen Only
    if (hasScreen && (!hasCamera || currentLayout === 'screen-only')) {
        return (
            <div className="w-full h-full relative bg-black rounded-2xl overflow-hidden">
                <video 
                    ref={handleScreenRef}
                    autoPlay muted playsInline 
                  className="w-full h-full object-cover" 
                />
                {renderRecordingStats()}
            </div>
        );
    }

    // Camera Only (Default fallback)
    return (
        <div className="w-full h-full relative bg-black rounded-2xl overflow-hidden flex items-center justify-center">
            <video 
                ref={handleCameraRef}
                autoPlay muted playsInline 
                className="w-full h-full object-cover"
            />
            {renderRecordingStats()}
        </div>
    );
  };


  return (
    <>
      {/* Notification Container (Task 7.3) */}
      <NotificationContainer
        notifications={notifications}
        onDismiss={dismissNotification}
      />


      <div className={`relative flex flex-col overflow-hidden ${
        variant === 'default' 
          ? 'bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm max-w-3xl w-full ml-4 md:ml-6 mr-4 md:mr-6 my-4' 
          : variant === 'embedded'
            ? 'w-full max-w-4xl ml-4 md:ml-6 mr-4 md:mr-6 bg-white rounded-xl border border-slate-200 shadow-sm my-4' // Reduced container size
            : 'w-full max-w-lg ml-4 md:ml-6 mr-4 md:mr-6 flex-none max-h-[520px] overflow-hidden'
      }`}>
      {/* Reserved right sidebar space removed to keep recorder size unchanged */}
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

      {/* Header - Adaptive based on variant */}
      {variant === 'embedded' ? (
        <div className="px-3 py-2 border-b border-slate-200 bg-white">
           <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Sources & Layouts - Left Aligned */}
              <div className="flex items-center gap-2">
                 <SourceControlIndicators
                    recordingSources={recordingSources}
                    onToggleCamera={() => recordingSources.camera ? closeCamera() : initializeCamera()}
                    onToggleScreen={() => isScreenSharing ? handleStopScreenShare() : handleStartScreenShare()}
                    disabled={false}
                    isRecording={isRecording}
                 />
                 {recordingSources.camera && recordingSources.screen && (
                    <div className="ml-1 pl-2 border-l border-slate-200">
                      <LayoutSelector
                        currentLayout={currentLayout as LayoutType}
                        onLayoutChange={handleLayoutChange}
                        disabled={false}
                        isCompositing={isCompositing}
                      />
                    </div>
                 )}
              </div>

              {/* Right Side: Tabs & Tools */}
              <div className="flex items-center gap-2 ml-auto">
                 {/* Advanced Tools Toggle */}
                 <button
                    onClick={() => setShowAdvancedTools(prev => !prev)}
                    className={`p-1.5 rounded-md transition-colors border ${
                      showAdvancedTools
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Advanced Tools"
                 >
                    <Settings className="h-3.5 w-3.5" />
                 </button>

                 <div className="flex bg-slate-100 p-0.5 rounded-md">
                    <button
                      onClick={() => handleTabChange('record')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        activeTab === 'record' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Record
                    </button>
                    <button
                      onClick={() => handleTabChange('upload')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        activeTab === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Upload
                    </button>
                 </div>
                 {onToggleTips && (
                    <button onClick={onToggleTips} className="p-1.5 text-slate-400 hover:text-slate-600">
                       <Sparkles className="h-4 w-4" />
                    </button>
                 )}
              </div>
           </div>
           
           {/* Advanced Tools Toolbar (Embedded) */}
           {showAdvancedTools && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 text-sm"
                  >
                    <Sparkles className="h-4 w-4" /> Tips
                  </button>
                  <button
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 text-sm"
                  >
                    <Zap className="h-4 w-4" /> Settings
                  </button>
                  <button
                    onClick={() => setShowSlideManager(!showSlideManager)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 text-sm"
                  >
                    <FileText className="h-4 w-4" /> Slides
                  </button>
                  <button
                    onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 text-sm"
                  >
                    <Keyboard className="h-4 w-4" /> Shortcuts
                  </button>
              </div>
           )}
        </div>
      ) : (
      <div className={`px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-center gap-4 ${variant === 'default' ? '' : 'bg-transparent border-none p-0'}`}>
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-md">
          <button
            onClick={() => handleTabChange('record')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 ${
              activeTab === 'record' 
                ? 'bg-white text-blue-600 shadow-md' 
                : 'bg-transparent text-slate-500 hover:text-slate-700 shadow-none'
            }`}
          >
            <VideoIcon className="h-4 w-4" />
            <span>Record</span>
          </button>
          <button
            onClick={() => handleTabChange('upload')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 ${
              activeTab === 'upload' 
                ? 'bg-white text-blue-600 shadow-md' 
                : 'bg-transparent text-slate-500 hover:text-slate-700 shadow-none'
            }`}
          >
            <Cloud className="h-4 w-4" />
            <span>Upload Video</span>
          </button>
        </div>

        {/* Tips Button (if provided) */}
        {onToggleTips && (
          <button
            onClick={onToggleTips}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            title="Show Tips"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        )}
      </div>
      )}

      {/* Screen Sharing Banner - Removed to save space (controls are in the toolbar) */}


      {/* NEW: Multi-source Controls with integrated components (Task 7.1) - Light theme */}
      {activeTab === 'record' && !recordedVideo && variant !== 'embedded' && (
        <div className={`border-b border-slate-200/50 bg-white/85 backdrop-blur-sm ${variant === 'default' ? 'px-6 py-3' : 'px-4 py-2'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left: Sources & Layouts */}
            <div className="flex items-center gap-4 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
              <SourceControlIndicators
                recordingSources={recordingSources}
                onToggleCamera={() => recordingSources.camera ? closeCamera() : initializeCamera()}
                onToggleScreen={() => isScreenSharing ? handleStopScreenShare() : handleStartScreenShare()}
                disabled={false}
                isRecording={isRecording}
              />
              
              <div className="h-6 w-px bg-slate-200/50 mx-1 hidden lg:block" />
              
              {recordingSources.camera && recordingSources.screen && (
                <LayoutSelector
                  currentLayout={currentLayout as LayoutType}
                  onLayoutChange={handleLayoutChange}
                  disabled={false}
                  isCompositing={isCompositing}
                />
              )}
            </div>
            
            {/* Right: Additional Tools */}
            <div className="flex items-center gap-2 ml-auto">
                {/* Advanced Tools Toggle */}
                <button
                  onClick={() => setShowAdvancedTools(prev => !prev)}
                  className={`p-2 rounded-lg transition-colors border ${
                    showAdvancedTools
                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                  }`}
                  title={showAdvancedTools ? "Hide Advanced Tools" : "Show Advanced Tools"}
                >
                  <Settings className="h-4 w-4" />
                </button>

                {showAdvancedTools && (
                  <>
                    {/* Tips */}
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-2 rounded-lg transition-colors border bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50"
                      title="Tips & guidance"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>

                    {/* Advanced Settings Panel Toggle */}
                    <button
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className={`p-2 rounded-lg transition-colors border ${
                        showAdvancedSettings
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                      }`}
                      title="Recording Settings"
                    >
                      <Zap className="h-4 w-4" />
                    </button>

                    {/* Slide Manager Toggle */}
                    <button
                      onClick={() => setShowSlideManager(!showSlideManager)}
                      className={`p-2 rounded-lg transition-colors border ${
                        showSlideManager 
                          ? 'bg-gradient-to-r from-[#FF6B9D]/20 to-[#FF8E9B]/20 text-[#FF6B9D] border-[#FF6B9D]/30' 
                          : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                      }`}
                      title="Slides"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    
                    {/* Keyboard Shortcuts Toggle */}
                    <button
                      onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                      className={`p-2 rounded-lg transition-colors border ${
                        showKeyboardShortcuts 
                          ? 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 text-[#FFD700] border-[#FFD700]/30' 
                          : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                      }`}
                      title="Shortcuts"
                    >
                      <Keyboard className="h-4 w-4" />
                    </button>
                    
                    {/* Compositor Preview Toggle */}
                    {isCompositing && (
                      <button
                        onClick={() => setShowCompositorPreview(!showCompositorPreview)}
                        className={`p-2 rounded-lg transition-colors border ${
                          showCompositorPreview 
                            ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300' 
                            : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                        }`}
                        title="Preview"
                      >
                        <Monitor className="h-4 w-4" />
                      </button>
                    )}
                    
                    {/* Audio Levels Toggle (Task 8.2) */}
                    {isCompositing && options.enableAudio && (
                      <button
                        onClick={() => setShowAudioLevels(!showAudioLevels)}
                        className={`p-2 rounded-lg transition-colors border ${
                          showAudioLevels 
                            ? 'bg-gradient-to-r from-[#00D4FF]/20 to-[#00B8E6]/20 text-[#00D4FF] border-[#00D4FF]/30' 
                            : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                        }`}
                        title="Audio Levels"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Panel - Light theme (advanced only) */}
      {showAdvancedTools && showAdvancedSettings && (
        <div className={`border-b border-slate-200/50 bg-white/85 backdrop-blur-sm ${variant === 'default' ? 'px-6 py-4' : 'px-4 py-3'}`}>
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
      <div className={`relative bg-black ${
        variant === 'default' 
          ? 'aspect-video w-full max-w-5xl mx-auto rounded-lg overflow-hidden shadow-lg border border-slate-800/50 my-4 max-h-[720px]' 
          : variant === 'embedded'
            ? 'aspect-video w-full max-w-3xl mx-auto rounded-lg overflow-hidden shadow-md border border-slate-200 my-4' // Reduced size for embedded
            : 'aspect-video w-full max-w-lg mx-auto rounded-lg overflow-hidden shadow-lg border border-slate-800/50 my-4 max-h-[420px]'
      }`}>
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
        {recordingStatus === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm">
            <div className={`text-white font-bold ${isMobile ? 'text-6xl' : 'text-8xl'} animate-bounce`}>
              {countdownValue > 0 ? countdownValue : 'GO!'}
            </div>
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



        {/* Recording Controls - Modern Floating Bar */}
        {activeTab === 'record' && !recordedVideo && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
            {!isRecording ? (
              <div className="flex flex-col items-center space-y-2">
                <button
                  onClick={handleStartRecording}
                  disabled={!recordingSources.camera && !recordingSources.screen}
                  className="group relative flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-md rounded-full border-2 border-white/30 hover:border-red-500 hover:bg-red-500/20 transition-all duration-300 disabled:opacity-50 disabled:hover:border-white/30 disabled:hover:bg-white/10"
                >
                  <div className="w-6 h-6 bg-red-600 rounded-full shadow-lg group-hover:scale-90 transition-transform duration-300"></div>
                </button>
                <span className="text-white/90 text-xs font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                  Start Recording
                </span>
              </div>
              ) : (
              <div className="flex items-center space-x-3 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg transform transition-all hover:scale-105">
                {/* Pause/Resume */}
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="group flex flex-col items-center space-y-0.5"
                  title={isPaused ? "Resume" : "Pause"}
                >
                  <div className={`p-2 rounded-full transition-all ${isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-white/10 hover:bg-white/20'}`}>
                    {isPaused ? <Play className="h-4 w-4 text-white fill-current" /> : <Pause className="h-4 w-4 text-white fill-current" />}
                  </div>
                  <span className="text-[9px] font-medium text-white/70 uppercase tracking-wider">{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                {/* Stop Button (Main Action) */}
                <button
                  onClick={handleStopRecording}
                  disabled={recordingTime < 1 || isStoppingRef.current || !isRecording}
                  className="group flex flex-col items-center space-y-0.5"
                  title="Stop Recording"
                >
                  <div className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-900/30 group-hover:scale-110">
                    <Square className="h-4 w-4 fill-current" />
                  </div>
                  <span className="text-[9px] font-medium text-white/70 uppercase tracking-wider">Stop</span>
                </button>
                
                {/* Save Session (Advanced) */}
                {showAdvancedTools && (
                    <button
                        onClick={handleSaveSession}
                        className="group flex flex-col items-center space-y-0.5"
                        title="Save Session Draft"
                    >
                        <div className="p-2 rounded-full bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all hover:scale-105">
                            <Save className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-medium text-white/70 uppercase tracking-wider">Save</span>
                    </button>
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
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-indigo-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {layoutChangeNotification}
        </div>
      )}

      {/* Debug overlay: shows source states and dimensions (advanced only) */}
      {showAdvancedTools && (
        <div className="absolute bottom-4 left-4 z-40 bg-black/60 text-white text-[11px] rounded-md px-3 py-2 space-y-1 pointer-events-none">
          <div>Layout: {currentLayout}</div>
          <div>Camera: {recordingSources.camera ? 'on' : 'off'} | Screen: {recordingSources.screen ? 'on' : 'off'}</div>
          <div>
            Cam: {videoRef?.current ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 'n/a'} |
            Screen: {screenVideoRef?.current ? `${screenVideoRef.current.videoWidth}x${screenVideoRef.current.videoHeight}` : 'n/a'}
          </div>
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

      {/* Success/Error inline banners removed; handled by toast notifications */}

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

      {/* Post-Recording Studio - Compact & Organized */}
      {(recordedVideo || selectedFile) && !uploading && !uploadSuccess && !showLessonForm && showPreview && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-4">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Recording Ready
                    </h3>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                        <span>{formatTime(recordingDuration)}</span>
                        <span>•</span>
                        <span>{videoBlob ? getFileSize(videoBlob.size) : 'Unknown'}</span>
                    </div>
                </div>
            </div>
            
            <div className="p-4 flex flex-wrap items-center gap-3">
                 {/* Primary Actions */}
                 <button 
                    onClick={() => {
                        setShowPreview(false);
                        setShowLessonForm(true);
                    }}
                    className="flex-1 min-w-[140px] py-2 px-4 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 font-medium shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2 text-sm"
                >
                    <span>Continue to Upload</span>
                    <ArrowRight className="h-4 w-4" />
                </button>

                {/* Secondary Actions Group */}
                <div className="flex items-center gap-2 flex-wrap">
                    {activeTab === 'record' && videoBlob && (
                        <button
                            onClick={() => {
                                setShowTimelineEditor(true);
                                setShowPreview(false);
                            }}
                            className="py-2 px-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 hover:bg-amber-100 transition-all flex items-center space-x-1.5 text-sm font-medium"
                        >
                            <Scissors className="h-4 w-4" />
                            <span>Edit</span>
                        </button>
                    )}
                    
                    <button 
                        onClick={downloadRecording}
                        className="py-2 px-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all flex items-center space-x-1.5 text-sm font-medium"
                    >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                    </button>

                    <button 
                        onClick={handleReset}
                        className="py-2 px-3 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                        Discard
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Enhanced Video Preview Modal */}
      {showEnhancedPreview && (recordedVideo || filePreview || videoBlob) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full mx-auto">
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
      {showLessonForm && (
        <div className="p-6 border-t border-slate-200/50 bg-white/85 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold flex items-center space-x-2 text-slate-700">
                <Star className="h-5 w-5 text-[#FFD700]" />
                <span>
                  {lessonId ? 'Update Lesson' : 'Create New Lesson'}
                </span>
              </h3>
              {/* Mode indicator */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                lessonId
                  ? 'bg-[#2980B9]/10 text-[#2980B9] border border-[#2980B9]/20'
                  : 'bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/20'
              }`}>
                {lessonId ? '🎬 Recording Mode' : '📝 New Lesson Mode'}
              </div>
            </div>
            <p className="text-sm text-slate-600 hidden sm:block">
              {lessonId
                ? 'This will replace the video for your existing lesson'
                : 'Create a new lesson with your recorded/uploaded video'
              }
            </p>
          </div>

          {/* Video Actions (Preview/Edit) - Only if video exists */}
          {(recordedVideo || selectedFile) && (
            <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Video Ready
                </h4>
                <p className="text-xs text-slate-500">
                  {recordingDuration > 0 ? `Duration: ${Math.floor(recordingDuration)}s` : 'Ready to upload'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowEnhancedPreview(true);
                    // Don't hide form, just show preview modal
                  }}
                  className="px-3 py-2 border border-slate-300/50 rounded-lg bg-white hover:bg-slate-50 transition-all duration-200 flex items-center space-x-2 text-sm shadow-sm text-slate-700"
                >
                  <Play className="h-4 w-4" />
                  <span>Preview</span>
                </button>
                {activeTab === 'record' && (
                  <div className="relative group">
                    <button
                      onClick={() => {
                        setShowTimelineEditor(true);
                        // Don't hide form
                      }}
                      className="px-3 py-2 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-200 transition-all duration-200 flex items-center space-x-2 text-sm"
                    >
                      <Scissors className="h-4 w-4" />
                      <span>Edit Video</span>
                    </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      Trim your video to remove unwanted parts
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700">Select Course *</label>
              <div className="flex flex-col gap-2">
                <select 
                  value={selectedCourse} 
                  onChange={(e) => setSelectedCourse(e.target.value)} 
                  className="w-full p-3 border border-slate-300 rounded-xl bg-white/90 text-slate-700 focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent shadow-sm"
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
                    Create new course
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
              <label className="block text-sm font-medium mb-1.5 text-slate-700">Lesson Title *</label>
              <input 
                type="text" 
                value={lessonTitle} 
                onChange={(e) => setLessonTitle(e.target.value)} 
                placeholder="Enter lesson title..." 
                className="w-full p-3 border border-slate-300 rounded-xl bg-white/90 text-slate-700 focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent shadow-sm" 
                disabled={uploading} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700">Description (Optional)</label>
              <textarea 
                value={lessonDescription} 
                onChange={(e) => setLessonDescription(e.target.value)} 
                placeholder="Brief description..." 
                rows={3} 
                className="w-full p-3 border border-slate-300 rounded-xl bg-white/90 text-slate-700 focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent shadow-sm" 
                disabled={uploading} 
              />
            </div>
            <div className="flex space-x-3 pt-2">
              {(recordedVideo || selectedFile) && (
                <button 
                  onClick={handleReset} 
                  disabled={uploading}
                  className="px-4 py-3 border border-slate-300/50 rounded-xl bg-white/90 backdrop-blur-sm hover:bg-white hover:border-slate-400/50 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 text-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{activeTab === 'record' ? 'Record Again' : 'Upload New'}</span>
                </button>
              )}
              
              <button 
                onClick={handleUpload} 
                disabled={uploading || uploadSuccess || !selectedCourse || !lessonTitle.trim() || (!recordedVideo && !selectedFile)}
                className="flex-1 px-4 py-3 border border-transparent rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 shadow-md backdrop-blur-sm border border-emerald-500/40"
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
                    <span>{lessonId ? 'Update Lesson' : 'Create Lesson'}</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Warning if no video */}
            {(!recordedVideo && !selectedFile) && (
              <p className="text-xs text-center text-amber-600 mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Please record or upload a video to create the lesson
              </p>
            )}
          </div>
        </div>
      )}

      {/* NEW: Simple Video Editor Modal */}
      {showTimelineEditor && videoBlob && recordedVideo && (
        <SimpleTrimEditor
          videoBlob={videoBlob}
          videoUrl={recordedVideo}
          onEditComplete={handleEditComplete}
          onCancel={() => {
            setShowTimelineEditor(false);
            setShowPreview(false);
            setShowLessonForm(true);
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

      {/* Success/Progress Modal Notification */}
      <SuccessNotificationModal
        isOpen={modalNotification.isOpen}
        type={modalNotification.type}
        title={modalNotification.title}
        message={modalNotification.message}
        progress={modalNotification.progress}
        autoCloseDelay={modalNotification.autoCloseDelay}
        onClose={() => setModalNotification(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
    </>
  );
};

export default VideoRecorder;