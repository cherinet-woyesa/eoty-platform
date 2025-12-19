import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, Video, Edit, Trash2, Loader2, CheckCircle 
} from 'lucide-react';
import { brandColors } from '@/theme/brand';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration?: number;
  order: number;
  is_completed?: boolean;
}

interface CourseSidebarProps {
  lessons: Lesson[];
  selectedLesson: Lesson | null;
  searchQuery: string;
  filterCompleted: 'all' | 'completed' | 'incomplete';
  isAdmin: boolean;
  isOwner: boolean;
  isTheaterMode: boolean;
  isSidebarOpen: boolean;
  lessonProgress: Record<string, any>;
  deletingLessonId: string | null;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: 'all' | 'completed' | 'incomplete') => void;
  onSelectLesson: (lesson: Lesson) => void;
  onCreateLesson: (title: string, description: string) => Promise<void>;
  onUpdateLesson: (lesson: Lesson, title: string, description: string) => Promise<void>;
  onDeleteLesson: (lessonId: string) => void;
}

const CourseSidebar: React.FC<CourseSidebarProps> = ({
  lessons,
  selectedLesson,
  searchQuery,
  filterCompleted,
  isAdmin,
  isOwner,
  isTheaterMode,
  isSidebarOpen,
  lessonProgress,
  deletingLessonId,
  onSearchChange,
  onFilterChange,
  onSelectLesson,
  onCreateLesson,
  onUpdateLesson,
  onDeleteLesson
}) => {
  const { t } = useTranslation();
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDescription, setNewLessonDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    const progress = lessonProgress[lesson.id];
    const isCompleted = progress?.is_completed || lesson.is_completed;
    const matchesFilter = filterCompleted === 'all' || 
                         (filterCompleted === 'completed' && isCompleted) ||
                         (filterCompleted === 'incomplete' && !isCompleted);
    return matchesSearch && matchesFilter;
  });

  const totalDuration = filteredLessons.reduce((acc, l) => acc + (l.duration || 0), 0);

  const handleSubmit = async () => {
    if (!newLessonTitle.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (editingLesson) {
        await onUpdateLesson(editingLesson, newLessonTitle, newLessonDescription);
      } else {
        await onCreateLesson(newLessonTitle, newLessonDescription);
      }
      setNewLessonTitle('');
      setNewLessonDescription('');
      setIsCreatingLesson(false);
      setEditingLesson(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setNewLessonTitle(lesson.title);
    setNewLessonDescription(lesson.description);
    setIsCreatingLesson(false);
  };

  if (isTheaterMode) return null;

  return (
    <div className={`flex flex-col gap-6 transition-all duration-300 ${
      isSidebarOpen ? 'lg:w-[30%] opacity-100' : 'lg:w-0 opacity-0 overflow-hidden'
    }`}>
      {/* Search & Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
         <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('course_details.search_lessons_placeholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-20 focus:border-transparent"
              style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
            />
         </div>
         <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{filteredLessons.length} {t('common.lessons')}</span>
            <select
              value={filterCompleted}
              onChange={(e) => onFilterChange(e.target.value as any)}
              className="border-none bg-transparent font-medium text-gray-700 focus:ring-0 cursor-pointer hover:text-gray-900"
            >
              <option value="all">{t('course_details.filters.all_status')}</option>
              <option value="completed">{t('course_details.filters.completed')}</option>
              <option value="incomplete">{t('course_details.filters.incomplete')}</option>
            </select>
         </div>
      </div>

      {/* Lesson List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden max-h-[calc(100vh-300px)]">
         <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900">{t('course_details.course_content')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {filteredLessons.length} {t('common.lessons')} • {formatDuration(totalDuration)}
              </p>
            </div>
            {(isAdmin || isOwner) && (
              <button
                onClick={() => {
                  setIsCreatingLesson(true);
                  setNewLessonTitle('');
                  setNewLessonDescription('');
                  setEditingLesson(null);
                }}
                className="text-xs text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium shadow-sm hover:shadow"
                style={{ backgroundColor: brandColors.primaryHex }}
              >
                <Plus className="h-3.5 w-3.5" />
               {t('course_details.add_lesson')}
              </button>
            )}
         </div>
         
         {/* Create/Edit Lesson Form */}
         {(isCreatingLesson || editingLesson) && (
            <div className="p-4 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-top-2">
               <h4 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">
                 {editingLesson ? t('course_details.edit_lesson_title') : t('course_details.create_lesson')}
               </h4>
               <input
                  type="text"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder={t('course_details.lesson_title_placeholder')}
                  className="w-full mb-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
               />
               <textarea
                  value={newLessonDescription}
                  onChange={(e) => setNewLessonDescription(e.target.value)}
                  placeholder={t('course_details.lesson_description_placeholder')}
                  className="w-full mb-3 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-20"
               />
               <div className="flex gap-2">
                  <button 
                     onClick={handleSubmit}
                     disabled={isSubmitting || !newLessonTitle.trim()}
                     className="flex-1 text-white text-xs py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     style={{ backgroundColor: brandColors.primaryHex }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                    ) : (
                      editingLesson ? t('course_details.save_changes') : t('course_details.create_lesson')
                    )}
                  </button>
                  <button 
                     onClick={() => {
                        setIsCreatingLesson(false);
                        setEditingLesson(null);
                     }}
                     className="flex-1 bg-white text-gray-700 text-xs py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium transition-colors"
                  >
                  {t('common.cancel')}
                  </button>
               </div>
            </div>
         )}

         <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
            {filteredLessons.length === 0 ? (
              <div className="text-center py-8 px-4 text-gray-500">
                <p className="text-sm">{t('course_details.no_lessons_found')}</p>
              </div>
            ) : (
              filteredLessons.map((lesson, index) => {
                 const progress = lessonProgress[lesson.id];
                 const isCompleted = progress?.is_completed || lesson.is_completed;
                 const isSelected = selectedLesson?.id === lesson.id;
                 
                 return (
                    <div 
                       key={lesson.id}
                       className={`group p-3 rounded-lg cursor-pointer transition-all border-l-4 ${
                          isSelected 
                             ? 'bg-gray-50 border-y border-r border-gray-100 shadow-sm' 
                             : 'hover:bg-gray-50 border-l-transparent border-y border-r border-transparent'
                       }`}
                       style={isSelected ? { borderLeftColor: brandColors.primaryHex } : {}}
                       onClick={() => onSelectLesson(lesson)}
                    >
                       <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                             {isCompleted ? (
                                <div 
                                  className="h-5 w-5 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: brandColors.primaryHex }}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 text-white" />
                                </div>
                             ) : (
                                <div 
                                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
                                   isSelected ? 'bg-white' : 'border-gray-300 text-gray-500 group-hover:border-gray-400'
                                  }`}
                                  style={isSelected ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex } : {}}
                                >
                                   {lesson.order !== undefined ? lesson.order + 1 : index + 1}
                                </div>
                             )}
                          </div>
                          <div className="flex-1 min-w-0">
                             <h4 
                               className={`text-sm font-medium mb-1 leading-snug ${isSelected ? '' : 'text-gray-900'}`}
                               style={isSelected ? { color: brandColors.primaryHex } : {}}
                             >
                                {lesson.title}
                             </h4>
                             <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                   <Video className="h-3 w-3" />
                                   {formatDuration(lesson.duration || 0)}
                                </span>
                             </div>
                          </div>
                          {(isAdmin || isOwner) && (
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                <button 
                                   onClick={(e) => { e.stopPropagation(); startEditing(lesson); }}
                                   className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                  title={t('course_details.edit_lesson_title')}
                                >
                                   <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                   onClick={(e) => { e.stopPropagation(); onDeleteLesson(lesson.id); }}
                                   disabled={deletingLessonId === lesson.id}
                                   className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                                  title={t('course_details.delete_lesson_title')}
                                >
                                   {deletingLessonId === lesson.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                   ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                   )}
                                </button>
                             </div>
                          )}
                       </div>
                    </div>
                 );
              })
            )}
         </div>
      </div>
    </div>
  );
};

export default CourseSidebar;