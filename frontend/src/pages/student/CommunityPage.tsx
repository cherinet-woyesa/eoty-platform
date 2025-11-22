import React, { useState } from 'react';
import { Users, MessageSquare, UsersIcon, Sparkles } from 'lucide-react';
import CommunityHub from '@/pages/shared/social/CommunityHub';
import StudyGroupsPage from './StudyGroupsPage';
import Forums from '@/pages/shared/social/Forums';
import ChaptersPage from '@/pages/shared/chapters/ChaptersPage';

const CommunityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'feed' | 'groups' | 'forums' | 'chapters'>('feed');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Users className="h-8 w-8 text-[#27AE60]" />
            Community
          </h1>
          <p className="text-gray-600">Connect, collaborate, and grow together</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <nav className="flex border-b border-gray-200 overflow-x-auto flex-shrink-0">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'feed'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="h-5 w-5" />
              <span>Community Feed</span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'groups'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Users className="h-5 w-5" />
              <span>Study Groups</span>
            </button>
            <button
              onClick={() => setActiveTab('forums')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'forums'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span>Discussions</span>
            </button>
            <button
              onClick={() => setActiveTab('chapters')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'chapters'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <UsersIcon className="h-5 w-5" />
              <span>Chapters</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'feed' && (
              <div className="animate-in fade-in duration-300">
                <CommunityHub />
              </div>
            )}
            {activeTab === 'groups' && (
              <div className="animate-in fade-in duration-300">
                <StudyGroupsPage />
              </div>
            )}
            {activeTab === 'forums' && (
              <div className="animate-in fade-in duration-300">
                <Forums embedded />
              </div>
            )}
            {activeTab === 'chapters' && (
              <div className="animate-in fade-in duration-300">
                <ChaptersPage />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;

