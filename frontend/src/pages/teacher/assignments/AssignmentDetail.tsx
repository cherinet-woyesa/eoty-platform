import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FileText,
  BookOpen,
  Calendar,
  User,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Pencil,
} from 'lucide-react';
import { assignmentsApi } from '@/services/api/assignments';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Assignment {
  id: number;
  title: string;
  description?: string | null;
  course_id: number | null;
  course_title?: string | null;
  due_date?: string | null;
  max_points: number;
  status: string;
  created_at: string;
}

interface Submission {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  email: string;
  submitted_at: string | null;
  score: number | null;
  feedback: string | null;
  status: string;
  graded_at: string | null;
  content?: string | null;
}

const AssignmentDetail: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeValue, setGradeValue] = useState<number | ''>('');
  const [feedbackValue, setFeedbackValue] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!assignmentId) {
        setError('Missing assignment id.');
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await assignmentsApi.getById(assignmentId);
        setAssignment(res.data?.assignment || null);
        setSubmissions(res.data?.submissions || []);
      } catch (err: any) {
        console.error('Failed to load assignment detail:', err);
        setError(
          err?.response?.data?.message || err?.message || 'Failed to load assignment details.'
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [assignmentId]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const startGrading = (submission: Submission) => {
    setGradingId(submission.id);
    setGradeValue(submission.score ?? '');
    setFeedbackValue(submission.feedback || '');
  };

  const cancelGrading = () => {
    setGradingId(null);
    setGradeValue('');
    setFeedbackValue('');
  };

  const saveGrade = async (submissionId: number) => {
    if (!assignmentId) return;
    try {
      setGradingId(submissionId);
      const payload: { score?: number; feedback?: string } = {};
      if (gradeValue !== '') payload.score = Number(gradeValue);
      if (feedbackValue.trim()) payload.feedback = feedbackValue.trim();
      await assignmentsApi.gradeSubmission(assignmentId, submissionId, payload);

      const res = await assignmentsApi.getById(assignmentId);
      setAssignment(res.data?.assignment || null);
      setSubmissions(res.data?.submissions || []);
      cancelGrading();
    } catch (err: any) {
      console.error('Failed to save grade:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to save grade.');
    } finally {
      setGradingId(null);
    }
  };

  const handlePublish = async () => {
    if (!assignmentId) return;
    try {
      setError(null);
      const res = await assignmentsApi.publish(assignmentId);
      // Re-fetch assignment after publishing
      const refreshed = await assignmentsApi.getById(assignmentId);
      setAssignment(refreshed.data?.assignment || null);
    } catch (err: any) {
      console.error('Failed to publish assignment:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to publish assignment.'
      );
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="flex items-center justify-center min-h-80">
          <LoadingSpinner size="lg" text="Loading assignment..." variant="logo" />
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-stone-200 p-8 shadow-sm text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-stone-700 font-medium mb-2">
            {error || 'Assignment not found or you do not have access.'}
          </p>
          <button
            onClick={() => navigate('/teacher/assignments')}
            className="mt-3 inline-flex items-center px-4 py-2 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-sm text-stone-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to assignments
          </button>
        </div>
      </div>
    );
  }

  const gradedCount = submissions.filter((s) => s.status === 'graded').length;

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#27AE60]/30 rounded-lg blur-md"></div>
              <div className="relative p-3 bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20 rounded-lg border border-[#27AE60]/30">
                <FileText className="h-6 w-6 text-[#27AE60]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-1">
                {assignment.title}
              </h1>
              <p className="text-stone-600 text-sm">
                {assignment.course_title || 'Unassigned course'} •{' '}
                {assignment.status === 'published'
                  ? 'Published'
                  : assignment.status === 'closed'
                  ? 'Closed'
                  : 'Draft'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/teacher/assignments')}
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/50 text-stone-700 hover:text-[#27AE60] rounded-lg transition-all text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            {assignment.status !== 'published' && (
              <button
                type="button"
                onClick={handlePublish}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Publish
              </button>
            )}
            <Link
              to={`/teacher/assignments/${assignment.id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 rounded-lg transition-all shadow-md hover:shadow-lg text-sm font-semibold"
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/95 rounded-2xl border border-stone-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#27AE60]" />
              Assignment details
            </h2>
            <p className="text-sm text-stone-700 whitespace-pre-line mb-3">
              {assignment.description || 'No description provided.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-stone-600">
                <Calendar className="h-4 w-4" />
                <span>Due:</span>
                <span className="font-medium text-stone-800">
                  {assignment.due_date ? formatDate(assignment.due_date) : 'No due date'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <CheckCircle className="h-4 w-4 text-amber-500" />
                <span>Max points:</span>
                <span className="font-medium text-stone-800">{assignment.max_points}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/95 rounded-2xl border border-stone-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[#27AE60]" />
              Submissions ({submissions.length})
            </h2>

            {submissions.length === 0 ? (
              <p className="text-sm text-stone-500">
                No submissions yet. Once students submit, you’ll see them here for grading.
              </p>
            ) : (
              <div className="space-y-3">
                {submissions.map((s) => {
                  const isGrading = gradingId === s.id;
                  return (
                    <div
                      key={s.id}
                      className="border border-stone-200 rounded-xl px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-stone-800">
                              {s.first_name} {s.last_name}
                            </p>
                            <p className="text-xs text-stone-500">{s.email}</p>
                          </div>
                          <div className="text-xs text-stone-500 text-right">
                            {s.submitted_at ? `Submitted ${formatDate(s.submitted_at)}` : 'Not submitted'}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-stone-600">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full ${
                              s.status === 'graded'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {s.status === 'graded'
                              ? `Graded${s.score !== null ? `: ${s.score}/${assignment.max_points}` : ''}`
                              : 'Pending grade'}
                          </span>
                        </div>
                        {/* Render submitted content (text + optional attachment) */}
                        {s.content && (
                          <div className="mt-2 text-sm text-stone-700">
                            {(() => {
                              try {
                                const parsed = JSON.parse(s.content as string);
                                const text = parsed?.text || null;
                                const attachment = parsed?.attachment || null;
                                return (
                                  <div className="space-y-2">
                                    {text && <div className="text-sm text-stone-700 whitespace-pre-line">{text}</div>}
                                    {attachment && attachment.url && (
                                      <div>
                                        <a
                                          href={attachment.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 text-sm text-[#27AE60] hover:underline"
                                        >
                                          <FileText className="h-4 w-4" />
                                          <span>{attachment.filename || 'Attachment'}</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                );
                              } catch (e) {
                                // Not JSON, render raw string
                                return <div className="text-sm text-stone-700 whitespace-pre-line">{s.content}</div>;
                              }
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="sm:w-72">
                        {isGrading ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={assignment.max_points}
                                value={gradeValue}
                                onChange={(e) =>
                                  setGradeValue(e.target.value === '' ? '' : Number(e.target.value))
                                }
                                placeholder="Score"
                                className="w-24 px-2 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => saveGrade(s.id)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelGrading}
                                className="inline-flex items-center px-2 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-600 hover:bg-stone-50"
                              >
                                Cancel
                              </button>
                            </div>
                            <textarea
                              value={feedbackValue}
                              onChange={(e) => setFeedbackValue(e.target.value)}
                              placeholder="Optional feedback for the student"
                              className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startGrading(s)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-700 bg-white hover:bg-stone-50 font-semibold"
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                            {s.status === 'graded' ? 'Edit grade' : 'Grade'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white/95 rounded-2xl border border-stone-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-stone-800 mb-3">Grading overview</h2>
            <div className="space-y-2 text-sm text-stone-700">
              <div className="flex items-center justify-between">
                <span>Total submissions</span>
                <span className="font-semibold">{submissions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Graded submissions</span>
                <span className="font-semibold">
                  {gradedCount}/{submissions.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetail;


