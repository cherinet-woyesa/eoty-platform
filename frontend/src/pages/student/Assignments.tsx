import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { assignmentsApi, type StudentAssignment } from '@/services/api/assignments';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const StudentAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await assignmentsApi.listForStudent();
        setAssignments(res.data?.assignments || []);
      } catch (err: any) {
        console.error('Failed to load student assignments:', err);
        setError(err?.response?.data?.message || err?.message || 'Failed to load assignments.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const stats = useMemo(() => {
    const total = assignments.length;
    const graded = assignments.filter((a) => a.submission_status === 'graded').length;
    return { total, graded };
  }, [assignments]);

  const [editingSubmissionFor, setEditingSubmissionFor] = useState<number | null>(null);
  const [submissionText, setSubmissionText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <div className="flex items-center justify-center min-h-80">
          <LoadingSpinner size="lg" text="Loading assignments..." variant="logo" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="bg-gradient-to-r from-emerald-500/90 via-teal-500/90 to-sky-500/90 rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-lg">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">My Assignments</h1>
              <p className="text-xs sm:text-sm text-emerald-50/80">
                See upcoming assignments, due dates, and your grades.
              </p>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-emerald-50/80">
            {stats.total} total • {stats.graded} graded
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-3">
        {assignments.length === 0 ? (
          <div className="bg-white/95 rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
            <BookOpen className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-700 font-medium mb-1">No assignments yet</p>
            <p className="text-stone-500 text-sm">
              When your teachers publish assignments in your courses, they’ll appear here.
            </p>
          </div>
        ) : (
          assignments.map((a) => (
            <div
              key={a.id}
              className="bg-white/95 rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-800">{a.title}</p>
                <p className="text-xs text-stone-500">
                  {a.course_title || 'Course'} • Due {formatDate(a.due_date)}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <div className="flex items-center gap-1 text-stone-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(a.due_date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  {a.submission_status === 'graded' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Graded {a.score !== null ? `• ${a.score}/${a.max_points}` : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {a.submission_status === 'submitted' ? 'Submitted, awaiting grade' : 'Not submitted'}
                    </span>
                  )}
                  {/* Student submit controls */}
                  {a.submission_status !== 'submitted' && a.submission_status !== 'graded' && (
                    <div className="ml-3">
                      {editingSubmissionFor === a.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={submissionText}
                            onChange={(e) => setSubmissionText(e.target.value)}
                            placeholder="Enter a link or short answer"
                            className="px-3 py-1 border rounded text-sm"
                          />
                          <input
                            type="file"
                            onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                            className="px-2 py-1 text-sm"
                          />
                          <button
                            onClick={async () => {
                              try {
                                setSubmitting(true);
                                setError(null);
                                const payload: any = { content: submissionText };
                                if (submissionFile) payload.file = submissionFile;
                                const res = await assignmentsApi.submit(a.id, payload);
                                // Update local assignment state
                                setAssignments((prev) => prev.map((it) => (it.id === a.id ? { ...it, submission_status: 'submitted', submission_id: res.data.submission.id } : it)));
                                setEditingSubmissionFor(null);
                                setSubmissionText('');
                                setSubmissionFile(null);
                              } catch (err: any) {
                                console.error('Failed to submit assignment:', err);
                                setError(err?.response?.data?.message || err?.message || 'Failed to submit.');
                              } finally {
                                setSubmitting(false);
                              }
                            }}
                            disabled={submitting}
                            className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => { setEditingSubmissionFor(null); setSubmissionText(''); setSubmissionFile(null); }}
                            className="px-2 py-1 bg-gray-100 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingSubmissionFor(a.id); setSubmissionText(''); setSubmissionFile(null); setError(null); }}
                          className="ml-3 px-3 py-1 bg-blue-600 text-white rounded text-sm"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentAssignments;


