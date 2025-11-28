import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Video, FolderOpen, Sparkles } from 'lucide-react';
import TeacherResourceManager from './components/TeacherResourceManager';

// Lazy load heavy component
const RecordVideo = React.lazy(() => import('./RecordVideo'));

const TeacherContentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
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

  return (
    <div className="w-full h-full bg-gray-50/50">
      <div className="w-full max-w-7xl mx-auto space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Dynamic Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-[#2980B9] to-[#27AE60] rounded-lg shadow-sm">
                {activeTab === 'record' ? (
                  <Video className="h-5 w-5 text-white" />
                ) : (
                  <FolderOpen className="h-5 w-5 text-white" />
                )}
              </div>
              {lessonId ? 'Lesson Content Manager' : 'Content Creation Studio'}
            </h1>
            <p className="text-sm text-gray-600 mt-0.5 ml-11">
              {lessonId 
                ? 'Create video content and manage resources for this lesson' 
                : 'Create and manage your educational content library'}
            </p>
          </div>
          
          {/* Context Badge */}
          {(lessonId || courseId) && (
            <div className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm text-xs font-medium text-gray-600">
              <Sparkles className="h-3.5 w-3.5 text-[#27AE60] mr-1.5" />
              {lessonId ? 'Editing Lesson Content' : 'Course Mode'}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col min-h-[calc(100vh-10rem)]">
          {/* Tab Content - Simplified to only show RecordVideo */}
          <div className="flex-1 p-4 sm:p-6 bg-white overflow-y-auto">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-12 h-12 border-4 border-[#2980B9] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500 font-medium">Loading Studio...</p>
                </div>
              }>
                <RecordVideo courseId={courseId} lessonId={lessonId} variant="embedded" />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherContentPage;

