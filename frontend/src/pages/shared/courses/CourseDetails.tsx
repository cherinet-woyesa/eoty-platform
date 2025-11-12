import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesApi, interactiveApi } from '@/services/api';
import UnifiedVideoPlayer from '@/components/shared/courses/UnifiedVideoPlayer';
import RelatedVideos from '@/components/shared/courses/RelatedVideos';
import { CoursePublisher } from '@/components/shared/courses/CoursePublisher';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, BookOpen, Clock, PlayCircle, Video, Users, BarChart, 
  Search, Filter, CheckCircle, Circle, Star, MessageSquare, 
  Download, Share2, Edit, TrendingUp, Award, Calendar,
  Loader2
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
  <div className="flex items-center justify-center min-h-96 bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED]">
    <div className="text-center">
      <Loader2 className="w-16 h-16 border-t-2 border-[#FFD700] border-solid rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-600">Loading course content...</p>
    </div>
  </div>
));

const CourseNotFound = React.memo(({ onBack }: { onBack: () => void }) => (
  <div className="text-center py-12 bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] min-h-96 flex items-center justify-center">
    <div>
      <BookOpen className="h-16 w-16 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 mb-2">Course Not Found</h3>
      <p className="text-slate-600 mb-4">The course you're looking for doesn't exist.</p>
      <button
        onClick={onBack}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-[#FFD700]/90 to-[#FFC107]/90 hover:from-[#FFC107] hover:to-[#FFB300] transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm border border-[#FFD700]/30"
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

  // Memoized values
  const isAdmin = useMemo(() => user?.role === 'chapter_admin' || user?.role === 'platform_admin', [user?.role]);
  const isOwner = useMemo(() => user?.role === 'teacher' && course?.created_by === user?.id, [user?.role, user?.id, course?.created_by]);
  const isStudent = useMemo(() => user?.role === 'student', [user?.role]);

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
      
      // Load course details
      const coursesResponse = await coursesApi.getCourses();
      const courseData = coursesResponse.data.courses.find((c: any) => c.id === parseInt(courseId));
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

      // Load basic stats (simplified for now)
      setCourseStats({
        totalStudents: 0,
        completionRate: 0,
        averageRating: 4.5,
        totalLessons: lessonsData.length,
        completedLessons: 0,
        activeStudents: 0
      });

    } catch (error) {
      console.error('Failed to load course data:', error);
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

  if (!course) {
    return <CourseNotFound onBack={() => navigate(getBackLink())} />;
  }

  const selectedLessonProgress = selectedLesson ? lessonProgress[selectedLesson.id] : null;
  const isSelectedLessonCompleted = selectedLessonProgress?.is_completed || selectedLesson?.is_completed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Light beige/silver theme - Matching StudentEnrolledCourses */}
        <div className="bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-sm">
          <Link
            to={getBackLink()}
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-700 mb-4 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {getBackLabel()}
          </Link>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-700">{course.title}</h1>
                {course.level && (
                  <span className="px-3 py-1 bg-white/70 backdrop-blur-sm text-slate-700 text-xs font-semibold rounded-full border border-slate-200/50">
                    {course.level}
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-sm mb-3">
                {course.description}
              </p>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center space-x-1.5">
                  <Star className="h-4 w-4 text-[#FFD700] fill-current" />
                  <span className="font-semibold text-slate-700">{courseStats.averageRating.toFixed(1)}</span>
                  <span className="text-slate-500">rating</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Users className="h-4 w-4 text-slate-600" />
                  <span className="font-semibold text-slate-700">{courseStats.totalStudents}</span>
                  <span className="text-slate-500">students</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <PlayCircle className="h-4 w-4 text-slate-600" />
                  <span className="font-semibold text-slate-700">{courseStats.totalLessons}</span>
                  <span className="text-slate-500">lessons</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Clock className="h-4 w-4 text-slate-600" />
                  <span className="font-semibold text-slate-700">{formatDuration(lessons.reduce((acc, l) => acc + (l.duration || 0), 0))}</span>
                  <span className="text-slate-500">total</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Admin/Teacher Actions */}
              {(isAdmin || isOwner) && (
                <Link
                  to={`/teacher/courses/${courseId}/edit`}
                  className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Course
                </Link>
              )}
              <button className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Course Publisher - Only for teachers */}
        {(isAdmin || isOwner) && (
          <CoursePublisher 
            course={course} 
            onPublishSuccess={(updatedCourse) => {
              setCourse(updatedCourse);
            }}
          />
        )}

        {/* Stats Grid - Light cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/85 backdrop-blur-sm rounded-xl p-4 border border-slate-200/40 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-[#42A5F5]/20 to-[#2196F3]/20">
              <Users className="h-4 w-4 text-[#42A5F5]" />
            </div>
            <TrendingUp className="h-3 w-3 text-[#42A5F5]" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800 mb-0.5">{courseStats.totalStudents}</p>
            <p className="text-xs text-slate-600 font-medium">Total Students</p>
          </div>
        </div>

        <div className="bg-white/85 backdrop-blur-sm rounded-xl p-4 border border-slate-200/40 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-[#66BB6A]/20 to-[#4CAF50]/20">
              <BarChart className="h-4 w-4 text-[#66BB6A]" />
            </div>
            <Award className="h-3 w-3 text-[#66BB6A]" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800 mb-0.5">{progressPercentage}%</p>
            <p className="text-xs text-slate-600 font-medium">Your Progress</p>
          </div>
        </div>

        <div className="bg-white/85 backdrop-blur-sm rounded-xl p-4 border border-slate-200/40 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-[#FFD700]/20 to-[#FFC107]/20">
              <Star className="h-4 w-4 text-[#FFD700]" />
            </div>
            <Star className="h-3 w-3 text-[#FFD700] fill-current" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800 mb-0.5">{courseStats.averageRating.toFixed(1)}/5</p>
            <p className="text-xs text-slate-600 font-medium">Average Rating</p>
          </div>
        </div>

        <div className="bg-white/85 backdrop-blur-sm rounded-xl p-4 border border-slate-200/40 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-[#FF7043]/20 to-[#FF5722]/20">
              <PlayCircle className="h-4 w-4 text-[#FF7043]" />
            </div>
            <CheckCircle className="h-3 w-3 text-[#FF7043]" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800 mb-0.5">{isStudent ? studentProgress.completed : courseStats.completedLessons}/{courseStats.totalLessons}</p>
            <p className="text-xs text-slate-600 font-medium">Lessons Progress</p>
          </div>
        </div>
      </div>

        {/* Tab Navigation - Light theme with better design */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200/50 bg-slate-50/30">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3.5 text-sm font-semibold transition-all relative ${
                    activeTab === tab.id
                      ? 'text-[#39FF14] bg-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#39FF14] to-[#00FF41]"></span>
                  )}
                  <Icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-[#39FF14]' : ''}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.id 
                        ? 'bg-gradient-to-r from-[#39FF14]/20 to-[#00FF41]/20 text-[#39FF14] border border-[#39FF14]/30' 
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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
                        <h2 className="text-xl font-bold text-slate-700">{selectedLesson.title}</h2>
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
                    {isStudent && (
                      <button
                        onClick={() => markLessonComplete(selectedLesson.id)}
                        disabled={isSelectedLessonCompleted || markingComplete === selectedLesson.id}
                        className={`px-5 py-2.5 rounded-lg transition-all duration-200 text-sm font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
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
                    <button className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white rounded-lg hover:from-[#FFA500] hover:to-[#FF8C00] transition-all duration-200 text-sm font-bold shadow-lg hover:shadow-xl border border-[#FFD700]/50">
                      <Award className="h-4 w-4 inline mr-2" />
                      Take Quiz
                    </button>
                    <button className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#FF6B9D] to-[#FF8E9B] text-white rounded-lg hover:from-[#FF8E9B] hover:to-[#FFA5B0] transition-all duration-200 text-sm font-bold shadow-lg hover:shadow-xl border border-[#FF6B9D]/50">
                      <Download className="h-4 w-4 inline mr-2" />
                      Resources
                    </button>
                    <button className="px-4 py-2.5 bg-gradient-to-r from-[#00D4FF] to-[#00B8E6] text-white rounded-lg hover:from-[#00B8E6] hover:to-[#0099CC] transition-all duration-200 shadow-lg hover:shadow-xl border border-[#00D4FF]/50">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>

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

            {/* Progress Summary - Neon green theme */}
            {isStudent && (
              <div className="bg-gradient-to-br from-[#39FF14]/10 via-[#00FF41]/10 to-[#00E676]/10 rounded-xl border-2 border-[#39FF14]/30 p-5 shadow-lg">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-[#39FF14]" />
                  Your Progress
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-bold text-slate-800 mb-2">
                      <span>Course Completion</span>
                      <span className="text-[#39FF14] text-lg">
                        {progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-[#39FF14] via-[#00FF41] to-[#00E676] h-3 rounded-full transition-all duration-500 shadow-sm"
                        style={{ 
                          width: `${progressPercentage}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 font-medium">
                      {studentProgress.completed} of {studentProgress.total} lessons completed
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Lessons List */}
            <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-slate-200/50 bg-slate-50/50">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center">
                    <PlayCircle className="mr-1.5 h-4 w-4 text-[#FFD700]" />
                    Course Lessons
                  </span>
                  <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full">
                    {filteredLessons.length}
                  </span>
                </h3>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto p-3 space-y-2">
                {filteredLessons.length > 0 ? (
                  filteredLessons.map((lesson, index) => {
                    const progress = lessonProgress[lesson.id];
                    const isCompleted = progress?.is_completed || lesson.is_completed;
                    const lessonProgressPercent = progress ? Math.round(progress.progress * 100) : 0;
                    const isSelected = selectedLesson?.id === lesson.id;
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson)}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                          isSelected
                            ? 'border-[#FFD700] bg-gradient-to-r from-[#FFD700]/10 to-[#FFC107]/10 shadow-sm'
                            : 'border-slate-200/50 hover:border-[#FFD700]/50 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start space-x-2.5">
                          <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm ${
                            isCompleted
                              ? 'bg-gradient-to-r from-[#39FF14] to-[#00FF41] text-white border border-[#39FF14]/50'
                              : isSelected
                              ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white border border-[#FFD700]/50'
                              : 'bg-slate-200 text-slate-700 border border-slate-300/50'
                          }`}>
                            {isCompleted ? <CheckCircle className="h-4 w-4" /> : (lesson.order !== undefined ? lesson.order + 1 : index + 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-semibold mb-0.5 ${
                              isSelected ? 'text-slate-900' : 'text-slate-700'
                            }`}>
                              {lesson.title}
                            </h4>
                            <div className="flex items-center space-x-2 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
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
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Circle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No lessons found</p>
                  </div>
                )}
              </div>

              {lessons.length === 0 && (
                <div className="p-6 text-center border-t border-slate-200/50">
                  <Video className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm mb-3">No lessons yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
        <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-700 mb-3">Course Overview</h2>
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
        <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-700 mb-4">Course Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-slate-200/50 rounded-lg hover:border-[#FFD700]/50 hover:bg-[#FFD700]/5 transition-all">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-[#FFD700]/20 rounded-lg">
                    <Download className="h-4 w-4 text-[#FFD700]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700">Resource {i}</h4>
                    <p className="text-xs text-slate-500">PDF Document</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-[#FF6B9D] to-[#FF8E9B] text-white rounded-lg hover:from-[#FF8E9B] hover:to-[#FFA5B0] transition-all duration-200 text-xs font-bold shadow-lg hover:shadow-xl border border-[#FF6B9D]/50">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

        {/* Discussions Tab */}
        {activeTab === 'discussions' && (
        <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-700 mb-4">Course Discussions</h2>
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
