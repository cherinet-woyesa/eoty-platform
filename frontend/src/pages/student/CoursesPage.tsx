import React, { useState } from 'react';
import { BookOpen, Search, Bookmark, GraduationCap, TrendingUp, Clock } from 'lucide-react';
import StudentEnrolledCourses from './courses/StudentEnrolledCourses';
import CourseCatalog from './courses/CourseCatalog';
import BookmarksPage from './BookmarksPage';

const CoursesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'enrolled' | 'browse' | 'bookmarks'>('enrolled');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-stone-800 mb-1.5 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#27AE60]" />
            My Courses
          </h1>
          <p className="text-stone-600 text-sm">Manage your learning journey and discover new courses</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-stone-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('enrolled')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'enrolled'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">My Courses</span>
              <span className="sm:hidden">Enrolled</span>
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'browse'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Browse Courses</span>
              <span className="sm:hidden">Browse</span>
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'bookmarks'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Bookmarked</span>
              <span className="sm:hidden">Saved</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex-1 overflow-y-auto">
            {activeTab === 'enrolled' && (
              <div className="animate-in fade-in duration-300">
                <StudentEnrolledCourses />
              </div>
            )}
            {activeTab === 'browse' && (
              <div className="animate-in fade-in duration-300">
                <CourseCatalog />
              </div>
            )}
            {activeTab === 'bookmarks' && (
              <div className="animate-in fade-in duration-300">
                <BookmarksPage />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;

