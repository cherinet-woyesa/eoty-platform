import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Video, Library, ArrowLeft, Sparkles, Layout } from 'lucide-react';
// brandColors not used here
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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex flex-col">
        {/* Header Section */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                {(lessonId || courseId) && (
                  <button 
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-all"
                    title={t('teacher_content.go_back')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Layout className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-stone-900 leading-none">
                      {t('teacher_content.title', 'Content Studio')}
                    </h1>
                    <p className="text-xs text-stone-500 mt-1">
                      {lessonId ? t('teacher_content.subtitle_edit', 'Editing Lesson Content') : t('teacher_content.subtitle_create', 'Create & Manage Content')}
                    </p>
                  </div>
                </div>

                {/* Context Badge */}
                {(lessonId || courseId) && (
                  <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium ml-4">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    {lessonId ? t('teacher_content.context.editing_lesson') : t('teacher_content.context.course_mode')}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex bg-stone-100/80 p-1 rounded-xl border border-stone-200/50">
                <button
                  onClick={() => handleTabChange('record')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'record'
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
                >
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('teacher_content.tabs.video_studio')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('resources')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'resources'
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
                >
                  <Library className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('teacher_content.tabs.resources')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-full">
              {activeTab === 'record' ? (
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden min-h-[600px]">
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
              ) : (
                <div className="h-full">
                  <TeacherResourceManager lessonId={lessonId} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TeacherContentPage;

