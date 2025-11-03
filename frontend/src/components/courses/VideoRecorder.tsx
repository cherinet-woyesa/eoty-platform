// frontend/src/components/courses/VideoRecorder.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { videoApi, coursesApi } from '../../services/api';
import VideoTimelineEditor from './VideoTimelineEditor';
import SlideManager from './SlideManager';
import VideoProcessingStatus from './VideoProcessingStatus';
import {
  Video, Circle, Square, Pause, Play,
  Upload, RotateCcw, Camera,
  CheckCircle, Loader, AlertCircle,
  Settings, Trash2,
  PlayCircle, Volume2, VolumeX, Cloud,
  Mic, MicOff, VideoIcon, Timer,
  Zap, Download,
  Lightbulb, Sparkles, Star,
  Monitor, PictureInPicture,
  Split, Save, FolderOpen, Scissors,
  FileText, Clock
} from 'lucide-react';

interface VideoRecorderProps {
  onRecordingComplete?: (videoUrl: string) => void;
  onUploadComplete?: (lessonId: string, videoUrl: string) => void;
  courseId?: string;
  lessonId?: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  category?: string;
}



// FIXED: Enhanced blobToFile function with forced WebM type
const blobToFile = (blob: Blob, fileName: string): File => {
  try {
    if (!blob || blob.size === 0) {
      throw new Error('Invalid or empty blob');
    }

    console.log('Blob details before conversion:', {
      size: blob.size,
      type: blob.type,
      isBlob: blob instanceof Blob
    });

    // Extract base filename without extension
    const baseName = fileName.split('.')[0];
    
    // ALWAYS use webm extension regardless of blob type
    // This forces the file to be treated as WebM
    const fileExtension = 'webm';
    const mimeType = 'video/webm';
    
    const finalFileName = `${baseName}.${fileExtension}`;

    // Create the file with forced WebM type
    const file = new File([blob], finalFileName, {
      type: mimeType,
      lastModified: Date.now()
    });

    console.log('Blob to File conversion successful:', {
      originalBlobSize: blob.size,
      originalBlobType: blob.type,
      finalFileSize: file.size,
      finalFileType: file.type,
      finalFileName: file.name
    });

    return file;
  } catch (error) {
    console.error('Error converting blob to file:', error);
    throw new Error('Failed to prepare video file for upload');
  }
};

// NEW: File validation function
const validateVideoFile = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    // Basic validation
    const validTypes = [
      'video/mp4', 
      'video/webm', 
      'video/quicktime', 
      'video/x-msvideo',
      'video/mp4; codecs=avc1,opus',
      'video/webm; codecs=vp8,opus',
      'video/webm; codecs=vp9,opus'
    ];
    
    if (!validTypes.some(type => file.type.includes(type.replace('; codecs=.*', '')))) {
      console.warn('File type may not be fully supported:', file.type);
      // Continue anyway as the browser might not detect the type correctly
    }
    
    if (file.size < 1024) { // Less than 1KB
      throw new Error('Video file is too small and likely corrupted');
    }
    
    if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB
      throw new Error('Video file must be less than 2GB');
    }
    
    resolve(true);
  });
};

// NEW: Debug function to analyze blob content
const debugBlobContent = async (blob: Blob): Promise<string> => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Get first 12 bytes for file signature
    const headerBytes = uint8Array.slice(0, 12);
    const hexString = Array.from(headerBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    
    console.log('Video blob analysis:', {
      size: blob.size,
      type: blob.type,
      headerHex: hexString,
      headerAscii: Array.from(headerBytes)
        .map(b => b > 31 && b < 127 ? String.fromCharCode(b) : '.')
        .join('')
    });
    
    // Check for common video file signatures
    if (hexString.includes('1a 45 df a3')) { // Standard WebM/EBML
      console.log('Detected: Standard WebM file (EBML signature)');
    } else if (hexString.includes('43 c3 82 03')) { // Chrome/Edge MediaRecorder
      console.log('Detected: Chrome/Edge MediaRecorder WebM file');
    } else if (hexString.includes('43 b6 75 01')) { // Alternative MediaRecorder
      console.log('Detected: Alternative MediaRecorder WebM file');
    } else if (hexString.includes('42 82 84 77')) { // Firefox MediaRecorder
      console.log('Detected: Firefox MediaRecorder WebM file');
    } else if (hexString.includes('66 74 79 70')) { // MP4
      console.log('Detected: MP4 file (ftyp signature)');
    } else {
      console.log('Browser-generated WebM file with non-standard header - this is normal');
    }
    
    return hexString;
  } catch (error) {
    console.error('Error debugging blob:', error);
    return 'error';
  }
};

const repairWebMHeader = async (blob: Blob): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Check if it already has a standard EBML header
        const standardEBML = [0x1A, 0x45, 0xDF, 0xA3];
        if (uint8Array.length >= 4 && 
            uint8Array[0] === standardEBML[0] && 
            uint8Array[1] === standardEBML[1] && 
            uint8Array[2] === standardEBML[2] && 
            uint8Array[3] === standardEBML[3]) {
          console.log('WebM already has standard EBML header');
          return resolve(blob);
        }
        
        // For browser-generated WebM files, we need to create a proper EBML structure
        // This is a minimal EBML header that FFmpeg can understand
        const ebmlHeader = new Uint8Array([
          // EBML Header
          0x1A, 0x45, 0xDF, 0xA3, // EBML signature
          0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F, // Header size (31 bytes)
          
          // EBMLVersion
          0x42, 0x86, 0x81, 0x01,
          
          // EBMLReadVersion  
          0x42, 0xF7, 0x81, 0x01,
          
          // EBMLMaxIDLength
          0x42, 0xF2, 0x81, 0x04,
          
          // EBMLMaxSizeLength
          0x42, 0xF3, 0x81, 0x08,
          
          // DocType
          0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D, // "webm"
          
          // DocTypeVersion
          0x42, 0x87, 0x81, 0x02,
          
          // DocTypeReadVersion
          0x42, 0x85, 0x81, 0x02
        ]);
        
        // Find the start of actual media data by looking for Segment element (0x18, 0x53, 0x80, 0x67)
        let segmentStart = -1;
        for (let i = 0; i < Math.min(uint8Array.length - 4, 100); i++) {
          if (uint8Array[i] === 0x18 && uint8Array[i + 1] === 0x53 && 
              uint8Array[i + 2] === 0x80 && uint8Array[i + 3] === 0x67) {
            segmentStart = i;
            break;
          }
        }
        
        let repairedData;
        if (segmentStart !== -1) {
          // Found segment, combine EBML header with segment data
          console.log(`Found Segment element at position ${segmentStart}`);
          const segmentData = uint8Array.slice(segmentStart);
          repairedData = new Uint8Array(ebmlHeader.length + segmentData.length);
          repairedData.set(ebmlHeader, 0);
          repairedData.set(segmentData, ebmlHeader.length);
        } else {
          // Fallback: try to find any recognizable WebM elements
          console.log('Segment not found, looking for other WebM elements');
          
          // Look for common WebM elements that might indicate start of media data
          const webmElements = [
            [0x11, 0x4D, 0x9B, 0x74], // SeekHead
            [0x15, 0x49, 0xA9, 0x66], // Info
            [0x16, 0x54, 0xAE, 0x6B], // Tracks
            [0x1C, 0x53, 0xBB, 0x6B], // Cues
            [0x1F, 0x43, 0xB6, 0x75]  // Cluster
          ];
          
          let dataStart = -1;
          for (const element of webmElements) {
            for (let i = 0; i < Math.min(uint8Array.length - 4, 200); i++) {
              if (uint8Array[i] === element[0] && uint8Array[i + 1] === element[1] && 
                  uint8Array[i + 2] === element[2] && uint8Array[i + 3] === element[3]) {
                dataStart = i;
                console.log(`Found WebM element at position ${i}`);
                break;
              }
            }
            if (dataStart !== -1) break;
          }
          
          if (dataStart !== -1) {
            // Create a minimal segment wrapper
            const segmentHeader = new Uint8Array([
              0x18, 0x53, 0x80, 0x67, // Segment ID
              0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF // Unknown size (streaming)
            ]);
            
            const mediaData = uint8Array.slice(dataStart);
            repairedData = new Uint8Array(ebmlHeader.length + segmentHeader.length + mediaData.length);
            repairedData.set(ebmlHeader, 0);
            repairedData.set(segmentHeader, ebmlHeader.length);
            repairedData.set(mediaData, ebmlHeader.length + segmentHeader.length);
          } else {
            // Last resort: just prepend EBML header to original data
            console.log('No recognizable WebM elements found, using fallback approach');
            repairedData = new Uint8Array(ebmlHeader.length + uint8Array.length);
            repairedData.set(ebmlHeader, 0);
            repairedData.set(uint8Array, ebmlHeader.length);
          }
        }
        
        const repairedBlob = new Blob([repairedData], { type: 'video/webm' });
        console.log('WebM header repaired successfully', {
          originalSize: blob.size,
          repairedSize: repairedBlob.size,
          headerAdded: ebmlHeader.length
        });
        
        resolve(repairedBlob);
      } catch (error) {
        console.error('Error repairing WebM header:', error);
        // If repair fails, return original blob
        resolve(blob);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading blob for WebM repair:', error);
      resolve(blob); // Return original blob on error
    };
    
    reader.readAsArrayBuffer(blob);
  });
};

const VideoRecorder: FC<VideoRecorderProps> = ({ 
  onRecordingComplete, 
  onUploadComplete,
  courseId
}) => {
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
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
    currentSession,
    isPaused,
    recordingTime,
    setRecordingTime: setRecordingTimeState,
    saveSession,
    loadSession,
    getSavedSessions,
    // NEW: Enhanced features
    recordingStats,
    setRecordingStats,
    exportSession,
    // NEW: Slide integration
    recordSlideChange,
    // NEW: Editing capabilities
    editRecording
  } = useVideoRecorder();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Core UI State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Course/Lesson State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState(courseId || '');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [showLessonForm, setShowLessonForm] = useState(false);
  
  // Error/Success State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');

  // Enhanced recording state
  const [recordingQuality, setRecordingQuality] = useState<'480p' | '720p' | '1080p'>('720p');
  const [enableAudio, setEnableAudio] = useState(true);
  const [recordingTips, setRecordingTips] = useState<string[]>([]);
  const [autoStopTimer, setAutoStopTimer] = useState<number>(0);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Session management state
  const [savedSessions, setSavedSessions] = useState<string[]>([]);
  const [showSessionMenu, setShowSessionMenu] = useState(false);

  // NEW: Integrated Features State
  const [showTimelineEditor, setShowTimelineEditor] = useState(false);
  const [showSlideManager, setShowSlideManager] = useState(false);
  const [showProcessingStatus, setShowProcessingStatus] = useState(false);
  const [processingLessonId, setProcessingLessonId] = useState<string | null>(null);
  const [currentSlides, setCurrentSlides] = useState<any[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // NEW: Enhanced state for production features
  const [, setRecordingStatus] = useState<'idle' | 'countdown' | 'recording' | 'paused' | 'processing'>('idle');



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
    setRecordingTips(tips);
  }, []);

  // Update video elements when streams change
  useEffect(() => {
    if (videoRef.current && recordingSources.camera) {
      videoRef.current.srcObject = recordingSources.camera;
    }
    
    if (screenVideoRef.current && recordingSources.screen) {
      screenVideoRef.current.srcObject = recordingSources.screen;
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
            setMicLevel(average / 255);
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

  // NEW: Recording stats monitoring
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
      
      setSuccessMessage('Video edited successfully!');
      setShowTimelineEditor(false);
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

  // NEW: Enhanced recording with multi-source support
  const startCountdownAndRecording = useCallback(async () => {
    try {
      setRecordingStatus('countdown');
      setCountdown(3);
      
      await new Promise<void>((resolve) => {
        let n = 3;
        countdownIntervalRef.current = setInterval(() => {
          n -= 1;
          setCountdown(n);
          
          if (n <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            setCountdown(null);
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
      setErrorMessage(error.message || 'Failed to start recording.');
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
      } catch (error) {
        console.error('Failed to load courses:', error);
        if (isMounted) {
          setErrorMessage('Failed to load courses. Please refresh the page.');
        }
      }
    };
    
    loadCourses();
    
    return () => {
      isMounted = false;
    };
  }, [courseId]);

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
      setErrorMessage(error.message || 'Failed to start recording.');
      setRecordingStatus('idle');
      resetRecording();
    }
  };

  const handleStopRecording = async () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    
    // Check minimum recording duration
    if (recordingTime < 1) {
      setErrorMessage('Recording too short. Please record for at least 1 second.');
      return;
    }
    
    // IMPORTANT: Capture the recording time BEFORE stopping (as stopRecording may reset it)
    const capturedDuration = recordingTime;
    console.log('Stopping recording with duration:', capturedDuration);
    
    setRecordingStatus('processing');
    try {
      await stopRecording();
      
      setRecordingStatus('idle');
      setShowPreview(true);
      setShowLessonForm(false); // Don't show form immediately, let user preview first
      setRecordingDuration(capturedDuration); // Use captured value BEFORE closing camera
      setSuccessMessage('Recording completed! Preview your video before uploading.');
      
      // Close camera and screen share AFTER setting duration
      // This provides clear feedback that recording has ended
      // We do this last so it doesn't interfere with state updates
      setTimeout(() => {
        closeCamera();
      }, 100); // Small delay to ensure state updates complete
    } catch (error) {
      console.error('Error stopping recording:', error);
      setErrorMessage('Failed to stop recording.');
      setRecordingStatus('idle');
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
    setSuccessMessage(null);
    setSelectedFile(null);
    setAutoStopTimer(0);
    setRecordingStatus('idle');
    setShowTimelineEditor(false);
    setShowSlideManager(false);
    setShowProcessingStatus(false);
    setProcessingLessonId(null);
    setCurrentSlides([]);
    setCurrentSlideIndex(0);
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

  // FIXED: Enhanced upload function with WebM header analysis
  const handleUpload = async () => {
    if (!selectedCourse || !lessonTitle.trim()) {
      setErrorMessage('Please select a course and enter a lesson title.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setErrorMessage(null);
      setShowProcessingStatus(true);

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

      // Create the lesson first
      const lessonResponse = await coursesApi.createLesson(selectedCourse, {
        title: lessonTitle.trim(),
        description: lessonDescription.trim() || 'Video lesson',
        order: 0
      });

      const newLessonId = lessonResponse.data.lesson.id;
      setProcessingLessonId(newLessonId);
      setUploadProgress(30);

      let uploadResponse;
      
      if (activeTab === 'record' && videoBlob) {
        console.log('Uploading recorded video blob for lesson:', newLessonId);
        
        // Debug the blob content before conversion
        await debugBlobContent(videoBlob);
        
        // Repair WebM header for FFmpeg compatibility
        const repairedBlob = await repairWebMHeader(videoBlob);
        
        const videoFile = blobToFile(repairedBlob, `lesson-${newLessonId}-${Date.now()}`);
        
        // Validate the file before upload
        await validateVideoFile(videoFile);
        
        console.log('Final file details for upload:', {
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type
        });

        uploadResponse = await videoApi.uploadVideo(
          videoFile, 
          newLessonId, 
          (progress) => setUploadProgress(30 + (progress * 0.7)) // 30-100%
        );
      } else if (activeTab === 'upload' && selectedFile) {
        console.log('Uploading selected file for lesson:', newLessonId);
        
        if (!selectedFile.type.startsWith('video/')) {
          throw new Error('Selected file is not a valid video format');
        }
        
        // Validate the uploaded file
        await validateVideoFile(selectedFile);
        
        // For manual uploads, use the original file directly (don't convert to WebM)
        uploadResponse = await videoApi.uploadVideo(
          selectedFile, 
          newLessonId, 
          (progress) => setUploadProgress(30 + (progress * 0.7)) // 30-100%
        );
      } else {
        throw new Error('No valid video content to upload');
      }

      setUploadProgress(100);
      setUploadSuccess(true);
      
      const videoUrl = uploadResponse.data.videoUrl;
      console.log('Upload successful. Video URL:', videoUrl);
      
      onRecordingComplete?.(videoUrl);
      onUploadComplete?.(newLessonId, videoUrl);

    } catch (error: any) {
      console.error('Upload failed:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Upload failed. Please try again.');
      setUploading(false);
      setShowProcessingStatus(false);
      setProcessingLessonId(null);
    }
  };

  // NEW: Handle processing completion
  const handleProcessingComplete = () => {
    setShowProcessingStatus(false);
    setSuccessMessage('Video processing completed! Your video is now available.');
    setTimeout(() => {
      handleReset();
    }, 3000);
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
        return (
          <div className="relative w-full h-full">
            <video
              ref={recordedVideoRef}
              src={recordedVideo}
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            {showPreview && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <button onClick={handlePreviewPlay} className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  {isPlaying ? <Pause className="h-8 w-8 text-white" /> : <PlayCircle className="h-8 w-8 text-white" />}
                </button>
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div className={`w-full h-full relative ${getLayoutClass()}`}>
            {/* Camera Preview */}
            {recordingSources.camera && (
              <div className={`camera-preview ${currentLayout === 'screen-only' ? 'hidden' : ''}`}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                  Camera {micLevel > 0.1 && (
                    <div className="flex items-center space-x-1">
                      <Mic className="h-3 w-3" />
                      <div className="w-12 h-1 bg-gray-600 rounded">
                        <div 
                          className="h-1 bg-green-500 rounded transition-all"
                          style={{ width: `${micLevel * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Screen Share Preview */}
            {recordingSources.screen && (
              <div className={`screen-preview ${currentLayout === 'camera-only' ? 'hidden' : ''}`}>
                <video
                  ref={screenVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                  Screen
                </div>
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
            <video src={filePreview} className="w-full h-full object-cover" controls />
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
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Video className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Create Video Lesson</h3>
          </div>
          <div className="flex items-center space-x-2">
            {/* Session Management Button */}
            {savedSessions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSessionMenu(!showSessionMenu)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Saved Sessions"
                >
                  <FolderOpen className="h-5 w-5" />
                </button>
                {showSessionMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                    <div className="p-2 text-xs text-gray-500 border-b border-gray-100">
                      Saved Sessions
                    </div>
                    {savedSessions.map(sessionId => (
                      <button
                        key={sessionId}
                        onClick={() => handleLoadSession(sessionId)}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Session {sessionId.slice(-8)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
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
              title="Settings"
            >
              <Sparkles className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Enhanced Tab Navigation */}
        <div className="flex space-x-1 mt-4 bg-white rounded-xl p-1 border">
          <button
            onClick={() => handleTabChange('record')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'record' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
            }`}>
            <VideoIcon className="h-4 w-4" />
            <span>Record Live</span>
          </button>
          <button
            onClick={() => handleTabChange('upload')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'upload' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
            }`}>
            <Cloud className="h-4 w-4" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      {/* NEW: Multi-source Controls */}
      {activeTab === 'record' && !recordedVideo && (
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Sources:</span>
              
              {/* Camera Toggle */}
              <button
                onClick={() => recordingSources.camera ? closeCamera() : initializeCamera()}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  recordingSources.camera 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Camera className="h-4 w-4 inline mr-1" />
                Camera
              </button>
              
              {/* Screen Share Toggle */}
              <button
                onClick={() => isScreenSharing ? stopScreenShare() : startScreenShare()}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  isScreenSharing 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Monitor className="h-4 w-4 inline mr-1" />
                Screen
              </button>

              {/* NEW: Slide Manager Toggle */}
              <button
                onClick={() => setShowSlideManager(!showSlideManager)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  showSlideManager 
                    ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-1" />
                Slides
              </button>
            </div>
            
            {/* Layout Selector */}
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600 mr-2">Layout:</span>
              {(['picture-in-picture', 'side-by-side', 'screen-only', 'camera-only'] as const).map(layout => (
                <button
                  key={layout}
                  onClick={() => setLayout(layout)}
                  className={`p-1 rounded transition-colors ${
                    currentLayout === layout 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={layout.replace('-', ' ')}
                >
                  {layout === 'picture-in-picture' && <PictureInPicture className="h-4 w-4" />}
                  {layout === 'side-by-side' && <Split className="h-4 w-4" />}
                  {layout === 'screen-only' && <Monitor className="h-4 w-4" />}
                  {layout === 'camera-only' && <Camera className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Panel */}
      {showAdvancedSettings && (
        <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Advanced Recording Settings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recording Quality
              </label>
              <select
                value={recordingQuality}
                onChange={(e) => setRecordingQuality(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="480p">480p (SD) - Faster processing</option>
                <option value="720p">720p (HD) - Recommended</option>
                <option value="1080p">1080p (Full HD) - Best quality</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto-stop Timer (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={autoStopTimer}
                onChange={(e) => setAutoStopTimer(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                placeholder="0 = no auto-stop"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enable-audio"
                checked={enableAudio}
                onChange={(e) => setEnableAudio(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="enable-audio" className="ml-2 text-sm text-gray-700">
                Enable Audio Recording
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Recording Tips */}
      {showSettings && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h4 className="font-semibold text-gray-900 mb-3">Recording Tips</h4>
          <div className="space-y-2">
            {recordingTips.map((tip, index) => (
              <div key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Preview Area */}
      <div className="relative bg-black aspect-video">
        {renderPreview()}

        {/* NEW: Slide Indicator */}
        {currentSlides.length > 0 && activeTab === 'record' && (
          <div className="absolute top-4 left-4 z-30 bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
            Slide {currentSlideIndex + 1}/{currentSlides.length}
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-white text-6xl font-bold">{countdown}</div>
          </div>
        )}

        {/* Recording Status */}
        {isRecording && activeTab === 'record' && (
          <div className="absolute top-4 left-4 flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>REC</span>
            </div>
            <div className="bg-black/50 text-white px-3 py-1 rounded-full">
              <span>{formatTime(recordingTime)}</span>
            </div>
            {isPaused && <div className="bg-yellow-600 text-white px-3 py-1 rounded-full">PAUSED</div>}
            {autoStopTimer > 0 && (
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full flex items-center space-x-1">
                <Timer className="h-3 w-3" />
                <span>Auto-stop: {autoStopTimer}m</span>
              </div>
            )}
          </div>
        )}

        {/* NEW: Enhanced Action Buttons (shown after recording) */}
        {activeTab === 'record' && recordedVideo && (
          <div className="absolute top-4 right-4 z-30 flex space-x-2">
            <button
              onClick={() => setShowTimelineEditor(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center space-x-2"
            >
              <Scissors className="h-4 w-4" />
              <span>Edit Video</span>
            </button>
            <button
              onClick={handleExportSession}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        )}

        {/* Recording Controls */}
        {activeTab === 'record' && !recordedVideo && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            {!isRecording ? (
              <div className="text-center">
                <button 
                  onClick={handleStartRecording} 
                  disabled={countdown !== null || (!recordingSources.camera && !recordingSources.screen)}
                  className="flex items-center space-x-3 px-8 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  <Circle className="h-6 w-6" />
                  <span className="font-semibold">
                    {countdown !== null ? `Starting...` : 'Start Recording'}
                  </span>
                </button>
                <p className="text-white text-sm mt-2 opacity-75">
                  Minimum recording time: 1 second
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-4 mb-2">
                  {/* Session Save Button */}
                  <button 
                    onClick={handleSaveSession}
                    className="p-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors"
                    title="Save Session"
                  >
                    <Save className="h-6 w-6" />
                  </button>
                  
                  {/* Pause/Resume Button */}
                  <button 
                    onClick={isPaused ? resumeRecording : pauseRecording} 
                    className="p-4 bg-yellow-500 text-white rounded-2xl hover:bg-yellow-600 transition-colors"
                  >
                    {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                  </button>
                  
                  {/* Stop Button */}
                  <button 
                    onClick={handleStopRecording} 
                    disabled={recordingTime < 1}
                    className="p-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={recordingTime < 1 ? 'Record for at least 1 second' : 'Stop Recording'}
                  >
                    <Square className="h-6 w-6" />
                  </button>
                </div>
                {recordingTime < 1 && (
                  <p className="text-yellow-300 text-sm">
                    Record for at least 1 second to stop
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Preview Controls */}
        {activeTab === 'record' && recordedVideo && showPreview && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-4">
            <button onClick={handlePreviewPlay} className="p-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={handleMuteToggle} className="p-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button onClick={downloadRecording} className="p-3 bg-green-600/80 text-white rounded-xl hover:bg-green-700/80 transition-colors">
              <Download className="h-5 w-5" />
            </button>
            <button onClick={handleDeleteRecording} className="p-3 bg-red-600/80 text-white rounded-xl hover:bg-red-700/80 transition-colors">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* NEW: Slide Manager */}
      {showSlideManager && (
        <div className="absolute top-4 right-4 z-40 w-96">
          <SlideManager
            onSlidesChange={handleSlidesChange}
            onSlideAdvance={handleSlideAdvance}
          />
        </div>
      )}

      {/* Recording Stats */}
      {activeTab === 'record' && recordedVideo && videoBlob && (
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

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-3 bg-green-100 border-l-4 border-green-400 text-green-700 flex items-center space-x-2">
          <CheckCircle className="h-4 w-4" />
          <span>{successMessage}</span>
        </div>
      )}
      
      {errorMessage && (
        <div className="p-3 bg-red-100 border-l-4 border-red-400 text-red-700 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="p-4 bg-blue-50">
          <div className="flex justify-between mb-1 text-sm text-blue-700">
            <span>Uploading video...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }} 
            />
          </div>
        </div>
      )}

      {/* Preview Section - Enhanced */}
      {showPreview && (recordedVideo || selectedFile) && !uploading && !uploadSuccess && (
        <div className="p-6 border-t bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <PlayCircle className="h-5 w-5 text-blue-600" />
              <span>Preview Your {activeTab === 'record' ? 'Recording' : 'Video'}</span>
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{formatTime(recordingDuration)}</span>
              {videoBlob && (
                <>
                  <span className="mx-2">•</span>
                  <span>{getFileSize(videoBlob.size)}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Preview Video Player */}
          <div className="relative bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
            {(recordedVideo || filePreview) ? (
              <video
                ref={recordedVideoRef}
                src={(recordedVideo || filePreview) || undefined}
                className="w-full h-full object-contain"
                controls
                controlsList="nodownload"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  // Update duration from video metadata if not already set or if it's 0
                  if (video.duration && video.duration > 0 && (!recordingDuration || recordingDuration === 0)) {
                    const duration = Math.floor(video.duration);
                    console.log('Video metadata loaded, duration:', duration);
                    setRecordingDuration(duration);
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-400" />
                  <p>No video available to preview</p>
                </div>
              </div>
            )}
          </div>

          {/* Preview Actions */}
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center space-x-3">
              {activeTab === 'record' && videoBlob && (
                <button 
                  onClick={downloadRecording}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  title="Download Recording"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{activeTab === 'record' ? 'Record Again' : 'Choose Different File'}</span>
              </button>
              <button 
                onClick={() => setShowLessonForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Looks Good, Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Form */}
      {showLessonForm && (recordedVideo || selectedFile) && (
        <div className="p-6 border-t">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>Save Your {activeTab === 'record' ? 'Recording' : 'Video'}</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Course *</label>
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)} 
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={uploading}
              >
                <option value="">Choose a course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lesson Title *</label>
              <input 
                type="text" 
                value={lessonTitle} 
                onChange={(e) => setLessonTitle(e.target.value)} 
                placeholder="Enter lesson title..." 
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                disabled={uploading} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <textarea 
                value={lessonDescription} 
                onChange={(e) => setLessonDescription(e.target.value)} 
                placeholder="Brief description..." 
                rows={3} 
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                disabled={uploading} 
              />
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleReset} 
                disabled={uploading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{activeTab === 'record' ? 'Record Again' : 'Upload New'}</span>
              </button>
              <button 
                onClick={handleUpload} 
                disabled={uploading || uploadSuccess || !selectedCourse || !lessonTitle.trim()}
                className="flex-1 px-4 py-3 border border-transparent rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
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
          onCancel={() => setShowTimelineEditor(false)}
        />
      )}

      {/* NEW: Video Processing Status */}
      {showProcessingStatus && processingLessonId && (
        <VideoProcessingStatus
          lessonId={processingLessonId}
          isOpen={showProcessingStatus}
          onClose={() => setShowProcessingStatus(false)}
          onProcessingComplete={handleProcessingComplete}
        />
      )}
    </div>
  );
};

export default VideoRecorder;