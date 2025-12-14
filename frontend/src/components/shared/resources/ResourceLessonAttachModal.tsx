import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Search } from 'lucide-react';
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
      showNotification({ title: 'Error', message: 'Failed to load courses', type: 'error' });
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
      showNotification({ title: 'Error', message: 'Failed to load lessons', type: 'error' });
    }
  };

  const handleAttach = async () => {
    if (!selectedLessonId) {
      showNotification({ title: 'Select Lesson', message: 'Please select a lesson', type: 'warning' });
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
        showNotification({ title: 'Success', message: 'Resource attached successfully', type: 'success' });
        onSuccess();
        onClose();
      } else {
        showNotification({ title: 'Error', message: data.message || 'Failed to attach resource', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to attach resource:', error);
      showNotification({ title: 'Error', message: 'Failed to attach resource', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <LinkIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Attach Resource to Lesson</h2>
              <p className="text-sm text-gray-600 mt-1">
                Attaching: <span className="font-medium">{resourceTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Select Course
            </label>
            <select
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Choose a course --</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Selection */}
          {selectedCourseId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Select Lesson
              </label>
              
              {/* Search */}
              {lessons.length > 5 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search lessons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Lesson List */}
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {filteredLessons.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {lessons.length === 0 ? 'No lessons in this course' : 'No lessons match your search'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredLessons.map(lesson => (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          selectedLessonId === lesson.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                            {lesson.order_index}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {lesson.title}
                            </p>
                          </div>
                          {selectedLessonId === lesson.id && (
                            <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAttach}
            disabled={!selectedLessonId || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Attaching...' : 'Attach Resource'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceLessonAttachModal;
