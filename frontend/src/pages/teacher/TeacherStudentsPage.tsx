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
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6" style={{ background: `linear-gradient(120deg, ${brandColors.primaryHex}10, #fff 80%)` }}>
        {/* Compact Header */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold mb-1 flex items-center gap-2" style={{ color: brandColors.primaryHex }}>
            <Users className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            {t('teacher_students.member_management')}
          </h1>
          <p className="text-sm" style={{ color: brandColors.primaryText }}>{t('teacher_students.manage_members_desc')}</p>
        </div>

        {/* Compact Tabs */}
        <div className="rounded-lg shadow-sm border overflow-hidden flex flex-col h-[calc(100vh-8rem)]" style={{ background: '#fff', borderColor: brandColors.primaryHex + '20' }}>
          <nav className="flex border-b flex-shrink-0" style={{ borderColor: brandColors.primaryHex + '20' }}>
            <button
              onClick={() => setActiveTab('students')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'students'
                  ? 'border-b-2' : ''
              }`}
              style={activeTab === 'students' ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex, background: brandColors.primaryHex + '08' } : { color: brandColors.primaryText }}
            >
              <Users className="h-4 w-4" />
              <span>{t('teacher_students.my_members')}</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'assignments'
                  ? 'border-b-2' : ''
              }`}
              style={activeTab === 'assignments' ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex, background: brandColors.primaryHex + '08' } : { color: brandColors.primaryText }}
            >
              <CheckSquare className="h-4 w-4" />
              <span>{t('teacher_students.assignments')}</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
                activeTab === 'analytics'
                  ? 'border-b-2' : ''
              }`}
              style={activeTab === 'analytics' ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex, background: brandColors.primaryHex + '08' } : { color: brandColors.primaryText }}
            >
              <BarChart2 className="h-4 w-4" />
              <span>{t('teacher_students.analytics')}</span>
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

