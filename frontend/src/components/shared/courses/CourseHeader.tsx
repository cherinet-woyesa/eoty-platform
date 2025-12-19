import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, Edit, Bookmark, Share2, 
  Monitor, Maximize2, Minimize2 
} from 'lucide-react';
import { brandColors } from '@/theme/brand';

interface CourseHeaderProps {
  course: any;
  userRole?: string;
  isAdmin: boolean;
  isOwner: boolean;
  isStudent: boolean;
  isTheaterMode: boolean;
  isSidebarOpen: boolean;
  isBookmarked: boolean;
  progressPercentage: number;
  onToggleTheaterMode: () => void;
  onToggleSidebar: () => void;
  onToggleBookmark: () => void;
  getBackLink: () => string;
  getBackLabel: () => string;
}

const CourseHeader: React.FC<CourseHeaderProps> = ({
  course,
  isAdmin,
  isOwner,
  isStudent,
  isTheaterMode,
  isSidebarOpen,
  isBookmarked,
  progressPercentage,
  onToggleTheaterMode,
  onToggleSidebar,
  onToggleBookmark,
  getBackLink,
  getBackLabel
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={getBackLink()}
            className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <div className="p-1.5 rounded-full bg-gray-100 group-hover:bg-gray-200 mr-2 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">{getBackLabel()}</span>
          </Link>
          <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900 truncate max-w-md leading-tight">{course.title}</h1>
            {(isAdmin || isOwner) && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit border border-amber-100">
                {t('course_details.instructor_view')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isStudent && (
             <div className="hidden md:flex items-center gap-4 mr-4 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">{t('course_details.your_progress')}</div>
                  <div className="text-sm font-bold" style={{ color: brandColors.primaryHex }}>{progressPercentage}% {t('course_details.complete_word')}</div>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%`, backgroundColor: brandColors.primaryHex }}
                  ></div>
                </div>
             </div>
          )}

          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button 
              onClick={onToggleTheaterMode}
              className={`p-2 rounded-md transition-all ${isTheaterMode ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={isTheaterMode ? { color: brandColors.primaryHex } : {}}
              title={isTheaterMode ? t('course_details.exit_theater_mode') : t('course_details.theater_mode')}
            >
              <Monitor className="h-4 w-4" />
            </button>

            <button 
              onClick={onToggleSidebar}
              className={`p-2 rounded-md transition-all ${!isSidebarOpen ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={!isSidebarOpen ? { color: brandColors.primaryHex } : {}}
              title={isSidebarOpen ? t('course_details.expand_view') : t('course_details.show_sidebar')}
            >
              {isSidebarOpen ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
          </div>
          
          {(isAdmin || isOwner) && (
            <Link
              to={`/teacher/courses/${course.id}/edit`}
              className="inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              <Edit className="h-4 w-4 mr-2" />
              {t('common.edit_course')}
            </Link>
          )}
          {isStudent && (
            <button
              onClick={onToggleBookmark}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                isBookmarked 
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
              {isBookmarked ? t('common.saved') : t('common.save')}
            </button>
          )}
          <button className="inline-flex items-center px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseHeader;