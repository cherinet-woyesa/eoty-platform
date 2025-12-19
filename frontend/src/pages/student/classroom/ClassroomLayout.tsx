import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  Menu, 
  MessageSquare, 
  FileText, 
  Info,
  ChevronRight
} from 'lucide-react';
import ClassroomSidebar from './ClassroomSidebar';
import UnifiedVideoPlayer from '@/components/shared/courses/UnifiedVideoPlayer';
import { coursesApi, interactiveApi } from '@/services/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Types (should be moved to a shared types file)
interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration: number;
  completed: boolean;
  order: number;
  type: 'video' | 'article' | 'quiz';
  resources?: any[];
  video_provider?: 'mux' | 's3';
  mux_playback_id?: string;
  mux_asset_id?: string;
  mux_status?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  progress: number;
}

const ClassroomLayout: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'discussion'>('overview');

  // Fetch Course & Lesson Data
  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch course details
        const courseRes = await coursesApi.getCourseById(courseId);
        const courseData = courseRes.data.course;
        
        // Fetch lessons
        const lessonsRes = await coursesApi.getLessons(courseId);
        const lessonsData = lessonsRes.data.lessons || [];
        
        // Fetch progress for each lesson
        const progressPromises = lessonsData.map(async (lesson: Lesson) => {
          try {
            const progressRes = await interactiveApi.getLessonProgress(lesson.id);
            if (progressRes.success && progressRes.data?.progress) {
              return {
                ...lesson,
                completed: progressRes.data.progress.is_completed,
                // Store progress if needed for resume functionality
              };
            }
          } catch (e) {
            // Ignore error
          }
          return lesson;
        });
        
        const lessonsWithProgress = await Promise.all(progressPromises);
        
        // Calculate course progress
        const totalLessons = lessonsWithProgress.length;
        const completedLessons = lessonsWithProgress.filter((l: Lesson) => l.completed).length;
        const courseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        
        // Combine data
        const fullCourse = {
          ...courseData,
          lessons: lessonsWithProgress,
          progress: courseProgress
        };
        
        setCourse(fullCourse);
        
        // Set active lesson
        if (lessonId) {
          const found = lessonsWithProgress.find((l: Lesson) => l.id === lessonId);
          if (found) setActiveLesson(found);
        } else if (lessonsWithProgress.length > 0) {
          // Default to first lesson if none specified
          setActiveLesson(lessonsWithProgress[0]);
          // Update URL to reflect the default lesson
          navigate(`/classroom/${courseId}/lesson/${lessonsWithProgress[0].id}`, { replace: true });
        }
      } catch (error) {
        console.error('Failed to load classroom data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId, lessonId, navigate]);

  const handleLessonSelect = (id: string) => {
    navigate(`/classroom/${courseId}/lesson/${id}`);
  };

  const handleNextLesson = () => {
    if (!course || !activeLesson) return;
    const currentIndex = course.lessons.findIndex(l => l.id === activeLesson.id);
    if (currentIndex < course.lessons.length - 1) {
      const nextLesson = course.lessons[currentIndex + 1];
      handleLessonSelect(nextLesson.id);
    }
  };

  const handlePrevLesson = () => {
    if (!course || !activeLesson) return;
    const currentIndex = course.lessons.findIndex(l => l.id === activeLesson.id);
    if (currentIndex > 0) {
      const prevLesson = course.lessons[currentIndex - 1];
      handleLessonSelect(prevLesson.id);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!course || !activeLesson) return <div>Course not found</div>;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
              title={t('common.back_to_dashboard')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="font-bold text-gray-900 text-lg truncate max-w-xl">
              {activeLesson.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${
                sidebarOpen ? 'bg-indigo-50 text-[#1e1b4b]' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-black">
          <div className="max-w-6xl mx-auto w-full">
            {/* Video Player Container */}
            <div className="aspect-video w-full bg-black shadow-2xl">
              <UnifiedVideoPlayer
                lesson={activeLesson}
                autoPlay={false}
                courseTitle={course.title}
              />
            </div>

            {/* Lesson Details & Tabs */}
            <div className="bg-white min-h-[500px]">
              <div className="border-b border-gray-200 px-6">
                <nav className="flex gap-6 -mb-px">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-[#1e1b4b] text-[#1e1b4b]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      {t('classroom.overview', 'Overview')}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('resources')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'resources'
                        ? 'border-[#1e1b4b] text-[#1e1b4b]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('classroom.resources', 'Resources')}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('discussion')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'discussion'
                        ? 'border-[#1e1b4b] text-[#1e1b4b]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t('classroom.discussion', 'Discussion')}
                    </div>
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="max-w-3xl animate-in fade-in duration-300">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{activeLesson.title}</h2>
                    <div className="prose prose-indigo max-w-none text-gray-600">
                      {activeLesson.description}
                    </div>
                    
                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-100">
                      <button
                        onClick={handlePrevLesson}
                        disabled={course.lessons[0].id === activeLesson.id}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {t('common.previous_lesson', 'Previous Lesson')}
                      </button>
                      
                      <button
                        onClick={handleNextLesson}
                        disabled={course.lessons[course.lessons.length - 1].id === activeLesson.id}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#1e1b4b] text-white rounded-lg hover:bg-[#312e81] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                      >
                        {t('common.next_lesson', 'Next Lesson')}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                {activeTab === 'resources' && (
                  <div className="animate-in fade-in duration-300">
                    <p className="text-gray-500 italic">Resources content coming soon...</p>
                  </div>
                )}
                
                {activeTab === 'discussion' && (
                  <div className="animate-in fade-in duration-300">
                    <p className="text-gray-500 italic">Discussion forum coming soon...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <ClassroomSidebar
          lessons={course.lessons}
          activeLessonId={activeLesson.id}
          onSelectLesson={handleLessonSelect}
          courseTitle={course.title}
          progress={course.progress}
        />
      )}
    </div>
  );
};

export default ClassroomLayout;
