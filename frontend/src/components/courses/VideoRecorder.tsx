import React, { useState, useRef, useEffect } from 'react';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { videoApi, coursesApi } from '../../services/api';
import { 
  Video, Circle, Square, Pause, Play, 
  Upload, RotateCcw, Camera, BookOpen,
  CheckCircle, X, Loader
} from 'lucide-react';

interface VideoRecorderProps {
  onRecordingComplete?: (videoUrl: string) => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onRecordingComplete }) => {
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
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [showLessonForm, setShowLessonForm] = useState(false);

  // Load teacher's courses
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await coursesApi.getCourses();
        setCourses(response.data.courses || []);
      } catch (error) {
        console.error('Failed to load courses:', error);
      }
    };
    loadCourses();
  }, []);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const handleStartRecording = async () => {
    setRecordingTime(0);
    setUploadSuccess(false);
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    setShowLessonForm(true);
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
    setLessonTitle('');
    setSelectedCourse('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = async () => {
    if (!videoBlob || !selectedCourse || !lessonTitle) {
      alert('Please select a course and enter a lesson title');
      return;
    }

    try {
      setUploading(true);

      // First create the lesson
      const lessonResponse = await coursesApi.createLesson(selectedCourse, {
        title: lessonTitle,
        description: 'Video lesson recorded from browser',
        order: 0
      });

      const lessonId = lessonResponse.data.lesson.id;

      // Then upload the video
      const uploadResponse = await videoApi.uploadVideo(videoBlob, lessonId);

      setUploadSuccess(true);
      onRecordingComplete?.(uploadResponse.data.videoUrl);

      // Reset form after successful upload
      setTimeout(() => {
        handleReset();
      }, 2000);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
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
        <button
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
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
          <video
            src={recordedVideo}
            controls
            className="w-full h-full"
          />
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium">{formatTime(recordingTime)}</span>
            {isPaused && (
              <span className="text-yellow-300 font-medium">PAUSED</span>
            )}
          </div>
        )}

        {/* Recording Controls */}
        {!recordedVideo && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors duration-200"
              >
                <Circle className="h-5 w-5" />
                <span>Start Recording</span>
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={isPaused ? handleResumeRecording : handlePauseRecording}
                  className="p-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl transition-colors duration-200"
                >
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </button>
                <button
                  onClick={handleStopRecording}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors duration-200"
                >
                  <Square className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lesson Form */}
      {showLessonForm && recordedVideo && (
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Your Recording</h3>
          
          <div className="space-y-4">
            {/* Course Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                Lesson Title
              </label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Enter lesson title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Record Again
              </button>
              
              <button
                onClick={handleUpload}
                disabled={uploading || uploadSuccess || !selectedCourse || !lessonTitle}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
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
            <Camera className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Ready to Record</h4>
              <p className="text-sm text-gray-600 mt-1">
                Click "Start Recording" to begin your video lesson. Make sure you have good lighting and audio quality.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;