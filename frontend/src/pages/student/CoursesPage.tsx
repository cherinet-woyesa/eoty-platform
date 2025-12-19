import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, Bookmark, GraduationCap, TrendingUp, Clock } from 'lucide-react';
import StudentEnrolledCourses from './courses/StudentEnrolledCourses';
import CourseCatalog from './courses/CourseCatalog';
import BookmarksPage from './BookmarksPage';
import { brandColors } from '@/theme/brand';

type CoursesTab = 'enrolled' | 'browse' | 'bookmarks';

const CoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as CoursesTab) || 'enrolled';
  const [activeTab, setActiveTab] = useState<CoursesTab>(initialTab);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as CoursesTab | null;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: CoursesTab) => {
    if (tab === activeTab) return;
    // Removed artificial delay for better perceived performance
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const tabSkeleton = useMemo(() => (
    <div className="p-4 space-y-4">
      <div className="h-8 bg-stone-200 rounded-md animate-pulse w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-36 bg-stone-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  ), []);

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-stone-800 mb-1.5 flex items-center gap-2">
            <BookOpen className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            {t('courses_page.title')}
          </h1>
          <p className="text-stone-600 text-sm">{t('courses_page.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-stone-200 flex-shrink-0">
            <button
              onClick={() => handleTabChange('enrolled')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'enrolled'
                  ? 'bg-stone-50'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
              style={{
                borderColor: activeTab === 'enrolled' ? brandColors.primaryHex : 'transparent',
                color: activeTab === 'enrolled' ? brandColors.primaryHex : undefined
              }}
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">{t('courses_page.tabs.enrolled')}</span>
              <span className="sm:hidden">{t('courses_page.tabs.enrolled_short')}</span>
            </button>
            <button
              onClick={() => handleTabChange('browse')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'browse'
                  ? 'bg-stone-50'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
              style={{
                borderColor: activeTab === 'browse' ? brandColors.primaryHex : 'transparent',
                color: activeTab === 'browse' ? brandColors.primaryHex : undefined
              }}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{t('courses_page.tabs.browse')}</span>
              <span className="sm:hidden">{t('courses_page.tabs.browse_short')}</span>
            </button>
            <button
              onClick={() => handleTabChange('bookmarks')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'bookmarks'
                  ? 'bg-stone-50'
                  : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
              }`}
              style={{
                borderColor: activeTab === 'bookmarks' ? brandColors.primaryHex : 'transparent',
                color: activeTab === 'bookmarks' ? brandColors.primaryHex : undefined
              }}
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">{t('courses_page.tabs.bookmarks')}</span>
              <span className="sm:hidden">{t('courses_page.tabs.bookmarks_short')}</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex-1 overflow-y-auto">
            {/* Render all tabs but hide inactive ones to preserve state and improve switching speed */}
            <div className={activeTab === 'enrolled' ? 'block animate-in fade-in duration-300' : 'hidden'}>
              <StudentEnrolledCourses />
            </div>
            <div className={activeTab === 'browse' ? 'block animate-in fade-in duration-300' : 'hidden'}>
              <CourseCatalog />
            </div>
            <div className={activeTab === 'bookmarks' ? 'block animate-in fade-in duration-300' : 'hidden'}>
              <BookmarksPage />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;

