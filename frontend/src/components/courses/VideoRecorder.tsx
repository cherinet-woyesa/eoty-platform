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
  const shouldStartAfterInit = useRef(false);

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
    } catch (error: any) {
      console.error('Error during countdown or recording start:', error);
      setErrorMessage(error.message || 'Failed to start recording.');
      resetRecording();
    }
  }, [startRecording, resetRecording]);

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
    
    if (stream) {
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
  }, [stream]);

  // Recording timer with cleanup
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
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
      if (analyser) {
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
    
    if (stream) {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      isActive = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stream]);

  // Auto-show lesson form when recording stops or file is selected
  useEffect(() => {
    if ((recordedVideo || selectedFile) && !showLessonForm) {
      setShowLessonForm(true);
      setShowPreview(true);
    }
  }, [recordedVideo, selectedFile, showLessonForm]);

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
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

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

      const lessonResponse = await coursesApi.createLesson(selectedCourse, {
        title: lessonTitle.trim(),
        description: lessonDescription.trim() || 'Video lesson',
        order: 0
      });

      const newLessonId = lessonResponse.data.lesson.id;
      setUploadProgress(50);

      let videoUrl: string;

      if (activeTab === 'record' && videoBlob) {
        const videoFile = blobToFile(videoBlob, `lesson-${newLessonId}.webm`);
        const uploadResponse = await videoApi.uploadVideo(videoFile, newLessonId);
        videoUrl = uploadResponse.data.videoUrl;
      } else if (activeTab === 'upload' && selectedFile) {
        const uploadResponse = await videoApi.uploadVideo(selectedFile, newLessonId);
        videoUrl = uploadResponse.data.videoUrl;
      } else {
        throw new Error('No video content to upload');
      }

      setUploadProgress(100);
      setUploadSuccess(true);
      setSuccessMessage('Video uploaded successfully!');
      
      onRecordingComplete?.(videoUrl);
      onUploadComplete?.(newLessonId, videoUrl);

      setTimeout(() => {
        handleReset();
      }, 3000);

    } catch (error: any) {
      console.error('Upload failed:', error);
      setErrorMessage(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRecording = () => {
    if (confirm('Are you sure you want to delete this recording?')) {
      handleReset();
    }
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
            <Video className="h-5 w-5 text-white" />
            <h3 className="text-lg font-bold text-gray-900">Create Video Lesson</h3>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        <div className="flex space-x-1 mt-4 bg-white rounded-xl p-1 border">
          <button
            onClick={() => setActiveTab('record')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all ${activeTab === 'record' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
            Record Live
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
            Upload Video
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="px-6 py-4 border-b">
          {/* Settings UI */}
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
                    {isPlaying ? <Pause /> : <PlayCircle />}
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
                <Cloud className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Upload Video File</h3>
                <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="mt-4 px-6 py-3 border rounded-xl bg-blue-600 text-white">
                  Choose Video File
                </button>
              </div>
            )}
          </div>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-white text-4xl font-bold">{countdown}</div>
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
          </div>
        )}

        {activeTab === 'record' && !recordedVideo && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            {!isRecording ? (
              <button onClick={handleStartRecording} disabled={countdown !== null} className="flex items-center space-x-3 px-8 py-4 bg-red-600 text-white rounded-2xl">
                <Circle />
                <span>{countdown !== null ? `Starting...` : 'Start Recording'}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <button onClick={isPaused ? handleResumeRecording : handlePauseRecording} className="p-4 bg-yellow-500 text-white rounded-2xl">
                  {isPaused ? <Play /> : <Pause />}
                </button>
                <button onClick={handleStopRecording} className="p-4 bg-red-600 text-white rounded-2xl">
                  <Square />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'record' && recordedVideo && showPreview && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-4">
            <button onClick={handlePreviewPlay} className="p-3 bg-white/20 text-white rounded-xl">
              {isPlaying ? <Pause /> : <Play />}
            </button>
            <button onClick={handleMuteToggle} className="p-3 bg-white/20 text-white rounded-xl">
              {isMuted ? <VolumeX /> : <Volume2 />}
            </button>
            <button onClick={handleDeleteRecording} className="p-3 bg-red-600/80 text-white rounded-xl">
              <Trash2 />
            </button>
          </div>
        )}
      </div>

      {successMessage && <div className="p-3 bg-green-100 border-l-4 border-green-400 text-green-700">{successMessage}</div>}
      {errorMessage && <div className="p-3 bg-red-100 border-l-4 border-red-400 text-red-700">{errorMessage}</div>}

      {uploading && (
        <div className="p-4 bg-blue-50">
          <div className="flex justify-between mb-1">
            <span>Uploading...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {showLessonForm && (recordedVideo || selectedFile) && (
        <div className="p-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Save Your {activeTab === 'record' ? 'Recording' : 'Video'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Course *</label>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full p-3 border rounded-xl" disabled={uploading}>
                <option value="">Choose a course...</option>
                {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lesson Title *</label>
              <input type="text" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="Enter lesson title..." className="w-full p-3 border rounded-xl" disabled={uploading} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <textarea value={lessonDescription} onChange={(e) => setLessonDescription(e.target.value)} placeholder="Brief description..." rows={3} className="w-full p-3 border rounded-xl" disabled={uploading} />
            </div>
            <div className="flex space-x-3">
              <button onClick={handleReset} disabled={uploading} className="flex-1 px-4 py-3 border rounded-xl bg-gray-100 hover:bg-gray-200">
                {activeTab === 'record' ? 'Record Again' : 'Upload New'}
              </button>
              <button onClick={handleUpload} disabled={uploading || uploadSuccess || !selectedCourse || !lessonTitle.trim()} className="flex-1 px-4 py-3 border rounded-xl bg-blue-600 text-white disabled:opacity-50">
                {uploading ? 'Uploading...' : uploadSuccess ? 'Uploaded!' : 'Save Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
