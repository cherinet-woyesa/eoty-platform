import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { videoApi, coursesApi } from '../../services/api';
import {
  Video, Circle, Square, Pause, Play,
  Upload, RotateCcw, Camera, FileVideo,
  CheckCircle, Loader, AlertCircle,
  Settings, Eye, EyeOff, Trash2,
  PlayCircle, Volume2, VolumeX, Cloud,
  Mic, MicOff, VideoIcon, Timer,
  Zap, Shield, Clock, Download,
  Lightbulb, Sparkles, Users, Star
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

// Utility function to convert Blob to File with proper error handling and mimetype preservation
const blobToFile = (blob: Blob, fileName: string): File => {
  try {
    // Ensure blob is valid
    if (!blob || blob.size === 0) {
      throw new Error('Invalid or empty blob');
    }

    console.log('Blob details before conversion:', {
      size: blob.size,
      type: blob.type,
      isBlob: blob instanceof Blob
    });

    // Clean up the mimetype - remove codecs information for the file type
    const cleanMimeType = blob.type.split(';')[0]; // Remove everything after semicolon
    
    // Use the cleaned mimetype
    const fileType = cleanMimeType && cleanMimeType.startsWith('video/') 
      ? cleanMimeType 
      : 'video/webm';

    // Ensure the file extension matches the cleaned mimetype
    const extension = fileType.split('/')[1] || 'webm';
    
    // Clean the filename - remove any existing extension and add the proper one
    const baseName = fileName.split('.')[0];
    const finalFileName = `${baseName}.${extension}`;

    const file = new File([blob], finalFileName, {
      type: fileType,
      lastModified: Date.now()
    });

    console.log('Blob to File conversion successful:', {
      originalBlobSize: blob.size,
      originalBlobType: blob.type,
      cleanMimeType: cleanMimeType,
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
    closeCamera,
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

  // Enhanced features state
  const [recordingQuality, setRecordingQuality] = useState<'480p' | '720p' | '1080p'>('720p');
  const [enableAudio, setEnableAudio] = useState(true);
  const [recordingTips, setRecordingTips] = useState<string[]>([]);
  const [autoStopTimer, setAutoStopTimer] = useState<number>(0); // in minutes
  const [recordingDuration, setRecordingDuration] = useState<number>(0); // in seconds
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldStartAfterInit = useRef(false);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // FIX: Camera cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('VideoRecorder unmounting - cleaning up camera');
      closeCamera();
      
      // Clean up all intervals and timeouts
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      
      // Clean up file preview URLs
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo);
      }
    };
  }, [closeCamera, filePreview, recordedVideo]);

  // Recording tips
  useEffect(() => {
    const tips = [
      "Ensure good lighting facing you",
      "Use a quiet environment for clear audio",
      "Look directly at the camera",
      "Keep your background professional",
      "Test your microphone before recording",
      "Use a tripod or stable surface",
      "Speak clearly and at a moderate pace"
    ];
    setRecordingTips(tips);
  }, []);

  const startCountdownAndRecording = useCallback(async () => {
    try {
      // Countdown UX
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
      resetRecording();
    }
  }, [startRecording, resetRecording, autoStopTimer, isRecording]);

  useEffect(() => {
    if (shouldStartAfterInit.current && stream) {
      shouldStartAfterInit.current = false;
      startCountdownAndRecording();
    }
  }, [stream, startCountdownAndRecording]);

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
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    
    if (stream && enableAudio) {
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
      audioAnalyserRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, [stream, enableAudio]);

  // Recording timer with cleanup
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
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
      if (analyser && enableAudio) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        
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
    
    if (stream && enableAudio) {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      isActive = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stream, enableAudio]);

  // Auto-show lesson form when recording stops or file is selected
  useEffect(() => {
    if ((recordedVideo || selectedFile) && !showLessonForm) {
      setShowLessonForm(true);
      setShowPreview(true);
    }
  }, [recordedVideo, selectedFile, showLessonForm]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setErrorMessage('Please select a valid video file.');
        return;
      }
      
      if (file.size > 1024 * 1024 * 1024) {
        setErrorMessage('Video file must be less than 1GB.');
        return;
      }

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
    try {
      setRecordingTime(0);
      setRecordingDuration(0);
      setUploadSuccess(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      
      if (!stream) {
        shouldStartAfterInit.current = true;
        await initializeCamera();
      } else {
        await startCountdownAndRecording();
      }
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setErrorMessage(error.message || 'Failed to start recording.');
      resetRecording();
    }
  };

  const handleStopRecording = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    stopRecording();
  };

  const handlePauseRecording = () => {
    pauseRecording();
    setIsPaused(true);
  };

  const handleResumeRecording = () => {
    resumeRecording();
    setIsPaused(false);
  };

  const handleReset = useCallback(() => {
    console.log('Resetting recorder state');
    
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    
    resetRecording();
    setRecordingTime(0);
    setRecordingDuration(0);
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
    setAutoStopTimer(0);
    
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

  // FIXED: Proper upload handling with blob validation and mimetype preservation
  const handleUpload = async () => {
    if (!selectedCourse || !lessonTitle.trim()) {
      setErrorMessage('Please select a course and enter a lesson title.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setErrorMessage(null);

      // Validate video content before creating lesson
      if (activeTab === 'record' && (!videoBlob || videoBlob.size === 0)) {
        throw new Error('Recorded video is empty or invalid. Please record again.');
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
      setUploadProgress(50);

      let uploadResponse;
      
      if (activeTab === 'record' && videoBlob) {
        console.log('Uploading recorded video blob for lesson:', newLessonId);
        console.log('Video Blob validation:', {
          size: videoBlob.size,
          type: videoBlob.type,
          isBlob: videoBlob instanceof Blob
        });

        // Convert blob to file with proper error handling and mimetype
        const videoFile = blobToFile(videoBlob, `lesson-${newLessonId}-${Date.now()}`);
        
        console.log('Final file details for upload:', {
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type,
          lastModified: videoFile.lastModified
        });

        // Temporary debug - add this right before the upload call
        const debugFormData = new FormData();
        debugFormData.append('video', videoFile);
        debugFormData.append('lessonId', newLessonId);

        console.log('DEBUG - FormData contents:');
        for (let [key, value] of debugFormData.entries()) {
          if (value instanceof File) {
            console.log(`${key}:`, {
              name: value.name,
              size: value.size,
              type: value.type,
              lastModified: value.lastModified
            });
          } else {
            console.log(`${key}:`, value);
          }
        }

        // Double-check the mimetype before upload
        if (!videoFile.type.startsWith('video/')) {
          console.warn('File does not have video mimetype, forcing video/webm');
          // Create a new File with correct mimetype if needed
          const correctedFile = new File([videoFile], videoFile.name, {
            type: 'video/webm',
            lastModified: videoFile.lastModified
          });
          uploadResponse = await videoApi.uploadVideo(
            correctedFile, 
            newLessonId, 
            (progress) => setUploadProgress(50 + (progress / 2))
          );
        } else {
          uploadResponse = await videoApi.uploadVideo(
            videoFile, 
            newLessonId, 
            (progress) => setUploadProgress(50 + (progress / 2))
          );
        }
      } else if (activeTab === 'upload' && selectedFile) {
        console.log('Uploading selected file for lesson:', newLessonId);
        
        // Validate selected file mimetype
        if (!selectedFile.type.startsWith('video/')) {
          throw new Error('Selected file is not a valid video format');
        }
        
        uploadResponse = await videoApi.uploadVideo(
          selectedFile, 
          newLessonId, 
          (progress) => setUploadProgress(50 + (progress / 2))
        );
      } else {
        throw new Error('No valid video content to upload');
      }

      setUploadProgress(100);
      setUploadSuccess(true);
      setSuccessMessage('Video uploaded successfully!');
      
      // Get the proper video URL from the upload response
      const videoUrl = uploadResponse.data.videoUrl;
      console.log('Upload successful. Video URL:', videoUrl);
      
      onRecordingComplete?.(videoUrl);
      onUploadComplete?.(newLessonId, videoUrl);

      setTimeout(() => {
        handleReset();
      }, 3000);

    } catch (error: any) {
      console.error('Upload failed:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Upload failed. Please try again.');
      setUploading(false);
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
    }
  };

  const getFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // FIX: Handle tab change - close camera when switching to upload tab
  const handleTabChange = (tab: 'record' | 'upload') => {
    if (activeTab === 'record' && tab === 'upload') {
      // Close camera when switching to upload tab
      closeCamera();
    }
    setActiveTab(tab);
  };

  if (coursesLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-lg">
        <Loader className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Loading Courses</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-lg">
        <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Error</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Video className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Create Video Lesson</h3>
          </div>
          <div className="flex items-center space-x-2">
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

      {showAdvancedSettings && (
        <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Advanced Settings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recording Quality
              </label>
              <select
                value={recordingQuality}
                onChange={(e) => setRecordingQuality(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="480p">480p (SD)</option>
                <option value="720p">720p (HD)</option>
                <option value="1080p">1080p (Full HD)</option>
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

      <div className="relative bg-black aspect-video">
        {activeTab === 'record' ? (
          stream && !recordedVideo ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : !recordedVideo ? (
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
                  <button onClick={handlePreviewPlay} className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    {isPlaying ? <Pause className="h-8 w-8 text-white" /> : <PlayCircle className="h-8 w-8 text-white" />}
                  </button>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {filePreview ? (
              <video src={filePreview} className="w-full h-full object-cover" controls />
            ) : (
              <div className="text-center p-8">
                <Cloud className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Video File</h3>
                <p className="text-gray-600 text-sm mb-4">Supported formats: MP4, WebM, MOV</p>
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
        )}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-white text-6xl font-bold">{countdown}</div>
          </div>
        )}

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

        {/* Audio Level Indicator */}
        {isRecording && enableAudio && (
          <div className="absolute top-4 right-4 bg-black/50 rounded-full p-2">
            <div className="flex items-center space-x-1">
              <Mic className={`h-4 w-4 ${micLevel > 0.1 ? 'text-green-400' : 'text-gray-400'}`} />
              <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-400 transition-all duration-100"
                  style={{ width: `${micLevel * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'record' && !recordedVideo && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            {!isRecording ? (
              <button 
                onClick={handleStartRecording} 
                disabled={countdown !== null}
                className="flex items-center space-x-3 px-8 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                <Circle className="h-6 w-6" />
                <span className="font-semibold">
                  {countdown !== null ? `Starting...` : 'Start Recording'}
                </span>
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <button 
                  onClick={isPaused ? handleResumeRecording : handlePauseRecording} 
                  className="p-4 bg-yellow-500 text-white rounded-2xl hover:bg-yellow-600 transition-colors"
                >
                  {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                </button>
                <button 
                  onClick={handleStopRecording} 
                  className="p-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-colors"
                >
                  <Square className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        )}

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

      {/* Recording Stats */}
      {activeTab === 'record' && recordedVideo && videoBlob && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Duration: {formatTime(recordingDuration)}</span>
              <span>Size: {getFileSize(videoBlob.size)}</span>
              <span>Quality: {recordingQuality}</span>
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
    </div>
  );
};

export default VideoRecorder;