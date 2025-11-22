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
        {/* Ethiopian Orthodox Themed Header */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-xl flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">Community & Engagement</h1>
                <p className="text-lg text-stone-600 mt-1">Connect, collaborate, and grow together</p>
              </div>
          </div>
        </div>

        {/* Ethiopian Orthodox Themed Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <nav className="flex border-b border-stone-200 flex-shrink-0 bg-gradient-to-r from-stone-50 to-neutral-50">
            <button
              onClick={() => setActiveTab('discussions')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-3 whitespace-nowrap ${
                activeTab === 'discussions'
                  ? 'border-[#27AE60] text-[#27AE60] bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10'
                  : 'border-transparent text-stone-600 hover:text-[#27AE60] hover:bg-stone-50'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span>Discussions</span>
            </button>
            <button
              onClick={() => setActiveTab('chapters')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-3 whitespace-nowrap ${
                activeTab === 'chapters'
                  ? 'border-[#16A085] text-[#16A085] bg-gradient-to-r from-[#16A085]/10 to-[#2980B9]/10'
                  : 'border-transparent text-stone-600 hover:text-[#16A085] hover:bg-stone-50'
              }`}
            >
              <UsersIcon className="h-5 w-5" />
              <span>Chapters</span>
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-3 whitespace-nowrap ${
                activeTab === 'achievements'
                  ? 'border-[#2980B9] text-[#2980B9] bg-gradient-to-r from-[#2980B9]/10 to-[#27AE60]/10'
                  : 'border-transparent text-stone-600 hover:text-[#2980B9] hover:bg-stone-50'
              }`}
            >
              <Award className="h-5 w-5" />
              <span>Achievements</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'discussions' && (
              <div className="animate-in fade-in duration-300">
                <Forums embedded />
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

