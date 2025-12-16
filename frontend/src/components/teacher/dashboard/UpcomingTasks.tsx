import React, { useCallback, useState, useMemo } from 'react';
import { 
  Clock, CheckCircle, Users, AlertCircle, Calendar, FileText, 
  MessageCircle, Video, Plus, Filter, Search, MoreVertical, 
  Edit3, Trash2, Bell, Target, Zap, BookOpen, Award,
  ChevronDown, ChevronUp, X, RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';

// Types
interface Task {
  id: string;
  type: 'assignment' | 'video' | 'discussion' | 'review' | 'meeting' | 'announcement' | 'quiz';
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  course: string;
  courseId?: string;
  studentCount?: number;
  completed: boolean;
  createdAt: string;
  estimatedDuration?: number; // in minutes
  tags?: string[];
  attachments?: number;
  reminders?: string[];
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface UpcomingTasksProps {
  tasks: Task[];
  compact?: boolean;
  showFilters?: boolean;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskCreate?: () => void;
  enableFetch?: boolean;
  limit?: number;
  page?: number;
}

type TaskType = Task['type'];
type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue' | TaskType;
type SortField = 'dueDate' | 'priority' | 'title' | 'course';

const UpcomingTasks: React.FC<UpcomingTasksProps> = ({ 
  tasks, 
  compact = false,
  showFilters = true,
  onTaskUpdate,
  onTaskCreate,
  enableFetch = true,
  limit = 20,
  page = 1
}) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(page);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TaskFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const taskTypes = useMemo(() => [
    { type: 'assignment', label: t('tasks.types.assignment'), icon: FileText, color: 'blue' },
    { type: 'video', label: t('tasks.types.video'), icon: Video, color: 'red' },
    { type: 'discussion', label: t('tasks.types.discussion'), icon: MessageCircle, color: 'green' },
    { type: 'review', label: t('tasks.types.review'), icon: CheckCircle, color: 'purple' },
    { type: 'meeting', label: t('tasks.types.meeting'), icon: Users, color: 'orange' },
    { type: 'announcement', label: t('tasks.types.announcement'), icon: Bell, color: 'indigo' },
    { type: 'quiz', label: t('tasks.types.quiz'), icon: Target, color: 'pink' }
  ], [t]);

  const { data: fetchedTasks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-upcoming-tasks', limit, currentPage],
    queryFn: async () => {
      const res = await apiClient.get('/teacher/tasks', { params: { limit, page: currentPage } });
      return res?.data?.data || {};
    },
    enabled: enableFetch,
    staleTime: 60 * 1000,
    retry: 1
  });

  const sourceTasks = enableFetch ? (fetchedTasks.tasks || []) : tasks;
  const pagination = enableFetch ? fetchedTasks.pagination : null;

  const filteredAndSortedTasks = useMemo(() => {
    const now = new Date();
    let filtered = sourceTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.course.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || 
                         (typeFilter === 'pending' && !task.completed) ||
                         (typeFilter === 'completed' && task.completed) ||
                         (typeFilter === 'overdue' && !task.completed && new Date(task.dueDate) < now) ||
                         task.type === typeFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesCompletion = showCompleted || !task.completed;
      
      return matchesSearch && matchesType && matchesPriority && matchesCompletion;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'dueDate':
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'course':
          aValue = a.course.toLowerCase();
          bValue = b.course.toLowerCase();
          break;
        default:
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tasks, searchTerm, typeFilter, priorityFilter, sortBy, sortDirection, showCompleted]);

  const getTaskIcon = (type: TaskType) => {
    const taskType = taskTypes.find(tt => tt.type === type);
    const Icon = taskType?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getTaskColor = (type: TaskType) => {
    const taskType = taskTypes.find(tt => tt.type === type);
    const color = taskType?.color || 'gray';
    
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-700';
      case 'red': return 'bg-red-100 text-red-700';
      case 'green': return 'bg-green-100 text-green-700';
      case 'purple': return 'bg-purple-100 text-purple-700';
      case 'orange': return 'bg-orange-100 text-orange-700';
      case 'indigo': return 'bg-indigo-100 text-indigo-700';
      case 'pink': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'low':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  const formatDueDate = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: t('common.overdue'), color: 'text-red-600', isOverdue: true };
    if (days === 0) return { text: t('common.today'), color: 'text-orange-600', isOverdue: false };
    if (days === 1) return { text: t('common.tomorrow'), color: 'text-yellow-600', isOverdue: false };
    if (days < 7) return { text: t('common.days_away', { count: days }), color: 'text-blue-600', isOverdue: false };
    
    return { 
      text: due.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: due.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      }), 
      color: 'text-gray-600',
      isOverdue: false
    };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return t('common.duration_hours_minutes', { hours, minutes: mins });
    }
    return t('common.duration_minutes', { minutes: mins });
  };

  const handleTaskComplete = useCallback((taskId: string) => {
    onTaskUpdate?.(taskId, { completed: true });
  }, [onTaskUpdate]);

  const handleTaskUncomplete = useCallback((taskId: string) => {
    onTaskUpdate?.(taskId, { completed: false });
  }, [onTaskUpdate]);

  const handleTaskDelete = useCallback((taskId: string) => {
    // In real app, this would call an API
    console.log('Delete task:', taskId);
  }, []);

  const handleTaskEdit = useCallback((taskId: string) => {
    // In real app, this would open an edit modal
    console.log('Edit task:', taskId);
  }, []);

  const toggleTaskExpand = useCallback((taskId: string) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  }, [expandedTask]);

  const taskStats = useMemo(() => {
    const now = new Date();
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.completed).length;
    const overdue = tasks.filter(t => !t.completed && new Date(t.dueDate) < now).length;
    const today = tasks.filter(t => {
      const due = new Date(t.dueDate);
      return due.toDateString() === now.toDateString() && !t.completed;
    }).length;
    const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed).length;

    return {
      total,
      completed,
      pending,
      overdue,
      today,
      highPriority,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [tasks]);

  const typeOptions = [
    { value: 'all', label: t('common.all_tasks') },
    { value: 'pending', label: t('common.pending') },
    { value: 'completed', label: t('common.completed') },
    { value: 'overdue', label: t('common.overdue') },
    ...taskTypes.map(type => ({ value: type.type, label: type.label }))
  ];

  const priorityOptions = [
    { value: 'all', label: t('common.all_priorities') },
    { value: 'high', label: t('common.high_priority') },
    { value: 'medium', label: t('common.medium_priority') },
    { value: 'low', label: t('common.low_priority') }
  ];

  const sortOptions = [
    { value: 'dueDate', label: t('common.due_date') },
    { value: 'priority', label: t('common.priority') },
    { value: 'title', label: t('common.title') },
    { value: 'course', label: t('common.course') }
  ];

  if (compact) {
    const pendingTasks = filteredAndSortedTasks.filter(t => !t.completed).slice(0, 5);
    
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            {t('tasks.upcoming_tasks')}
          </h3>
          {taskStats.today > 0 && (
            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
              {taskStats.today} {t('common.today')}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {pendingTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              formatDueDate={formatDueDate}
              getTaskIcon={getTaskIcon}
              getTaskColor={getTaskColor}
              getPriorityColor={getPriorityColor}
              onComplete={handleTaskComplete}
              compact
              t={t}
            />
          ))}
        </div>

        {pendingTasks.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('tasks.no_upcoming_tasks')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('tasks.youre_all_caught_up')}</p>
          </div>
        )}

        {tasks.length > 5 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button 
              onClick={onTaskCreate}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center"
            >
              {t('tasks.view_all_tasks')} ({tasks.length})
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
          </div>
        )}
      </div>

      {pagination && (
        <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
          <button
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
          >
            {t('common.previous')}
          </button>
          <span>
            {t('common.page_of', { page: pagination.page, pages: pagination.pages || 1 })}
          </span>
          <button
            disabled={pagination.page >= (pagination.pages || 1) || isLoading}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('tasks.upcoming_tasks')}</h2>
          <p className="text-gray-600 mt-1">{t('tasks.manage_your_teaching_schedule')}</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          <button
            onClick={onTaskCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('tasks.new_task')}
          </button>
          {pagination && (
            <button
              onClick={() => {
                const total = pagination.total || limit;
                window.location.href = `/teacher/tasks/export?limit=${total}&format=csv`;
              }}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50"
            >
              {t('common.export_csv')}
            </button>
          )}
          {pagination && (
            <button
              onClick={() => {
                const total = pagination.total || limit;
                window.location.href = `/teacher/tasks/export?limit=${total}&format=pdf`;
              }}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50"
            >
              {t('common.export_pdf')}
            </button>
          )}
        </div>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{taskStats.total}</div>
          <div className="text-sm text-blue-700">{t('common.total')}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
          <div className="text-sm text-green-700">{t('common.completed')}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{taskStats.pending}</div>
          <div className="text-sm text-orange-700">{t('common.pending')}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-2xl font-bold text-red-600">{taskStats.overdue}</div>
          <div className="text-sm text-red-700">{t('common.overdue')}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{taskStats.today}</div>
          <div className="text-sm text-purple-700">{t('common.due_today')}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div className="text-2xl font-bold text-amber-600">{taskStats.highPriority}</div>
          <div className="text-sm text-amber-700">{t('common.high_priority')}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{t('tasks.completion_progress')}</span>
          <span>{taskStats.completionRate.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${taskStats.completionRate}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search_tasks')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TaskFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {t('common.sort_by')} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Show Completed Toggle */}
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{t('tasks.show_completed')}</span>
            </label>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredAndSortedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            formatDueDate={formatDueDate}
            formatDuration={formatDuration}
            getTaskIcon={getTaskIcon}
            getTaskColor={getTaskColor}
            getPriorityColor={getPriorityColor}
            getPriorityIcon={getPriorityIcon}
            onComplete={handleTaskComplete}
            onUncomplete={handleTaskUncomplete}
            onDelete={handleTaskDelete}
            onEdit={handleTaskEdit}
            onExpand={toggleTaskExpand}
            isExpanded={expandedTask === task.id}
            t={t}
          />
        ))}
      </div>

      {pagination && (
        <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
          <button
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
          >
            {t('common.previous')}
          </button>
          <span>
            {t('common.page_of', { page: pagination.page, pages: pagination.pages || 1 })}
          </span>
          <button
            disabled={pagination.page >= (pagination.pages || 1) || isLoading}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
          >
            {t('common.next')}
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedTasks.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || typeFilter !== 'all' || priorityFilter !== 'all'
              ? t('tasks.no_tasks_match_filters')
              : t('tasks.no_tasks_yet')
            }
          </h4>
          <p className="text-gray-600 mb-6">
            {t('tasks.create_tasks_to_organize')}
          </p>
          <button
            onClick={onTaskCreate}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('tasks.create_first_task')}
          </button>
        </div>
      )}
    </div>
  );
};

// Task Item Component
interface TaskItemProps {
  task: Task;
  formatDueDate: (dueDate: string) => { text: string; color: string; isOverdue: boolean };
  formatDuration?: (minutes: number) => string;
  getTaskIcon: (type: Task['type']) => React.ReactNode;
  getTaskColor: (type: Task['type']) => string;
  getPriorityColor: (priority: string) => string;
  getPriorityIcon?: (priority: string) => React.ReactNode;
  onComplete?: (taskId: string) => void;
  onUncomplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  onExpand?: (taskId: string) => void;
  isExpanded?: boolean;
  compact?: boolean;
  t: (key: string, options?: any) => string;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  formatDueDate,
  formatDuration,
  getTaskIcon,
  getTaskColor,
  getPriorityColor,
  getPriorityIcon,
  onComplete,
  onUncomplete,
  onDelete,
  onEdit,
  onExpand,
  isExpanded = false,
  compact = false,
  t
}) => {
  const dueInfo = formatDueDate(task.dueDate);

  if (compact) {
    return (
      <div
        className={`p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
          task.priority === 'high' ? 'bg-red-50 border-red-200' :
          task.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }`}
        onClick={() => onExpand?.(task.id)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded ${getTaskColor(task.type)}`}>
              {getTaskIcon(task.type)}
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
              <p className="text-xs text-gray-600">{task.course}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete?.(task.id);
            }}
            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className={dueInfo.color}>{dueInfo.text}</span>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
            {t(`common.${task.priority}_priority`)}
          </span>
        </div>

        {task.studentCount && (
          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-2">
            <Users className="h-3 w-3" />
            <span>{task.studentCount} {t('common.students')}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border rounded-lg transition-all duration-200 ${
        task.completed 
          ? 'bg-gray-50 border-gray-200' 
          : dueInfo.isOverdue
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Completion Checkbox */}
            <button
              onClick={() => task.completed ? onUncomplete?.(task.id) : onComplete?.(task.id)}
              className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 transition-colors ${
                task.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-green-500'
              }`}
            >
              {task.completed && <CheckCircle className="h-3 w-3" />}
            </button>

            {/* Task Icon and Type */}
            <div className={`p-2 rounded-lg ${getTaskColor(task.type)}`}>
              {getTaskIcon(task.type)}
            </div>

            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`font-semibold text-sm ${
                  task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}>
                  {task.title}
                </h4>
                {!task.completed && dueInfo.isOverdue && (
                  <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    {t('common.overdue')}
                  </span>
                )}
              </div>
              
              <p className={`text-sm mb-2 ${
                task.completed ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {task.description}
              </p>

              {/* Task Metadata */}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-3 w-3" />
                  <span>{task.course}</span>
                </div>
                
                {task.estimatedDuration && formatDuration && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(task.estimatedDuration)}</span>
                  </div>
                )}

                {task.studentCount && (
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{task.studentCount} {t('common.students')}</span>
                  </div>
                )}

                {task.attachments && task.attachments > 0 && (
                  <div className="flex items-center space-x-1">
                    <FileText className="h-3 w-3" />
                    <span>{task.attachments}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {task.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions and Due Date */}
          <div className="flex items-center space-x-2 ml-4">
            {/* Due Date */}
            <div className="text-right">
              <div className={`text-sm font-medium ${dueInfo.color}`}>
                {dueInfo.text}
              </div>
              <div className="text-xs text-gray-500">
                {t('common.due')}
              </div>
            </div>

            {/* Priority Badge */}
            {!task.completed && (
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {getPriorityIcon && getPriorityIcon(task.priority)}
                <span>{t(`common.${task.priority}_priority`)}</span>
              </span>
            )}

            {/* Expand Button */}
            <button
              onClick={() => onExpand?.(task.id)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {/* More Actions */}
            <div className="relative">
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {task.createdAt && (
                  <div>
                    <span className="font-medium">{t('common.created')}:</span>{' '}
                    {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                )}
                {task.recurrence && task.recurrence !== 'none' && (
                  <div>
                    <span className="font-medium">{t('common.repeats')}:</span>{' '}
                    {t(`common.${task.recurrence}`)}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEdit?.(task.id)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>{t('common.edit')}</span>
                </button>
                <button
                  onClick={() => onDelete?.(task.id)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{t('common.delete')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Circle icon for priorities
const Circle: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="5" />
  </svg>
);

export default React.memo(UpcomingTasks);