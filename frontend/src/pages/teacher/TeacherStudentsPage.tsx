import React, { useState } from 'react';
import { Users, CheckSquare, BarChart2 } from 'lucide-react';
import StudentManagement from './StudentManagement';
import Assignments from './assignments/Assignments';
import VideoAnalyticsDashboard from '@/components/teacher/dashboard/VideoAnalyticsDashboard';

const TeacherStudentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'analytics'>('students');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Compact Header */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#2980B9]" />
            Student Management
          </h1>
          <p className="text-sm text-gray-600">Manage students, assignments, and track performance</p>
        </div>

        {/* Compact Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'students'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>My Students</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'assignments'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Assignments</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'analytics'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              <span>Analytics</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'students' && (
              <div className="animate-in fade-in duration-300">
                <StudentManagement />
              </div>
            )}
            {activeTab === 'assignments' && (
              <div className="animate-in fade-in duration-300">
                <Assignments />
              </div>
            )}
            {activeTab === 'analytics' && (
              <div className="animate-in fade-in duration-300">
                <VideoAnalyticsDashboard />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentsPage;

