import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../../services/api';
import type { Lesson } from '../../types/courses';
import LessonList from './LessonList';
import { useNotification } from '../../context/NotificationContext';
import { Plus } from 'lucide-react';

interface LessonListDemoProps {
  courseId: string;
}

/**
 * Demo component showing how to integrate LessonList with course editing
 * 
 * Features demonstrated:
 * - Fetching lessons from API
 * - Drag-and-drop reordering with optimistic updates
 * - Inline title editing
 * - Quick actions (edit, delete, duplicate)
 * - Video status indicators
 * - Total duration calculation
 */
const LessonListDemo: React.FC<LessonListDemoProps> = ({ courseId }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  // Fetch lessons
  const { data: lessons = [], isLoading, error } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => coursesApi.getLessons(courseId),
  });

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: (title: string) =>
      coursesApi.createLesson(courseId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      showNotification({
        type: 'success',
        title: 'Lesson Created',
        message: 'New lesson created successfully',
        duration: 3000,
      });
      setIsCreating(false);
      setNewLessonTitle('');
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Creation Failed',
        message: error.response?.data?.message || 'Failed to create lesson',
        duration: 5000,
      });
    },
  });

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: number) =>
      coursesApi.deleteLesson(lessonId.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      showNotification({
        type: 'success',
        title: 'Lesson Deleted',
        message: 'Lesson deleted successfully',
        duration: 3000,
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: error.response?.data?.message || 'Failed to delete lesson',
        duration: 5000,
      });
    },
  });

  // Duplicate lesson mutation
  const duplicateLessonMutation = useMutation({
    mutationFn: (lesson: Lesson) =>
      coursesApi.createLesson(courseId, {
        title: `${lesson.title} (Copy)`,
        description: lesson.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      showNotification({
        type: 'success',
        title: 'Lesson Duplicated',
        message: 'Lesson duplicated successfully',
        duration: 3000,
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Duplication Failed',
        message: error.response?.data?.message || 'Failed to duplicate lesson',
        duration: 5000,
      });
    },
  });

  const handleCreateLesson = () => {
    if (newLessonTitle.trim() === '') {
      showNotification({
        type: 'error',
        title: 'Invalid Title',
        message: 'Lesson title cannot be empty',
        duration: 3000,
      });
      return;
    }

    createLessonMutation.mutate(newLessonTitle.trim());
  };

  const handleEdit = (lesson: Lesson) => {
    // Navigate to lesson editor or open modal
    console.log('Edit lesson:', lesson);
    showNotification({
      type: 'info',
      title: 'Edit Lesson',
      message: `Opening editor for: ${lesson.title}`,
      duration: 3000,
    });
  };

  const handleDelete = (lessonId: number) => {
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      deleteLessonMutation.mutate(lessonId);
    }
  };

  const handleDuplicate = (lesson: Lesson) => {
    duplicateLessonMutation.mutate(lesson);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Failed to load lessons. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Course Lessons</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Lesson
        </button>
      </div>

      {/* Create lesson form */}
      {isCreating && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              placeholder="Enter lesson title..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateLesson();
                } else if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewLessonTitle('');
                }
              }}
            />
            <button
              onClick={handleCreateLesson}
              disabled={createLessonMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createLessonMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewLessonTitle('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Lesson list */}
      <LessonList
        courseId={courseId}
        lessons={lessons}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />

      {/* Usage instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <h3 className="font-semibold mb-2">Usage Tips:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Drag lessons by the grip handle to reorder them</li>
          <li>Click the edit icon to rename a lesson inline</li>
          <li>Use quick actions (edit, duplicate, delete) on hover</li>
          <li>Video status indicators show processing state</li>
          <li>Total duration updates automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default LessonListDemo;
