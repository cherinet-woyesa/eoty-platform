import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Search,
  Clock,
  CheckCircle,
  Circle,
  TrendingUp,
  User,
} from 'lucide-react';
import { type ColumnDef } from '../shared/DataTable';
import { Skeleton } from '../shared/LoadingStates';
import { useEnrolledStudents, useStudentProgress, useExportAnalytics } from '../../hooks/useAnalytics';
import { useNotification } from '../../context/NotificationContext';

interface ProgressTrackerProps {
  courseId: string;
}

interface StudentData {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
  enrollment_status: string;
  enrolled_at: string;
  completed_at?: string;
  progress_percentage: number;
  last_accessed_at?: string;
  lessonsAccessed: number;
  lessonsCompleted: number;
  totalTimeSpent: number;
}

interface LessonProgressItem {
  lesson_id: number;
  title: string;
  order: number;
  duration: number;
  progress: number;
  is_completed: boolean;
  completed_at?: string;
  last_accessed_at?: string;
  time_spent: number;
  view_count: number;
  last_watched_timestamp: number;
}

interface QuizScoreItem {
  lesson_id: number;
  quiz_id: number;
  quiz_title: string;
  score_percentage: number;
  is_completed: boolean;
  started_at: string;
  completed_at?: string;
  attempt_number: number;
}

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
};

const ProgressBar: React.FC<{ progress: number; className?: string }> = ({ progress, className = '' }) => {
  const percentage = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const ExpandedStudentRow: React.FC<{ courseId: string; studentId: number }> = ({ courseId, studentId }) => {
  const { data: progressData, isLoading } = useStudentProgress(courseId, studentId.toString());

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (!progressData?.data) {
    return (
      <div className="p-6 bg-gray-50 text-center text-gray-500">
        No detailed progress data available
      </div>
    );
  }

  const { summary, lessonProgress, quizScores } = progressData.data;

  return (
    <div className="p-6 bg-gray-50 border-t border-gray-200">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Completion Rate</div>
          <div className="text-2xl font-bold text-blue-600">{summary.completionRate}%</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Lessons Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {summary.completedLessons}/{summary.totalLessons}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Time Spent</div>
          <div className="text-2xl font-bold text-purple-600">{formatDuration(summary.totalTimeSpent)}</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Avg Progress</div>
          <div className="text-2xl font-bold text-orange-600">{summary.averageProgress}%</div>
        </div>
      </div>

      {/* Lesson-by-Lesson Progress */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Lesson Progress</h4>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lesson</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time Spent</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Accessed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lessonProgress.map((lesson: LessonProgressItem) => (
                <tr key={lesson.lesson_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">{lesson.title}</div>
                    <div className="text-xs text-gray-500">Lesson {lesson.order}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ProgressBar progress={lesson.progress || 0} />
                      </div>
                      <span className="text-xs text-gray-600 w-12 text-right">
                        {Math.round(lesson.progress || 0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDuration(lesson.time_spent || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {lesson.is_completed ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Complete
                      </span>
                    ) : lesson.progress > 0 ? (
                      <span className="inline-flex items-center gap-1 text-blue-600">
                        <Circle className="h-4 w-4" />
                        In Progress
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <Circle className="h-4 w-4" />
                        Not Started
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatRelativeTime(lesson.last_accessed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quiz Scores */}
      {quizScores && quizScores.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Quiz Performance</h4>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quiz</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quizScores.map((quiz: QuizScoreItem) => (
                  <tr key={`${quiz.quiz_id}-${quiz.attempt_number}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{quiz.quiz_title}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-semibold ${
                        quiz.score_percentage >= 80 ? 'text-green-600' :
                        quiz.score_percentage >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {Math.round(quiz.score_percentage)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      Attempt {quiz.attempt_number}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {quiz.is_completed ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-600">
                          <Clock className="h-4 w-4" />
                          In Progress
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ courseId }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy] = useState('enrolled_at');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { showNotification } = useNotification();
  const { exportAnalytics } = useExportAnalytics();

  const { data, isLoading, error } = useEnrolledStudents(courseId, {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
  });

  const students = data?.data?.students || [];
  const pagination = data?.data?.pagination;

  const toggleRowExpansion = (studentId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleExport = async () => {
    try {
      await exportAnalytics(courseId, 'csv', 'students');
      showNotification({
        type: 'success',
        title: 'Export Successful',
        message: 'Student progress report has been downloaded',
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export student progress report',
      });
    }
  };

  const columns: ColumnDef<StudentData>[] = useMemo(() => [
    {
      key: 'expand',
      header: '',
      accessor: (row) => (
        <button
          onClick={() => toggleRowExpansion(row.user_id)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label={expandedRows.has(row.user_id) ? 'Collapse row' : 'Expand row'}
        >
          {expandedRows.has(row.user_id) ? (
            <ChevronDown className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          )}
        </button>
      ),
      width: '50px',
    },
    {
      key: 'student',
      header: 'Student',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          {row.profile_picture ? (
            <img
              src={row.profile_picture}
              alt={`${row.first_name} ${row.last_name}`}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">
              {row.first_name} {row.last_name}
            </div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
      sortable: true,
      filterable: true,
    },
    {
      key: 'progress',
      header: 'Overall Progress',
      accessor: (row) => (
        <div className="w-full max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1">
              <ProgressBar progress={row.progress_percentage || 0} />
            </div>
            <span className="text-sm font-medium text-gray-700 w-12 text-right">
              {Math.round(row.progress_percentage || 0)}%
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {row.lessonsCompleted || 0} lessons completed
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'timeSpent',
      header: 'Time Spent',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-700">{formatDuration(row.totalTimeSpent || 0)}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => {
        if (row.enrollment_status === 'completed') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3" />
              Completed
            </span>
          );
        } else if (row.progress_percentage > 0) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <TrendingUp className="h-3 w-3" />
              Active
            </span>
          );
        } else {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <Circle className="h-3 w-3" />
              Enrolled
            </span>
          );
        }
      },
      sortable: true,
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      accessor: (row) => (
        <div className="text-sm text-gray-600">
          {formatRelativeTime(row.last_accessed_at)}
        </div>
      ),
      sortable: true,
    },
  ], [expandedRows]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-800">Failed to load student progress data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Export */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // Reset to first page on search
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="p-8">
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-12 w-full mb-4" />
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Enrolled</h3>
            <p className="text-gray-500">
              {search ? 'No students match your search criteria' : 'No students have enrolled in this course yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        style={{ width: column.width }}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student: StudentData) => (
                    <React.Fragment key={student.user_id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        {columns.map((column) => (
                          <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                            {column.accessor(student)}
                          </td>
                        ))}
                      </tr>
                      {expandedRows.has(student.user_id) && (
                        <tr>
                          <td colSpan={columns.length} className="p-0">
                            <ExpandedStudentRow courseId={courseId} studentId={student.user_id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-700">
                    {(pagination.page - 1) * pagination.pageSize + 1}-
                    {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of{' '}
                    {pagination.totalItems}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;
