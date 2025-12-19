import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus, Search } from 'lucide-react';
import MyCourses from './MyCourses';
import CreateCourse from './CreateCourse';
import CourseCatalog from '@/pages/student/courses/CourseCatalog';
import { brandColors } from '@/theme/brand';

const TeacherCoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'my-courses' | 'create' | 'browse'>('my-courses');

  return (
    <div className="w-full h-full bg-gray-50">
      <div className="w-full space-y-4 p-4 lg:p-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <BookOpen className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
            {t('teacher_courses_page.title')}
          </h1>
          <p className="text-sm text-gray-600">{t('teacher_courses_page.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-9rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all border-b-2 text-sm ${
                activeTab === 'my-courses'
                  ? 'bg-gray-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={activeTab === 'my-courses' ? { 
                borderColor: brandColors.primaryHex, 
                color: brandColors.primaryHex,
                backgroundColor: `${brandColors.primaryHex}0D`
              } : {}}
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{t('teacher_courses_page.tabs.my_courses')}</span>
              <span className="sm:hidden">{t('teacher_courses_page.tabs.courses')}</span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all border-b-2 text-sm ${
                activeTab === 'create'
                  ? 'bg-gray-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={activeTab === 'create' ? { 
                borderColor: brandColors.primaryHex, 
                color: brandColors.primaryHex,
                backgroundColor: `${brandColors.primaryHex}0D`
              } : {}}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('teacher_courses_page.tabs.create_new')}</span>
              <span className="sm:hidden">{t('teacher_courses_page.tabs.create')}</span>
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all border-b-2 text-sm ${
                activeTab === 'browse'
                  ? 'bg-gray-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={activeTab === 'browse' ? { 
                borderColor: brandColors.primaryHex, 
                color: brandColors.primaryHex,
                backgroundColor: `${brandColors.primaryHex}0D`
              } : {}}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{t('teacher_courses_page.tabs.browse_catalog')}</span>
              <span className="sm:hidden">{t('teacher_courses_page.tabs.browse')}</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {activeTab === 'my-courses' && (
              <div className="animate-in fade-in duration-300 h-full">
                <MyCourses hideHeader={true} onCreateClick={() => setActiveTab('create')} />
              </div>
            )}
            {activeTab === 'create' && (
              <div className="animate-in fade-in duration-300 h-full">
                <CreateCourse onBack={() => setActiveTab('my-courses')} />
              </div>
            )}
            {activeTab === 'browse' && (
              <div className="animate-in fade-in duration-300 h-full">
                <CourseCatalog />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherCoursesPage;

