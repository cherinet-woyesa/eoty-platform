import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesApi, interactiveApi } from '@/services/api';
import UnifiedVideoPlayer from '@/components/shared/courses/UnifiedVideoPlayer';
import RelatedVideos from '@/components/shared/courses/RelatedVideos';
import LessonPolls from '@/components/shared/courses/LessonPolls';
import QuizButton from '@/components/shared/courses/QuizButton';
import LessonInteractivePanel from '@/components/shared/courses/LessonInteractivePanel';
import LessonTeacherAnalytics from '@/components/shared/courses/LessonTeacherAnalytics';
import LessonResources from '@/components/shared/courses/LessonResources';
import { CoursePublisher } from '@/components/shared/courses/CoursePublisher';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, BookOpen, Clock, PlayCircle, Video, Users, BarChart, 
  Search, Filter, CheckCircle, Circle, Star, MessageSquare, 
  Download, Share2, Edit, TrendingUp, Award, Calendar,
  Loader2, Plus, Trash2, Bot
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

type TabType = 'overview' | 'lessons' | 'resources' | 'discussions';

// Memoized components
const LoadingSpinner = React.memo(() => (
  <div className="flex items-center justify-center min-h-64 p-8">
    <div className="text-center">
      <Loader2 className="w-8 h-8 border-t-2 border-blue-600 border-solid rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-600 text-sm">Loading course content...</p>
    </div>
  </div>
));

const CourseNotFound = React.memo(({ onBack }: { onBack: () => void }) => (
  <div className="text-center py-8 p-8">
    <div>
      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Not Found</h3>
      <p className="text-gray-600 text-sm mb-4">The course you're looking for doesn't exist or has been removed.</p>
      <button
        onClick={onBack}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Courses
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
  const [activeTab, setActiveTab] = useState<TabType>('lessons');
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

  // Memoized values
  const isAdmin = useMemo(() => user?.role === 'chapter_admin' || user?.role === 'admin', [user?.role]);
  const isOwner = useMemo(() => user?.role === 'teacher' && course?.created_by === user?.id, [user?.role, user?.id, course?.created_by]);
  // Base members (user/legacy student) are treated as learners for progress, etc.
  const isStudent = useMemo(() => user?.role === 'user' || user?.role === 'student', [user?.role]);

  // Memoized functions
  const getBackLink = useCallback(() => {
    if (isAdmin) return '/admin/courses';
    if (isOwner || user?.role === 'teacher') return '/teacher/courses';
    return '/student/courses';
  }, [isAdmin, isOwner, user?.role]);

  const getBackLabel = useCallback(() => {
    if (isAdmin) return 'Back to Admin Courses';
    if (isOwner || user?.role === 'teacher') return 'Back to My Courses';
    return 'Back to My Courses';
  }, [isAdmin, isOwner, user?.role]);

  const formatDuration = useCallback((minutes: number) => {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, []);

  const handleTimestampClick = useCallback((timestamp: number) => {
    console.log('Jumping to timestamp:', timestamp);
  }, []);

  // Load student progress for a lesson
  const loadLessonProgress = useCallback(async (lessonId: string) => {
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
    if (!window.confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
      return;
    }
    
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
  }, [lessons, selectedLesson]);

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

  // Memoized tabs
  const tabs = useMemo(() => [
    { id: 'overview' as TabType, label: 'Overview', icon: BookOpen },
    { id: 'lessons' as TabType, label: 'Lessons', icon: PlayCircle, count: lessons.length },
    { id: 'resources' as TabType, label: 'Resources', icon: Download },
    { id: 'discussions' as TabType, label: 'Discussions', icon: MessageSquare }
  ], [lessons.length]);

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
        for (const lesson of lessonsData) {
          await loadLessonProgress(lesson.id);
        }
      }

      // Auto-select first lesson if available
      if (lessonsData.length > 0) {
        setSelectedLesson(lessonsData[0]);
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
    return <LoadingSpinner />;
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Course</h3>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate(getBackLink())}
                className="px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back to Courses
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              to={getBackLink()}
              className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {getBackLabel()}
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 truncate">{course.title}</h1>
              {course.level && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  {course.level}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(isAdmin || isOwner) && (
              <Link
                to={`/teacher/courses/${courseId}/edit`}
                className="inline-flex items-center px-3 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Course
              </Link>
            )}
            <button className="inline-flex items-center px-3 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
        </div>

        {/* Tab Navigation - Moved to top */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Course Publisher - Only for teachers */}
        {(isAdmin || isOwner) && activeTab === 'overview' && (
          <div className="mb-6">
            <CoursePublisher
              course={course}
              onPublishSuccess={(updatedCourse) => {
                setCourse(updatedCourse);
              }}
            />
          </div>
        )}

        {/* Stats Grid - Only show on overview tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-100">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{courseStats.totalStudents}</p>
            <p className="text-sm text-gray-600">Total Students</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-100">
              <BarChart className="h-4 w-4 text-green-600" />
            </div>
            <Award className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{progressPercentage}%</p>
            <p className="text-sm text-gray-600">Completion Rate</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-yellow-100">
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
            <Star className="h-4 w-4 text-yellow-600 fill-current" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{courseStats.averageRating.toFixed(1)}/5</p>
            <p className="text-sm text-gray-600">Average Rating</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-purple-100">
              <PlayCircle className="h-4 w-4 text-purple-600" />
            </div>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{isStudent ? studentProgress.completed : courseStats.completedLessons}/{courseStats.totalLessons}</p>
            <p className="text-sm text-gray-600">Lessons Progress</p>
          </div>
        </div>
      </div>
        )}

        {/* Tab Content */}
        {activeTab === 'lessons' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player & Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {selectedLesson ? (
              <>
                {/* Unified Video Player */}
                <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 overflow-hidden shadow-sm">
                  <UnifiedVideoPlayer 
                    lesson={{
                      id: selectedLesson.id,
                      title: selectedLesson.title,
                      video_provider: selectedLesson.video_provider === 'mux' ? 'mux' : undefined,
                      mux_playback_id: selectedLesson.mux_playback_id,
                      allow_download: selectedLesson.allow_download
                    }}
                    courseTitle={course?.title}
                    onTimestampClick={handleTimestampClick}
                    onProgress={(time) => {
                      setCurrentLessonTime(time);
                      if (selectedLesson && isStudent) {
                        const duration = selectedLesson.duration || 0;
                        if (duration > 0) {
                          const progress = time / (duration * 60); // Convert minutes to seconds
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
                </div>
                
                {/* Lesson Details */}
                <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h2 className="text-base font-semibold text-slate-700">{selectedLesson.title}</h2>
                        {isSelectedLessonCompleted && (
                          <span className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-[#39FF14]/20 to-[#00FF41]/20 text-[#39FF14] rounded-full text-xs font-bold border border-[#39FF14]/40 shadow-sm">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatDuration(selectedLesson.duration || 0)}</span>
                        </div>
                        <span>•</span>
                        <span>Lesson {(selectedLesson.order !== undefined ? selectedLesson.order + 1 : 1)} of {lessons.length}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(selectedLesson.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      {isStudent && (
                        <button
                          onClick={() => markLessonComplete(selectedLesson.id)}
                          disabled={isSelectedLessonCompleted || markingComplete === selectedLesson.id}
                          className={`px-3 py-1.5 rounded-lg transition-all duration-200 text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                            isSelectedLessonCompleted
                              ? 'bg-gradient-to-r from-[#39FF14] to-[#00FF41] text-white border border-[#39FF14]/50'
                              : 'bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white border border-[#FF6B35]/50 hover:from-[#FF8C42] hover:to-[#FFA366]'
                          }`}
                        >
                          {markingComplete === selectedLesson.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isSelectedLessonCompleted ? (
                            <>
                              <CheckCircle className="h-4 w-4 inline mr-1.5" />
                              Completed
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 inline mr-1.5" />
                              Mark Complete
                            </>
                          )}
                        </button>
                      )}
                      {/* Ask AI about this lesson */}
                      <Link
                        to={`/ai-assistant?lessonId=${selectedLesson.id}&courseId=${courseId}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 shadow-sm"
                      >
                        <Bot className="h-4 w-4 mr-2 text-[#16A085]" />
                        Ask AI about this lesson
                      </Link>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none mb-4">
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedLesson.description}</p>
                  </div>
                  
                  {/* Progress Bar for Student */}
                  {isStudent && selectedLessonProgress && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                        <span>Your Progress</span>
                        <span className="text-slate-700">{Math.round((selectedLessonProgress.progress || 0) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFC107] rounded-full transition-all duration-300 shadow-sm"
                          style={{ width: `${(selectedLessonProgress.progress || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Learning Objectives */}
                  <div className="mt-4 p-4 bg-gradient-to-br from-[#42A5F5]/10 to-[#2196F3]/10 rounded-lg border border-[#42A5F5]/20">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
                      <Award className="h-4 w-4 mr-1.5 text-[#42A5F5]" />
                      Learning Objectives
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1.5">
                      <li className="flex items-start">
                        <CheckCircle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0 text-[#66BB6A]" />
                        <span>Understand the core concepts presented in this lesson</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0 text-[#66BB6A]" />
                        <span>Apply the teachings to your spiritual practice</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0 text-[#66BB6A]" />
                        <span>Participate in discussions with other learners</span>
                      </li>
                    </ul>
                  </div>

                  {/* Action Buttons - Neon colors */}
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex-1">
                      {selectedLesson && (
                        <QuizButton
                          lessonId={parseInt(selectedLesson.id)}
                          onQuizComplete={() => {
                            // After quiz completion, mark lesson as complete for spiritual mastery
                            if (isStudent) {
                              markLessonComplete(selectedLesson.id);
                            }
                          }}
                        />
                      )}
                    </div>
                    <button className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#FF6B9D] to-[#FF8E9B] text-white rounded-lg hover:from-[#FF8E9B] hover:to-[#FFA5B0] transition-all duration-200 text-sm font-bold shadow-lg hover:shadow-xl border border-[#FF6B9D]/50">
                      <Download className="h-4 w-4 inline mr-2" />
                      Resources
                    </button>
                    <button className="px-4 py-2.5 bg-gradient-to-r from-[#00D4FF] to-[#00B8E6] text-white rounded-lg hover:from-[#00B8E6] hover:to-[#0099CC] transition-all duration-200 shadow-lg hover:shadow-xl border border-[#00D4FF]/50">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>

                  {/* In-lesson annotations & discussion */}
                  {selectedLesson && (
                    <LessonInteractivePanel
                      lessonId={selectedLesson.id}
                      currentTime={currentLessonTime}
                    />
                  )}

                  {/* Teacher/Admin lesson engagement analytics */}
                  {selectedLesson && (isAdmin || isOwner) && (
                    <LessonTeacherAnalytics lessonId={selectedLesson.id} />
                  )}

                  {/* Lesson Polls */}
                  {selectedLesson && (
                    <div className="mt-4">
                      <LessonPolls lessonId={parseInt(selectedLesson.id)} />
                    </div>
                  )}

                  {/* Related Videos */}
                  {selectedLesson && (
                    <div className="mt-6">
                      <RelatedVideos
                        lessonId={selectedLesson.id}
                        currentCourseId={courseId}
                        onVideoSelect={(video) => {
                          const foundLesson = lessons.find(l => l.id === video.id.toString());
                          if (foundLesson) {
                            setSelectedLesson(foundLesson);
                          } else if (video.course_id) {
                            // Navigate to different course
                            navigate(`/student/courses/${video.course_id}?lesson=${video.id}`);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 p-8 text-center shadow-sm">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Video className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Lesson Selected</h3>
                  <p className="text-sm text-slate-600 mb-4">Choose a lesson from the list to start watching.</p>
                </div>
              </div>
            )}
          </div>

          {/* Lessons Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 p-3 shadow-sm">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search lessons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700]/50 text-sm bg-slate-50/50 text-slate-700"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <select
                  value={filterCompleted}
                  onChange={(e) => setFilterCompleted(e.target.value as any)}
                  className="flex-1 px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700]/50 text-xs bg-slate-50/50 text-slate-700"
                >
                  <option value="all">All Lessons</option>
                  <option value="completed">Completed</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              </div>
            </div>

            {/* Progress Summary - Compact */}
            {isStudent && (
              <div className="bg-gradient-to-br from-[#39FF14]/10 via-[#00FF41]/10 to-[#00E676]/10 rounded-lg border border-[#39FF14]/30 p-3 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-800 mb-2 flex items-center">
                  <TrendingUp className="mr-1.5 h-3.5 w-3.5 text-[#39FF14]" />
                  Your Progress
                </h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1.5">
                      <span>Course Completion</span>
                      <span className="text-[#39FF14] text-sm">
                        {progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-[#39FF14] via-[#00FF41] to-[#00E676] h-2 rounded-full transition-all duration-500 shadow-sm"
                        style={{ 
                          width: `${progressPercentage}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1.5 font-medium">
                      {studentProgress.completed} of {studentProgress.total} lessons completed
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Lessons List */}
            <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-slate-200/50 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center">
                    <PlayCircle className="mr-1.5 h-4 w-4 text-[#FFD700]" />
                    Course Lessons
                    <span className="ml-2 text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full">
                      {filteredLessons.length}
                    </span>
                  </h3>
                  {(isAdmin || isOwner) && (
                    <button
                      onClick={() => {
                        setIsCreatingLesson(true);
                        setNewLessonTitle('');
                        setNewLessonDescription('');
                        setIsEditingLesson(null);
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Lesson
                    </button>
                  )}
                </div>
              </div>

              {/* Create/Edit Lesson Form */}
              {(isCreatingLesson || isEditingLesson) && (
                <div className="p-4 border-b border-slate-200/50 bg-slate-50/30">
                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="Lesson title"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      />
                    </div>
                    <div>
                      <textarea
                        value={newLessonDescription}
                        onChange={(e) => setNewLessonDescription(e.target.value)}
                        placeholder="Lesson description (optional)"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (isEditingLesson) {
                            handleUpdateLesson(isEditingLesson);
                          } else {
                            handleCreateLesson();
                          }
                        }}
                        disabled={!newLessonTitle.trim()}
                        className="px-4 py-1.5 text-xs font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isEditingLesson ? 'Update' : 'Create'}
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingLesson(false);
                          setIsEditingLesson(null);
                          setNewLessonTitle('');
                          setNewLessonDescription('');
                        }}
                        className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="max-h-[600px] overflow-y-auto p-3 space-y-2">
                {filteredLessons.length > 0 ? (
                  filteredLessons.map((lesson, index) => {
                    const progress = lessonProgress[lesson.id];
                    const isCompleted = progress?.is_completed || lesson.is_completed;
                    const lessonProgressPercent = progress ? Math.round(progress.progress * 100) : 0;
                    const isSelected = selectedLesson?.id === lesson.id;
                    
                    return (
                      <div
                        key={lesson.id}
                        className={`w-full p-3 rounded-lg border transition-all duration-200 ${
                          isSelected
                            ? 'border-[#FFD700] bg-gradient-to-r from-[#FFD700]/10 to-[#FFC107]/10 shadow-sm'
                            : 'border-slate-200/50 hover:border-[#FFD700]/50 hover:bg-slate-50/50'
                        }`}
                      >
                        <button
                          onClick={() => setSelectedLesson(lesson)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start space-x-2">
                            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm ${
                              isCompleted
                                ? 'bg-gradient-to-r from-[#39FF14] to-[#00FF41] text-white border border-[#39FF14]/50'
                                : isSelected
                                ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white border border-[#FFD700]/50'
                                : 'bg-slate-200 text-slate-700 border border-slate-300/50'
                            }`}>
                              {isCompleted ? <CheckCircle className="h-3.5 w-3.5" /> : (lesson.order !== undefined ? lesson.order + 1 : index + 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-xs font-semibold mb-0.5 ${
                                isSelected ? 'text-slate-900' : 'text-slate-700'
                              }`}>
                                {lesson.title}
                              </h4>
                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                                <Clock className="h-2.5 w-2.5" />
                                <span>{formatDuration(lesson.duration || 0)}</span>
                                {isCompleted && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[#39FF14] font-bold">Completed</span>
                                  </>
                                )}
                                {!isCompleted && progress && lessonProgressPercent > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-600 font-medium">{lessonProgressPercent}% watched</span>
                                  </>
                                )}
                              </div>
                              {progress && !isCompleted && (
                                <div className="mt-2 w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FF8C00] rounded-full transition-all duration-300 shadow-sm"
                                    style={{ width: `${lessonProgressPercent}%` }}
                                  />
                                </div>
                              )}
                            </div>
                            <PlayCircle className={`flex-shrink-0 h-5 w-5 ${
                              isSelected ? 'text-[#FFD700]' : isCompleted ? 'text-[#39FF14]' : 'text-slate-400'
                            }`} />
                          </div>
                        </button>
                        {(isAdmin || isOwner) && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/50">
                            <Link
                              to={`/teacher/content?lessonId=${lesson.id}&courseId=${courseId}&tab=record`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 px-2 py-1 text-xs font-medium text-white bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded hover:from-[#16A085] hover:to-[#27AE60] transition-colors flex items-center justify-center shadow-sm"
                            >
                              <Video className="h-3 w-3 mr-1" />
                              Record Video
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingLesson(lesson);
                                setNewLessonTitle(lesson.title);
                                setNewLessonDescription(lesson.description || '');
                                setIsCreatingLesson(false);
                              }}
                              className="flex-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors flex items-center justify-center"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLesson(lesson.id);
                              }}
                              disabled={deletingLessonId === lesson.id}
                              className="flex-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              {deletingLessonId === lesson.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Circle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No lessons found</p>
                  </div>
                )}
              </div>

              {lessons.length === 0 && !isCreatingLesson && (
                <div className="p-6 text-center border-t border-slate-200/50">
                  <Video className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm mb-3">No lessons yet</p>
                  {(isAdmin || isOwner) && (
                    <button
                      onClick={() => {
                        setIsCreatingLesson(true);
                        setNewLessonTitle('');
                        setNewLessonDescription('');
                        setIsEditingLesson(null);
                      }}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Lesson
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
        <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Course Overview</h2>
          <p className="text-sm text-slate-700 mb-4">{course.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">What You'll Learn</h3>
              <ul className="space-y-1.5 text-sm text-slate-700">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-[#66BB6A] mr-1.5 mt-0.5 flex-shrink-0" />
                  <span>Master the fundamental concepts</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-[#66BB6A] mr-1.5 mt-0.5 flex-shrink-0" />
                  <span>Apply practical techniques</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-[#66BB6A] mr-1.5 mt-0.5 flex-shrink-0" />
                  <span>Build real-world projects</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Course Details</h3>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Level:</span>
                  <span className="font-medium">{course.level || 'All Levels'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{formatDuration(lessons.reduce((acc, l) => acc + (l.duration || 0), 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lessons:</span>
                  <span className="font-medium">{lessons.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Language:</span>
                  <span className="font-medium">English</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            {selectedLesson ? (
              <LessonResources
                lessonId={parseInt(selectedLesson.id)}
                courseId={courseId}
                isTeacher={isOwner || isAdmin}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-center py-12">
                  <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Course Resources</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Select a lesson to view its resources, or create resources for specific lessons.
                  </p>
                  <p className="text-sm text-gray-500">
                    Resources are organized by lesson for better learning flow.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Discussions Tab */}
        {activeTab === 'discussions' && (
        <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Course Discussions</h2>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700 mb-2">No Discussions Yet</h3>
            <p className="text-sm text-slate-600 mb-4">Start a conversation with your fellow students</p>
            <button className="px-5 py-2.5 bg-gradient-to-r from-[#00D4FF] to-[#00B8E6] text-white rounded-lg hover:from-[#00B8E6] hover:to-[#0099CC] transition-all duration-200 text-sm font-bold shadow-lg hover:shadow-xl border border-[#00D4FF]/50">
              Start Discussion
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(CourseDetails);
