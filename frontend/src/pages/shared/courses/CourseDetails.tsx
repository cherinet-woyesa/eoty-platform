import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesApi, interactiveApi } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/api/apiClient';
import UnifiedVideoPlayer from '@/components/shared/courses/UnifiedVideoPlayer';
import RelatedVideos from '@/components/shared/courses/RelatedVideos';
import LessonPolls from '@/components/shared/courses/LessonPolls';
import QuizButton from '@/components/shared/courses/QuizButton';
import LessonInteractivePanel from '@/components/shared/courses/LessonInteractivePanel';
import LessonTeacherAnalytics from '@/components/shared/courses/LessonTeacherAnalytics';
import UploadResource from '@/pages/teacher/UploadResource';
import { CoursePublisher } from '@/components/shared/courses/CoursePublisher';
import UnifiedResourceView from '@/components/student/UnifiedResourceView';
import { useAuth } from '@/context/AuthContext';
import CourseDetailsSkeleton from '@/components/shared/courses/CourseDetailsSkeleton';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import { brandColors } from '@/theme/brand';
import CourseHeader from '@/components/shared/courses/CourseHeader';
import CourseSidebar from '@/components/shared/courses/CourseSidebar';
import VideoRecorder from '@/components/shared/courses/EnhancedVideoRecorder';
import MuxVideoUploader from '@/components/shared/courses/MuxVideoUploader';
import {
  ArrowLeft, BookOpen, Clock, PlayCircle, Video,
  CheckCircle,
  Download,
  Loader2, Plus, Bot, BarChart3,
  Minimize2, MessageSquare, Activity, AlertCircle,
  Camera, Upload
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  video_provider?: 'mux' | 's3';
  mux_playback_id?: string;
  mux_asset_id?: string;
  mux_status?: string;
  order: number;
  created_at: string;
  duration?: number;
  completed?: boolean;
  progress?: number; // Student's progress (0-1)
  is_completed?: boolean; // Student's completion status
  allow_download?: boolean;
}

interface LessonProgress {
  progress: number;
  is_completed: boolean;
  last_watched_timestamp: number;
  completed_at?: string;
}

type TabType = 'description' | 'resources' | 'polls' | 'discussion' | 'analytics';

const CourseNotFound = React.memo(({ onBack }: { onBack: () => void }) => (
  <div className="text-center py-8 p-8">
    <div>
      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{useTranslation().t('course_details.not_found.title')}</h3>
      <p className="text-gray-600 text-sm mb-4">{useTranslation().t('course_details.not_found.description')}</p>
      <button
        onClick={onBack}
        className="inline-flex items-center px-4 py-2 bg-indigo-900 text-white text-sm rounded-lg border border-indigo-800 hover:bg-indigo-800 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {useTranslation().t('course_details.back_to_courses')}
      </button>
    </div>
  </div>
));

const CourseDetails: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('description');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [courseStats, setCourseStats] = useState({
    totalStudents: 0,
    completionRate: 0,
    averageRating: 0,
    totalLessons: 0,
    completedLessons: 0,
    activeStudents: 0
  });
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [markingComplete, setMarkingComplete] = useState<string | null>(null);
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [currentLessonTime, setCurrentLessonTime] = useState<number>(0);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [pollCount, setPollCount] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showCourseUploader, setShowCourseUploader] = useState(false);
  const [resourcesRefreshToken, setResourcesRefreshToken] = useState(0);
  const [mediaMode, setMediaMode] = useState<'view' | 'record' | 'upload'>('view');
  const { confirm } = useConfirmDialog();

  const openAIAssistant = () => {
    const event = new CustomEvent('open-ai-chat', {
        detail: {
            source: 'course-details',
            courseId,
            lessonId: selectedLesson?.id,
            courseTitle: course?.title,
            lessonTitle: selectedLesson?.title
        }
    });
    window.dispatchEvent(event);
  };

  // Check bookmark status
  useEffect(() => {
    const checkBookmark = async () => {
      if (!courseId) return;
      try {
        const response = await apiClient.get(`/bookmarks/check?entityType=course&entityId=${courseId}`);
        setIsBookmarked(response.data.bookmarked);
      } catch (err) {
        console.error('Failed to check bookmark status:', err);
      }
    };
    checkBookmark();
  }, [courseId]);

  const toggleBookmark = async () => {
    if (!courseId) return;
    try {
      const response = await apiClient.post('/bookmarks/toggle', {
        entityType: 'course',
        entityId: courseId
      });
      setIsBookmarked(response.data.bookmarked);
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  // Memoized values
  const isAdmin = useMemo(() => user?.role === 'chapter_admin' || user?.role === 'admin', [user?.role]);
  const isOwner = useMemo(() => user?.role === 'teacher' && course?.created_by === user?.id, [user?.role, user?.id, course?.created_by]);
  // Base members (user/legacy student) are treated as learners for progress, etc.
  const isStudent = useMemo(() => user?.role === 'user' || user?.role === 'student', [user?.role]);

  // Memoized functions
  const getBackLink = useCallback(() => {
    if (isAdmin) return '/admin/courses';
    if (isOwner || user?.role === 'teacher') return '/teacher/courses';
    return '/member/courses';
  }, [isAdmin, isOwner, user?.role]);

  const { t } = useTranslation();

  const getBackLabel = useCallback(() => {
    if (isAdmin) return t('course_details.back_to_admin');
    if (isOwner || user?.role === 'teacher') return t('course_details.back_to_my_courses');
    return t('course_details.back_to_my_courses');
  }, [isAdmin, isOwner, user?.role, t]);

  const formatDuration = useCallback((minutes: number) => {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, []);

  const handleTimestampClick = useCallback((timestamp: number) => {
    setSeekTo(timestamp);
  }, []);


  // Load student progress for a lesson
  const loadLessonProgress = useCallback(async (lessonId: string) => {
    // Reset poll count when loading a new lesson
    setPollCount(0);

    if (!isStudent) return;

    try {
      const response = await interactiveApi.getLessonProgress(lessonId);
      if (response.success && response.data?.progress) {
        const progress = response.data.progress;
        setLessonProgress(prev => ({
          ...prev,
          [lessonId]: {
            progress: progress.progress || 0,
            is_completed: progress.is_completed || false,
            last_watched_timestamp: progress.last_watched_timestamp || 0,
            completed_at: progress.completed_at
          }
        }));
      }
    } catch (error) {
      console.error('Failed to load lesson progress:', error);
    }
  }, [isStudent]);

  // Update lesson progress
  const updateProgress = useCallback(async (lessonId: string, progress: number, lastWatchedTimestamp?: number, isCompleted?: boolean) => {
    if (!isStudent || updatingProgress === lessonId) return;
    
    try {
      setUpdatingProgress(lessonId);
      await interactiveApi.updateLessonProgress(lessonId, {
        progress: Math.min(Math.max(progress, 0), 1),
        lastWatchedTimestamp: lastWatchedTimestamp || 0,
        isCompleted: isCompleted || false
      });
      
      // Update local state
      setLessonProgress(prev => ({
        ...prev,
        [lessonId]: {
          progress: Math.min(Math.max(progress, 0), 1),
          is_completed: isCompleted || false,
          last_watched_timestamp: lastWatchedTimestamp || 0,
          completed_at: isCompleted ? new Date().toISOString() : prev[lessonId]?.completed_at
        }
      }));
      
      // Update lesson in lessons array
      setLessons(prev => prev.map(l => 
        l.id === lessonId 
          ? { ...l, progress: Math.min(Math.max(progress, 0), 1), is_completed: isCompleted || false }
          : l
      ));
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setUpdatingProgress(null);
    }
  }, [isStudent, updatingProgress]);

  // Mark lesson as complete
  const markLessonComplete = useCallback(async (lessonId: string) => {
    if (!isStudent || markingComplete === lessonId) return;
    
    try {
      setMarkingComplete(lessonId);
      await updateProgress(lessonId, 1, 0, true);
    } catch (error) {
      console.error('Failed to mark lesson complete:', error);
    } finally {
      setMarkingComplete(null);
    }
  }, [isStudent, markingComplete, updateProgress]);

  // Create lesson
  const handleCreateLesson = useCallback(async (title: string, description: string) => {
    if (!courseId || !title.trim()) return;
    
    try {
      const response = await coursesApi.createLesson(courseId, {
        title: title.trim(),
        description: description.trim() || undefined,
        order: lessons.length
      });
      
      const newLesson = response.data.lesson;
      setLessons(prev => [...prev, newLesson].sort((a, b) => (a.order || 0) - (b.order || 0)));
      setSelectedLesson(newLesson);
    } catch (error) {
      console.error('Failed to create lesson:', error);
    }
  }, [courseId, lessons.length]);

  // Update lesson
  const handleUpdateLesson = useCallback(async (lesson: Lesson, title: string, description: string) => {
    if (!lesson.id || !title.trim()) return;
    
    try {
      const response = await coursesApi.updateLesson(lesson.id, {
        title: title.trim(),
        description: description.trim() || undefined
      });
      
      const updatedLesson = response.data.lesson;
      setLessons(prev => prev.map(l => l.id === lesson.id ? updatedLesson : l));
      setSelectedLesson(updatedLesson);
    } catch (error) {
      console.error('Failed to update lesson:', error);
    }
  }, []);

  // Delete lesson
  const handleDeleteLesson = useCallback(async (lessonId: string) => {
    const agreed = await confirm({
      title: 'Delete Lesson',
      message: 'Are you sure you want to delete this lesson? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger'
    });
    if (!agreed) return;

    try {
      setDeletingLessonId(lessonId);
      await coursesApi.deleteLesson(lessonId);
      setLessons(prev => prev.filter(l => l.id !== lessonId));
      if (selectedLesson?.id === lessonId) {
        const remainingLessons = lessons.filter(l => l.id !== lessonId);
        setSelectedLesson(remainingLessons.length > 0 ? remainingLessons[0] : null);
      }
    } catch (error) {
      console.error('Failed to delete lesson:', error);
    } finally {
      setDeletingLessonId(null);
    }
  }, [lessons, selectedLesson, confirm]);

  // Memoized tabs - Role-based ordering
  // Deprecated tabs memo (legacy UI)

  // Calculate student progress
  const studentProgress = useMemo(() => {
    if (!isStudent || lessons.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = lessons.filter(l => {
      const progress = lessonProgress[l.id];
      return progress?.is_completed || l.is_completed;
    }).length;
    
    return {
      completed,
      total: lessons.length,
      percentage: Math.round((completed / lessons.length) * 100)
    };
  }, [lessons, lessonProgress, isStudent]);

  // Load course data with useCallback
  const loadCourseData = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);

      // Load course details using specific course API
      let courseData;
      try {
        const courseResponse = await coursesApi.getCourseById(courseId);
        courseData = courseResponse.data.course;
        setCourse(courseData);
      } catch (err: any) {
        console.error('Failed to load course details:', err);
        if (err.response && err.response.status === 404) {
           setError(t('course_details.not_found.title'));
           setLoading(false);
           return;
        }
        throw new Error(t('course_details.error_loading_course'));
      }

      // Load lessons - handle separately so course can load even if lessons fail
      try {
        const lessonsResponse = await coursesApi.getLessons(courseId);
        const lessonsData = lessonsResponse.data.lessons || [];
        setLessons(lessonsData);

        // Load progress for all lessons if student
        if (isStudent) {
          // Don't block on progress loading
          Promise.all(lessonsData.map((lesson: Lesson) => loadLessonProgress(lesson.id))).catch(e => console.warn('Failed to load progress', e));
        }

        // Auto-select first lesson if available
        if (lessonsData.length > 0) {
          // Check for URL param lesson ID
          const params = new URLSearchParams(window.location.search);
          const lessonIdParam = params.get('lesson');
          
          if (lessonIdParam) {
            const foundLesson = lessonsData.find((l: Lesson) => l.id === lessonIdParam);
            if (foundLesson) {
              setSelectedLesson(foundLesson);
            } else {
              setSelectedLesson(lessonsData[0]);
            }
          } else {
            setSelectedLesson(lessonsData[0]);
          }
        }
        
        // Update stats with lesson count
        setCourseStats(prev => ({
            ...prev,
            totalLessons: courseData.lesson_count || lessonsData.length
        }));

      } catch (lessonErr) {
        console.error('Failed to load lessons:', lessonErr);
        // We don't set global error here, just log it. 
        // The UI will show empty lessons list which is better than full crash.
        // Optionally set a specific warning state
      }

      // Load initial stats from course data
      setCourseStats(prev => ({
        ...prev,
        totalStudents: courseData.student_count || 0,
        completionRate: 0, 
        averageRating: courseData.average_rating || 4.5,
        activeStudents: 0
      }));

    } catch (error: any) {
      console.error('Failed to load course data:', error);
      setError(error.message || 'Failed to load course data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [courseId, isStudent, loadLessonProgress, t]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  // Load progress when lesson is selected
  useEffect(() => {
    if (selectedLesson && isStudent) {
      loadLessonProgress(selectedLesson.id);
    }
  }, [selectedLesson, isStudent, loadLessonProgress]);

  // Update completed lessons count when lesson progress changes
  useEffect(() => {
    if (isStudent && lessons.length > 0) {
      const progressEntries = Object.values(lessonProgress);
      const completedCount = progressEntries.filter((p: any) =>
        p.is_completed || (p.progress && p.progress >= 1)
      ).length;

      setCourseStats(prev => ({
        ...prev,
        completedLessons: completedCount
      }));
    }
  }, [lessonProgress, lessons.length, isStudent]);

  // Memoized progress percentage
  const progressPercentage = useMemo(() => {
    if (isStudent) {
      return studentProgress.percentage;
    }
    return courseStats.totalLessons > 0 
      ? Math.round((courseStats.completedLessons / courseStats.totalLessons) * 100) 
      : 0;
  }, [isStudent, studentProgress, courseStats]);

  if (loading) {
    return <CourseDetailsSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('course_details.error_title')}</h3>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => loadCourseData()}
                className="px-4 py-2 text-white text-sm rounded-lg border transition-colors"
                style={{ backgroundColor: brandColors.primaryHex, borderColor: brandColors.primaryHex }}
              >
                {t('common.try_again')}
              </button>
              <button
                onClick={() => navigate(getBackLink())}
                className="px-4 py-2 bg-white text-sm rounded-lg border transition-colors"
                style={{ color: brandColors.primaryHex, borderColor: `${brandColors.primaryHex}40` }}
              >
                {t('common.back_to_courses')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return <CourseNotFound onBack={() => navigate(getBackLink())} />;
  }

  const selectedLessonProgress = selectedLesson ? lessonProgress[selectedLesson.id] : null;
  const isSelectedLessonCompleted = selectedLessonProgress?.is_completed || selectedLesson?.is_completed;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CourseHeader
        course={course}
        isAdmin={isAdmin}
        isOwner={isOwner}
        isStudent={isStudent}
        isTheaterMode={isTheaterMode}
        isSidebarOpen={isSidebarOpen}
        isBookmarked={isBookmarked}
        progressPercentage={progressPercentage}
        onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleBookmark={toggleBookmark}
        getBackLink={getBackLink}
        getBackLabel={getBackLabel}
      />

      <main className={`flex-1 w-full mx-auto transition-all duration-300 ${isTheaterMode ? 'max-w-full p-0' : 'max-w-[1600px] p-4 sm:p-6 lg:p-8'}`}>
        <div className={`flex flex-col lg:flex-row gap-6 h-full relative ${isTheaterMode ? 'gap-0' : ''}`}>
          {/* Left Column - Main Content */}
          <div className={`flex flex-col gap-6 transition-all duration-300 ${isSidebarOpen && !isTheaterMode ? 'lg:w-[70%]' : 'lg:w-full'} ${isTheaterMode ? 'w-full' : ''}`}>
            {/* Video Player Area */}
            <div className={`bg-black overflow-hidden shadow-lg relative group transition-all duration-300 ${isTheaterMode ? 'h-[85vh] rounded-none' : 'aspect-video rounded-xl'}`}>
               {selectedLesson ? (
                  <>
                    {/* Case 1: Lesson has video content */}
                    {(selectedLesson.video_url || selectedLesson.mux_playback_id) && mediaMode === 'view' ? (
                      <UnifiedVideoPlayer 
                        lesson={{
                          id: selectedLesson.id,
                          title: selectedLesson.title,
                          video_provider: selectedLesson.video_provider === 'mux' ? 'mux' : undefined,
                          mux_playback_id: selectedLesson.mux_playback_id,
                          allow_download: selectedLesson.allow_download
                        }}
                        courseTitle={course?.title}
                        showTheaterToggle={false}
                        onTimestampClick={handleTimestampClick}
                        seekTo={seekTo}
                        onProgress={(time) => {
                          setCurrentLessonTime(time);
                          if (selectedLesson && isStudent) {
                            const duration = selectedLesson.duration || 0;
                            if (duration > 0) {
                              const progress = time / (duration * 60);
                              updateProgress(selectedLesson.id, progress, time);
                            }
                          }
                        }}
                        onComplete={() => {
                          if (selectedLesson && isStudent) {
                            markLessonComplete(selectedLesson.id);
                          }
                        }}
                        onError={(error) => {
                          console.error('Video playback error:', error);
                        }}
                      />
                    ) : (
                      /* Case 2: No video content (or explicitly in record/upload mode) */
                      <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-white p-6">
                        {mediaMode === 'record' ? (
                          <div className="w-full h-full">
                            <div className="absolute top-4 right-4 z-50">
                              <button 
                                onClick={() => setMediaMode('view')}
                                className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                              >
                                <Minimize2 className="h-5 w-5" />
                              </button>
                            </div>
                            <VideoRecorder 
                              courseId={courseId}
                              lessonId={selectedLesson.id}
                              onUploadComplete={() => {
                                setMediaMode('view');
                                loadCourseData(); // Refresh to get new video data
                              }}
                            />
                          </div>
                        ) : mediaMode === 'upload' ? (
                          <div className="w-full max-w-md bg-white rounded-xl p-6 text-gray-900">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-lg">{t('course_details.upload_video')}</h3>
                              <button onClick={() => setMediaMode('view')} className="text-gray-500 hover:text-gray-700">
                                <Minimize2 className="h-5 w-5" />
                              </button>
                            </div>
                            <MuxVideoUploader 
                              lessonId={selectedLesson.id}
                              onUploadComplete={() => {
                                setMediaMode('view');
                                loadCourseData(); // Refresh
                              }}
                              onCancel={() => setMediaMode('view')}
                            />
                          </div>
                        ) : (
                          /* Default Empty State */
                          <div className="text-center max-w-md">
                            {(isAdmin || isOwner) ? (
                              <>
                                <div className="mb-6">
                                  <div className="h-20 w-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Video className="h-10 w-10 text-gray-400" />
                                  </div>
                                  <h3 className="text-xl font-bold mb-2">{t('course_details.no_content_title')}</h3>
                                  <p className="text-gray-400 mb-8">{t('course_details.no_content_desc')}</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                  <button
                                    onClick={() => navigate(`/teacher/record?courseId=${courseId}&lessonId=${selectedLesson.id}`)}
                                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:scale-105"
                                    style={{ backgroundColor: brandColors.primaryHex }}
                                  >
                                    <Camera className="h-5 w-5" />
                                    {t('course_details.record_video')}
                                  </button>
                                  <button
                                    onClick={() => setMediaMode('upload')}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-medium transition-all hover:bg-gray-100"
                                  >
                                    <Upload className="h-5 w-5" />
                                    {t('course_details.upload_video')}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p>{t('course_details.lesson_not_ready')}</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
               ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <PlayCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>{t('course_details.select_lesson_prompt')}</p>
                    </div>
                  </div>
               )}
            </div>

            {/* Lesson Header & Actions */}
            {selectedLesson && (
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedLesson.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(selectedLesson.duration || 0)}
                    </span>
                    <span>•</span>
                    <span>{t('course_details.lesson_of_total', { index: (selectedLesson.order !== undefined ? selectedLesson.order + 1 : 1), total: lessons.length })}</span>
                  </div>
                </div>
                
                {isStudent && (
                   <button
                      onClick={() => markLessonComplete(selectedLesson.id)}
                      disabled={isSelectedLessonCompleted || markingComplete === selectedLesson.id}
                      className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        isSelectedLessonCompleted
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : 'bg-[#27AE60] text-white hover:bg-[#219150] shadow-sm hover:shadow'
                      }`}
                   >
                      {markingComplete === selectedLesson.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isSelectedLessonCompleted ? (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          {t('common.completed')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          {t('course_details.mark_complete')}
                        </>
                      )}
                   </button>
                )}
              </div>
            )}

            {/* Contextual Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
              <div className="border-b border-gray-200">
                <div className="flex items-center justify-between px-6 pt-2">
                  <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'description', label: t('course_details.tabs.overview'), icon: BookOpen },
                      { id: 'resources', label: t('course_details.tabs.resources'), icon: Download },
                      { id: 'polls', label: t('course_details.tabs.polls'), icon: BarChart3, count: pollCount },
                      { id: 'discussion', label: t('course_details.tabs.discussion'), icon: MessageSquare },
                      ...((isAdmin || isOwner) ? [{ id: 'analytics', label: t('course_details.tabs.analytics'), icon: Activity }] : [])
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`group flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'border-current text-current'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        style={activeTab === tab.id ? { color: brandColors.primaryHex, borderColor: brandColors.primaryHex } : {}}
                      >
                        <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? '' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                          <span 
                            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                            style={activeTab === tab.id 
                              ? { backgroundColor: `${brandColors.primaryHex}15`, color: brandColors.primaryHex }
                              : { backgroundColor: '#F3F4F6', color: '#4B5563' }
                            }
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-3 pl-4 border-l border-gray-200 ml-4 py-3">
                    <button
                      onClick={openAIAssistant}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white rounded-lg shadow-sm transition-all hover:shadow-md hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
                    >
                      <Bot className="h-3.5 w-3.5 mr-1.5" />
                      {t('course_details.ask_ai')}
                    </button>
                    
                    {(activeTab === 'resources') && (isAdmin || isOwner) && (
                      <button
                        onClick={() => setShowCourseUploader(v => !v)}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          showCourseUploader
                            ? 'text-white border-transparent'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        style={showCourseUploader ? { backgroundColor: brandColors.primaryHex } : {}}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        {showCourseUploader ? t('course_details.hide_uploader') : t('course_details.add_resource')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {activeTab === 'description' && selectedLesson && (
                  <div className="prose max-w-none">
                    {(isAdmin || isOwner) && (
                       <div className="mb-6 not-prose space-y-4">
                          <CoursePublisher
                             course={course}
                             onPublishSuccess={(updatedCourse: any) => setCourse(updatedCourse)}
                          />
                       </div>
                    )}
                    <p className="text-gray-600 leading-relaxed">{selectedLesson.description}</p>
                    
                    {isStudent && (
                       <div className="not-prose mt-8 pt-8 border-t border-gray-100 space-y-6">
                          <div className="flex flex-wrap items-center gap-3">
                             <div className="flex-1 min-w-[200px]">
                                <QuizButton 
                                   lessonId={parseInt(selectedLesson.id)} 
                                   onQuizComplete={() => markLessonComplete(selectedLesson.id)} 
                                />
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <RelatedVideos 
                                lessonId={selectedLesson.id} 
                                currentCourseId={courseId} 
                                onVideoSelect={(video) => {
                                   const foundLesson = lessons.find(l => l.id === video.id.toString());
                                   if (foundLesson) {
                                      setSelectedLesson(foundLesson);
                                   } else if (video.course_id) {
                                      navigate(`/member/courses/${video.course_id}?lesson=${video.id}`);
                                   }
                                }} 
                             />
                          </div>
                       </div>
                    )}
                    
                    {/* Learning Objectives or other metadata could go here */}
                    <div className="mt-8 pt-8 border-t border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('course_details.about_heading')}</h3>
                      <p className="text-sm text-gray-600">{course.description}</p>
                    </div>
                  </div>
                )}
                
                {activeTab === 'analytics' && selectedLesson && (isAdmin || isOwner) && (
                   <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">{t('course_details.lesson_analytics')}</h3>
                      <LessonTeacherAnalytics lessonId={selectedLesson.id} />
                   </div>
                )}
                
                {activeTab === 'resources' && (
                  <div className="space-y-4">
                    {(isAdmin || isOwner) && showCourseUploader && (
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('course_details.add_resource_to_course')}</h3>
                        <UploadResource
                          variant="embedded"
                          target="library"
                          defaultScope="course_specific"
                          defaultCourseId={courseId}
                          lockScope={true}
                          onUploadComplete={() => {
                            setShowCourseUploader(false);
                            setResourcesRefreshToken((t) => t + 1);
                          }}
                        />
                      </div>
                    )}

                    <UnifiedResourceView
                      courseId={courseId}
                      showCourseResources={true}
                      hideTabs={true}
                      activeTab="course"
                      variant="embedded"
                      refreshToken={resourcesRefreshToken}
                    />
                  </div>
                )}
                
                {activeTab === 'polls' && selectedLesson && (
                   <LessonPolls
                      lessonId={parseInt(selectedLesson.id)}
                      onPollCountChange={setPollCount}
                   />
                )}

                 {activeTab === 'discussion' && selectedLesson && (
                   <div className="mt-4">
                      <LessonInteractivePanel 
                        lessonId={selectedLesson.id} 
                        currentTime={currentLessonTime}
                        onTimestampClick={handleTimestampClick}
                      />
                   </div>
                 )}
              </div>
            </div>
          </div>



          {/* Right Column - Sidebar */}
          <CourseSidebar
            lessons={lessons}
            selectedLesson={selectedLesson}
            searchQuery={searchQuery}
            filterCompleted={filterCompleted}
            isAdmin={isAdmin}
            isOwner={isOwner}
            isTheaterMode={isTheaterMode}
            isSidebarOpen={isSidebarOpen}
            lessonProgress={lessonProgress}
            deletingLessonId={deletingLessonId}
            onSearchChange={setSearchQuery}
            onFilterChange={setFilterCompleted}
            onSelectLesson={(l) => setSelectedLesson(l as any)}
            onCreateLesson={handleCreateLesson}
            onUpdateLesson={(l, t, d) => handleUpdateLesson(l as any, t, d)}
            onDeleteLesson={handleDeleteLesson}
          />
        </div>
      </main>
    </div>
  );
};
export default React.memo(CourseDetails);
