/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import { coursesApi } from '@/services/api';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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
import { formatErrorForDisplay } from '@/utils/errorHandler';
import ErrorAlert from '@/components/common/ErrorAlert';

// Lazy load heavy components
const SimpleTrimEditor = lazy(() => import('./SimpleTrimEditor'));
const Teleprompter = lazy(() => import('./Teleprompter'));
const MuxVideoUploader = lazy(() => import('./MuxVideoUploader'));
const RecordingQualitySettings = lazy(() => import('./RecordingQualitySettings'));
const RecordingPresetsManager = lazy(() => import('./RecordingPresetsManager'));
const SuccessNotificationModal = lazy(() => import('./SuccessNotificationModal'));
const VideoPreviewPlayer = lazy(() => import('./VideoPreviewPlayer'));

import PreFlightCheck from './PreFlightCheck';
// import { useVirtualBackground } from '@/hooks/useVirtualBackground';
import VideoProcessingStatus from './VideoProcessingStatus';
import LayoutSelector from './LayoutSelector';
import CompositorPreview from './CompositorPreview';
import SourceControlIndicators from './SourceControlIndicators';
import KeyboardShortcuts from './KeyboardShortcuts';
import NotificationContainer, { type Notification } from './NotificationContainer';
import { AudioLevelIndicators } from './AudioLevelIndicators';
import LessonDetailsForm from './recorder/LessonDetailsForm';
import PostRecordingActions from './recorder/PostRecordingActions';
import RecordingControls from './recorder/RecordingControls';
import RecordingStatusDisplay from './recorder/RecordingStatusDisplay';
import { recordingPresetsApi, type RecordingPreset } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import type { LayoutType } from '@/types/VideoCompositor';
import type { AudioLevelData } from '@/utils/AudioMixer';
import {
  Upload, Camera,
  CheckCircle, Loader,
  Settings, Cloud,
  Mic, MicOff, VideoIcon,
  Zap,
  Sparkles,
  Monitor,
  AlignLeft,
  Keyboard,
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
  onUploadComplete,
  courseId,
  lessonId,
  variant = 'default',
  onToggleTips
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { confirm } = useConfirmDialog();
  
  // Refs for click-outside detection
  const shortcutsRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

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
    // NEW: Compositor properties (Task 3.1)
    compositorInstance,
    isCompositing,
    performanceMetrics,
    // NEW: Enhanced features
    recordingStats,
    setRecordingStats,
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
    setOptions,
    acknowledgePreview,
    initializeCompositor
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
  const [showPreview, setShowPreview] = useState(false);


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
  const [showPreFlight, setShowPreFlight] = useState(false);

  // Mux upload state - Mux is now the default and only upload method
  const [showMuxUploader, setShowMuxUploader] = useState(false);
  const [muxUploadLessonId, setMuxUploadLessonId] = useState<string | null>(null);

  // NEW: UI state for integrated components (Task 7.1)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showCompositorPreview, setShowCompositorPreview] = useState(false);

  // Task 8.2: Audio level monitoring state
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
  // const [showSlideManager, setShowSlideManager] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [showProcessingStatus, setShowProcessingStatus] = useState(false);
  
  // Virtual Background State - COMMENTED OUT FOR NOW
  /*
  const [vbEnabled, setVbEnabled] = useState(false);
  const [vbMode, setVbMode] = useState<'blur' | 'image' | 'none'>('none');
  const [rawCameraStream, setRawCameraStream] = useState<MediaStream | null>(null);
  const isSettingStreamRef = useRef(false);

  const { processedStream, isModelLoaded, error: vbError } = useVirtualBackground(rawCameraStream, {
    enabled: vbEnabled,
    mode: vbMode,
    blurRadius: 10
  });
  */

  // Handle VB Error - COMMENTED OUT FOR NOW
  /*
  useEffect(() => {
    if (vbError && vbEnabled) {

        if (!vbEnabled) {
             setRawCameraStream(recordingSources.camera);
        }
    }
  }, [recordingSources.camera, vbEnabled]);
  */

  // Apply processed stream - COMMENTED OUT FOR NOW
  /*
  useEffect(() => {
      if (vbEnabled && processedStream && processedStream !== recordingSources.camera) {
          isSettingStreamRef.current = true;
          setCameraStream(processedStream);
      } else if (!vbEnabled && rawCameraStream && rawCameraStream !== recordingSources.camera) {
          isSettingStreamRef.current = true;
          setCameraStream(rawCameraStream);
      }
  }, [vbEnabled, processedStream, rawCameraStream, setCameraStream, recordingSources.camera]);
  */
  const [processingLessonId, setProcessingLessonId] = useState<string | null>(null);
  const [currentSlides, setCurrentSlides] = useState<any[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // NEW: Enhanced state for production features
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'countdown' | 'recording' | 'paused' | 'processing'>('idle');

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

    // Audio analysis setup removed as it was unused and causing performance overhead

    return () => {
      // Cleanup
    };
  }, [stream, recordingSources, enableAudio]);

  // NEW: Recording stats monitoring with performance alerts (Task 7.3)
  // Interval removed as stats are now handled by the media recorder events in useVideoRecorder hook
  useEffect(() => {
    return () => {
      if (recordingStatsIntervalRef.current) {
        clearInterval(recordingStatsIntervalRef.current);
      }
    };
  }, []);

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

      setSuccessMessage(t('record_video.edit_success', 'Video edited successfully! Ready to upload.'));
      setShowPreview(false);
      setShowLessonForm(true); // Go back to upload form after editing
      setRecordingStatus('idle');

      // Update preview if needed
      if (recordedVideoRef.current) {
        recordedVideoRef.current.src = newVideoUrl;
      }
    } catch (error) {
      // Video editing failed
      setErrorMessage(t('record_video.edit_error', 'Failed to apply edits. Please try again.'));
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

  // NEW: Layout change with feedback (Task 7.2)
  const handleLayoutChange = useCallback((layout: LayoutType) => {
    if (changeLayout) {
      // @ts-ignore - changeLayout accepts LayoutType including 'presentation'
      changeLayout(layout);

      // Show feedback notification
      const layoutNames: Record<LayoutType, string> = {
        'picture-in-picture': t('record_video.layout_pip', 'Picture-in-Picture'),
        'side-by-side': t('record_video.layout_side_by_side', 'Side-by-Side'),
        'presentation': t('record_video.layout_presentation', 'Presentation'),
        'screen-only': t('record_video.layout_screen_only', 'Screen Only'),
        'camera-only': t('record_video.layout_camera_only', 'Camera Only')
      };

      setLayoutChangeNotification(t('record_video.layout_changed', { layout: layoutNames[layout] }));
      setTimeout(() => setLayoutChangeNotification(null), 2000);
    }
  }, [changeLayout, t]);

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
      // Pre-initialize compositor to reduce delay after countdown
      // We do this BEFORE the countdown starts so the user waits here instead of after "GO!"
      if (!compositorInstance && (recordingSources.camera || recordingSources.screen)) {
         setIsInitializingCompositor(true);
         try {
           await initializeCompositor();
         } catch (e) {
           console.warn('Pre-initialization of compositor failed', e);
         } finally {
           setIsInitializingCompositor(false);
         }
      }

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
            setSuccessMessage(t('record_video.auto_stop_message', { minutes: autoStopTimer }));
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
    
    // Only force layout change if the current layout is invalid for the available sources
    if (hasCamera && !hasScreen) {
      if (currentLayout !== 'camera-only') {
        handleLayoutChange('camera-only');
      }
    } else if (!hasCamera && hasScreen) {
      if (currentLayout !== 'screen-only') {
        handleLayoutChange('screen-only');
      }
    }
    // If both are available, allow any layout (including screen-only or camera-only)
  }, [recordingSources.camera, recordingSources.screen, currentLayout, handleLayoutChange]);

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
      setErrorMessage(t('record_video.enter_course_title', 'Please enter a course title.'));
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
        setSuccessMessage(t('record_video.course_created_success', 'Course created. You can now save this lesson into it.'));
      } else {
        setErrorMessage(t('record_video.course_created_no_data', 'Course was created but no course data was returned.'));
      }
    } catch (error: any) {
      // Failed to create course inline
      setErrorMessage(
        error?.response?.data?.message ||
        t('record_video.course_create_error', 'Failed to create course. Please try again or create it from My Courses.')
      );
    } finally {
      setIsCreatingCourseLoading(false);
    }
  };

  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Close shortcuts panel if clicked outside
      if (showKeyboardShortcuts && shortcutsRef.current && !shortcutsRef.current.contains(target)) {
        // If clicked inside toolbar, let the toolbar buttons handle it
        if (toolbarRef.current && toolbarRef.current.contains(target)) {
          return;
        }
        setShowKeyboardShortcuts(false);
      }

      // Close advanced tools if clicked outside toolbar
      if (showAdvancedTools && toolbarRef.current && !toolbarRef.current.contains(target)) {
        // If clicked inside shortcuts panel, keep advanced tools open
        if (shortcutsRef.current && shortcutsRef.current.contains(target)) {
          return;
        }
        setShowAdvancedTools(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showKeyboardShortcuts, showAdvancedTools]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setErrorMessage(t('record_video.select_valid_video', 'Please select a valid video file.'));
        return;
      }

      if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB
        setErrorMessage(t('record_video.video_too_large', 'Video file must be less than 2GB.'));
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
      // setSuccessMessage(t('record_video.video_selected', 'Video file selected! Preview it before uploading.'));
    }
  }, [filePreview, t]);

  // Enhanced: Start recording with multi-source initialization
  const handleStartRecording = async () => {
    try {
      setRecordingTimeState(0);
      setRecordingDuration(0);
      setUploadSuccess(false);
      setErrorMessage(null);
      setSuccessMessage(null);

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
        if (currentLayout === 'screen-only') {
          // If screen-only layout is selected but no screen shared, start screen share
          await handleStartScreenShare();
          // Do NOT auto-start recording. User must click "Start Recording" again.
        } else {
          // Initialize camera but do NOT auto-start recording
          await initializeCamera();
        }
      } else {
        await startCountdownAndRecording();
      }
    } catch (error: any) {
      // Error starting recording
      setErrorMessage(formatErrorForDisplay(error) || t('record_video.start_recording_error', 'Failed to start recording.'));
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
        setErrorMessage(t('record_video.recording_too_short', 'Recording too short. Please record for at least 1 second.'));
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

      // FIX: Close camera immediately when stopping recording
      // This ensures the camera light turns off promptly
      closeCamera();

      // Reset stopping flag after a delay to allow blob creation
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 2000);

    } catch (error) {
      // Error stopping recording
      setErrorMessage(t('record_video.stop_recording_error', 'Failed to stop recording.'));
      setRecordingStatus('idle');
      isStoppingRef.current = false;
    }
  };

  // NEW: Enhanced session management
  const handleSaveSession = () => {
    if (currentSession && videoBlob) {
      const sessionId = Date.now().toString();
      saveSession(sessionId);
      setSuccessMessage(t('record_video.session_saved', 'Recording session saved successfully'));
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
    // setShowSlideManager(false);
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
  const handleProcessingComplete = useCallback((transcodedVideoUrl?: string) => {
    // Don't close the modal immediately - let the user see the success state and click "Done"
    // setShowProcessingStatus(false);

    // Show prominent success message that persists
    // const persistentMessage = '🎉 Video processing completed successfully! Your video is now available for viewing.';
    // persistentSuccessMessageRef.current = persistentMessage;
    // setSuccessMessage(persistentMessage);
    /*
    try {
      // Also show a visible toast popup
      addNotification(
        'success',
        'Success',
        persistentMessage,
        undefined,
        true // auto-hide
      );
    } catch { }
    */

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
  }, [processingLessonId, onUploadComplete]);

  // NEW: Handle Mux upload completion
  const handleMuxUploadComplete = useCallback((lessonId: string) => {
    // Mux upload complete
    setUploadSuccess(true);
    // setSuccessMessage('Video uploaded to Mux successfully! Processing will begin shortly.');

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

  const handleTabChange = async (tab: 'record' | 'upload') => {
    if (activeTab === tab) return;

    // Clearance check: If we have unsaved work, confirm before switching
    if ((activeTab === 'record' && (recordedVideo || videoBlob)) || 
        (activeTab === 'upload' && (selectedFile || filePreview))) {
      // Simple confirmation - in a real app might use a modal
      const confirmed = await confirm({
        title: t('common.discard_changes_title', 'Discard Changes?'),
        message: t('common.discard_changes', 'Switching modes will discard your current recording/selection. Continue?'),
        confirmLabel: t('common.continue', 'Continue'),
        cancelLabel: t('common.cancel', 'Cancel'),
        variant: 'danger'
      });
      
      if (!confirmed) {
        return;
      }
      // Clear previous state
      handleReset();
    }

    if (tab === 'upload') {
      closeCamera();
      // setShowSlideManager(false);
    } else {
      // Switching back to record - re-init camera
      initializeCamera(); 
    }
    setActiveTab(tab);
  };

  // NEW: Enhanced recording stats display
  const renderRecordingStats = () => {
    if (!isRecording) return null;

    return (
      <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-lg text-xs space-y-1 z-20">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${recordingStats.networkQuality === 'good' ? 'bg-green-500' :
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
      // Only update if different to avoid interrupting playback
      if (el.srcObject !== recordingSources.camera) {
        el.srcObject = recordingSources.camera;
        el.play().catch((e) => {
          // Ignore AbortError which happens when element is removed or playback interrupted
          if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
            console.warn('Camera preview play error:', e);
            // Only show error if it's a real failure, not just an interruption
            // setErrorMessage(t('record_video.camera_preview_error', 'Camera preview failed to start.'));
          }
        });
      }
    }
  }, [recordingSources.camera, t]);

  const handleScreenRef = useCallback((el: HTMLVideoElement | null) => {
    // Update the ref for other uses
    if (screenVideoRef) (screenVideoRef as any).current = el;

    // Attach stream if element exists
    if (el && recordingSources.screen) {
      // Only update if different to avoid interrupting playback
      if (el.srcObject !== recordingSources.screen) {
        el.srcObject = recordingSources.screen;
        el.play().catch((e) => {
          // Ignore AbortError which happens when element is removed or playback interrupted
          if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
            console.warn('Screen preview play error:', e);
            // setErrorMessage(t('record_video.screen_preview_error', 'Screen preview failed to start.'));
          }
        });
      }
    }
  }, [recordingSources.screen, t]);

  const handleScreenBgRef = useCallback((el: HTMLVideoElement | null) => {
    // Attach stream if element exists
    if (el && recordingSources.screen) {
      // Only update if different to avoid interrupting playback
      if (el.srcObject !== recordingSources.screen) {
        el.srcObject = recordingSources.screen;
        el.play().catch(() => {});
      }
    }
  }, [recordingSources.screen]);

  // NEW: Enhanced preview rendering with slide support
  const renderPreview = () => {
    // 1. Playback Mode (Recorded Video or Uploaded File)
    const showRecordPreview = activeTab === 'record' && recordedVideo;
    const showUploadPreview = activeTab === 'upload' && filePreview;

    if (showRecordPreview || showUploadPreview) {
      const src = showRecordPreview ? recordedVideo : filePreview;
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
                  setErrorMessage(t('record_video.preview_finalize_error', 'Unable to finalize preview state.'));
                }

                // Close camera after a short delay to ensure preview is stable
                // This fixes the issue where camera remains active after recording stops
                setTimeout(() => {
                  try { closeCamera(); } catch (e) { setErrorMessage(t('record_video.camera_cleanup_error', 'Camera cleanup encountered an issue.')); }
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('record_video.upload_video_file', 'Upload Video File')}</h3>
            <p className="text-gray-600 text-sm mb-4">{t('record_video.supported_formats', 'Supported formats: MP4, WebM, MOV, AVI, MPEG')}</p>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-indigo-900 text-white rounded-xl hover:bg-indigo-800 transition-colors flex items-center space-x-2 mx-auto shadow-md"
            >
              <Upload className="h-4 w-4" />
              <span>{t('record_video.choose_video_file', 'Choose Video File')}</span>
            </button>
          </div>
        </div>
      );
    }

    // 3. Live Recording Preview

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
            <h3 className="text-base font-medium mb-1">{t('record_video.ready_to_record', 'Ready to Record')}</h3>
            <p className="text-slate-400 text-xs mb-4">Click "Start Recording" to begin</p>
            {!enableAudio && (
              <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                <MicOff className="h-3 w-3 mr-1.5" />
                {t('record_video.audio_disabled', 'Audio disabled')}
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
            <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">{t('record_video.screen')}</div>
          </div>
          <div className="w-1/2 h-full relative">
            <video
              ref={handleCameraRef}
              autoPlay muted playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">{t('record_video.camera')}</div>
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
            <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">{t('record_video.screen')}</div>
          </div>
          <div className="w-[30%] h-full relative bg-slate-900">
            <video
              ref={handleCameraRef}
              autoPlay muted playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">{t('record_video.camera')}</div>
          </div>
          {renderRecordingStats()}
        </div>
      );
    }

    // Screen Only
    if (hasScreen && (!hasCamera || currentLayout === 'screen-only')) {
      return (
        <div className="w-full h-full relative bg-black rounded-2xl overflow-hidden">
          {/* Blurred Background */}
          <div className="absolute inset-0 z-0">
             <video
                ref={handleScreenBgRef}
                autoPlay muted playsInline
                className="w-full h-full object-cover filter blur-lg opacity-50 scale-110"
             />
          </div>
          
          {/* Main Content */}
          <video
            ref={handleScreenRef}
            autoPlay muted playsInline
            className="relative z-10 w-full h-full object-contain"
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


      <div className={`relative flex flex-col overflow-hidden ${variant === 'default'
          ? 'bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm w-full max-w-[95%] mx-auto my-4'
          : variant === 'embedded'
            ? 'w-full max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm my-4' // Reduced container size
            : 'w-full max-w-lg mx-auto flex-none max-h-[520px] overflow-hidden'
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
          <div ref={toolbarRef} className="px-3 py-2 border-b border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Sources & Layouts - Left Aligned */}
              <div className="flex items-center gap-2">
                <SourceControlIndicators
                  recordingSources={recordingSources}
                  onToggleCamera={() => recordingSources.camera ? closeCamera() : initializeCamera()}
                  onToggleScreen={() => isScreenSharing ? handleStopScreenShare() : handleStartScreenShare()}
                  disabled={!!recordedVideo || !!filePreview}
                  isRecording={isRecording}
                />
                {recordingSources.camera && recordingSources.screen && (
                  <div className="ml-1 pl-2 border-l border-slate-200">
                    <LayoutSelector
                      currentLayout={currentLayout as LayoutType}
                      onLayoutChange={handleLayoutChange}
                      disabled={!!recordedVideo || !!filePreview}
                      isCompositing={isCompositing}
                    />
                  </div>
                )}
              </div>

              {/* Right Side: Tabs & Tools */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Pre-flight Check Toggle */}
                <button
                  onClick={() => setShowPreFlight(true)}
                  className="p-1.5 rounded-md transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  title={t('record_video.check_devices', 'Check Devices')}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </button>

                {/* Teleprompter Toggle - Always Visible */}
                <button
                  onClick={() => setShowTeleprompter(!showTeleprompter)}
                  className={`p-1.5 rounded-md transition-colors border ${showTeleprompter
                      ? 'bg-sky-100 text-sky-700 border-sky-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  title={t('teleprompter.title', 'Teleprompter')}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </button>

                {/* Virtual Background Toggle - Always Visible - COMMENTED OUT FOR NOW
                <button
                  onClick={() => {
                      const newEnabled = !vbEnabled;
                      setVbEnabled(newEnabled);
                      setVbMode(newEnabled ? 'blur' : 'none');
                  }}
                  disabled={!isModelLoaded && !vbError}
                  className={`p-1.5 rounded-md transition-colors border ${vbEnabled
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    } ${(!isModelLoaded && !vbError) ? 'opacity-50 cursor-wait' : ''}`}
                  title={!isModelLoaded ? "Loading Virtual Background Model..." : (vbEnabled ? "Disable Virtual Background" : "Enable Blur Background")}
                >
                  {!isModelLoaded && !vbError ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <User className="h-3.5 w-3.5" />}
                </button>
                */}

                {/* Advanced Tools Toggle */}
                <button
                  onClick={() => setShowAdvancedTools(prev => !prev)}
                  className={`p-1.5 rounded-md transition-colors border ${showAdvancedTools
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
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${activeTab === 'record' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {t('record_video.record')}
                  </button>
                  <button
                    onClick={() => handleTabChange('upload')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${activeTab === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {t('record_video.upload')}
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
                {onToggleTips && (
                  <button
                    onClick={onToggleTips}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 text-sm"
                  >
                    <Sparkles className="h-4 w-4" /> {t('record_video.tips_label', 'Tips')}
                  </button>
                )}
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 text-sm"
                >
                  <Zap className="h-4 w-4" /> {t('record_video.settings', 'Settings')}
                </button>
                <button
                  onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 text-sm"
                >
                  <Keyboard className="h-4 w-4" /> {t('record_video.shortcuts', 'Shortcuts')}
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
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 ${activeTab === 'record'
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'bg-transparent text-slate-500 hover:text-slate-700 shadow-none'
                  }`}
              >
                <VideoIcon className="h-4 w-4" />
                <span>{t('record_video.record')}</span>
              </button>
              <button
                onClick={() => handleTabChange('upload')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 ${activeTab === 'upload'
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'bg-transparent text-slate-500 hover:text-slate-700 shadow-none'
                  }`}
              >
                <Cloud className="h-4 w-4" />
                <span>{t('record_video.upload')}</span>
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
                  disabled={!!recordedVideo || !!filePreview}
                  isRecording={isRecording}
                />

                <div className="h-6 w-px bg-slate-200/50 mx-1 hidden lg:block" />

                {recordingSources.camera && recordingSources.screen && (
                  <LayoutSelector
                    currentLayout={currentLayout as LayoutType}
                    onLayoutChange={handleLayoutChange}
                    disabled={!!recordedVideo || !!filePreview}
                    isCompositing={isCompositing}
                  />
                )}
              </div>

              {/* Right: Additional Tools */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Virtual Background Toggle - Always Visible - COMMENTED OUT FOR NOW
                <button
                  onClick={() => {
                      if (!isModelLoaded && !vbEnabled) {
                         // If model not loaded yet, maybe show toast?
                         // But we allow clicking to trigger loading if it's lazy, 
                         // though currently it loads on mount.
                      }
                      const newEnabled = !vbEnabled;
                      setVbEnabled(newEnabled);
                      setVbMode(newEnabled ? 'blur' : 'none');
                  }}
                  disabled={!isModelLoaded && !vbError}
                  className={`p-2 rounded-lg transition-colors border ${vbEnabled
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                      : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                    } ${(!isModelLoaded && !vbError) ? 'opacity-50 cursor-wait' : ''}`}
                  title={!isModelLoaded ? "Loading Virtual Background Model..." : (vbEnabled ? "Disable Virtual Background" : "Enable Blur Background")}
                >
                  {!isModelLoaded && !vbError ? <Loader className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                </button>
                */}

                {/* Teleprompter Toggle - Always Visible */}
                <button
                  onClick={() => setShowTeleprompter(!showTeleprompter)}
                  className={`p-2 rounded-lg transition-colors border ${showTeleprompter
                      ? 'bg-sky-100 text-sky-700 border-sky-300'
                      : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                    }`}
                  title={t('record_video.teleprompter', "Teleprompter")}
                >
                  <AlignLeft className="h-4 w-4" />
                </button>

                {/* System Check */}
                <button
                  onClick={() => setShowPreFlight(true)}
                  className="p-2 rounded-lg transition-colors border bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50"
                  title={t('preflight.title', "System Check")}
                >
                  <CheckCircle className="h-4 w-4" />
                </button>

                {/* Tips */}
                {onToggleTips && (
                  <button
                    onClick={onToggleTips}
                    className="p-2 rounded-lg transition-colors border bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50"
                    title={t('record_video.tips_guidance', "Tips & guidance")}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                )}

                {/* Compositor Preview Toggle */}
                {isCompositing && (
                      <button
                        onClick={() => setShowCompositorPreview(!showCompositorPreview)}
                        className={`p-2 rounded-lg transition-colors border ${showCompositorPreview
                            ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300'
                            : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                          }`}
                        title={t('record_video.preview', "Preview")}
                      >
                        <Monitor className="h-4 w-4" />
                      </button>
                    )}

                    {/* Audio Levels Toggle (Task 8.2) */}
                    {isCompositing && options.enableAudio && (
                      <button
                        onClick={() => setShowAudioLevels(!showAudioLevels)}
                        className={`p-2 rounded-lg transition-colors border ${showAudioLevels
                            ? 'bg-gradient-to-r from-[#00D4FF]/20 to-[#00B8E6]/20 text-[#00D4FF] border-[#00D4FF]/30'
                            : 'bg-white/90 text-slate-600 border-slate-200/50 hover:bg-slate-50/50'
                          }`}
                        title="Audio Levels"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
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
        <div className={`relative bg-black ${variant === 'default'
            ? 'aspect-video w-full mx-auto rounded-lg overflow-hidden shadow-lg border border-slate-800/50 my-4 max-h-[80vh]'
            : variant === 'embedded'
              ? 'aspect-video w-full mx-auto rounded-lg overflow-hidden shadow-md border border-slate-200 my-4' // Reduced size for embedded
              : 'aspect-video w-full mx-auto rounded-lg overflow-hidden shadow-lg border border-slate-800/50 my-4 max-h-[420px]'
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
          <RecordingStatusDisplay
            isRecording={isRecording}
            activeTab={activeTab}
            isMobile={isMobile}
            recordingTime={recordingTime}
            formatTime={formatTime}
            isPaused={isPaused}
            autoStopTimer={autoStopTimer}
          />

          {/* Task 8.2: Audio Level Indicators */}
          {showAudioLevels && isRecording && (
            <div className="absolute bottom-4 right-4 z-30">
              <AudioLevelIndicators
                isRecording={isRecording}
                isCompositing={isCompositing}
                startMonitoring={startAudioLevelMonitoring}
                stopMonitoring={stopAudioLevelMonitoring}
                onVolumeChange={setAudioVolume}
                onMuteToggle={setAudioMuted}
                getMutedState={isAudioMuted}
                getVolume={getAudioVolume}
              />
            </div>
          )}



          {/* Recording Controls - Modern Floating Bar */}
          <RecordingControls
            activeTab={activeTab}
            recordedVideo={recordedVideo}
            isRecording={isRecording}
            handleStartRecording={handleStartRecording}
            recordingSources={recordingSources as any}
            t={t as any}
            isPaused={isPaused}
            resumeRecording={resumeRecording}
            pauseRecording={pauseRecording}
            handleStopRecording={handleStopRecording}
            recordingTime={recordingTime}
            isStopping={isStoppingRef.current}
            showAdvancedTools={showAdvancedTools}
            handleSaveSession={handleSaveSession}
          />


        </div>

        {/* NEW: Slide Manager (advanced only) - REMOVED */}
        {/* 
        {showAdvancedTools && showSlideManager && (
          <div className="absolute top-4 right-4 z-40 w-96">
            <SlideManager
              onSlidesChange={handleSlidesChange}
              onSlideAdvance={handleSlideAdvance}
            />
          </div>
        )} 
        */}

        {/* NEW: Keyboard Shortcuts Panel (Task 7.1, 7.2) - advanced only */}
        {showAdvancedTools && showKeyboardShortcuts && (
          <div ref={shortcutsRef} className="absolute top-16 left-4 z-50 w-80 shadow-xl rounded-xl overflow-hidden border border-slate-200">
            <KeyboardShortcuts
              isRecording={isRecording}
              isPaused={isPaused}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
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
        <PostRecordingActions
          recordedVideo={recordedVideo}
          selectedFile={selectedFile}
          uploading={uploading}
          uploadSuccess={uploadSuccess}
          showLessonForm={showLessonForm}
          showPreview={showPreview}
          recordingDuration={recordingDuration}
          videoBlob={videoBlob}
          activeTab={activeTab}
          setShowPreview={setShowPreview}
          setShowLessonForm={setShowLessonForm}
          handleReset={handleReset}
          setShowTimelineEditor={setShowTimelineEditor}
          downloadRecording={downloadRecording}
          formatTime={formatTime}
        />

        {/* Enhanced Video Preview Modal */}
        {showEnhancedPreview && (recordedVideo || filePreview || videoBlob) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full mx-auto">
              <Suspense fallback={<LoadingSpinner />}>
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
                    setShowPreview(false);
                  } : undefined}
                  onCancel={() => setShowEnhancedPreview(false)}
                  title={activeTab === 'record' ? 'Recorded Video' : selectedFile?.name || 'Video Preview'}
                  duration={recordingDuration}
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* Mux Uploader Modal */}
        {showMuxUploader && muxUploadLessonId && (
          <div className="p-6 border-t bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2 mb-2">
                <Cloud className="h-5 w-5 text-blue-600" />
                <span>Upload Video</span>
              </h3>
              <p className="text-sm text-gray-600">
                Your lesson has been created. Now upload your video for optimized streaming.
              </p>
            </div>
            <Suspense fallback={<LoadingSpinner />}>
              <MuxVideoUploader
                lessonId={muxUploadLessonId}
                videoBlob={videoBlob || selectedFile || undefined}
                onUploadComplete={handleMuxUploadComplete}
                onError={handleMuxUploadError}
                onCancel={handleMuxUploadCancel}
              />
            </Suspense>
          </div>
        )}

        {/* Lesson Form - Light theme */}
        {showLessonForm && (
          <LessonDetailsForm
            t={t as any}
            lessonId={lessonId}
            recordedVideo={recordedVideo}
            selectedFile={selectedFile}
            recordingDuration={recordingDuration}
            activeTab={activeTab}
            handleReset={handleReset}
            setShowEnhancedPreview={setShowEnhancedPreview}
            setShowTimelineEditor={setShowTimelineEditor}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
            uploading={uploading}
            isCreatingCourseLoading={isCreatingCourseLoading}
            courses={courses}
            isCreatingCourse={isCreatingCourse}
            setIsCreatingCourse={setIsCreatingCourse}
            newCourseTitle={newCourseTitle}
            setNewCourseTitle={setNewCourseTitle}
            handleCreateCourseInline={handleCreateCourseInline}
            lessonTitle={lessonTitle}
            setLessonTitle={setLessonTitle}
            lessonDescription={lessonDescription}
            setLessonDescription={setLessonDescription}
            handleUpload={handleUpload}
            uploadSuccess={uploadSuccess}
          />
        )}

        {/* NEW: Teleprompter Overlay */}
        <Suspense fallback={null}>
          <Teleprompter 
            isOpen={showTeleprompter} 
            onClose={() => setShowTeleprompter(false)} 
          />
        </Suspense>

        {/* NEW: Pre-flight Check */}
        <PreFlightCheck
          isOpen={showPreFlight}
          onComplete={() => {
            setShowPreFlight(false);
          }}
          onCancel={() => setShowPreFlight(false)}
        />

        {/* NEW: Simple Video Editor Modal */}
        {showTimelineEditor && videoBlob && recordedVideo && (
          <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"><LoadingSpinner color="white" /></div>}>
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
          </Suspense>
        )}

        {/* NEW: Video Processing Status */}
        {showProcessingStatus && processingLessonId && (
          <VideoProcessingStatus
            lessonId={processingLessonId}
            isOpen={showProcessingStatus}
            onClose={() => setShowProcessingStatus(false)}
            onProcessingComplete={handleProcessingComplete}
            onViewLesson={() => {
              const targetCourseId = courseId || selectedCourse;
              if (targetCourseId) {
                navigate(`/teacher/courses/${targetCourseId}`);
              } else {
                navigate('/dashboard');
              }
            }}
            videoProvider="mux"
          />
        )}

        {/* Recording Presets Manager Modal (advanced only) */}
        {showAdvancedTools && (
          <Suspense fallback={null}>
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
              onPresetSelect={() => { }}
              onClose={() => setShowPresetsManager(false)}
              isOpen={showPresetsManager}
            />
          </Suspense>
        )}

        {/* Success/Progress Modal Notification */}
        <Suspense fallback={null}>
          <SuccessNotificationModal
            isOpen={modalNotification.isOpen}
            type={modalNotification.type}
            title={modalNotification.title}
            message={modalNotification.message}
            progress={modalNotification.progress}
            autoCloseDelay={modalNotification.autoCloseDelay}
            onClose={() => setModalNotification(prev => ({ ...prev, isOpen: false }))}
          />
        </Suspense>
      </div>
    </>
  );
};

export default VideoRecorder;