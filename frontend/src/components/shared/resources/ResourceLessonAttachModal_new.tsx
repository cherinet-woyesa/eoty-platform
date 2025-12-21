import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Link as LinkIcon, Search, BookOpen, FileText } from 'lucide-react';
import { useNotification } from '../../../context/NotificationContext';

interface Course {
  id: number;
  title: string;
}

interface Lesson {
  id: number;
  title: string;
  order_index: number;
}

interface ResourceLessonAttachModalProps {
  resourceId: number;
  resourceTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResourceLessonAttachModal: React.FC<ResourceLessonAttachModalProps> = ({
  resourceId,
  resourceTitle,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { showNotification } = useNotification();

  useEffect(() => {
    if (isOpen) {
      loadCourses();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCourseId) {
      loadLessons(selectedCourseId);
    } else {
      setLessons([]);
      setSelectedLessonId(null);
    }
  }, [selectedCourseId]);

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/teacher/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setCourses(data.data.courses || []);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      showNotification({ title: 'Error', message: t('resources.attach_modal.load_courses_error'), type: 'error' });
    }
  };

  const loadLessons = async (courseId: number) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/lessons`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setLessons(data.data.lessons || []);
      }
    } catch (error) {
      console.error('Failed to load lessons:', error);
      showNotification({ title: 'Error', message: t('resources.attach_modal.load_lessons_error'), type: 'error' });
    }
  };

  const handleAttach = async () => {
    if (!selectedLessonId) {
      showNotification({ title: 'Warning', message: t('resources.attach_modal.select_lesson_warning'), type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/resources/attach-to-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          resourceId,
          lessonId: selectedLessonId
        })
      });

      const data = await response.json();
      if (data.success) {
        showNotification({ title: 'Success', message: t('resources.attach_modal.success'), type: 'success' });
        onSuccess();
        onClose();
      } else {
        showNotification({ title: 'Error', message: data.message || t('resources.attach_modal.error'), type: 'error' });
      }
    } catch (error) {
      console.error('Failed to attach resource:', error);
      showNotification({ title: 'Error', message: t('resources.attach_modal.error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-brand-soft/20 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{t('resources.attach_modal.title')}</h3>
            <p className="text-sm text-gray-500 mt-1">{resourceTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {/* Course Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('resources.attach_modal.select_course')}</label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('resources.attach_modal.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
              />
            </div>
            
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`p-3 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      selectedCourseId === course.id ? 'bg-brand-soft/10 border-l-4 border-brand-primary' : ''
                    }`}
                  >
                    <BookOpen className={`h-4 w-4 ${selectedCourseId === course.id ? 'text-brand-primary' : 'text-gray-400'}`} />
                    <span className={`text-sm ${selectedCourseId === course.id ? 'font-medium text-brand-primary' : 'text-gray-700'}`}>
                      {course.title}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {t('resources.attach_modal.no_courses')}
                </div>
              )}
            </div>
          </div>

          {/* Lesson Selection */}
          {selectedCourseId && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('resources.attach_modal.select_lesson')}</label>
              <div className="border border-gray-200 rounded-lg flex-1 overflow-y-auto">
                {lessons.length > 0 ? (
                  lessons.map(lesson => (
                    <div
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`p-3 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                        selectedLessonId === lesson.id ? 'bg-brand-soft/10 border-l-4 border-brand-primary' : ''
                      }`}
                    >
                      <FileText className={`h-4 w-4 ${selectedLessonId === lesson.id ? 'text-brand-primary' : 'text-gray-400'}`} />
                      <span className={`text-sm ${selectedLessonId === lesson.id ? 'font-medium text-brand-primary' : 'text-gray-700'}`}>
                        {lesson.title}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {t('resources.attach_modal.no_lessons')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            {t('resources.attach_modal.cancel')}
          </button>
          <button
            onClick={handleAttach}
            disabled={loading || !selectedLessonId}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('resources.attach_modal.attaching')}
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4" />
                {t('resources.attach_modal.attach_button')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
