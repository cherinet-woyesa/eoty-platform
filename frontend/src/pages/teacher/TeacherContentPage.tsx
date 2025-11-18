import React, { useState, Suspense } from 'react';
import { Video, Upload, FolderOpen } from 'lucide-react';
import UploadResource from './UploadResource';

// Lazy load heavy component
const RecordVideo = React.lazy(() => import('./RecordVideo'));

const TeacherContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'upload' | 'resources'>('record');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Video className="h-5 w-5 text-[#2980B9]" />
            Content Creation
          </h1>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('record')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'record'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Video className="h-5 w-5" />
              <span>Record Video</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'upload'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Upload className="h-5 w-5" />
              <span>Upload Resources</span>
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'resources'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <FolderOpen className="h-5 w-5" />
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
                  <RecordVideo />
                </Suspense>
              </div>
            )}
            {activeTab === 'upload' && (
              <div className="animate-in fade-in duration-300">
                <UploadResource />
              </div>
            )}
            {activeTab === 'resources' && (
              <div className="animate-in fade-in duration-300 p-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 text-center">
                  <FolderOpen className="h-16 w-16 text-[#2980B9] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">My Resources</h3>
                  <p className="text-gray-600">View and manage all your uploaded resources</p>
                  {/* TODO: Implement resource library view */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherContentPage;

