import React, { useState } from 'react';
import { FileText, Shield, Tag, BookOpen } from 'lucide-react';
import ContentManagement from './ContentManagement';
import ModerationTools from '@/components/admin/ModerationTools';
import TagManager from '@/components/admin/TagManager';
import AllCourses from './AllCourses';

const AdminContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'uploads' | 'moderation' | 'tags' | 'courses'>('uploads');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8 text-[#E74C3C]" />
            Content Management
          </h1>
          <p className="text-gray-600">Manage uploads, moderation, tags, and courses</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('uploads')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'uploads'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span>Upload Queue</span>
            </button>
            <button
              onClick={() => setActiveTab('moderation')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'moderation'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Shield className="h-5 w-5" />
              <span>Moderation</span>
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'tags'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Tag className="h-5 w-5" />
              <span>Tags & Categories</span>
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'courses'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span>Courses</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'uploads' && (
              <div className="animate-in fade-in duration-300">
                <ContentManagement />
              </div>
            )}
            {activeTab === 'moderation' && (
              <div className="animate-in fade-in duration-300">
                <ModerationTools />
              </div>
            )}
            {activeTab === 'tags' && (
              <div className="animate-in fade-in duration-300">
                <TagManager />
              </div>
            )}
            {activeTab === 'courses' && (
              <div className="animate-in fade-in duration-300">
                <AllCourses />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminContentPage;

