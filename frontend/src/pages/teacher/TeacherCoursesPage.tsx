import React, { useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import MyCourses from './MyCourses';
import CreateCourse from './CreateCourse';
import CourseCatalog from '@/pages/student/CourseCatalog';

const TeacherCoursesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'my-courses' | 'create' | 'browse'>('my-courses');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Compact Header */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-stone-800 mb-1 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#27AE60]" />
            Course Management
          </h1>
          <p className="text-sm text-stone-600">Create, manage, and discover courses</p>
        </div>

        {/* Compact Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-stone-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 text-sm ${
                activeTab === 'my-courses'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">My Courses</span>
              <span className="sm:hidden">Courses</span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 text-sm ${
                activeTab === 'create'
                  ? 'border-[#16A085] text-[#16A085] bg-[#16A085]/5'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create New</span>
              <span className="sm:hidden">Create</span>
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 text-sm ${
                activeTab === 'browse'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Browse Catalog</span>
              <span className="sm:hidden">Browse</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex-1 overflow-y-auto">
            {activeTab === 'my-courses' && (
              <div className="animate-in fade-in duration-300">
                <MyCourses />
              </div>
            )}
            {activeTab === 'create' && (
              <div className="animate-in fade-in duration-300">
                <CreateCourse />
              </div>
            )}
            {activeTab === 'browse' && (
              <div className="animate-in fade-in duration-300">
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

