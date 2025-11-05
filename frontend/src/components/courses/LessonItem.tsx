import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Lesson } from '../../types/courses';
import {
  GripVertical,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Play,
  Clock,
  AlertCircle,
  Loader,
} from 'lucide-react';

interface LessonItemProps {
  lesson: Lesson;
  index: number;
  isEditing: boolean;
  editingTitle: string;
  onEditingTitleChange: (title: string) => void;
  onStartEdit: (lesson: Lesson) => void;
  onSaveTitle: (lessonId: number) => void;
  onCancelEdit: () => void;
  onEdit?: (lesson: Lesson) => void;
  onDelete?: (lessonId: number) => void;
  onDuplicate?: (lesson: Lesson) => void;
}

const LessonItem: React.FC<LessonItemProps> = ({
  lesson,
  index,
  isEditing,
  editingTitle,
  onEditingTitleChange,
  onStartEdit,
  onSaveTitle,
  onCancelEdit,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const [showActions, setShowActions] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoStatusBadge = () => {
    const status = lesson.video_status || 'no_video';
    
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
            <Play className="w-3 h-3" />
            Ready
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
            <Loader className="w-3 h-3 animate-spin" />
            Processing {lesson.processing_progress ? `${lesson.processing_progress}%` : ''}
          </span>
        );
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
            <Loader className="w-3 h-3 animate-spin" />
            Uploading
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
            No Video
          </span>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white border rounded-lg transition-all
        ${isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}
        ${showActions ? 'shadow-md' : 'shadow-sm'}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Drag handle */}
        <button
          className={`
            flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600
            transition-opacity
            ${showActions ? 'opacity-100' : 'opacity-0'}
          `}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Lesson number */}
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
          {index + 1}
        </div>

        {/* Lesson content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => onEditingTitleChange(e.target.value)}
                className="flex-1 px-3 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSaveTitle(lesson.id);
                  } else if (e.key === 'Escape') {
                    onCancelEdit();
                  }
                }}
              />
              <button
                onClick={() => onSaveTitle(lesson.id)}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <h4 className="font-medium text-gray-900 truncate">{lesson.title}</h4>
              {lesson.description && (
                <p className="text-sm text-gray-500 truncate mt-0.5">{lesson.description}</p>
              )}
            </div>
          )}
        </div>

        {/* Video status and duration */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {getVideoStatusBadge()}
          
          {lesson.duration > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(lesson.duration)}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div
          className={`
            flex items-center gap-1 flex-shrink-0 transition-opacity
            ${showActions ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <button
            onClick={() => onStartEdit(lesson)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit title"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(lesson)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit lesson"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {onDuplicate && (
            <button
              onClick={() => onDuplicate(lesson)}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Duplicate lesson"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(lesson.id)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete lesson"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error message if video processing failed */}
      {lesson.video_status === 'error' && lesson.error_message && (
        <div className="px-4 pb-4">
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{lesson.error_message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonItem;
