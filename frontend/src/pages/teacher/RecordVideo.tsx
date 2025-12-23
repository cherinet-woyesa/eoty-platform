import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Video, BookOpen, TrendingUp, Loader2, Plus, CheckCircle, ChevronDown
} from 'lucide-react';
import EnhancedVideoRecorder from '@/components/shared/courses/EnhancedVideoRecorder';
import { coursesApi } from '@/services/api';
import { brandColors } from '@/theme/brand';

interface RecordVideoProps {
  courseId?: string;
  lessonId?: string;
  variant?: 'full' | 'embedded';
  onSuccess?: (lessonId: string) => void;
}

const RecordVideo: React.FC<RecordVideoProps> = ({
  courseId: propCourseId,
  lessonId: propLessonId,
  variant = 'full',
  onSuccess
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlLessonId = searchParams.get('lessonId') || undefined;
  const urlCourseId = searchParams.get('courseId') || undefined;

  // Use props if provided, otherwise fall back to URL params
  const lessonId = propLessonId || urlLessonId;
  const initialCourseId = propCourseId || urlCourseId;

  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(initialCourseId);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [showCourseSelector, setShowCourseSelector] = useState(false);

  
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoadingCourses(true);
        const response = await coursesApi.getCourses();
        // Safety check for response structure
        if (response && response.data && Array.isArray(response.data.courses)) {
          setCourses(response.data.courses);
        } else {
          setCourses([]);
        }
      } catch (error) {
        console.error('Failed to fetch courses', error);
        setCourses([]);
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    }
  }, [initialCourseId]);

  // Determine the mode and title
  const isNewLesson = !lessonId;
  const pageTitle = isNewLesson ? t('record_video.create_new_lesson') : t('record_video.record_video_for_lesson');
  const pageSubtitle = isNewLesson
    ? t('record_video.create_new_lesson_desc')
    : t('record_video.record_video_desc');

  const [showTips, setShowTips] = useState(false);

  // If embedded, we skip the page wrapper styles
  const containerClasses = variant === 'full'
    ? "w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen"
    : "w-full min-h-full relative";

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourseId(courseId);
    setShowCourseSelector(false);
  };

  const selectedCourse = courses.find(c => String(c.id) === String(selectedCourseId));

  if (isLoadingCourses && variant === 'full') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={containerClasses}>

      {/* Header with mode indication - Only show in full mode */}
      {variant === 'full' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="p-2 rounded-lg border"
                style={{
                  backgroundColor: `${brandColors.primaryHex}0D`, // 0.05 opacity
                  borderColor: `${brandColors.primaryHex}1A`, // 0.1 opacity
                }}
              >
                {isNewLesson ? (
                  <BookOpen className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
                ) : (
                  <Video className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
                <p className="text-sm text-gray-600">{pageSubtitle}</p>
              </div>
            </div>

            {/* Mode indicator removed as per requirements */}
            <div className="flex items-center gap-3">


              {/* Course Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCourseSelector(!showCourseSelector)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedCourseId
                      ? 'text-white hover:opacity-90'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  style={selectedCourseId ? { backgroundColor: brandColors.primaryHex, borderColor: brandColors.primaryHex } : {}}
                >
                  <BookOpen className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">
                    {selectedCourse ? selectedCourse.title : t('record_video.select_course_optional')}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </button>

                {showCourseSelector && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('record_video.select_target_course')}</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                      <button
                        onClick={() => handleCourseSelect('')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${!selectedCourseId ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        <div className="w-2 h-2 rounded-full border border-gray-300 bg-white"></div>
                        {t('record_video.no_course_selected')}
                      </button>
                      {courses.map(course => (
                        <button
                          key={course.id}
                          onClick={() => handleCourseSelect(String(course.id))}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${String(selectedCourseId) === String(course.id)
                              ? 'font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          style={String(selectedCourseId) === String(course.id) ? { backgroundColor: `${brandColors.primaryHex}1A`, color: brandColors.primaryHex } : {}}
                        >
                          {course.thumbnail ? (
                            <img src={course.thumbnail} alt="" className="w-5 h-5 rounded object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-[10px]">
                              {course.title.charAt(0)}
                            </div>
                          )}
                          <span className="truncate">{course.title}</span>
                          {String(selectedCourseId) === String(course.id) && (
                            <CheckCircle className="h-3 w-3 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                      <Link
                        to="/teacher/courses/new"
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
                        style={{ ':hover': { color: brandColors.primaryHex, borderColor: `${brandColors.primaryHex}4D` } } as any}
                      >
                        <Plus className="h-3 w-3" />
                        {t('record_video.create_new_course')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowTips(!showTips)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
            >
              <TrendingUp className="h-4 w-4" />
              {showTips ? t('record_video.hide_tips') : t('record_video.recording_tips')}
            </button>
            <Link
              to="/teacher/courses"
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium shadow-sm"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('record_video.back_to_courses')}
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
              {t('record_video.pro_tips_title')}
            </h3>
            {variant === 'embedded' && (
              <button onClick={() => setShowTips(false)} className="text-blue-500 hover:text-blue-700">
                <span className="sr-only">{t('record_video.close')}</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/60 p-3 rounded-lg border border-blue-100/50">
              <p className="text-xs font-medium text-blue-900 mb-1">{t('record_video.tips.lighting_title')}</p>
              <p className="text-xs text-blue-700">{t('record_video.tips.lighting_desc')}</p>
            </div>
            <div className="bg-white/60 p-3 rounded-lg border border-blue-100/50">
              <p className="text-xs font-medium text-blue-900 mb-1">{t('record_video.tips.audio_title')}</p>
              <p className="text-xs text-blue-700">{t('record_video.tips.audio_desc')}</p>
            </div>
            <div className="bg-white/60 p-3 rounded-lg border border-blue-100/50">
              <p className="text-xs font-medium text-blue-900 mb-1">{t('record_video.tips.engagement_title')}</p>
              <p className="text-xs text-blue-700">{t('record_video.tips.engagement_desc')}</p>
            </div>
          </div>
        </div>
      )}

      <div className={`${variant === 'full' ? 'grid grid-cols-1 gap-6' : 'h-full'}`}>
        {/* Main Recording Area */}
        <div className={`${variant === 'full' ? 'w-full space-y-6' : 'h-full'}`}>
          <EnhancedVideoRecorder
            courseId={selectedCourseId}
            lessonId={lessonId}
            variant={variant === 'embedded' ? 'embedded' : 'default'}
            onToggleTips={() => setShowTips(!showTips)}
            onUploadComplete={(completedLessonId) => {
              if (onSuccess) {
                onSuccess(completedLessonId);
                return;
              }

              // Redirect back to upload page after successful upload
              navigate('/teacher/content');
            }}
          />
        </div>

        {/* Sidebar with Stats and Quick Actions - Moved below or removed if not needed, but user said "increase container" so we remove the sidebar constraint */}
        {/* We can keep the stats but maybe make them horizontal or less intrusive if needed, but for now just making the main area full width */}
      </div>
    </div>
  );
};

export default RecordVideo;