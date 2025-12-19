import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Video, Library, ArrowLeft, Layout } from 'lucide-react';
import { brandColors } from '@/theme/brand';
import TeacherResourceManager from './components/TeacherResourceManager';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Lazy load heavy component
const RecordVideo = React.lazy(() => import('./RecordVideo'));

const TeacherContentPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const lessonId = searchParams.get('lessonId') || undefined;
  const courseId = searchParams.get('courseId') || undefined;
  const tabParam = searchParams.get('tab') as 'record' | 'resources' | null;

  const [activeTab, setActiveTab] = useState<'record' | 'resources'>('record');

  // Set active tab from URL parameter
  useEffect(() => {
    if (tabParam && ['record', 'resources'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'record' | 'resources') => {
    setActiveTab(tab);
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    });
  };

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

              {/* Tabs */}
              <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                <button
                  onClick={() => handleTabChange('record')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'record'
                    ? 'bg-white shadow-sm ring-1 ring-black/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  style={activeTab === 'record' ? { color: brandColors.primaryHex } : {}}
                >
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('teacher_content.tabs.video_studio', 'Video Studio')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('resources')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'resources'
                    ? 'bg-white shadow-sm ring-1 ring-black/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  style={activeTab === 'resources' ? { color: brandColors.primaryHex } : {}}
                >
                  <Library className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('teacher_content.tabs.resources', 'Resources')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {/* Removed overflow-hidden and relative from parent to avoid double scrollbars */}
        <div className="flex-1">
          {activeTab === 'record' ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            </div>
          ) : (
            // Resources component handles its own internal layout/scrolling better when given full height
            // We use a specific height calc or h-full depending on desired layout, but basic padding wrapper is safe
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-64px)]">
              <ErrorBoundary>
                <TeacherResourceManager lessonId={lessonId} />
              </ErrorBoundary>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TeacherContentPage;

