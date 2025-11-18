import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Video, Upload, FolderOpen } from 'lucide-react';
import UploadResource from './UploadResource';
import LessonResources from '@/components/shared/courses/LessonResources';

// Lazy load heavy component
const RecordVideo = React.lazy(() => import('./RecordVideo'));

const TeacherContentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const lessonId = searchParams.get('lessonId') || undefined;
  const courseId = searchParams.get('courseId') || undefined;
  const tabParam = searchParams.get('tab') as 'record' | 'upload' | 'resources' | null;

  const [activeTab, setActiveTab] = useState<'record' | 'upload' | 'resources'>('record');

  // Set active tab from URL parameter
  useEffect(() => {
    if (tabParam && ['record', 'upload', 'resources'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Compact Header */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Video className="h-5 w-5 text-[#2980B9]" />
            Content Creation
          </h1>
        </div>

        {/* Compact Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('record')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'record'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Video className="h-4 w-4" />
              <span>Record Video</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'upload'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>Upload Resources</span>
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'resources'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              <span>My Resources</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'record' && (
              <div className="animate-in fade-in duration-300 h-full">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-12 h-12 border-t-4 border-[#2980B9] border-solid rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading video recorder...</p>
                    </div>
                  </div>
                }>
                  <RecordVideo courseId={courseId} lessonId={lessonId} />
                </Suspense>
              </div>
            )}
            {activeTab === 'upload' && (
              <div className="animate-in fade-in duration-300">
                <UploadResource />
              </div>
            )}
            {activeTab === 'resources' && (
              <div className="animate-in fade-in duration-300 p-3">
                {lessonId ? (
                  <LessonResources
                    lessonId={parseInt(lessonId)}
                    courseId={courseId}
                    isTeacher={true}
                  />
                ) : (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 text-center">
                    <FolderOpen className="h-12 w-12 text-[#2980B9] mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Lesson Resources</h3>
                    <p className="text-sm text-gray-600">Select a lesson to manage its resources</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Resources are organized by lesson for better learning flow
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherContentPage;

