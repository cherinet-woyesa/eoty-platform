import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Users as UsersIcon, Award, Grid, Plus, UserPlus, Calendar } from 'lucide-react';
import Forums from '@/pages/shared/social/Forums';
import TeacherAchievements from './TeacherAchievements';

const TeacherCommunityPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'feed' | 'achievements'>('feed');

  const handleCreateDiscussion = () => {
    setActiveTab('feed');
    // In a real app, this would focus the "New Post" input or open a modal
    const forumInput = document.querySelector('textarea[placeholder*="discussion"]');
    if (forumInput instanceof HTMLElement) {
      forumInput.focus();
    }
  };

  const handleInviteToChapter = () => {
    // Placeholder for invite logic
    console.log('Invite to chapter clicked');
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      {/* Compact Topbar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-br from-[#27AE60] to-[#16A085] text-white" aria-hidden="true">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t('teacher_community.title')}</h2>
              <p className="text-xs text-slate-500">{t('teacher_community.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2" role="tablist" aria-label="Community Sections">
            <button
              role="tab"
              aria-selected={activeTab === 'feed'}
              aria-controls="feed-panel"
              id="feed-tab"
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#27AE60] ${activeTab === 'feed' ? 'bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/20 font-medium' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {t('teacher_community.tabs.feed')}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'achievements'}
              aria-controls="achievements-panel"
              id="achievements-tab"
              onClick={() => setActiveTab('achievements')}
              className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2980B9] ${activeTab === 'achievements' ? 'bg-[#2980B9]/10 text-[#2980B9] border border-[#2980B9]/20 font-medium' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              <Award className="h-4 w-4" aria-hidden="true" />
              {t('teacher_community.tabs.achievements')}
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Main Column */}
          <div className="lg:col-span-8 space-y-4">
            {activeTab === 'feed' && (
              <div 
                role="tabpanel" 
                id="feed-panel" 
                aria-labelledby="feed-tab"
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Grid className="h-5 w-5 text-slate-600" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-slate-800">{t('teacher_community.feed.latest_discussions')}</h3>
                  </div>
                  <div className="text-xs text-slate-500">{t('teacher_community.feed.subtitle')}</div>
                </div>
                <div>
                  <Forums embedded />
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div 
                role="tabpanel" 
                id="achievements-panel" 
                aria-labelledby="achievements-tab"
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-in fade-in duration-200"
              >
                <h3 className="text-sm font-semibold text-slate-800 mb-3">{t('teacher_community.achievements.title')}</h3>
                <TeacherAchievements />
              </div>
            )}
          </div>

          {/* Right / Help Column */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">{t('teacher_community.quick_tips.title')}</h4>
              <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
                <li>{t('teacher_community.quick_tips.tip_1')}</li>
                <li>{t('teacher_community.quick_tips.tip_2')}</li>
                <li>{t('teacher_community.quick_tips.tip_3')}</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">{t('teacher_community.tools.title')}</h4>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={handleCreateDiscussion}
                  className="w-full text-left px-3 py-2 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 flex items-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-slate-400"
                  aria-label="Create a new discussion topic"
                >
                  <Plus className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{t('teacher_community.tools.create_discussion')}</span>
                </button>
                <button 
                  onClick={handleInviteToChapter}
                  className="w-full text-left px-3 py-2 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 flex items-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-slate-400"
                  aria-label="Invite teachers to a chapter"
                >
                  <UserPlus className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{t('teacher_community.tools.invite_chapter')}</span>
                </button>
                <button 
                  className="w-full text-left px-3 py-2 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 flex items-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-slate-400"
                  aria-label="View upcoming community events"
                >
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{t('teacher_community.tools.view_events')}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default TeacherCommunityPage;

