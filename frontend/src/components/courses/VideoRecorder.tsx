import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { videoApi, coursesApi } from '../../services/api';
import { 
  Video, Circle, Square, Pause, Play, 
  Upload, RotateCcw, Camera, FileVideo,
  CheckCircle, Loader, AlertCircle, 
  Settings, Eye, EyeOff, Trash2,
  PlayCircle, Volume2, VolumeX, Cloud
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

// Utility function to convert Blob to File
const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, { 
    type: blob.type,
    lastModified: Date.now()
  });
};

const VideoRecorder: FC<VideoRecorderProps> = ({ 
  onRecordingComplete, 
  onUploadComplete,
  courseId
}) => {
  const {
    isRecording,
    recordedVideo,
    videoBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error,
    stream,
    options,
    setOptions,
    devices,
    initializeCamera,
    cameraInitialized
  } = useVideoRecorder();

  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI State
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
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
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [teleprompterText, setTeleprompterText] = useState('');
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(1);
  
  // Course/Lesson State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState(courseId || '');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [showLessonForm, setShowLessonForm] = useState(false);
  
  // Error State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New state for pre-recorded video upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [coursesLoading, setCoursesLoading] = useState(false);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load teacher's courses with proper error handling
  useEffect(() => {
    let isMounted = true;
    
    const loadCourses = async () => {
      try {
        setCoursesLoading(true);
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
      } finally {
        if (isMounted) {
          setCoursesLoading(false);
        }
      }
    };
    
    loadCourses();
    
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Update video element when stream changes
  useEffect(() => {
    console.log('Stream useEffect triggered, videoRef.current:', !!videoRef.current, 'stream:', !!stream);
    if (videoRef.current && stream) {
      console.log('Setting video srcObject');
      videoRef.current.srcObject = stream;
    }
    
    // Setup mic analyser for level meter
    if (stream) {
      console.log('Setting up mic analyzer');
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioAnalyserRef.current = analyser;
        audioContextRef.current = audioCtx;
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    }
    
    return () => {
      console.log('Cleaning up audio analyzer');
      audioAnalyserRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, [stream]);

  // Recording timer with cleanup
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    console.log('!!! Recording timer useEffect triggered, isRecording:', isRecording, 'isPaused:', isPaused);
    
    if (isRecording && !isPaused) {
      console.log('!!! Starting recording timer');
      interval = setInterval(() => {
        setRecordingTime(prev => {
          console.log('!!! Recording time updated:', prev + 1);
          return prev + 1;
        });
      }, 1000);
    } else {
      console.log('!!! Recording timer not started or paused');
    }
    
    return () => {
      console.log('!!! Cleaning up recording timer');
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  // Mic level polling with cleanup
  useEffect(() => {
    let raf: number;
    let isActive = true;

    const tick = () => {
      if (!isActive) return;
      
      const analyser = audioAnalyserRef.current;
      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        
        // Compute RMS
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / bufferLength);
        setMicLevel(Math.min(1, rms * 2));
      }
      
      if (isActive) {
        raf = requestAnimationFrame(tick);
      }
    };
    
    if (stream) {
      console.log('Starting mic level polling');
      raf = requestAnimationFrame(tick);
    }

    return () => {
      console.log('Cleaning up mic level polling');
      isActive = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stream]);

  // Auto-show lesson form when recording stops or file is selected
  useEffect(() => {
    console.log('useEffect triggered, recordedVideo:', recordedVideo, 'selectedFile:', selectedFile, 'showLessonForm:', showLessonForm, 'isRecording:', isRecording, 'recordingTime:', recordingTime);
    if ((recordedVideo || selectedFile) && !showLessonForm) {
      console.log('Showing lesson form and preview');
      setShowLessonForm(true);
      setShowPreview(true);
    }
    // Also show lesson form when recording has stopped but there's no recorded video
    // This handles the case where recording failed or was stopped immediately
    else if (!recordedVideo && !selectedFile && !isRecording && !showLessonForm && recordingTime > 0) {
      console.log('Showing lesson form for failed recording');
      setShowLessonForm(true);
      setShowPreview(true);
      // Set an error message to inform the user
      setErrorMessage('Recording was stopped before any data was captured. Please try recording again.');
    }
    // Handle case where recording was attempted but failed (no video data)
    else if (!recordedVideo && !selectedFile && !isRecording && showLessonForm && recordingTime > 0) {
      console.log('Recording completed but no data captured');
      // Only show this error if we haven't already shown it
      if (!errorMessage || !errorMessage.includes('no video data was captured')) {
        setErrorMessage('Recording completed but no video data was captured. Please try recording again.');
      }
    }
    // Additional check for when recording stops but no data is captured
    else if (!recordedVideo && !selectedFile && !isRecording && recordingTime > 0 && !showLessonForm) {
      console.log('Recording stopped with no data, showing error');
      setShowLessonForm(true);
      setShowPreview(true);
      setErrorMessage('Recording completed but no video data was captured. Please try recording again.');
    }
  }, [recordedVideo, selectedFile, showLessonForm, isRecording, recordingTime, errorMessage]);

  // Cleanup file preview URLs
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  // Cleanup countdown on unmount
  useEffect(() => {
    console.log('Setting up countdown cleanup');
    return () => {
      console.log('Cleaning up countdown interval');
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Handle file selection for pre-recorded videos
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setErrorMessage('Please select a valid video file (MP4, WebM, MOV, AVI, etc.).');
        return;
      }
      
      // Validate file size (max 1GB for pre-recorded videos)
      if (file.size > 1024 * 1024 * 1024) {
        setErrorMessage('Video file must be less than 1GB. For larger files, consider compressing first.');
        return;
      }

      // Clean up previous preview
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }

      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setShowLessonForm(true);
      setErrorMessage(null);
      setActiveTab('upload');
    }
  }, [filePreview]);

  const handleStartRecording = async () => {
    console.log('handleStartRecording called');
    try {
      setRecordingTime(0);
      setUploadSuccess(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      
      // Ensure camera is initialized
      if (!stream && activeTab === 'record') {
        console.log('Camera not initialized, initializing now...');
        await initializeCamera();
        // Wait a bit for stream to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!stream) {
          throw new Error('Failed to initialize camera. Please check permissions.');
        }
      }
      
      // Countdown UX
      setCountdown(3);
      
      // Create a promise that resolves when countdown completes
      await new Promise<void>((resolve, reject) => {
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
      
      // Start recording after countdown
      console.log('Countdown complete, calling startRecording');
      await startRecording();
      console.log('startRecording completed, isRecording:', isRecording, 'stream available:', !!stream);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setErrorMessage(error.message || 'Failed to start recording. Please check camera permissions and try again.');
      // Make sure countdown is properly reset
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setCountdown(null);
      // Reset the recording state to allow user to try again
      resetRecording();
    }
  };

  const handleStopRecording = () => {
    console.log('handleStopRecording called');
    stopRecording();
  };

  const handlePauseRecording = () => {
    console.log('handlePauseRecording called');
    pauseRecording();
    setIsPaused(true);
  };

  const handleResumeRecording = () => {
    console.log('handleResumeRecording called');
    resumeRecording();
    setIsPaused(false);
  };

  const handleReset = useCallback(() => {
    console.log('handleReset called');
    resetRecording();
    setRecordingTime(0);
    setIsPaused(false);
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
    
    // Clean up file preview
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

  const handleUpload = async () => {
    if (!selectedCourse || !lessonTitle.trim()) {
      setErrorMessage('Please select a course and enter a lesson title.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setErrorMessage(null);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      // First create the lesson
      const lessonResponse = await coursesApi.createLesson(selectedCourse, {
        title: lessonTitle.trim(),
        description: lessonDescription.trim() || 'Video lesson',
        order: 0
      });

      const newLessonId = lessonResponse.data.lesson.id;
      setUploadProgress(50);

      let videoUrl: string;

      if (activeTab === 'record' && videoBlob) {
        // Convert Blob to File for consistent API
        const videoFile = blobToFile(videoBlob, `lesson-${newLessonId}-${Date.now()}.webm`);
        const uploadResponse = await videoApi.uploadVideo(videoFile, newLessonId);
        videoUrl = uploadResponse.data.videoUrl;
      } else if (activeTab === 'upload' && selectedFile) {
        // Upload pre-recorded file
        const uploadResponse = await videoApi.uploadVideo(selectedFile, newLessonId);
        videoUrl = uploadResponse.data.videoUrl;
      } else {
        throw new Error('No video content to upload');
      }

      setUploadProgress(100);
      clearInterval(progressInterval);
      
      setUploadSuccess(true);
      setSuccessMessage('Video uploaded successfully!');
      
      onRecordingComplete?.(videoUrl);
      onUploadComplete?.(newLessonId, videoUrl);

      // Reset form after successful upload
      setTimeout(() => {
        handleReset();
      }, 3000);

    } catch (error: any) {
      console.error('Upload failed:', error);
      setErrorMessage(error.response?.data?.message || 'Upload failed. Please try again.');
      
      // Auto-retry logic can be added here
      if (error.response?.status >= 500) {
        setTimeout(() => {
          if (confirm('Upload failed due to server error. Would you like to try again?')) {
            handleUpload();
          }
        }, 2000);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRecording = () => {
    if (confirm('Are you sure you want to delete this recording?')) {
      handleReset();
    }
  };

  // Render loading state for courses
  if (coursesLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Courses</h3>
        <p className="text-gray-600">Please wait while we load your courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <Camera className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Access Required</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <div className="space-y-3">
          <button
            onClick={initializeCamera}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
          >
            <Camera className="mr-2 h-4 w-4" />
            Initialize Camera
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 transform hover:scale-105"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </button>
          <p className="text-xs text-gray-500">
            Make sure to allow camera and microphone access when prompted
          </p>
        </div>
      </div>
    );
  }

  // Show initialization button when no stream is available
  if (!stream && activeTab === 'record' && !recordedVideo) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Camera className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Initialization</h3>
        <p className="text-gray-600 mb-4">Click the button below to initialize your camera and start recording.</p>
        <div className="space-y-3">
          <button
            onClick={initializeCamera}
            disabled={cameraInitialized}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <Camera className="mr-2 h-5 w-5" />
            {cameraInitialized ? 'Camera Ready' : 'Initialize Camera'}
          </button>
          <p className="text-xs text-gray-500">
            You'll be prompted to allow camera and microphone access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Create Video Lesson</h3>
              <p className="text-sm text-gray-600">Record live or upload pre-recorded content</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:bg-white rounded-lg"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab('record')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg transition-all duration-200 ${
              activeTab === 'record' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span className="text-sm font-medium">Record Live</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg transition-all duration-200 ${
              activeTab === 'upload' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FileVideo className="h-4 w-4" />
            <span className="text-sm font-medium">Upload Video</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Camera</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                value={options.videoDeviceId || ''}
                onChange={(e) => setOptions({ videoDeviceId: e.target.value || undefined })}
              >
                <option value="">Default Camera</option>
                {devices.cameras.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${devices.cameras.indexOf(d) + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Microphone</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                value={options.audioDeviceId || ''}
                onChange={(e) => setOptions({ audioDeviceId: e.target.value || undefined })}
              >
                <option value="">Default Microphone</option>
                {devices.microphones.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Mic ${devices.microphones.indexOf(d) + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quality</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                value={options.resolution || '720p'}
                onChange={(e) => setOptions({ resolution: e.target.value as any })}
              >
                <option value="720p">720p HD</option>
                <option value="1080p">1080p Full HD</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={!!options.screen}
                  onChange={(e) => setOptions({ screen: e.target.checked })}
                />
                <span>Screen + Mic</span>
              </label>
              {/* Mic level meter */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Mic</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      micLevel > 0.7 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                      micLevel > 0.3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                      'bg-gradient-to-r from-green-400 to-green-600'
                    }`}
                    style={{ width: `${Math.round(micLevel * 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={resetRecording}
              className="text-xs text-blue-600 hover:text-blue-700 underline transition-colors duration-200"
            >
              Reinitialize devices
            </button>
            <button
              onClick={() => setShowTeleprompter(v => !v)}
              className="text-xs text-blue-600 hover:text-blue-700 underline transition-colors duration-200"
            >
              {showTeleprompter ? 'Hide Teleprompter' : 'Show Teleprompter'}
            </button>
          </div>
          {showTeleprompter && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
              <textarea
                className="md:col-span-5 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                rows={3}
                placeholder="Paste or write your script here..."
                value={teleprompterText}
                onChange={(e) => setTeleprompterText(e.target.value)}
              />
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Scroll speed</label>
                <input 
                  type="range" 
                  min={0.5} 
                  max={3} 
                  step={0.25} 
                  value={teleprompterSpeed} 
                  onChange={(e) => setTeleprompterSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{teleprompterSpeed}x</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Preview/Recording Area */}
      <div className="relative bg-black aspect-video">
        {activeTab === 'record' ? (
          !recordedVideo ? (
            // Camera automatically shows video feed (like old version)
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
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
                  <div className="text-center text-white">
                    <button
                      onClick={handlePreviewPlay}
                      className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all duration-200 mb-4 shadow-lg"
                    >
                      {isPlaying ? (
                        <Pause className="h-8 w-8" />
                      ) : (
                        <PlayCircle className="h-8 w-8" />
                      )}
                    </button>
                    <p className="text-sm">Click to preview your recording</p>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          // Upload tab content
          <div className="w-full h-full flex items-center justify-center">
            {filePreview ? (
              <div className="relative w-full h-full">
                <video
                  src={filePreview}
                  className="w-full h-full object-cover"
                  controls
                />
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Cloud className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Video File</h3>
                <p className="text-gray-600 mb-4 max-w-md">
                  Select a video file from your device. Supported formats: MP4, WebM, MOV, AVI
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <FileVideo className="mr-2 h-5 w-5" />
                  Choose Video File
                </button>
                <p className="text-xs text-gray-500 mt-3">Maximum file size: 1GB</p>
              </div>
            )}
          </div>
        )}

        {/* Teleprompter Overlay */}
        {showTeleprompter && !recordedVideo && teleprompterText && activeTab === 'record' && (
          <div className="absolute inset-0 pointer-events-none p-8 flex items-end">
            <div
              className="w-full text-white text-2xl leading-relaxed opacity-80 font-mono"
              style={{
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0.1))',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0.1))',
                animation: `scrollUp ${Math.max(10, teleprompterText.length / teleprompterSpeed)}s linear infinite`
              }}
            >
              {teleprompterText}
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="w-24 h-24 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              {countdown}
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && activeTab === 'record' && (
          <div className="absolute top-4 left-4 flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-medium">REC</span>
            </div>
            <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full">
              <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
            </div>
            {isPaused && (
              <div className="bg-yellow-600 text-white px-3 py-1 rounded-full">
                <span className="text-sm font-medium">PAUSED</span>
              </div>
            )}
          </div>
        )}

        {/* Recording Controls */}
        {activeTab === 'record' && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                disabled={countdown !== null}
                className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Circle className="h-6 w-6" />
                <span>
                  {countdown !== null ? `Starting in ${countdown}...` : 'Start Recording'}
                </span>
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <button
                  onClick={isPaused ? handleResumeRecording : handlePauseRecording}
                  className="p-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                </button>
                <button
                  onClick={handleStopRecording}
                  className="p-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <Square className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Video Controls for Recorded Video */}
        {activeTab === 'record' && recordedVideo && showPreview && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
            <button
              onClick={handlePreviewPlay}
              className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-xl transition-all duration-200 shadow-lg backdrop-blur-sm"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              onClick={handleMuteToggle}
              className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-xl transition-all duration-200 shadow-lg backdrop-blur-sm"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button
              onClick={handleDeleteRecording}
              className="p-3 bg-red-600 bg-opacity-80 hover:bg-opacity-100 text-white rounded-xl transition-all duration-200 shadow-lg"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="px-6 py-3 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Uploading video...</span>
            <span className="text-sm text-blue-600">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Lesson Form */}
      {showLessonForm && (recordedVideo || selectedFile || (!recordedVideo && !selectedFile && !isRecording && recordingTime > 0)) && (
        <div className="p-6 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Save Your {activeTab === 'record' ? 'Recording' : 'Video'}</h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Course Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 bg-white"
                disabled={uploading}
              >
                <option value="">Choose a course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              {courses.length === 0 && !coursesLoading && (
                <p className="text-sm text-yellow-600 mt-1">
                  No courses found. Please create a course first.
                </p>
              )}
            </div>

            {/* Lesson Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lesson Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Enter lesson title..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 bg-white"
                disabled={uploading}
              />
            </div>

            {/* Lesson Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.target.value)}
                placeholder="Brief description of this lesson..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 bg-white resize-none"
                disabled={uploading}
              />
            </div>

            {/* Video Info */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  {activeTab === 'record' ? (
                    <Camera className="h-5 w-5 text-blue-600" />
                  ) : (
                    <FileVideo className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {activeTab === 'record' ? 'Live Recording' : 'Uploaded Video'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'record' 
                      ? `Duration: ${formatTime(recordingTime)}` 
                      : selectedFile ? `File: ${selectedFile.name} (${((selectedFile.size || 0) / (1024 * 1024)).toFixed(1)} MB)` : 'No file selected'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleReset}
                disabled={uploading}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {activeTab === 'record' ? 'Record Again' : 'Upload New Video'}
              </button>
              
              <button
                onClick={handleUpload}
                disabled={uploading || uploadSuccess || !selectedCourse || !lessonTitle.trim()}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {uploading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : uploadSuccess ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Uploaded!
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Save Lesson
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!showLessonForm && !isRecording && !recordedVideo && !selectedFile && (
        <div className="p-6 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Camera className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Record Live</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Create engaging video lessons with your camera and microphone.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileVideo className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Upload Video</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Upload pre-recorded videos from your device (max 1GB).
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Cloud className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Secure & Fast</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Your videos are securely stored and optimized for streaming.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;