import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  type DragCancelEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../../services/api';
import type { Lesson } from '../../types/courses';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';
import LessonItem from './LessonItem';
import {
  Video,
  FileText,
  PlayCircle,
  Clock,
  Eye,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Download,
  Upload,
  BarChart3,
  Zap,
  Target,
  BookOpen,
  AlertCircle,
  Plus
} from 'lucide-react';

interface LessonListProps {
  courseId: string;
  lessons: Lesson[];
  onEdit?: (lesson: Lesson) => void;
  onDelete?: (lessonId: number) => void;
  onDuplicate?: (lesson: Lesson) => void;
  onPreview?: (lesson: Lesson) => void;
  onAddLesson?: () => void;
  showFilters?: boolean;
  compact?: boolean;
  viewMode?: 'list' | 'grid';
}

type LessonStatus = 'published' | 'draft' | 'scheduled' | 'archived';
type LessonType = 'video' | 'article' | 'quiz' | 'assignment' | 'live';
type SortField = 'order' | 'title' | 'duration' | 'created_at' | 'updated_at' | 'views';
type SortDirection = 'asc' | 'desc';

const LessonList: React.FC<LessonListProps> = ({
  courseId,
  lessons: initialLessons,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
  onAddLesson,
  showFilters = true,
  compact = false,
  viewMode = 'list'
}) => {
  const { t } = useTranslation();
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LessonStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<LessonType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortField>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentViewMode, setCurrentViewMode] = useState<'list' | 'grid'>(viewMode);
  const [selectedLessons, setSelectedLessons] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  // Update local state when props change
  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  // Enhanced sensors with better configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        tolerance: 100,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Modifiers for drag and drop
  const modifiers = [restrictToVerticalAxis, restrictToWindowEdges];

  // Filter and sort lessons
  const filteredAndSortedLessons = useMemo(() => {
    let filtered = lessons.filter(lesson => {
      const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lesson.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || lesson.status === statusFilter;
      const matchesType = typeFilter === 'all' || lesson.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort lessons
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at || '').getTime();
          bValue = new Date(b.created_at || '').getTime();
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at || '').getTime();
          bValue = new Date(b.updated_at || '').getTime();
          break;
        case 'views':
          aValue = a.view_count || 0;
          bValue = b.view_count || 0;
          break;
        case 'order':
        default:
          aValue = a.order || 0;
          bValue = b.order || 0;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [lessons, searchTerm, statusFilter, typeFilter, sortBy, sortDirection]);

  // Calculate course statistics
  const courseStats = useMemo(() => {
    const total = lessons.length;
    const published = lessons.filter(l => l.status === 'published').length;
    const draft = lessons.filter(l => l.status === 'draft').length;
    const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    const totalViews = lessons.reduce((sum, lesson) => sum + (lesson.view_count || 0), 0);
    const averageCompletion = lessons.length > 0 
      ? Math.round(lessons.reduce((sum, lesson) => sum + (lesson.completion_rate || 0), 0) / lessons.length)
      : 0;

    return {
      total,
      published,
      draft,
      totalDuration,
      totalViews,
      averageCompletion
    };
  }, [lessons]);

  // Reorder mutation with enhanced error handling
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
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      showNotification({
        type: 'success',
        title: t('lessons.reorder_success'),
        message: t('lessons.reorder_success_message'),
        duration: 3000,
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: t('lessons.reorder_failed'),
        message: error.response?.data?.message || t('lessons.reorder_failed_message'),
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
        title: t('lessons.title_updated'),
        message: t('lessons.title_updated_message'),
        duration: 3000,
      });
      setEditingId(null);
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: t('lessons.update_failed'),
        message: error.response?.data?.message || t('lessons.title_update_failed'),
        duration: 5000,
      });
    },
  });

  // Bulk actions mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (action: string) => {
      const lessonIds = Array.from(selectedLessons);
      
      switch (action) {
        case 'publish':
          return Promise.all(lessonIds.map(id => 
            coursesApi.updateLesson(id.toString(), { status: 'published' })
          ));
        case 'unpublish':
          return Promise.all(lessonIds.map(id => 
            coursesApi.updateLesson(id.toString(), { status: 'draft' })
          ));
        case 'archive':
          return Promise.all(lessonIds.map(id => 
            coursesApi.updateLesson(id.toString(), { status: 'archived' })
          ));
        case 'delete':
          return Promise.all(lessonIds.map(id => 
            coursesApi.deleteLesson(id.toString())
          ));
        default:
          throw new Error('Invalid bulk action');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      setSelectedLessons(new Set());
      setBulkAction('');
      showNotification({
        type: 'success',
        title: t('lessons.bulk_action_success'),
        message: t('lessons.bulk_action_success_message'),
        duration: 3000,
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: t('lessons.bulk_action_failed'),
        message: error.response?.data?.message || t('lessons.bulk_action_failed_message'),
        duration: 5000,
      });
    },
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
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
  }, [reorderMutation]);

  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    setActiveId(null);
  }, []);

  const handleStartEdit = useCallback((lesson: Lesson) => {
    setEditingId(lesson.id);
    setEditingTitle(lesson.title);
  }, []);

  const handleSaveTitle = useCallback((lessonId: number) => {
    if (editingTitle.trim() === '') {
      showNotification({
        type: 'error',
        title: t('lessons.invalid_title'),
        message: t('lessons.title_required'),
        duration: 3000,
      });
      return;
    }

    if (editingTitle.length > 100) {
      showNotification({
        type: 'error',
        title: t('lessons.title_too_long'),
        message: t('lessons.title_max_length'),
        duration: 3000,
      });
      return;
    }

    updateTitleMutation.mutate({ lessonId, title: editingTitle.trim() });
  }, [editingTitle, updateTitleMutation, showNotification, t]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingTitle('');
  }, []);

  const handleSelectLesson = useCallback((lessonId: number) => {
    setSelectedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedLessons.size === filteredAndSortedLessons.length) {
      setSelectedLessons(new Set());
    } else {
      setSelectedLessons(new Set(filteredAndSortedLessons.map(l => l.id)));
    }
  }, [filteredAndSortedLessons, selectedLessons.size]);

  const handleBulkAction = useCallback(() => {
    if (bulkAction && selectedLessons.size > 0) {
      bulkActionMutation.mutate(bulkAction);
    }
  }, [bulkAction, selectedLessons.size, bulkActionMutation]);

  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  }, [sortBy, sortDirection]);

  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return t('common.duration_hours_minutes', { hours, minutes });
    } else if (minutes > 0) {
      return t('common.duration_minutes_seconds', { minutes, seconds: secs });
    } else {
      return t('common.duration_seconds', { seconds: secs });
    }
  }, [t]);

  const activeLesson = lessons.find((lesson) => lesson.id === activeId);

  // Status options for filter
  const statusOptions = [
    { value: 'all', label: t('common.all_statuses') },
    { value: 'published', label: t('common.published') },
    { value: 'draft', label: t('common.draft') },
    { value: 'scheduled', label: t('common.scheduled') },
    { value: 'archived', label: t('common.archived') }
  ];

  // Type options for filter
  const typeOptions = [
    { value: 'all', label: t('common.all_types') },
    { value: 'video', label: t('lessons.types.video') },
    { value: 'article', label: t('lessons.types.article') },
    { value: 'quiz', label: t('lessons.types.quiz') },
    { value: 'assignment', label: t('lessons.types.assignment') },
    { value: 'live', label: t('lessons.types.live') }
  ];

  // Bulk action options
  const bulkActionOptions = [
    { value: 'publish', label: t('lessons.bulk_actions.publish') },
    { value: 'unpublish', label: t('lessons.bulk_actions.unpublish') },
    { value: 'archive', label: t('lessons.bulk_actions.archive') },
    { value: 'delete', label: t('lessons.bulk_actions.delete') }
  ];

  if (compact) {
    return (
      <div className="space-y-3">
        {filteredAndSortedLessons.slice(0, 5).map((lesson, index) => (
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
            onPreview={onPreview}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{courseStats.total}</div>
            <div className="text-sm text-blue-700">{t('common.total_lessons')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{courseStats.published}</div>
            <div className="text-sm text-green-700">{t('common.published')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{courseStats.draft}</div>
            <div className="text-sm text-yellow-700">{t('common.draft')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatDuration(courseStats.totalDuration)}
            </div>
            <div className="text-sm text-purple-700">{t('common.total_duration')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{courseStats.totalViews}</div>
            <div className="text-sm text-orange-700">{t('common.total_views')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">{courseStats.averageCompletion}%</div>
            <div className="text-sm text-cyan-700">{t('common.avg_completion')}</div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('lessons.search_lessons')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LessonStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as LessonType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {typeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode and Sort */}
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    currentViewMode === 'list' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    currentViewMode === 'grid' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>

              {/* Sort Button */}
              <button
                onClick={() => handleSort('order')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                <span className="text-sm">{t('common.sort')}</span>
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedLessons.size > 0 && (
            <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedLessons.size === filteredAndSortedLessons.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-blue-700">
                  {t('lessons.selected_count', { count: selectedLessons.size })}
                </span>
              </div>
              
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('lessons.select_bulk_action')}</option>
                {bulkActionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || bulkActionMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bulkActionMutation.isPending ? t('common.applying') : t('common.apply')}
              </button>

              <button
                onClick={() => setSelectedLessons(new Set())}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('common.clear')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lesson List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* List Header */}
        {currentViewMode === 'list' && (
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-4 text-sm font-medium text-gray-700">
              <div className="w-12 text-center">{t('common.order')}</div>
              <div className="flex-1">{t('common.title')}</div>
              <div className="w-24 text-center">{t('common.type')}</div>
              <div className="w-20 text-center">{t('common.duration')}</div>
              <div className="w-20 text-center">{t('common.status')}</div>
              <div className="w-32 text-center">{t('common.actions')}</div>
            </div>
          </div>
        )}

        {/* Lesson Content */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={modifiers}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext 
            items={filteredAndSortedLessons.map((l) => l.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className={currentViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6' : 'space-y-2 p-4'}>
              {filteredAndSortedLessons.map((lesson, index) => (
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
                  onPreview={onPreview}
                  onSelect={handleSelectLesson}
                  isSelected={selectedLessons.has(lesson.id)}
                  viewMode={currentViewMode}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeLesson ? (
              <div className="bg-white border-2 border-blue-500 rounded-lg shadow-xl p-4 opacity-95 transform rotate-5">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    {lessons.findIndex((l) => l.id === activeLesson.id) + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{activeLesson.title}</h4>
                    <p className="text-sm text-gray-500 truncate">
                      {formatDuration(activeLesson.duration || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Empty State */}
        {filteredAndSortedLessons.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 m-4">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? t('lessons.no_lessons_match_filters')
                : t('lessons.no_lessons')
              }
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {t('lessons.create_first_lesson_description')}
            </p>
            {onAddLesson && (
              <button
                onClick={onAddLesson}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t('lessons.create_first_lesson')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer with Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3">
        <div>
          {t('lessons.showing_x_of_y', {
            showing: filteredAndSortedLessons.length,
            total: lessons.length
          })}
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{t('lessons.total_duration')}: {formatDuration(courseStats.totalDuration)}</span>
          </div>
          {selectedLessons.size > 0 && (
            <div className="flex items-center space-x-1 text-blue-600">
              <Target className="h-4 w-4" />
              <span>{t('lessons.x_selected', { count: selectedLessons.size })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(LessonList);