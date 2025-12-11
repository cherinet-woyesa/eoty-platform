import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
import {
  ArrowLeft, BookOpen, Clock, PlayCircle, Video,
  Search, CheckCircle, Bookmark,
  Download, Share2, Edit,
  Loader2, Plus, Trash2, Bot, BarChart3,
  Maximize2, Minimize2, Monitor, MessageSquare, Activity
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
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState<Lesson | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDescription, setNewLessonDescription] = useState('');
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [currentLessonTime, setCurrentLessonTime] = useState<number>(0);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [pollCount, setPollCount] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showCourseUploader, setShowCourseUploader] = useState(false);
  const [resourcesRefreshToken, setResourcesRefreshToken] = useState(0);
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
  const handleCreateLesson = useCallback(async () => {
    if (!courseId || !newLessonTitle.trim()) return;
    
    try {
      const response = await coursesApi.createLesson(courseId, {
        title: newLessonTitle.trim(),
        description: newLessonDescription.trim() || undefined,
        order: lessons.length
      });
      
      const newLesson = response.data.lesson;
      setLessons(prev => [...prev, newLesson].sort((a, b) => (a.order || 0) - (b.order || 0)));
      setNewLessonTitle('');
      setNewLessonDescription('');
      setIsCreatingLesson(false);
      setSelectedLesson(newLesson);
    } catch (error) {
      console.error('Failed to create lesson:', error);
    }
  }, [courseId, newLessonTitle, newLessonDescription, lessons.length]);

  // Update lesson
  const handleUpdateLesson = useCallback(async (lesson: Lesson) => {
    if (!lesson.id || !newLessonTitle.trim()) return;
    
    try {
      const response = await coursesApi.updateLesson(lesson.id, {
        title: newLessonTitle.trim(),
        description: newLessonDescription.trim() || undefined
      });
      
      const updatedLesson = response.data.lesson;
      setLessons(prev => prev.map(l => l.id === lesson.id ? updatedLesson : l));
      setNewLessonTitle('');
      setNewLessonDescription('');
      setIsEditingLesson(null);
      setSelectedLesson(updatedLesson);
    } catch (error) {
      console.error('Failed to update lesson:', error);
    }
  }, [newLessonTitle, newLessonDescription]);

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

  // Memoized filtered lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => {
      const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
      const progress = lessonProgress[lesson.id];
      const isCompleted = progress?.is_completed || lesson.is_completed;
      const matchesFilter = filterCompleted === 'all' || 
                           (filterCompleted === 'completed' && isCompleted) ||
                           (filterCompleted === 'incomplete' && !isCompleted);
      return matchesSearch && matchesFilter;
    });
  }, [lessons, searchQuery, filterCompleted, lessonProgress]);

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

      // Load course details using specific course API
      const courseResponse = await coursesApi.getCourseById(courseId);
      const courseData = courseResponse.data.course;
      setCourse(courseData);

      // Load lessons
      const lessonsResponse = await coursesApi.getLessons(courseId);
      const lessonsData = lessonsResponse.data.lessons || [];

      setLessons(lessonsData);

      // Load progress for all lessons if student
      if (isStudent) {
        await Promise.all(lessonsData.map((lesson: Lesson) => loadLessonProgress(lesson.id)));
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

      // Load initial stats from course data
      setCourseStats({
        totalStudents: courseData.student_count || 0,
        completionRate: 0, // Could be calculated from lesson progress if needed
        averageRating: courseData.average_rating || 4.5,
        totalLessons: courseData.lesson_count || lessonsData.length,
        completedLessons: 0, // Will be updated when lesson progress is loaded
        activeStudents: 0
      });

    } catch (error) {
      console.error('Failed to load course data:', error);
      setError('Failed to load course data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [courseId, isStudent, loadLessonProgress]);

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
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('course_details.error_title')}</h3>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-900 text-white text-sm rounded-lg border border-indigo-800 hover:bg-indigo-800 transition-colors"
              >
                {t('common.try_again')}
              </button>
              <button
                onClick={() => navigate(getBackLink())}
                className="px-4 py-2 bg-white text-indigo-900 text-sm rounded-lg border border-indigo-200 hover:border-indigo-400 transition-colors"
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={getBackLink()}
              className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <div className="p-1.5 rounded-full bg-gray-100 group-hover:bg-gray-200 mr-2 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <span className="hidden sm:inline">{getBackLabel()}</span>
            </Link>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-gray-900 truncate max-w-md leading-tight">{course.title}</h1>
              {(isAdmin || isOwner) && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit border border-amber-100">
                  {t('course_details.instructor_view')}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isStudent && (
               <div className="hidden md:flex items-center gap-4 mr-4 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">{t('course_details.your_progress')}</div>
                    <div className="text-sm font-bold text-[#27AE60]">{progressPercentage}% {t('course_details.complete_word')}</div>
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#27AE60] to-[#2ECC71] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(39,174,96,0.3)]"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
               </div>
            )}

            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                className={`p-2 rounded-md transition-all ${isTheaterMode ? 'bg-white shadow-sm text-[#27AE60]' : 'text-gray-500 hover:text-gray-700'}`}
                title={isTheaterMode ? t('course_details.exit_theater_mode') : t('course_details.theater_mode')}
              >
                <Monitor className="h-4 w-4" />
              </button>

              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-md transition-all ${!isSidebarOpen ? 'bg-white shadow-sm text-[#27AE60]' : 'text-gray-500 hover:text-gray-700'}`}
                title={isSidebarOpen ? t('course_details.expand_view') : t('course_details.show_sidebar')}
              >
                {isSidebarOpen ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </button>
            </div>
            
            {(isAdmin || isOwner) && (
              <Link
                to={`/teacher/courses/${courseId}/edit`}
                className="inline-flex items-center px-4 py-2 bg-[#27AE60] text-white text-sm font-medium rounded-lg hover:bg-[#219150] transition-all shadow-sm hover:shadow-md"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('common.edit_course')}
              </Link>
            )}
            {isStudent && (
              <button
                onClick={toggleBookmark}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                  isBookmarked 
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? t('common.saved') : t('common.save')}
              </button>
            )}
            <button className="inline-flex items-center px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <main className={`flex-1 w-full mx-auto transition-all duration-300 ${isTheaterMode ? 'max-w-full p-0' : 'max-w-[1600px] p-4 sm:p-6 lg:p-8'}`}>
        <div className={`flex flex-col lg:flex-row gap-6 h-full relative ${isTheaterMode ? 'gap-0' : ''}`}>
          {/* Left Column - Main Content */}
          <div className={`flex flex-col gap-6 transition-all duration-300 ${isSidebarOpen && !isTheaterMode ? 'lg:w-[70%]' : 'lg:w-full'} ${isTheaterMode ? 'w-full' : ''}`}>
            {/* Video Player */}
            <div className={`bg-black overflow-hidden shadow-lg relative group transition-all duration-300 ${isTheaterMode ? 'h-[85vh] rounded-none' : 'aspect-video rounded-xl'}`}>
               {selectedLesson ? (
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
              <div className="border-b border-gray-200 px-6 flex items-center justify-between">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
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
                      className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-[#27AE60] text-[#27AE60]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 pl-4 border-l border-gray-200 ml-4">
                  <button
                    onClick={openAIAssistant}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    <Bot className="h-3.5 w-3.5 mr-1.5 text-[#16A085]" />
                    {t('course_details.ask_ai')}
                  </button>
                  
                  {(activeTab === 'resources') && (isAdmin || isOwner) && (
                    <button
                      onClick={() => setShowCourseUploader(v => !v)}
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        showCourseUploader
                          ? 'bg-indigo-900 text-white border-indigo-800 hover:bg-indigo-800'
                          : 'bg-white text-indigo-900 border-indigo-200 hover:border-indigo-400'
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {showCourseUploader ? t('course_details.hide_uploader') : t('course_details.add_resource')}
                    </button>
                  )}
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
          <div className={`flex flex-col gap-6 transition-all duration-300 ${
            isSidebarOpen && !isTheaterMode
              ? 'lg:w-[30%] opacity-100' 
              : 'lg:w-0 opacity-0 overflow-hidden'
          } ${isTheaterMode ? 'hidden' : ''}`}>
            {/* Search & Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
               <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('course_details.search_lessons_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#27AE60]/20 focus:border-[#27AE60]"
                  />
               </div>
               <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{filteredLessons.length} {t('common.lessons')}</span>
                  <select
                    value={filterCompleted}
                    onChange={(e) => setFilterCompleted(e.target.value as any)}
                    className="border-none bg-transparent font-medium text-gray-700 focus:ring-0 cursor-pointer"
                  >
                    <option value="all">{t('course_details.filters.all_status')}</option>
                    <option value="completed">{t('course_details.filters.completed')}</option>
                    <option value="incomplete">{t('course_details.filters.incomplete')}</option>
                  </select>
               </div>
            </div>

            {/* Lesson List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden max-h-[calc(100vh-300px)]">
               <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900">{t('course_details.course_content')}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{filteredLessons.length} {t('common.lessons')} • {formatDuration(filteredLessons.reduce((acc, l) => acc + (l.duration || 0), 0))}</p>
                  </div>
                  {(isAdmin || isOwner) && (
                    <button
                      onClick={() => {
                        setIsCreatingLesson(true);
                        setNewLessonTitle('');
                        setNewLessonDescription('');
                        setIsEditingLesson(null);
                      }}
                      className="text-xs bg-[#27AE60] text-white px-3 py-1.5 rounded-lg hover:bg-[#219150] transition-colors flex items-center gap-1.5 font-medium shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                     {t('course_details.add_lesson')}
                    </button>
                  )}
               </div>
               
               {/* Create Lesson Form */}
               {(isCreatingLesson || isEditingLesson) && (
                  <div className="p-4 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-top-2">
                     <input
                        type="text"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                      placeholder={t('course_details.lesson_title_placeholder')}
                        className="w-full mb-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                     />
                     <div className="flex gap-2">
                        <button 
                           onClick={() => isEditingLesson ? handleUpdateLesson(isEditingLesson) : handleCreateLesson()}
                           className="flex-1 bg-indigo-900 text-white text-xs py-1.5 rounded-lg border border-indigo-800 hover:bg-indigo-800 font-medium"
                        >
                        {isEditingLesson ? t('course_details.save_changes') : t('course_details.create_lesson')}
                        </button>
                        <button 
                           onClick={() => {
                              setIsCreatingLesson(false);
                              setIsEditingLesson(null);
                           }}
                           className="flex-1 bg-white text-indigo-900 text-xs py-1.5 rounded-lg border border-indigo-200 hover:border-indigo-400 font-medium"
                        >
                        {t('common.cancel')}
                        </button>
                     </div>
                  </div>
               )}

               <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                  {filteredLessons.map((lesson, index) => {
                     const progress = lessonProgress[lesson.id];
                     const isCompleted = progress?.is_completed || lesson.is_completed;
                     const isSelected = selectedLesson?.id === lesson.id;
                     
                     return (
                        <div 
                           key={lesson.id}
                           className={`group p-3 rounded-lg cursor-pointer transition-all border-l-4 ${
                              isSelected 
                                 ? 'bg-[#27AE60]/5 border-l-[#27AE60] border-y border-r border-gray-100 shadow-sm' 
                                 : 'hover:bg-gray-50 border-l-transparent border-y border-r border-transparent'
                           }`}
                           onClick={() => setSelectedLesson(lesson)}
                        >
                           <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                 {isCompleted ? (
                                    <div className="h-5 w-5 rounded-full bg-[#27AE60] flex items-center justify-center">
                                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                                    </div>
                                 ) : (
                                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
                                       isSelected ? 'border-[#27AE60] text-[#27AE60] bg-white' : 'border-gray-300 text-gray-500 group-hover:border-gray-400'
                                    }`}>
                                       {lesson.order !== undefined ? lesson.order + 1 : index + 1}
                                    </div>
                                 )}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h4 className={`text-sm font-medium mb-1 leading-snug ${isSelected ? 'text-[#27AE60]' : 'text-gray-900'}`}>
                                    {lesson.title}
                                 </h4>
                                 <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                       <Video className="h-3 w-3" />
                                       {formatDuration(lesson.duration || 0)}
                                    </span>
                                 </div>
                              </div>
                              {(isAdmin || isOwner) && (
                                 <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                    <button 
                                       onClick={(e) => { e.stopPropagation(); setIsEditingLesson(lesson); }}
                                       className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                      title={t('course_details.edit_lesson_title')}
                                    >
                                       <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                       onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                                       disabled={deletingLessonId === lesson.id}
                                       className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                                      title={t('course_details.delete_lesson_title')}
                                    >
                                       {deletingLessonId === lesson.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                       ) : (
                                          <Trash2 className="h-3.5 w-3.5" />
                                       )}
                                    </button>
                                 </div>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
export default React.memo(CourseDetails);
