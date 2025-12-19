import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, CheckSquare, Map, Award } from 'lucide-react';
import ProgressDashboard from '@/components/shared/courses/ProgressDashboard';
import StudentAssignments from './Assignments';
import LearningPathsPage from './LearningPathsPage';
import Achievements from '@/pages/shared/social/Achievements';
import { brandColors } from '@/theme/brand';

type LearningTab = 'progress' | 'assignments' | 'paths' | 'achievements';

const LearningPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as LearningTab) || 'progress';
  const [activeTab, setActiveTab] = useState<LearningTab>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as LearningTab | null;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: LearningTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-stone-800 mb-1.5 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            My Learning
          </h1>
          <p className="text-stone-600 text-sm">Track your progress, assignments, and achievements</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-stone-200 flex-shrink-0 overflow-x-auto">
            <button
              onClick={() => handleTabChange('progress')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'progress'
                  ? 'bg-stone-50'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
              style={{
                borderColor: activeTab === 'progress' ? brandColors.primaryHex : 'transparent',
                color: activeTab === 'progress' ? brandColors.primaryHex : undefined
              }}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Progress</span>
            </button>
            <button
              onClick={() => handleTabChange('assignments')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'assignments'
                  ? 'bg-stone-50'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
              style={{
                borderColor: activeTab === 'assignments' ? brandColors.primaryHex : 'transparent',
                color: activeTab === 'assignments' ? brandColors.primaryHex : undefined
              }}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Assignments</span>
            </button>
            <button
              onClick={() => handleTabChange('paths')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'paths'
                  ? 'bg-stone-50'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
              style={{
                borderColor: activeTab === 'paths' ? brandColors.primaryHex : 'transparent',
                color: activeTab === 'paths' ? brandColors.primaryHex : undefined
              }}
            >
              <Map className="h-4 w-4" />
              <span>Study Paths</span>
            </button>
            <button
              onClick={() => handleTabChange('achievements')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'achievements'
                  ? 'bg-stone-50'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
              style={{
                borderColor: activeTab === 'achievements' ? brandColors.primaryHex : 'transparent',
                color: activeTab === 'achievements' ? brandColors.primaryHex : undefined
              }}
            >
              <Award className="h-4 w-4" />
              <span>Achievements</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className={activeTab === 'progress' ? 'block animate-in fade-in duration-300' : 'hidden'}>
              <ProgressDashboard />
            </div>
            <div className={activeTab === 'assignments' ? 'block animate-in fade-in duration-300' : 'hidden'}>
              <StudentAssignments />
            </div>
            <div className={activeTab === 'paths' ? 'block animate-in fade-in duration-300' : 'hidden'}>
              <LearningPathsPage />
            </div>
            <div className={activeTab === 'achievements' ? 'block animate-in fade-in duration-300' : 'hidden'}>
              <Achievements />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPage;

