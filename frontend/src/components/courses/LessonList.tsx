import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../../services/api';
import type { Lesson } from '../../types/courses';
import { useNotification } from '../../context/NotificationContext';
import LessonItem from './LessonItem';

interface LessonListProps {
  courseId: string;
  lessons: Lesson[];
  onEdit?: (lesson: Lesson) => void;
  onDelete?: (lessonId: number) => void;
  onDuplicate?: (lesson: Lesson) => void;
}

const LessonList: React.FC<LessonListProps> = ({
  courseId,
  lessons: initialLessons,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  // Update local state when props change
  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (reorderedLessons: Lesson[]) => {
      const lessonOrder = reorderedLessons.map((lesson, index) => ({
        id: lesson.id,
        order: index,
      }));
      return coursesApi.reorderLessons(courseId, lessonOrder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      showNotification({
        type: 'success',
        title: 'Lessons Reordered',
        message: 'Lesson order updated successfully',
        duration: 3000,
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Reorder Failed',
        message: error.response?.data?.message || 'Failed to reorder lessons',
        duration: 5000,
      });
      // Revert to original order
      setLessons(initialLessons);
    },
  });

  // Update lesson title mutation
  const updateTitleMutation = useMutation({
    mutationFn: ({ lessonId, title }: { lessonId: number; title: string }) =>
      coursesApi.updateLesson(lessonId.toString(), { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      showNotification({
        type: 'success',
        title: 'Title Updated',
        message: 'Lesson title updated successfully',
        duration: 3000,
      });
      setEditingId(null);
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.response?.data?.message || 'Failed to update lesson title',
        duration: 5000,
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setLessons((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const reordered = arrayMove(items, oldIndex, newIndex);
        
        // Optimistic update - send to server
        reorderMutation.mutate(reordered);
        
        return reordered;
      });
    }
  };

  const handleStartEdit = (lesson: Lesson) => {
    setEditingId(lesson.id);
    setEditingTitle(lesson.title);
  };

  const handleSaveTitle = (lessonId: number) => {
    if (editingTitle.trim() === '') {
      showNotification({
        type: 'error',
        title: 'Invalid Title',
        message: 'Lesson title cannot be empty',
        duration: 3000,
      });
      return;
    }

    updateTitleMutation.mutate({ lessonId, title: editingTitle.trim() });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const activeLesson = lessons.find((lesson) => lesson.id === activeId);

  // Calculate total course duration
  const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with total duration */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{lessons.length}</span> lesson{lessons.length !== 1 ? 's' : ''}
        </div>
        <div className="text-sm text-gray-600">
          Total duration: <span className="font-medium">{formatDuration(totalDuration)}</span>
        </div>
      </div>

      {/* Lesson list with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {lessons.map((lesson, index) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                index={index}
                isEditing={editingId === lesson.id}
                editingTitle={editingTitle}
                onEditingTitleChange={setEditingTitle}
                onStartEdit={handleStartEdit}
                onSaveTitle={handleSaveTitle}
                onCancelEdit={handleCancelEdit}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag overlay */}
        <DragOverlay>
          {activeLesson ? (
            <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg p-4 opacity-90">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  {lessons.findIndex((l) => l.id === activeLesson.id) + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{activeLesson.title}</h4>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty state */}
      {lessons.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No lessons</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new lesson.</p>
        </div>
      )}
    </div>
  );
};

export default LessonList;
