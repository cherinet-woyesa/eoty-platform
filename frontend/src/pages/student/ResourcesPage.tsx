import React, { useState } from 'react';
import { FolderOpen, HelpCircle } from 'lucide-react';
import ResourceLibrary from '@/pages/shared/resources/ResourceLibrary';
import HelpPage from './HelpPage';

const ResourcesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'help'>('library');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FolderOpen className="h-8 w-8 text-[#27AE60]" />
            Resources
          </h1>
          <p className="text-gray-600">Access learning materials and get support</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${
                activeTab === 'library'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <FolderOpen className="h-5 w-5" />
              <span>Resource Library</span>
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${
                activeTab === 'help'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <HelpCircle className="h-5 w-5" />
              <span>Help Center</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'library' && (
              <div className="animate-in fade-in duration-300">
                <ResourceLibrary hideHeader={true} />
              </div>
            )}
            {activeTab === 'help' && (
              <div className="animate-in fade-in duration-300">
                <HelpPage />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;

