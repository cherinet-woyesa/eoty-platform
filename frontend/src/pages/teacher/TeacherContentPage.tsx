import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Video, FolderOpen, Sparkles, ArrowLeft, Layout, Library } from 'lucide-react';
import TeacherResourceManager from './components/TeacherResourceManager';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
      {/* Compact Header */}
      <div className="border-b border-stone-200 px-4 py-2 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-4">
          {(lessonId || courseId) && (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500"
              title={t('teacher_content.go_back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          
          {/* Compact Tabs */}
          <div className="flex bg-stone-100 p-1 rounded-lg">
            <button
              onClick={() => handleTabChange('record')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'record'
                  ? 'bg-white text-[#27AE60] shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Video className="h-4 w-4" />
              <span>{t('teacher_content.tabs.video_studio')}</span>
            </button>
            <button
              onClick={() => handleTabChange('resources')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'resources'
                  ? 'bg-white text-[#27AE60] shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Library className="h-4 w-4" />
              <span>{t('teacher_content.tabs.resources')}</span>
            </button>
          </div>
        </div>

        {/* Context Badge */}
        {(lessonId || courseId) && (
          <div className="hidden sm:inline-flex items-center px-3 py-1 bg-stone-50 border border-stone-200 rounded-full text-xs font-medium text-stone-600">
            <Sparkles className="h-3.5 w-3.5 text-[#27AE60] mr-1.5" />
            {lessonId ? t('teacher_content.context.editing_lesson') : t('teacher_content.context.course_mode')}
          </div>
        )}
      </div>

      {/* Main Content - Full Space */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'record' ? (
          <div className="h-full w-full overflow-y-auto">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center h-full">
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
          <div className="h-full overflow-y-auto p-6">
            <TeacherResourceManager lessonId={lessonId} courseId={courseId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherContentPage;

