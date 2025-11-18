import React, { useState } from 'react';
import { MessageSquare, Users as UsersIcon, Award } from 'lucide-react';
import Forums from '@/pages/shared/social/Forums';
import ChaptersPage from '@/pages/shared/chapters/ChaptersPage';
import TeacherAchievements from './TeacherAchievements';

const TeacherCommunityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'discussions' | 'chapters' | 'achievements'>('discussions');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Compact Header */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#2980B9]" />
            Community & Engagement
          </h1>
          <p className="text-sm text-gray-600">Connect, collaborate, and celebrate achievements</p>
        </div>

        {/* Compact Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('discussions')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'discussions'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Discussions</span>
            </button>
            <button
              onClick={() => setActiveTab('chapters')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'chapters'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <UsersIcon className="h-4 w-4" />
              <span>Chapters</span>
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'achievements'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>Achievements</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'discussions' && (
              <div className="animate-in fade-in duration-300">
                <Forums />
              </div>
            )}
            {activeTab === 'chapters' && (
              <div className="animate-in fade-in duration-300">
                <ChaptersPage />
              </div>
            )}
            {activeTab === 'achievements' && (
              <div className="animate-in fade-in duration-300">
                <TeacherAchievements />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherCommunityPage;

