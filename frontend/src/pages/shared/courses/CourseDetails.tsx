import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesApi, interactiveApi } from '@/services/api';
import UnifiedVideoPlayer from '@/components/shared/courses/UnifiedVideoPlayer';
import RelatedVideos from '@/components/shared/courses/RelatedVideos';
import LessonPolls from '@/components/shared/courses/LessonPolls';
import QuizButton from '@/components/shared/courses/QuizButton';
import LessonInteractivePanel from '@/components/shared/courses/LessonInteractivePanel';
import LessonTeacherAnalytics from '@/components/shared/courses/LessonTeacherAnalytics';
import { CoursePublisher } from '@/components/shared/courses/CoursePublisher';
import UnifiedResourceView from '@/components/student/UnifiedResourceView';
import { useAuth } from '@/context/AuthContext';
import CourseDetailsSkeleton from '@/components/shared/courses/CourseDetailsSkeleton';
import {
  ArrowLeft, BookOpen, Clock, PlayCircle, Video,
  Search, CheckCircle, Circle, Star,
  Download, Share2, Edit,
  Loader2, Plus, Trash2, Bot, BarChart3
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

type TabType = 'description' | 'resources' | 'polls';

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
  const [pollCount, setPollCount] = useState<number>(0);

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

  // Memoized tabs - Role-based ordering
  const tabs = useMemo(() => {
    return [
      { id: 'description' as TabType, label: 'Description', icon: BookOpen },
      { id: 'resources' as TabType, label: 'Resources', icon: Download },
      { id: 'polls' as TabType, label: 'Polls', icon: BarChart3, count: pollCount }
    ];
  }, [pollCount]);

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={getBackLink()}
              className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {getBackLabel()}
            </Link>
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            <h1 className="text-lg font-bold text-gray-900 truncate hidden sm:block">{course.title}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {isStudent && (
               <div className="hidden md:flex items-center gap-3 mr-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Your Progress</div>
                    <div className="text-sm font-bold text-[#27AE60]">{progressPercentage}%</div>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#27AE60] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
               </div>
            )}
            
            {(isAdmin || isOwner) && (
              <Link
                to={`/teacher/courses/${courseId}/edit`}
                className="inline-flex items-center px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            )}
            <button className="inline-flex items-center px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Video Player */}
            <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video relative group">
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
                    onTimestampClick={handleTimestampClick}
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
                      <p>Select a lesson to start watching</p>
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
                    <span>Lesson {(selectedLesson.order !== undefined ? selectedLesson.order + 1 : 1)} of {lessons.length}</span>
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
                          Completed
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Mark Complete
                        </>
                      )}
                   </button>
                )}
              </div>
            )}

            {/* Contextual Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-[#27AE60] text-[#27AE60] bg-green-50/30'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
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
                          <LessonTeacherAnalytics lessonId={selectedLesson.id} />
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
                             <Link
                                to={`/ai-assistant?lessonId=${selectedLesson.id}&courseId=${courseId}`}
                                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                             >
                                <Bot className="h-4 w-4 mr-2 text-[#16A085]" />
                                Ask AI for Help
                             </Link>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <LessonInteractivePanel 
                                lessonId={selectedLesson.id} 
                                currentTime={currentLessonTime} 
                             />
                             <RelatedVideos 
                                lessonId={selectedLesson.id} 
                                currentCourseId={courseId} 
                                onVideoSelect={(video) => {
                                   const foundLesson = lessons.find(l => l.id === video.id.toString());
                                   if (foundLesson) {
                                      setSelectedLesson(foundLesson);
                                   } else if (video.course_id) {
                                      navigate(`/student/courses/${video.course_id}?lesson=${video.id}`);
                                   }
                                }} 
                             />
                          </div>
                       </div>
                    )}
                    
                    {/* Learning Objectives or other metadata could go here */}
                    <div className="mt-8 pt-8 border-t border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">About this Course</h3>
                      <p className="text-sm text-gray-600">{course.description}</p>
                    </div>
                  </div>
                )}
                
                {activeTab === 'resources' && (
                   <UnifiedResourceView
                      courseId={courseId}
                      showCourseResources={true}
                      variant="embedded"
                   />
                )}
                
                {activeTab === 'polls' && selectedLesson && (
                   <LessonPolls
                      lessonId={parseInt(selectedLesson.id)}
                      onPollCountChange={setPollCount}
                   />
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Search & Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
               <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search lessons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#27AE60]/20 focus:border-[#27AE60]"
                  />
               </div>
               <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{filteredLessons.length} lessons</span>
                  <select
                    value={filterCompleted}
                    onChange={(e) => setFilterCompleted(e.target.value as any)}
                    className="border-none bg-transparent font-medium text-gray-700 focus:ring-0 cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="incomplete">Incomplete</option>
                  </select>
               </div>
            </div>

            {/* Lesson List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden max-h-[calc(100vh-300px)]">
               <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Course Content</h3>
                  {(isAdmin || isOwner) && (
                    <button
                      onClick={() => {
                        setIsCreatingLesson(true);
                        setNewLessonTitle('');
                        setNewLessonDescription('');
                        setIsEditingLesson(null);
                      }}
                      className="text-xs bg-[#27AE60] text-white px-2 py-1 rounded hover:bg-[#219150] transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Lesson
                    </button>
                  )}
               </div>
               
               {/* Create Lesson Form */}
               {(isCreatingLesson || isEditingLesson) && (
                  <div className="p-4 bg-blue-50 border-b border-blue-100">
                     <input
                        type="text"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="Lesson Title"
                        className="w-full mb-2 px-3 py-2 text-sm border border-gray-300 rounded"
                        autoFocus
                     />
                     <div className="flex gap-2">
                        <button 
                           onClick={() => isEditingLesson ? handleUpdateLesson(isEditingLesson) : handleCreateLesson()}
                           className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700"
                        >
                           {isEditingLesson ? 'Save' : 'Create'}
                        </button>
                        <button 
                           onClick={() => {
                              setIsCreatingLesson(false);
                              setIsEditingLesson(null);
                           }}
                           className="flex-1 bg-white text-gray-700 text-xs py-1.5 rounded border border-gray-300 hover:bg-gray-50"
                        >
                           Cancel
                        </button>
                     </div>
                  </div>
               )}

               <div className="overflow-y-auto flex-1 p-2 space-y-1">
                  {filteredLessons.map((lesson, index) => {
                     const progress = lessonProgress[lesson.id];
                     const isCompleted = progress?.is_completed || lesson.is_completed;
                     const isSelected = selectedLesson?.id === lesson.id;
                     
                     return (
                        <div 
                           key={lesson.id}
                           className={`group p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                 ? 'bg-[#27AE60]/10 border border-[#27AE60]/20' 
                                 : 'hover:bg-gray-50 border border-transparent'
                           }`}
                           onClick={() => setSelectedLesson(lesson)}
                        >
                           <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                 {isCompleted ? (
                                    <CheckCircle className="h-5 w-5 text-[#27AE60]" />
                                 ) : (
                                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                                       isSelected ? 'border-[#27AE60] text-[#27AE60]' : 'border-gray-300 text-gray-500'
                                    }`}>
                                       {lesson.order !== undefined ? lesson.order + 1 : index + 1}
                                    </div>
                                 )}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h4 className={`text-sm font-medium mb-1 ${isSelected ? 'text-[#27AE60]' : 'text-gray-900'}`}>
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
                                       className="p-1 hover:bg-gray-200 rounded text-gray-500"
                                    >
                                       <Edit className="h-3 w-3" />
                                    </button>
                                    <button 
                                       onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                                       disabled={deletingLessonId === lesson.id}
                                       className="p-1 hover:bg-red-100 rounded text-red-500 disabled:opacity-50"
                                    >
                                       {deletingLessonId === lesson.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                       ) : (
                                          <Trash2 className="h-3 w-3" />
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
