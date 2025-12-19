import React, { useState } from 'react';
import { Users, CheckSquare, BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { brandColors } from '@/theme/brand';
import StudentManagement from './StudentManagement';
import Assignments from './assignments/Assignments';
import VideoAnalyticsDashboard from '@/components/teacher/dashboard/VideoAnalyticsDashboard';

const TeacherStudentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'analytics'>('students');

  const { t } = useTranslation();
  return (
    <div className="w-full h-full bg-gray-50">
      <div className="w-full space-y-4 p-4 lg:p-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Users className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
            {t('teacher_students.member_management')}
          </h1>
          <p className="text-sm text-gray-600">{t('teacher_students.manage_members_desc')}</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-9rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all border-b-2 text-sm ${
                activeTab === 'students'
                  ? 'bg-gray-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={activeTab === 'students' ? { 
                borderColor: brandColors.primaryHex, 
                color: brandColors.primaryHex,
                backgroundColor: `${brandColors.primaryHex}0D`
              } : {}}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('teacher_students.my_members')}</span>
              <span className="sm:hidden">{t('teacher_students.tabs.members')}</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all border-b-2 text-sm ${
                activeTab === 'assignments'
                  ? 'bg-gray-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={activeTab === 'assignments' ? { 
                borderColor: brandColors.primaryHex, 
                color: brandColors.primaryHex,
                backgroundColor: `${brandColors.primaryHex}0D`
              } : {}}
            >
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">{t('teacher_students.assignments')}</span>
              <span className="sm:hidden">{t('teacher_students.tabs.assignments')}</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all border-b-2 text-sm ${
                activeTab === 'analytics'
                  ? 'bg-gray-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={activeTab === 'analytics' ? { 
                borderColor: brandColors.primaryHex, 
                color: brandColors.primaryHex,
                backgroundColor: `${brandColors.primaryHex}0D`
              } : {}}
            >
              <BarChart2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('teacher_students.analytics')}</span>
              <span className="sm:hidden">{t('teacher_students.tabs.analytics')}</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {activeTab === 'students' && (
              <div className="animate-in fade-in duration-300 h-full">
                <StudentManagement />
              </div>
            )}
            {activeTab === 'assignments' && (
              <div className="animate-in fade-in duration-300 h-full">
                <Assignments />
              </div>
            )}
            {activeTab === 'analytics' && (
              <div className="animate-in fade-in duration-300 h-full">
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

