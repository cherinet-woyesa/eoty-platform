import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Video, BookOpen, Users, TrendingUp, FileVideo
} from 'lucide-react';
import EnhancedVideoRecorder from '@/components/shared/courses/EnhancedVideoRecorder';
import { teacherApi } from '@/services/api/teacher';

interface RecordVideoProps {
  courseId?: string;
  lessonId?: string;
  variant?: 'full' | 'embedded';
}

const RecordVideo: React.FC<RecordVideoProps> = ({ 
  courseId: propCourseId, 
  lessonId: propLessonId,
  variant = 'full'
}) => {
  const [searchParams] = useSearchParams();
  const urlLessonId = searchParams.get('lessonId') || undefined;
  const urlCourseId = searchParams.get('courseId') || undefined;

  // Use props if provided, otherwise fall back to URL params
  const lessonId = propLessonId || urlLessonId;
  const courseId = propCourseId || urlCourseId;

  const [stats, setStats] = useState({
    totalVideos: 0,
    totalStudents: 0,
    averageRating: 0,
    thisMonth: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await teacherApi.getDashboardStats();
        const data = res.data || res; // handle both {data:{}} or plain object
        setStats({
          totalVideos: data.totalLessons ?? 0,
          totalStudents: data.totalStudentsEnrolled ?? 0,
          averageRating: Number(data.averageCourseRating) || 0,
          thisMonth: data.lessonsRecordedThisMonth ?? 0
        });
      } catch (error) {
        // Fallback: keep zeros, don't break recording UI
        console.warn('Failed to load teacher recording stats:', error);
      }
    };

    void loadStats();
  }, []);

  // Determine the mode and title
  const isNewLesson = !lessonId;
  const pageTitle = isNewLesson ? 'Create New Lesson' : 'Record Video for Lesson';
  const pageSubtitle = isNewLesson
    ? 'Record a video and create a new lesson in your course'
    : 'Record a new video for your existing lesson';

  const [showTips, setShowTips] = useState(false);

  // If embedded, we skip the page wrapper styles
  const containerClasses = variant === 'full' 
    ? "w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen"
    : "w-full min-h-full relative";

  return (
    <div className={containerClasses}>

      {/* Header with mode indication - Only show in full mode */}
      {variant === 'full' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${
                isNewLesson
                  ? 'bg-[#27AE60]/10 border border-[#27AE60]/20'
                  : 'bg-[#2980B9]/10 border border-[#2980B9]/20'
              }`}>
                {isNewLesson ? (
                  <BookOpen className={`h-6 w-6 ${isNewLesson ? 'text-[#27AE60]' : 'text-[#2980B9]'}`} />
                ) : (
                  <Video className={`h-6 w-6 ${isNewLesson ? 'text-[#27AE60]' : 'text-[#2980B9]'}`} />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-stone-900">{pageTitle}</h1>
                <p className="text-sm text-stone-600">{pageSubtitle}</p>
              </div>
            </div>

            {/* Mode indicator */}
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              isNewLesson
                ? 'bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/20'
                : 'bg-[#2980B9]/10 text-[#2980B9] border border-[#2980B9]/20'
            }`}>
              {isNewLesson ? '📝 New Lesson Mode' : '🎬 Recording Mode'}
            </div>
          </div>

          <div className="flex gap-3">
             <button 
              onClick={() => setShowTips(!showTips)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors text-sm font-medium shadow-sm"
            >
              <TrendingUp className="h-4 w-4" />
              {showTips ? 'Hide Tips' : 'Recording Tips'}
            </button>
            <Link 
              to="/teacher/courses"
              className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors text-sm font-medium shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Courses
            </Link>
          </div>
        </div>
      )}

      {/* Recording Tips - Collapsible / Overlay */}
      {showTips && (
        <div className={`${variant === 'embedded' ? 'absolute top-16 right-4 z-50 w-full max-w-md shadow-xl' : 'mb-6'} bg-blue-50/95 backdrop-blur-sm border border-blue-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-4 duration-300`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-blue-800 flex items-center">
              <Video className="h-4 w-4 mr-2" />
              Pro Tips for Great Recordings
            </h3>
            {variant === 'embedded' && (
              <button onClick={() => setShowTips(false)} className="text-blue-500 hover:text-blue-700">
                <span className="sr-only">Close</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/60 p-3 rounded-lg border border-blue-100/50">
              <p className="text-xs font-medium text-blue-900 mb-1">Lighting</p>
              <p className="text-xs text-blue-700">Face a window or light source. Avoid backlighting which makes you look like a silhouette.</p>
            </div>
            <div className="bg-white/60 p-3 rounded-lg border border-blue-100/50">
              <p className="text-xs font-medium text-blue-900 mb-1">Audio</p>
              <p className="text-xs text-blue-700">Use a headset or external mic if possible. Minimize background noise and echo.</p>
            </div>
            <div className="bg-white/60 p-3 rounded-lg border border-blue-100/50">
              <p className="text-xs font-medium text-blue-900 mb-1">Engagement</p>
              <p className="text-xs text-blue-700">Look at the camera lens, not your screen. Keep videos short (5-10 mins) and focused.</p>
            </div>
          </div>
        </div>
      )}

      <div className={`${variant === 'full' ? 'grid grid-cols-1 xl:grid-cols-4 gap-6' : 'h-full'}`}>
        {/* Main Recording Area */}
        <div className={`${variant === 'full' ? 'xl:col-span-3 space-y-6' : 'h-full'}`}>
          <EnhancedVideoRecorder 
            courseId={courseId} 
            lessonId={lessonId} 
            variant={variant === 'embedded' ? 'embedded' : 'default'}
            onToggleTips={() => setShowTips(!showTips)}
          />
        </div>

        {/* Sidebar with Stats and Quick Actions */}
        {variant === 'full' && (
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-stone-800 flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4 text-[#27AE60]" />
                  Your Impact
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wide text-stone-500 font-medium">
                      This Month
                    </span>
                    <Video className="h-3.5 w-3.5 text-[#27AE60]" />
                  </div>
                  <p className="text-xl font-bold text-stone-900">{stats.thisMonth}</p>
                  <p className="text-[10px] text-stone-500">New videos</p>
                </div>
                <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wide text-stone-500 font-medium">
                      Library
                    </span>
                    <FileVideo className="h-3.5 w-3.5 text-[#16A085]" />
                  </div>
                  <p className="text-xl font-bold text-stone-900">{stats.totalVideos}</p>
                  <p className="text-[10px] text-stone-500">Total videos</p>
                </div>
                <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wide text-stone-500 font-medium">
                      Students
                    </span>
                    <Users className="h-3.5 w-3.5 text-[#2980B9]" />
                  </div>
                  <p className="text-xl font-bold text-stone-900">{stats.totalStudents}</p>
                  <p className="text-[10px] text-stone-500">Enrolled</p>
                </div>
                <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wide text-stone-500 font-medium">
                      Rating
                    </span>
                    <BookOpen className="h-3.5 w-3.5 text-[#F39C12]" />
                  </div>
                  <p className="text-xl font-bold text-stone-900">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
                  </p>
                  <p className="text-[10px] text-stone-500">Avg. Rating</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/teacher/courses/new"
                  className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-[#27AE60]/30 hover:bg-[#27AE60]/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#27AE60]/10 flex items-center justify-center group-hover:bg-[#27AE60]/20 transition-colors">
                    <BookOpen className="h-5 w-5 text-[#27AE60]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-stone-800">Create Course</span>
                    <span className="text-xs text-stone-500">Start a new series</span>
                  </div>
                </Link>
                
                <Link
                  to="/teacher/courses"
                  className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-[#2980B9]/30 hover:bg-[#2980B9]/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#2980B9]/10 flex items-center justify-center group-hover:bg-[#2980B9]/20 transition-colors">
                    <FileVideo className="h-5 w-5 text-[#2980B9]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-stone-800">Manage Content</span>
                    <span className="text-xs text-stone-500">Edit existing videos</span>
                  </div>
                </Link>

                <Link
                  to="/teacher/students"
                  className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-[#8E44AD]/30 hover:bg-[#8E44AD]/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#8E44AD]/10 flex items-center justify-center group-hover:bg-[#8E44AD]/20 transition-colors">
                    <Users className="h-5 w-5 text-[#8E44AD]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-stone-800">Students</span>
                    <span className="text-xs text-stone-500">View engagement</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordVideo;