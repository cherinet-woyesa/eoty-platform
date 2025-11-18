import React, { useState } from 'react';
import { BookOpen, Search, Bookmark, GraduationCap, TrendingUp, Clock } from 'lucide-react';
import StudentEnrolledCourses from './StudentEnrolledCourses';
import CourseCatalog from './CourseCatalog';
import BookmarksPage from './BookmarksPage';

const CoursesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'enrolled' | 'browse' | 'bookmarks'>('enrolled');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-[#27AE60]" />
            My Courses
          </h1>
          <p className="text-gray-600">Manage your learning journey and discover new courses</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('enrolled')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${
                activeTab === 'enrolled'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <GraduationCap className="h-5 w-5" />
              <span className="hidden sm:inline">My Courses</span>
              <span className="sm:hidden">Enrolled</span>
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${
                activeTab === 'browse'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Search className="h-5 w-5" />
              <span className="hidden sm:inline">Browse Courses</span>
              <span className="sm:hidden">Browse</span>
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${
                activeTab === 'bookmarks'
                  ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Bookmark className="h-5 w-5" />
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

