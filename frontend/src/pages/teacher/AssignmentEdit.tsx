import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Calendar, FileText, Loader2, Save, AlertCircle } from 'lucide-react';
import { coursesApi, assignmentsApi } from '@/services/api';

interface CourseOption {
  id: number;
  title: string;
}

const AssignmentEdit: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [maxPoints, setMaxPoints] = useState<number>(100);
  const [status, setStatus] = useState<'draft' | 'published' | 'closed'>('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!assignmentId) {
          setError('Missing assignment id.');
          return;
        }
        setLoading(true);
        setError(null);

        const [coursesRes, assignmentRes] = await Promise.all([
          coursesApi.getCourses(),
          assignmentsApi.getById(assignmentId),
        ]);

        const list = coursesRes.data?.courses || [];
        setCourses(list.map((c: any) => ({ id: c.id, title: c.title })));

        const a = assignmentRes.data?.assignment;
        if (!a) {
          setError('Assignment not found.');
          return;
        }

        setCourseId(a.course_id ? String(a.course_id) : '');
        setTitle(a.title || '');
        setDescription(a.description || '');
        if (a.due_date) {
          const d = new Date(a.due_date);
          const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setDueDate(isoLocal);
        } else {
          setDueDate('');
        }
        setMaxPoints(a.max_points || 100);
        setStatus(a.status || 'draft');
      } catch (err: any) {
        console.error('Failed to load assignment for edit:', err);
        setError(err?.response?.data?.message || err?.message || 'Failed to load assignment.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [assignmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentId) return;
    setError(null);

    if (!title.trim()) {
      setError('Please enter an assignment title.');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
        maxPoints,
        status,
      };
      await assignmentsApi.update(assignmentId, payload);
      navigate(`/teacher/assignments/${assignmentId}`);
    } catch (err: any) {
      console.error('Failed to save assignment:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to save assignment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="flex items-center justify-center min-h-80">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-[#27AE60] mx-auto mb-3" />
            <p className="text-stone-600 text-sm">Loading assignment…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#27AE60]/30 rounded-lg blur-md"></div>
              <div className="relative p-3 bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20 rounded-lg border border-[#27AE60]/30">
                <FileText className="h-6 w-6 text-[#27AE60]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">Edit Assignment</h1>
              <p className="text-stone-600 mt-1 text-sm">
                Update details, due date, or points for this assignment.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 shadow-md p-6 sm:p-8 space-y-6">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1">Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-600 cursor-not-allowed"
              >
                <option value="">Original course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#27AE60]/60 focus:border-transparent text-sm text-stone-800"
                maxLength={120}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#27AE60]/60 focus:border-transparent text-sm text-stone-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-800 mb-1">Due date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#27AE60]/60 focus:border-transparent text-sm text-stone-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-800 mb-1">Max points</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={maxPoints}
                    onChange={(e) => setMaxPoints(Number(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#27AE60]/60 focus:border-transparent text-sm text-stone-800"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#27AE60]/60 focus:border-transparent text-sm text-stone-800"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="flex justify-end pt-4 border-t border-stone-200 mt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 font-semibold text-sm shadow-md hover:shadow-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignmentEdit;


