import { useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { videoApi, coursesApi } from '../../services/api';
import { 
  Video, Circle, Square, Pause, Play, 
  Upload, RotateCcw, Camera,
  CheckCircle, Loader, AlertCircle, 
  Settings, Eye, EyeOff, Trash2,
  PlayCircle, Volume2, VolumeX
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
    stream
  } = useVideoRecorder();

  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  
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
  
  // Course/Lesson State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState(courseId || '');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [showLessonForm, setShowLessonForm] = useState(false);
  
  // Error State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load teacher's courses
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await coursesApi.getCourses();
        setCourses(response.data.courses || []);
        if (courseId) {
          setSelectedCourse(courseId);
        }
      } catch (error) {
        console.error('Failed to load courses:', error);
        setErrorMessage('Failed to load courses. Please refresh the page.');
      }
    };
    loadCourses();
  }, [courseId]);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Recording timer
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

  // Auto-show lesson form when recording stops
  useEffect(() => {
    if (recordedVideo && !showLessonForm) {
      setShowLessonForm(true);
      setShowPreview(true);
    }
  }, [recordedVideo, showLessonForm]);

  const handleStartRecording = async () => {
    try {
      setRecordingTime(0);
      setUploadSuccess(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      await startRecording();
    } catch (error) {
      setErrorMessage('Failed to start recording. Please check camera permissions.');
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

  const handleReset = () => {
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
  };

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
        recordedVideoRef.current.play();
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
    if (!videoBlob || !selectedCourse || !lessonTitle.trim()) {
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
        description: lessonDescription.trim() || 'Video lesson created via recording',
        order: 0
      });

      const newLessonId = lessonResponse.data.lesson.id;
      setUploadProgress(50);

      // Then upload the video
      const uploadResponse = await videoApi.uploadVideo(videoBlob, newLessonId);
      
      setUploadProgress(100);
      clearInterval(progressInterval);
      
      setUploadSuccess(true);
      setSuccessMessage('Video uploaded successfully!');
      
      onRecordingComplete?.(uploadResponse.data.videoUrl);
      onUploadComplete?.(newLessonId, uploadResponse.data.videoUrl);

      // Reset form after successful upload
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

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Camera className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Access Required</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <div className="space-y-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </button>
          <p className="text-xs text-gray-500">
            Make sure to allow camera and microphone access when prompted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Video Recorder</h3>
              <p className="text-sm text-gray-600">Create engaging video lessons</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Video Preview/Recording Area */}
      <div className="relative bg-black aspect-video">
        {!recordedVideo ? (
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
            />
            {showPreview && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-center text-white">
                  <button
                    onClick={handlePreviewPlay}
                    className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all duration-200 mb-4"
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
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
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
        {!recordedVideo && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="flex items-center space-x-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <Circle className="h-6 w-6" />
                <span>Start Recording</span>
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <button
                  onClick={isPaused ? handleResumeRecording : handlePauseRecording}
                  className="p-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                </button>
                <button
                  onClick={handleStopRecording}
                  className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <Square className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Video Controls for Recorded Video */}
        {recordedVideo && showPreview && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
            <button
              onClick={handlePreviewPlay}
              className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-xl transition-all duration-200"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              onClick={handleMuteToggle}
              className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-xl transition-all duration-200"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button
              onClick={handleDeleteRecording}
              className="p-3 bg-red-600 bg-opacity-80 hover:bg-opacity-100 text-white rounded-xl transition-all duration-200"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="px-6 py-3 bg-green-50 border-l-4 border-green-400">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="px-6 py-3 bg-red-50 border-l-4 border-red-400">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="px-6 py-4 bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Uploading video...</span>
            <span className="text-sm text-blue-600">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Lesson Form */}
      {showLessonForm && recordedVideo && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Save Your Recording</h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                disabled={uploading}
              >
                <option value="">Choose a course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 resize-none"
                disabled={uploading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleReset}
                disabled={uploading}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Record Again
              </button>
              
              <button
                onClick={handleUpload}
                disabled={uploading || uploadSuccess || !selectedCourse || !lessonTitle.trim()}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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
      {!showLessonForm && !isRecording && !recordedVideo && (
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-start space-x-3">
            <Camera className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Ready to Record</h4>
              <p className="text-sm text-gray-600 mt-1">
                Click "Start Recording" to begin creating your video lesson. Make sure you have good lighting and audio quality.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;