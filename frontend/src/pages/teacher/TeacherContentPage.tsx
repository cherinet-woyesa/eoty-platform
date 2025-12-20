import React, { Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Layout } from 'lucide-react';
import { brandColors } from '@/theme/brand';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LessonResourcesPanel from './components/LessonResourcesPanel';

// Lazy load heavy component
const RecordVideo = React.lazy(() => import('./RecordVideo'));

const TeacherContentPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const lessonId = searchParams.get('lessonId') || undefined;
  const courseId = searchParams.get('courseId') || undefined;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col">
        {/* Header Section */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                {(lessonId || courseId) && (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                    title={t('teacher_content.go_back')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColors.primaryHex}0D` }}>
                    <Layout className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 leading-none">
                      {t('teacher_content.title', 'Content Studio')}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                      {lessonId ? t('teacher_content.subtitle_edit', 'Editing Lesson Content') : t('teacher_content.subtitle_create', 'Create & Manage Content')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-8">
          {/* Video Recorder */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[600px]">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center h-[600px]">
                <LoadingSpinner size="lg" text={t('teacher_content.loading_studio')} variant="logo" />
              </div>
            }>
              <RecordVideo
                courseId={courseId}
                lessonId={lessonId}
                variant="embedded"
                onSuccess={(newLessonId) => {
                  setSearchParams(prev => {
                    prev.set('lessonId', newLessonId);
                    return prev;
                  });
                }}
              />
            </Suspense>
          </div>

          {/* Resources Panel - Only shown when lesson exists */}
          {lessonId && (
            <ErrorBoundary>
              <LessonResourcesPanel lessonId={lessonId} />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TeacherContentPage;

