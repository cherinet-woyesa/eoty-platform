import React, { useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import MyCourses from './MyCourses';
import CreateCourse from './CreateCourse';
import CourseCatalog from '@/pages/student/CourseCatalog';

const TeacherCoursesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'my-courses' | 'create' | 'browse'>('my-courses');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-[#2980B9]" />
            Course Management
          </h1>
          <p className="text-gray-600">Create, manage, and discover courses</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${
                activeTab === 'my-courses'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span className="hidden sm:inline">My Courses</span>
              <span className="sm:hidden">Courses</span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${
                activeTab === 'create'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Create New</span>
              <span className="sm:hidden">Create</span>
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${
                activeTab === 'browse'
                  ? 'border-[#2980B9] text-[#2980B9] bg-[#2980B9]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Search className="h-5 w-5" />
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

