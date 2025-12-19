import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, 
  Lock, 
  PlayCircle, 
  FileText, 
  ChevronRight,
  Clock
} from 'lucide-react';
import { brandColors } from '@/theme/brand';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  completed?: boolean;
  is_locked?: boolean;
  type?: 'video' | 'article' | 'quiz';
}

interface ClassroomSidebarProps {
  lessons: Lesson[];
  activeLessonId: string;
  onSelectLesson: (lessonId: string) => void;
  courseTitle: string;
  progress: number;
  isCollapsed?: boolean;
}

const ClassroomSidebar: React.FC<ClassroomSidebarProps> = ({
  lessons,
  activeLessonId,
  onSelectLesson,
  courseTitle,
  progress,
  isCollapsed = false
}) => {
  const { t } = useTranslation();

  if (isCollapsed) {
    return null; // Or a mini version
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col shadow-lg z-20">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
        <h2 className="font-bold text-gray-900 line-clamp-2 mb-3 leading-tight">
          {courseTitle}
        </h2>
        
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-gray-500">
            <span>{progress}% {t('common.completed', 'Completed')}</span>
            <span>{lessons.filter(l => l.completed).length}/{lessons.length}</span>
          </div>
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${progress}%`,
                backgroundColor: brandColors.primaryHex 
              }}
            />
          </div>
        </div>
      </div>

      {/* Lesson List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="py-2">
          {lessons.map((lesson, index) => {
            const isActive = lesson.id === activeLessonId;
            const isLocked = lesson.is_locked;
            
            return (
              <button
                key={lesson.id}
                onClick={() => !isLocked && onSelectLesson(lesson.id)}
                disabled={isLocked}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all duration-200 border-l-4 ${
                  isActive 
                    ? 'bg-indigo-50/50 border-[#1e1b4b]' 
                    : 'border-transparent hover:bg-gray-50'
                } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {/* Status Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {lesson.completed ? (
                    <CheckCircle className="h-5 w-5 text-[#27AE60]" />
                  ) : isLocked ? (
                    <Lock className="h-5 w-5 text-gray-400" />
                  ) : isActive ? (
                    <div className="h-5 w-5 rounded-full border-2 border-[#1e1b4b] flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-[#1e1b4b]" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug mb-1 ${
                    isActive ? 'text-[#1e1b4b]' : 'text-gray-700'
                  }`}>
                    {index + 1}. {lesson.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {lesson.type === 'quiz' ? (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {t('common.quiz', 'Quiz')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <PlayCircle className="h-3 w-3" />
                        {t('common.video', 'Video')}
                      </span>
                    )}
                    {lesson.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(lesson.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClassroomSidebar;
