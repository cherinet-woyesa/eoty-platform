import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Calendar, CheckCircle, Loader2, RefreshCw, Search, Filter, Clock, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import { assignmentsApi, type StudentAssignment } from '@/services/api/assignments';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { brandColors } from '@/theme/brand';
import { useNotification } from '@/context/NotificationContext';
import AssignmentSubmissionModal from './components/AssignmentSubmissionModal';

const StudentAssignments: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showNotification } = useNotification();
  const primary = brandColors.primaryHex;
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'due_asc' | 'due_desc' | 'title' | 'status'>('due_asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'graded' | 'submitted' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Modal state
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assignmentsApi.listForStudent();
      setAssignments(res.data?.assignments || []);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      console.error('Failed to load student assignments:', err);
      const message = err?.response?.data?.message || err?.message || t('assignments_page.error_desc');
      setError(message);
      showNotification({
        type: 'error',
        title: t('assignments_page.error_title'),
        message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  const stats = useMemo(() => {
    const total = assignments.length;
    const graded = assignments.filter((a) => a.submission_status === 'graded').length;
    const submitted = assignments.filter((a) => a.submission_status === 'submitted').length;
    const pending = total - graded - submitted;
    return { total, graded, submitted, pending };
  }, [assignments]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  };

  const filteredSorted = useMemo(() => {
    let list = [...assignments];
    if (statusFilter === 'graded') list = list.filter((a) => a.submission_status === 'graded');
    if (statusFilter === 'submitted') list = list.filter((a) => a.submission_status === 'submitted');
    if (statusFilter === 'pending') list = list.filter((a) => !a.submission_status || a.submission_status === 'pending' || a.submission_status === 'not_submitted');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || (a.course_title || '').toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case 'due_desc':
          return new Date(b.due_date || 0).getTime() - new Date(a.due_date || 0).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return (b.submission_status || '').localeCompare(a.submission_status || '');
        case 'due_asc':
        default:
          return new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
      }
    });
    return list;
  }, [assignments, sortBy, statusFilter, search]);

  const handleOpenSubmission = (assignment: StudentAssignment) => {
    setSelectedAssignment(assignment);
    setIsSubmissionModalOpen(true);
  };

  const handleSubmissionSuccess = () => {
    void loadAssignments(); // Refresh list
  };

  if (loading && assignments.length === 0) {
    return (
      <div className="w-full space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
              <div className="h-4 bg-stone-200 rounded w-1/2" />
              <div className="h-3 bg-stone-200 rounded w-1/3" />
              <div className="h-3 bg-stone-200 rounded w-2/3" />
              <div className="h-10 bg-stone-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header utility bar */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 text-xs text-stone-500 bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm">
          <Clock className="h-3.5 w-3.5" />
          <span>{t('assignments_page.last_updated')}:</span>
          <span className="font-medium text-stone-700">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}</span>
          <button
            onClick={() => loadAssignments()}
            className="ml-2 p-1 hover:bg-stone-100 rounded-full transition-colors"
            title={t('assignments_page.refresh') || 'Refresh'}
          >
            <RefreshCw className="h-3.5 w-3.5 text-brand-primary" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{t('assignments_page.error_title') || 'Error loading assignments'}</p>
            <p>{error}</p>
          </div>
          <button
            onClick={() => loadAssignments()}
            className="px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors shadow-sm"
          >
            {t('assignments_page.retry')}
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: t('assignments_page.stats_total'), value: stats.total, icon: BookOpen, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
          { label: t('assignments_page.stats_pending'), value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: t('assignments_page.stats_submitted'), value: stats.submitted, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: t('assignments_page.stats_graded'), value: stats.graded, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${item.bg}`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
            </div>
            <p className="text-xs font-medium text-stone-500">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('assignments_page.search_placeholder') || 'Search assignments...'}
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm text-stone-700">
            <Filter className="h-4 w-4 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent focus:outline-none border-none p-0 text-sm font-medium cursor-pointer"
            >
              <option value="all">{t('assignments_page.filter_all')}</option>
              <option value="graded">{t('assignments_page.filter_graded')}</option>
              <option value="submitted">{t('assignments_page.filter_submitted')}</option>
              <option value="pending">{t('assignments_page.filter_pending')}</option>
            </select>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary cursor-pointer"
          >
            <option value="due_asc">{t('assignments_page.sort_due_asc')}</option>
            <option value="due_desc">{t('assignments_page.sort_due_desc')}</option>
            <option value="title">{t('assignments_page.sort_title')}</option>
            <option value="status">{t('assignments_page.sort_status')}</option>
          </select>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        {filteredSorted.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('assignments_page.empty_title')}</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              {t('assignments_page.empty_desc')}
            </p>
            <Link
              to="/member/all-courses?tab=browse"
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-white text-sm font-semibold bg-brand-primary hover:bg-brand-primary/90 transition-colors shadow-sm hover:shadow"
            >
              {t('assignments_page.browse_courses')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSorted.map((a) => {
              const isGraded = a.submission_status === 'graded';
              const isSubmitted = a.submission_status === 'submitted';
              const isPending = !isSubmitted && !isGraded;
              const isOverdue = isPending && a.due_date && new Date(a.due_date) < new Date();

              return (
                <div
                  key={a.id}
                  className="group bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full"
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-primary transition-colors line-clamp-2" title={a.title}>
                        {a.title}
                      </h3>
                      <div className="flex-shrink-0">
                        {isGraded ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                            {a.score !== null ? `${a.score}/${a.max_points}` : 'Graded'}
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                            Submitted
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                            {isOverdue ? 'Overdue' : 'Pending'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 line-clamp-1">
                        <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                        {a.course_title || t('assignments_page.course_label')}
                      </p>
                      <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{t('assignments_page.due_label', { date: formatDate(a.due_date) })}</span>
                      </div>
                      {a.max_points && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{a.max_points} Points</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <Link
                      to={`/member/courses/${a.course_id || ''}`}
                      className="flex-1 text-center px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      View
                    </Link>

                    {isPending && (
                      <button
                        onClick={() => handleOpenSubmission(a)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 transition-colors shadow-sm flex items-center justify-center gap-1"
                      >
                        <span>Submit</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}

                    {isSubmitted && !isGraded && (
                      <button
                        onClick={() => handleOpenSubmission(a)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-brand-primary bg-brand-primary/5 border border-brand-primary/20 rounded-lg hover:bg-brand-primary/10 transition-colors"
                      >
                        Update
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {selectedAssignment && (
        <AssignmentSubmissionModal
          isOpen={isSubmissionModalOpen}
          onClose={() => {
            setIsSubmissionModalOpen(false);
            setSelectedAssignment(null);
          }}
          onSuccess={handleSubmissionSuccess}
          assignmentId={selectedAssignment.id}
          assignmentTitle={selectedAssignment.title}
        />
      )}
    </div>
  );
};

export default StudentAssignments;


