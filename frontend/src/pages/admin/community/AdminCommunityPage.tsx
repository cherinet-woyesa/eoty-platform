import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Users, Sparkles, Shield } from 'lucide-react';
import { useCommunityFeed } from '@/hooks/useCommunity';
import CommunityHub from '@/pages/shared/social/CommunityHub';
import StudyGroupsPage from '@/pages/student/community/StudyGroupsPage';
import Forums from '@/pages/shared/social/Forums';
import { brandColors } from '@/theme/brand';

const AdminCommunityPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'feed' | 'groups' | 'forums'>('feed');
  const feed = useCommunityFeed();

   return (
      <div className="w-full h-full">
         <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6">
               <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                  <Shield className="h-8 w-8" style={{ color: brandColors.primaryHex }} />
                  <span className="text-indigo-900">{t('community.admin_title')}</span>
               </h1>
               <p className="text-slate-600">{t('community.admin_subtitle')}</p>
            </div>

            {/* Tabs */}
            <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-indigo-100 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
               <nav className="flex border-b border-indigo-100 overflow-x-auto flex-shrink-0">
                  <button
                     onClick={() => setActiveTab('feed')}
                     className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'feed'
                           ? 'border-indigo-800 text-indigo-900 bg-indigo-50'
                           : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                     }`}
                  >
                     <Sparkles className="h-5 w-5" />
                     <span>{t('community.tabs.feed')}</span>
                  </button>
                  <button
                     onClick={() => setActiveTab('groups')}
                     className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'groups'
                           ? 'border-indigo-800 text-indigo-900 bg-indigo-50'
                           : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                     }`}
                  >
                     <Users className="h-5 w-5" />
                     <span>{t('community.tabs.groups')}</span>
                  </button>
                  <button
                     onClick={() => setActiveTab('forums')}
                     className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'forums'
                           ? 'border-indigo-800 text-indigo-900 bg-indigo-50'
                           : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                     }`}
                  >
                     <MessageSquare className="h-5 w-5" />
                     <span>{t('community.tabs.forums')}</span>
                  </button>
               </nav>

               {/* Tab Content */}
               <div className="flex-1 overflow-y-auto">
                  {activeTab === 'feed' && (
                     <div className="animate-in fade-in duration-300">
                        <CommunityHub variant="admin" feedState={feed} showTabs={false} />
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
               </div>
            </div>
         </div>
      </div>
   );
};

export default AdminCommunityPage;
