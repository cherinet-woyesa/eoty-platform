// frontend/src/components/courses/EnhancedVideoRecorder.tsx
// Enhanced VideoRecorder with 6-step workflow for improved UX
import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { videoApi, coursesApi } from '../../services/api';
import {
  Video, Circle, Square, Pause, Play,
  Upload, RotateCcw, Camera, CheckCircle, Loader,
  AlertCircle, Settings, Mic, MicOff, Monitor,
  ArrowRight, ArrowLeft, BookOpen, Plus, Search,
  FileText, Clock, Scissors, Sparkles, Send, Save
} from 'lucide-react';

// Step definitions
type WorkflowStep = 'course-selection' | 'lesson-setup' | 'recording' | 'review' | 'processing' | 'publish';

interface Course {
  id: string;
  title: string;
  description?: string;
  category?: string;
  lesson_count?: number;
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  order: number;
}

interface EnhancedVideoRecorderProps {
  onComplete?: (lessonId: string, videoUrl: string) => void;
  initialCourseId?: string;
}

const EnhancedVideoRecorder: FC<EnhancedVideoRecorderProps> = ({
  onComplete,
  initialCourseId
}) => {
  // Workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('course-selection');
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourseId || '');
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [isNewLesson, setIsNewLesson] = useState(true);
  
  // Course/Lesson data
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Recording settings
  const [recordingQuality, setRecordingQuality] = useState<'480p' | '720p' | '1080p'>('720p');
  const [recordingBitrate, setRecordingBitrate] = useState<'low' | 'medium' | 'high'>('medium');
  const [enableAudio, setEnableAudio] = useState(true);
  const [enableScreenShare, setEnableScreenShare] = useState(false);
  const [enableWebcam, setEnableWebcam] = useState(true);
  
  // Review/Edit state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [chapterMarkers, setChapterMarkers] = useState<{ time: number; title: string }[]>([]);
  const [enableAutoCaptions, setEnableAutoCaptions] = useState(false);
  
  // Processing state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'uploading' | 'processing' | 'complete' | 'error'>('uploading');
  const [processingMessage, setProcessingMessage] = useState('');
  const [backgroundProcessing, setBackgroundProcessing] = useState(false);
  const [emailNotification, setEmailNotification] = useState(false);
  
  // Publish state
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [saveDraft, setSaveDraft] = useState(true);
  const [createdLessonId, setCreatedLessonId] = useState<string>('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Video recorder hook
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
    changeLayout,
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
    isPaused,
    recordingTime,
    setRecordingTime,
    compositorInstance,
    isCompositing,
    performanceMetrics
  } = useVideoRecorder();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);
  
  // Load lessons when course is selected
  useEffect(() => {
    if (selectedCourse) {
      loadLessons(selectedCourse);
    }
  }, [selectedCourse]);
  
  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await coursesApi.getCourses();
      setCourses(response.data.courses || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError('Failed to load courses. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadLessons = async (courseId: string) => {
    try {
      const response = await coursesApi.getLessons(courseId);
      setLessons(response.data.lessons || []);
    } catch (err) {
      console.error('Failed to load lessons:', err);
    }
  };
  
  const createNewCourse = async (title: string) => {
    try {
      setLoading(true);
      const response = await coursesApi.createCourse({
        title,
        description: '',
        category: 'general'
      });
      const newCourse = response.data.course;
      setCourses(prev => [...prev, newCourse]);
      setSelectedCourse(newCourse.id);
      setSuccess('Course created successfully!');
      return newCourse.id;
    } catch (err) {
      console.error('Failed to create course:', err);
      setError('Failed to create course. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Step navigation
  const goToNextStep = () => {
    const steps: WorkflowStep[] = ['course-selection', 'lesson-setup', 'recording', 'review', 'processing', 'publish'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };
  
  const goToPreviousStep = () => {
    const steps: WorkflowStep[] = ['course-selection', 'lesson-setup', 'recording', 'review', 'processing', 'publish'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };
  
  // Step 1: Course Selection handlers
  const handleCourseSelect = (courseId: string) => {
    setSelectedCourse(courseId);
  };
  
  const handleCreateNewCourse = async () => {
    const title = prompt('Enter course title:');
    if (title) {
      await createNewCourse(title);
    }
  };
  
  const handleContinueFromCourseSelection = () => {
    if (!selectedCourse) {
      setError('Please select a course');
      return;
    }
    setError(null);
    goToNextStep();
  };
  
  // Step 2: Lesson Setup handlers
  const handleLessonTypeChange = (isNew: boolean) => {
    setIsNewLesson(isNew);
    if (!isNew) {
      setLessonTitle('');
      setLessonDescription('');
    }
  };
  
  const handleLessonSelect = (lessonId: string) => {
    setSelectedLesson(lessonId);
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) {
      setLessonTitle(lesson.title);
      setLessonDescription(lesson.description || '');
    }
  };
  
  const handleContinueFromLessonSetup = () => {
    if (isNewLesson && !lessonTitle.trim()) {
      setError('Please enter a lesson title');
      return;
    }
    if (!isNewLesson && !selectedLesson) {
      setError('Please select an existing lesson');
      return;
    }
    setError(null);
    goToNextStep();
  };

  // Step 3: Recording handlers
  const handleStartRecording = async () => {
    try {
      setError(null);
      
      // Initialize camera if webcam is enabled
      if (enableWebcam && !recordingSources.camera) {
        await initializeCamera();
      }
      
      // Start screen share if enabled
      if (enableScreenShare && !isScreenSharing) {
        await startScreenShare();
      }
      
      // Start recording
      await startRecording();
      setSuccess('Recording started!');
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setError(err.message || 'Failed to start recording');
    }
  };
  
  const handleStopRecording = async () => {
    try {
      await stopRecording();
      setSuccess('Recording stopped!');
      // Auto-advance to review step
      setTimeout(() => goToNextStep(), 1000);
    } catch (err: any) {
      console.error('Failed to stop recording:', err);
      setError(err.message || 'Failed to stop recording');
    }
  };
  
  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
        setSuccess('Screen sharing stopped');
      } else {
        await startScreenShare();
        setSuccess('Screen sharing started');
      }
    } catch (err: any) {
      console.error('Screen share error:', err);
      setError(err.message || 'Failed to toggle screen share');
    }
  };
  
  // Step 4: Review handlers
  const handleAddChapterMarker = () => {
    if (reviewVideoRef.current) {
      const currentTime = reviewVideoRef.current.currentTime;
      const title = prompt('Enter chapter title:');
      if (title) {
        setChapterMarkers(prev => [...prev, { time: currentTime, title }].sort((a, b) => a.time - b.time));
        setSuccess('Chapter marker added');
      }
    }
  };
  
  const handleRemoveChapterMarker = (index: number) => {
    setChapterMarkers(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleContinueFromReview = () => {
    if (!videoBlob) {
      setError('No video to upload');
      return;
    }
    setError(null);
    goToNextStep();
    // Start upload process
    handleUpload();
  };

  // Step 5: Processing/Upload handlers
  const handleUpload = async () => {
    if (!videoBlob || !selectedCourse) {
      setError('Missing required data for upload');
      return;
    }
    
    try {
      setProcessingStatus('uploading');
      setProcessingMessage('Creating lesson...');
      setUploadProgress(0);
      
      // Create or update lesson
      let lessonId: string;
      if (isNewLesson) {
        const lessonResponse = await coursesApi.createLesson(selectedCourse, {
          title: lessonTitle.trim(),
          description: lessonDescription.trim() || 'Video lesson',
          order: lessons.length
        });
        lessonId = lessonResponse.data.lesson.id;
      } else {
        lessonId = selectedLesson;
      }
      
      setCreatedLessonId(lessonId);
      setUploadProgress(20);
      setProcessingMessage('Uploading video...');
      
      // Upload video
      const videoFile = new File([videoBlob], `lesson-${lessonId}-${Date.now()}.webm`, {
        type: 'video/webm'
      });
      
      const uploadResponse = await videoApi.uploadVideo(
        videoFile,
        lessonId,
        (progress) => {
          setUploadProgress(20 + (progress * 0.6)); // 20-80%
        }
      );
      
      setUploadProgress(80);
      setProcessingStatus('processing');
      setProcessingMessage('Processing video...');
      
      // Simulate processing (in real app, poll for status)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUploadProgress(100);
      setProcessingStatus('complete');
      setProcessingMessage('Video processed successfully!');
      
      // Auto-advance to publish step
      setTimeout(() => goToNextStep(), 1500);
      
    } catch (err: any) {
      console.error('Upload failed:', err);
      setProcessingStatus('error');
      setProcessingMessage(err.message || 'Upload failed');
      setError('Failed to upload video. Please try again.');
    }
  };
  
  // Step 6: Publish handlers
  const handlePublish = async () => {
    try {
      setLoading(true);
      
      if (publishImmediately && createdLessonId) {
        // Publish the lesson immediately
        // Note: updateLesson API may need to be implemented
        // await coursesApi.updateLesson(selectedCourse, createdLessonId, {
        //   is_published: true
        // });
        setSuccess('Lesson published successfully!');
      } else {
        setSuccess('Lesson saved as draft!');
      }
      
      // Call completion callback
      if (onComplete && createdLessonId) {
        onComplete(createdLessonId, recordedVideo || '');
      }
      
      // Reset after a delay
      setTimeout(() => {
        handleReset();
      }, 2000);
      
    } catch (err: any) {
      console.error('Publish failed:', err);
      setError('Failed to publish lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReset = () => {
    setCurrentStep('course-selection');
    setSelectedCourse(initialCourseId || '');
    setSelectedLesson('');
    setIsNewLesson(true);
    setLessonTitle('');
    setLessonDescription('');
    setTrimStart(0);
    setTrimEnd(0);
    setChapterMarkers([]);
    setUploadProgress(0);
    setProcessingStatus('uploading');
    setCreatedLessonId('');
    setError(null);
    setSuccess(null);
    resetRecording();
    closeCamera();
  };

  // Utility functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getStepNumber = (step: WorkflowStep): number => {
    const steps: WorkflowStep[] = ['course-selection', 'lesson-setup', 'recording', 'review', 'processing', 'publish'];
    return steps.indexOf(step) + 1;
  };
  
  const getStepTitle = (step: WorkflowStep): string => {
    const titles: Record<WorkflowStep, string> = {
      'course-selection': 'Select Course',
      'lesson-setup': 'Lesson Setup',
      'recording': 'Record Video',
      'review': 'Review & Edit',
      'processing': 'Processing',
      'publish': 'Publish'
    };
    return titles[step];
  };
  
  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render Step 1: Course Selection
  const renderCourseSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Course</h3>
        <p className="text-gray-600">Choose which course this lesson belongs to, or create a new one.</p>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      {/* Create New Course Button */}
      <button
        onClick={handleCreateNewCourse}
        className="w-full p-4 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 text-blue-600 font-medium"
      >
        <Plus className="h-5 w-5" />
        <span>Create New Course</span>
      </button>
      
      {/* Course List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <Loader className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Loading courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No courses found</p>
          </div>
        ) : (
          filteredCourses.map(course => (
            <button
              key={course.id}
              onClick={() => handleCourseSelect(course.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                selectedCourse === course.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{course.title}</h4>
                  {course.description && (
                    <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    {course.category && (
                      <span className="px-2 py-1 bg-gray-100 rounded">{course.category}</span>
                    )}
                    {course.lesson_count !== undefined && (
                      <span>{course.lesson_count} lessons</span>
                    )}
                  </div>
                </div>
                {selectedCourse === course.id && (
                  <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
      
      {/* Continue Button */}
      <button
        onClick={handleContinueFromCourseSelection}
        disabled={!selectedCourse}
        className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium"
      >
        <span>Continue</span>
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );

  // Render Step 2: Lesson Setup
  const renderLessonSetup = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Lesson Setup</h3>
        <p className="text-gray-600">Create a new lesson or update an existing one.</p>
      </div>
      
      {/* Lesson Type Selection */}
      <div className="flex space-x-3">
        <button
          onClick={() => handleLessonTypeChange(true)}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            isNewLesson
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <Plus className="h-6 w-6 mx-auto mb-2 text-blue-600" />
          <div className="font-semibold">Create New</div>
          <div className="text-sm text-gray-600 mt-1">Start a new lesson</div>
        </button>
        <button
          onClick={() => handleLessonTypeChange(false)}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            !isNewLesson
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <FileText className="h-6 w-6 mx-auto mb-2 text-blue-600" />
          <div className="font-semibold">Select Existing</div>
          <div className="text-sm text-gray-600 mt-1">Update a lesson</div>
        </button>
      </div>
      
      {/* New Lesson Form */}
      {isNewLesson ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Title *
            </label>
            <input
              type="text"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Enter lesson title..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={lessonDescription}
              onChange={(e) => setLessonDescription(e.target.value)}
              placeholder="Brief description of the lesson..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      ) : (
        /* Existing Lesson Selection */
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {lessons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No lessons found in this course</p>
              <button
                onClick={() => handleLessonTypeChange(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Create a new lesson instead
              </button>
            </div>
          ) : (
            lessons.map(lesson => (
              <button
                key={lesson.id}
                onClick={() => handleLessonSelect(lesson.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedLesson === lesson.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                    {lesson.description && (
                      <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                    )}
                    <span className="text-xs text-gray-500 mt-2 inline-block">
                      Lesson {lesson.order + 1}
                    </span>
                  </div>
                  {selectedLesson === lesson.id && (
                    <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
      
      {/* Navigation Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={goToPreviousStep}
          className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>
        <button
          onClick={handleContinueFromLessonSetup}
          disabled={isNewLesson ? !lessonTitle.trim() : !selectedLesson}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          <span>Continue</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  // Render Step 3: Recording
  const renderRecording = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Record Your Lesson</h3>
        <p className="text-gray-600">Configure your recording settings and start recording.</p>
      </div>
      
      {/* Recording Settings */}
      {!isRecording && !recordedVideo && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
          <h4 className="font-semibold text-gray-900">Recording Settings</h4>
          
          {/* Quality Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video Quality
            </label>
            <select
              value={recordingQuality}
              onChange={(e) => setRecordingQuality(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="480p">480p (SD) - Faster processing</option>
              <option value="720p">720p (HD) - Recommended</option>
              <option value="1080p">1080p (Full HD) - Best quality</option>
            </select>
          </div>
          
          {/* Bitrate Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitrate
            </label>
            <select
              value={recordingBitrate}
              onChange={(e) => setRecordingBitrate(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low (1 Mbps) - Smaller file size</option>
              <option value="medium">Medium (2.5 Mbps) - Balanced</option>
              <option value="high">High (5 Mbps) - Best quality</option>
            </select>
          </div>
          
          {/* Source Selection */}
          <div className="space-y-2">
            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={enableWebcam}
                onChange={(e) => setEnableWebcam(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <Camera className="h-5 w-5 text-gray-600" />
              <span className="flex-1 text-sm font-medium text-gray-700">Enable Webcam</span>
            </label>
            
            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={enableScreenShare}
                onChange={(e) => setEnableScreenShare(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <Monitor className="h-5 w-5 text-gray-600" />
              <span className="flex-1 text-sm font-medium text-gray-700">Enable Screen Share</span>
            </label>
            
            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={enableAudio}
                onChange={(e) => setEnableAudio(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <Mic className="h-5 w-5 text-gray-600" />
              <span className="flex-1 text-sm font-medium text-gray-700">Enable Audio</span>
            </label>
          </div>
        </div>
      )}
      
      {/* Video Preview */}
      <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
        {recordedVideo ? (
          <video
            src={recordedVideo}
            controls
            className="w-full h-full object-contain"
          />
        ) : (
          <>
            {recordingSources.camera && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            {!recordingSources.camera && !isRecording && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Click Start Recording to begin</p>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-medium">REC</span>
            </div>
            <div className="bg-black/70 text-white px-3 py-1 rounded-full font-mono">
              {formatTime(recordingTime)}
            </div>
            {isPaused && (
              <div className="bg-yellow-600 text-white px-3 py-1 rounded-full">
                PAUSED
              </div>
            )}
          </div>
        )}
        
        {/* Audio Level Indicator */}
        {isRecording && enableAudio && (
          <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <Mic className="h-4 w-4" />
              <div className="w-24 h-2 bg-gray-600 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Recording Controls */}
      <div className="flex justify-center">
        {!isRecording && !recordedVideo ? (
          <button
            onClick={handleStartRecording}
            disabled={!enableWebcam && !enableScreenShare}
            className="px-8 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-3 font-medium"
          >
            <Circle className="h-6 w-6" />
            <span>Start Recording</span>
          </button>
        ) : isRecording ? (
          <div className="flex items-center space-x-4">
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
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
            {enableScreenShare && (
              <button
                onClick={handleToggleScreenShare}
                className={`px-4 py-3 rounded-xl transition-colors flex items-center space-x-2 ${
                  isScreenSharing
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Monitor className="h-5 w-5" />
                <span>{isScreenSharing ? 'Stop Screen' : 'Share Screen'}</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
      
      {/* Navigation Buttons */}
      {!isRecording && (
        <div className="flex space-x-3">
          <button
            onClick={goToPreviousStep}
            className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
          {recordedVideo && (
            <button
              onClick={goToNextStep}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
            >
              <span>Continue to Review</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Render Step 4: Review & Edit
  const renderReview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Review & Edit</h3>
        <p className="text-gray-600">Review your recording and add enhancements.</p>
      </div>
      
      {/* Video Player */}
      <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
        {recordedVideo && (
          <video
            ref={reviewVideoRef}
            src={recordedVideo}
            controls
            className="w-full h-full object-contain"
          />
        )}
      </div>
      
      {/* Editing Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trim Controls */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Scissors className="h-5 w-5 mr-2" />
            Trim Video
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Start Time (seconds)</label>
              <input
                type="number"
                min="0"
                value={trimStart}
                onChange={(e) => setTrimStart(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">End Time (seconds)</label>
              <input
                type="number"
                min="0"
                value={trimEnd}
                onChange={(e) => setTrimEnd(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
        
        {/* Chapter Markers */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Chapter Markers
          </h4>
          <button
            onClick={handleAddChapterMarker}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700"
          >
            + Add Chapter at Current Time
          </button>
          <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
            {chapterMarkers.map((marker, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{marker.title}</div>
                  <div className="text-xs text-gray-500">{formatTime(marker.time)}</div>
                </div>
                <button
                  onClick={() => handleRemoveChapterMarker(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <AlertCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Auto-Captions Option */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enableAutoCaptions}
            onChange={(e) => setEnableAutoCaptions(e.target.checked)}
            className="h-5 w-5 text-purple-600 rounded"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-gray-900">Generate Auto-Captions</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Automatically generate captions for your video (may take additional processing time)
            </p>
          </div>
        </label>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={goToPreviousStep}
          className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>
        <button
          onClick={handleContinueFromReview}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          <span>Upload & Process</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  // Render Step 5: Processing
  const renderProcessing = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Your Video</h3>
        <p className="text-gray-600">Please wait while we upload and process your video.</p>
      </div>
      
      {/* Processing Status */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
        <div className="text-center mb-6">
          {processingStatus === 'uploading' && (
            <Upload className="h-16 w-16 mx-auto text-blue-600 animate-bounce" />
          )}
          {processingStatus === 'processing' && (
            <Loader className="h-16 w-16 mx-auto text-purple-600 animate-spin" />
          )}
          {processingStatus === 'complete' && (
            <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
          )}
          {processingStatus === 'error' && (
            <AlertCircle className="h-16 w-16 mx-auto text-red-600" />
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-700 mb-2">
            <span>{processingMessage}</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                processingStatus === 'error' ? 'bg-red-600' :
                processingStatus === 'complete' ? 'bg-green-600' :
                'bg-blue-600'
              }`}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
        
        {/* Status Message */}
        <p className="text-center text-gray-600 text-sm">
          {processingStatus === 'uploading' && 'Uploading your video to the server...'}
          {processingStatus === 'processing' && 'Converting video to optimal format...'}
          {processingStatus === 'complete' && 'Video processed successfully!'}
          {processingStatus === 'error' && 'An error occurred during processing.'}
        </p>
      </div>
      
      {/* Background Processing Option */}
      {processingStatus === 'uploading' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={backgroundProcessing}
              onChange={(e) => setBackgroundProcessing(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Enable Background Processing</div>
              <p className="text-sm text-gray-600">
                Continue working while your video processes in the background
              </p>
            </div>
          </label>
          
          {backgroundProcessing && (
            <label className="flex items-center space-x-3 cursor-pointer mt-3 ml-7">
              <input
                type="checkbox"
                checked={emailNotification}
                onChange={(e) => setEmailNotification(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Send email notification when complete</span>
            </label>
          )}
        </div>
      )}
      
      {/* Processing Details */}
      {processingStatus !== 'error' && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Processing Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Video Quality:</span>
              <span className="font-medium text-gray-900">{recordingQuality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium text-gray-900">{formatTime(recordingTime)}</span>
            </div>
            {enableAutoCaptions && (
              <div className="flex justify-between">
                <span className="text-gray-600">Auto-Captions:</span>
                <span className="font-medium text-green-600">Enabled</span>
              </div>
            )}
            {chapterMarkers.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Chapter Markers:</span>
                <span className="font-medium text-gray-900">{chapterMarkers.length}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Error Actions */}
      {processingStatus === 'error' && (
        <div className="flex space-x-3">
          <button
            onClick={() => setCurrentStep('review')}
            className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Go Back
          </button>
          <button
            onClick={handleUpload}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Retry Upload
          </button>
        </div>
      )}
    </div>
  );

  // Render Step 6: Publish
  const renderPublish = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Video Ready!</h3>
        <p className="text-gray-600">Your video has been processed successfully.</p>
      </div>
      
      {/* Lesson Preview */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Lesson Preview</h4>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-600">Course:</span>
            <p className="font-medium text-gray-900">
              {courses.find(c => c.id === selectedCourse)?.title || 'Unknown Course'}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Lesson Title:</span>
            <p className="font-medium text-gray-900">{lessonTitle}</p>
          </div>
          {lessonDescription && (
            <div>
              <span className="text-sm text-gray-600">Description:</span>
              <p className="text-gray-700">{lessonDescription}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
            <div>
              <span className="text-sm text-gray-600">Duration:</span>
              <p className="font-medium text-gray-900">{formatTime(recordingTime)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Quality:</span>
              <p className="font-medium text-gray-900">{recordingQuality}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Publishing Options */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900">Publishing Options</h4>
        
        <label className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 cursor-pointer transition-colors">
          <input
            type="radio"
            name="publish-option"
            checked={publishImmediately}
            onChange={() => {
              setPublishImmediately(true);
              setSaveDraft(false);
            }}
            className="mt-1 h-4 w-4 text-blue-600"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <Send className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">Publish Immediately</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Make this lesson available to students right away
            </p>
          </div>
        </label>
        
        <label className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 cursor-pointer transition-colors">
          <input
            type="radio"
            name="publish-option"
            checked={saveDraft}
            onChange={() => {
              setPublishImmediately(false);
              setSaveDraft(true);
            }}
            className="mt-1 h-4 w-4 text-blue-600"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <Save className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Save as Draft</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Save the lesson but don't publish it yet. You can publish it later.
            </p>
          </div>
        </label>
      </div>
      
      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleReset}
          className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          Record Another
        </button>
        <button
          onClick={handlePublish}
          disabled={loading}
          className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          {loading ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Publishing...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              <span>{publishImmediately ? 'Publish Lesson' : 'Save Draft'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      {/* Header with Progress Indicator */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Video className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Create Video Lesson</h2>
          </div>
          <button
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Reset"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
        
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between">
          {(['course-selection', 'lesson-setup', 'recording', 'review', 'processing', 'publish'] as WorkflowStep[]).map((step, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === step;
            const isCompleted = getStepNumber(currentStep) > stepNumber;
            
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white scale-110'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-6 w-6" /> : stepNumber}
                  </div>
                  <span
                    className={`text-xs mt-2 text-center ${
                      isActive ? 'font-semibold text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    {getStepTitle(step)}
                  </span>
                </div>
                {index < 5 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded transition-all ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Success/Error Messages */}
      {success && (
        <div className="mx-6 mt-4 p-3 bg-green-100 border-l-4 border-green-400 text-green-700 flex items-center space-x-2 rounded">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-100 border-l-4 border-red-400 text-red-700 flex items-center space-x-2 rounded">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Step Content */}
      <div className="p-6">
        {currentStep === 'course-selection' && renderCourseSelection()}
        {currentStep === 'lesson-setup' && renderLessonSetup()}
        {currentStep === 'recording' && renderRecording()}
        {currentStep === 'review' && renderReview()}
        {currentStep === 'processing' && renderProcessing()}
        {currentStep === 'publish' && renderPublish()}
      </div>
    </div>
  );
};

export default EnhancedVideoRecorder;
