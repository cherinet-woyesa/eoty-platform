import React, { useState } from 'react';
import { TrendingUp, CheckSquare, Map, Award } from 'lucide-react';
import ProgressPage from './ProgressPage';
import StudentAssignments from './Assignments';
import LearningPathsPage from './LearningPathsPage';
import Achievements from '@/pages/shared/social/Achievements';

const LearningPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'progress' | 'assignments' | 'paths' | 'achievements'>('progress');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-stone-800 mb-1.5 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#27AE60]" />
            My Learning
          </h1>
          <p className="text-stone-600 text-sm">Track your progress, assignments, and achievements</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-stone-200 flex-shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'progress'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Progress</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'assignments'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Assignments</span>
            </button>
            <button
              onClick={() => setActiveTab('paths')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'paths'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              <Map className="h-4 w-4" />
              <span>Study Paths</span>
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'achievements'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>Achievements</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'progress' && (
              <div className="animate-in fade-in duration-300">
                <ProgressPage />
              </div>
            )}
            {activeTab === 'assignments' && (
              <div className="animate-in fade-in duration-300">
                <StudentAssignments />
              </div>
            )}
            {activeTab === 'paths' && (
              <div className="animate-in fade-in duration-300">
                <LearningPathsPage />
              </div>
            )}
            {activeTab === 'achievements' && (
              <div className="animate-in fade-in duration-300">
                <Achievements />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPage;

