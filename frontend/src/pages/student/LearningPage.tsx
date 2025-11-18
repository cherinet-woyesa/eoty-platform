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
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-[#27AE60]" />
            Learning Progress
          </h1>
          <p className="text-gray-600">Track your journey and achievements</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <nav className="flex border-b border-gray-200 overflow-x-auto flex-shrink-0">
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'progress'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="h-5 w-5" />
              <span>Progress</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'assignments'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <CheckSquare className="h-5 w-5" />
              <span>Assignments</span>
            </button>
            <button
              onClick={() => setActiveTab('paths')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'paths'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Map className="h-5 w-5" />
              <span>Study Paths</span>
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'achievements'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Award className="h-5 w-5" />
              <span>Achievements</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
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

