import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Search, Filter, CheckCircle, Clock, AlertCircle,
  User, BookOpen, Calendar, TrendingUp, Plus, Eye, Edit3,
  Loader2, RefreshCw, SortAsc, SortDesc
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { assignmentsApi, type TeacherAssignment } from '@/services/api/assignments';

interface Assignment {
  id: number;
  title: string;
  courseId: number | null;
  courseTitle: string;
  dueDate: string | null;
  totalSubmissions: number;
  gradedSubmissions: number;
  averageScore?: number | null;
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
}

interface AssignmentStats {
  totalAssignments: number;
  pendingGrading: number;
  averageScore: number;
  totalSubmissions: number;
}

const Assignments: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'closed'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt' | 'title'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await assignmentsApi.listForTeacher();
      const rows = response.data.assignments || [];
      const mapped: Assignment[] = rows.map((a: TeacherAssignment) => ({
        id: a.id,
        title: a.title,
        courseId: a.course_id,
        courseTitle: a.course_title || 'Unassigned course',
        dueDate: a.due_date,
        totalSubmissions: Number(a.total_submissions || 0),
        gradedSubmissions: Number(a.graded_submissions || 0),
        averageScore: a.average_score,
        status: a.status as Assignment['status'],
        createdAt: a.created_at
      }));

      setAssignments(mapped);
    } catch (err: any) {
      console.error('Failed to load assignments:', err);
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const stats: AssignmentStats = useMemo(() => {
    const total = assignments.length;
    const pending = assignments.reduce((sum, a) => sum + (a.totalSubmissions - a.gradedSubmissions), 0);
    const avgScore = assignments.length > 0
      ? Math.round(assignments.reduce((sum, a) => sum + (a.averageScore || 0), 0) / assignments.length)
      : 0;
    const totalSubs = assignments.reduce((sum, a) => sum + a.totalSubmissions, 0);

    return {
      totalAssignments: total,
      pendingGrading: pending,
      averageScore: avgScore,
      totalSubmissions: totalSubs
    };
  }, [assignments]);

  const filteredAndSortedAssignments = useMemo(() => {
    let filtered = assignments.filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'dueDate':
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [assignments, searchTerm, statusFilter, sortBy, sortOrder]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  const getDaysUntilDue = useCallback((dateString: string) => {
    const due = new Date(dateString);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'published':
        return 'bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 border-[#27AE60]/30 text-[#27AE60]';
      case 'draft':
        return 'bg-stone-100 border-stone-200 text-stone-600';
      case 'closed':
        return 'bg-stone-100 border-stone-200 text-stone-500';
      default:
        return 'bg-stone-100 border-stone-200 text-stone-600';
    }
  }, []);

  if (loading && assignments.length === 0) {
    return (
      <div className="w-full space-y-2 p-2">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#27AE60] mx-auto mb-2" />
            <p className="text-stone-600 text-sm">Loading assignments...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && assignments.length === 0) {
    return (
      <div className="w-full space-y-2 p-2">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center bg-white/90 backdrop-blur-md rounded-lg p-6 border border-red-200 shadow-sm max-w-sm">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button
              onClick={loadAssignments}
              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:shadow-md transition-all font-medium text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 p-2">
     
      

      {/* Compact Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 border border-stone-200 shadow-sm hover:shadow-md transition-all hover:border-[#27AE60]/50">
            <div className="flex items-center justify-between mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-[#27AE60]/20 rounded-lg blur-md"></div>
                <div className="relative p-1.5 bg-gradient-to-br from-[#27AE60]/10 to-[#16A085]/10 rounded-lg border border-[#27AE60]/30">
                  <FileText className="h-4 w-4 text-[#27AE60]" />
                </div>
              </div>
            </div>
            <p className="text-xl font-bold text-stone-800">{stats.totalAssignments}</p>
            <p className="text-xs text-stone-600 mt-0.5 font-medium">Total Assignments</p>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 border border-stone-200 shadow-sm hover:shadow-md transition-all hover:border-[#16A085]/50">
            <div className="flex items-center justify-between mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-[#16A085]/20 rounded-lg blur-md"></div>
                <div className="relative p-1.5 bg-gradient-to-br from-[#16A085]/10 to-[#00FFFF]/10 rounded-lg border border-[#16A085]/30">
                  <Clock className="h-4 w-4 text-[#16A085]" />
                </div>
              </div>
            </div>
            <p className="text-xl font-bold text-stone-800">{stats.pendingGrading}</p>
            <p className="text-xs text-stone-600 mt-0.5 font-medium">Pending Grading</p>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 border border-stone-200 shadow-sm hover:shadow-md transition-all hover:border-[#00FFFF]/50">
            <div className="flex items-center justify-between mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-[#00FFFF]/20 rounded-lg blur-md"></div>
                <div className="relative p-1.5 bg-gradient-to-br from-[#00FFFF]/10 to-[#27AE60]/10 rounded-lg border border-[#00FFFF]/30">
                  <TrendingUp className="h-4 w-4 text-[#00FFFF]" />
                </div>
              </div>
            </div>
            <p className="text-xl font-bold text-stone-800">{stats.averageScore}%</p>
            <p className="text-xs text-stone-600 mt-0.5 font-medium">Average Score</p>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 border border-stone-200 shadow-sm hover:shadow-md transition-all hover:border-[#FFD700]/50">
            <div className="flex items-center justify-between mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-[#FFD700]/20 rounded-lg blur-md"></div>
                <div className="relative p-1.5 bg-gradient-to-br from-[#FFD700]/10 to-[#FFA500]/10 rounded-lg border border-[#FFD700]/30">
                  <CheckCircle className="h-4 w-4 text-[#FFD700]" />
                </div>
              </div>
            </div>
            <p className="text-xl font-bold text-stone-800">{stats.totalSubmissions}</p>
            <p className="text-xs text-stone-600 mt-0.5 font-medium">Total Submissions</p>
          </div>
        </div>

      {/* Compact Search and Filters */}
      <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              >
                <option value="dueDate-desc">Due Date (Latest)</option>
                <option value="dueDate-asc">Due Date (Earliest)</option>
                <option value="createdAt-desc">Created (Newest)</option>
                <option value="createdAt-asc">Created (Oldest)</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

      {/* Assignments List */}
      {filteredAndSortedAssignments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredAndSortedAssignments.map((assignment) => {
              const daysUntilDue = getDaysUntilDue(assignment.dueDate);
              const isOverdue = daysUntilDue < 0;
              const progress = assignment.totalSubmissions > 0
                ? Math.round((assignment.gradedSubmissions / assignment.totalSubmissions) * 100)
                : 0;

              return (
                <div
                  key={assignment.id}
                  className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-md hover:shadow-lg transition-all hover:border-[#27AE60]/50 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-stone-800 mb-1">{assignment.title}</h3>
                      <p className="text-sm text-stone-600 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {assignment.courseTitle}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(assignment.status)}`}>
                      {assignment.status}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-600 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Due Date:
                      </span>
                      <span className={`font-semibold ${isOverdue ? 'text-red-500' : daysUntilDue <= 3 ? 'text-[#FFD700]' : 'text-stone-700'}`}>
                        {formatDate(assignment.dueDate)}
                        {!isOverdue && ` (${daysUntilDue} days)`}
                        {isOverdue && ' (Overdue)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-600 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Submissions:
                      </span>
                      <span className="font-semibold text-stone-700">
                        {assignment.gradedSubmissions} / {assignment.totalSubmissions} graded
                      </span>
                    </div>

                    {assignment.averageScore && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-600 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Average Score:
                        </span>
                        <span className="font-semibold text-[#27AE60]">{assignment.averageScore}%</span>
                      </div>
                    )}

                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-stone-600 mb-1">
                        <span>Grading Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-[#27AE60] to-[#16A085] h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-stone-200">
                    <Link
                      to={`/teacher/assignments/${assignment.id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 rounded-lg transition-all shadow-md hover:shadow-lg font-semibold text-sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View & Grade
                    </Link>
                    <Link
                      to={`/teacher/assignments/${assignment.id}/edit`}
                      className="inline-flex items-center px-4 py-2 bg-white/90 hover:bg-white border border-stone-200 hover:border-[#16A085]/50 text-stone-700 hover:text-[#16A085] rounded-lg transition-all font-semibold text-sm"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-md">
            <FileText className="h-16 w-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-stone-800 mb-2">No assignments found</h3>
            <p className="text-stone-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : "You haven't created any assignments yet"}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link
                to="/teacher/assignments/new"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Assignment
              </Link>
            )}
        </div>
      )}
    </div>
  );
};

export default Assignments;


