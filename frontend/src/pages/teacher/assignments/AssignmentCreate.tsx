import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, FileText, Loader2, Save, AlertCircle } from 'lucide-react';
import { coursesApi, assignmentsApi } from '@/services/api';
import { brandColors } from '@/theme/brand';

interface CourseOption {
  id: number;
  title: string;
}

const AssignmentCreate: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [maxPoints, setMaxPoints] = useState<number>(100);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        const response = await coursesApi.getCourses();
        const list = response.data?.courses || [];
        setCourses(list.map((c: any) => ({ id: c.id, title: c.title })));
      } catch (err: any) {
        console.error('Failed to load courses for assignment:', err);
        setError('Failed to load your courses. Make sure you have at least one course created.');
      } finally {
        setLoadingCourses(false);
      }
    };

    void loadCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId) {
      setError('Please select a course for this assignment.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter an assignment title.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        courseId: Number(courseId),
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        maxPoints,
      };
      const res = await assignmentsApi.create(payload);
      const newAssignmentId = res.data?.assignment?.id;
      if (newAssignmentId) {
        navigate(`/teacher/assignments/${newAssignmentId}`);
      } else {
        navigate('/teacher/assignments');
      }
    } catch (err: any) {
      console.error('Failed to create assignment:', err);
      setError(
        err?.response?.data?.message || err?.message || 'Failed to create assignment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Course *</label>
              <div className="flex flex-col gap-2">
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm text-gray-900"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  disabled={loadingCourses || submitting}
                >
                  <option value="">Select a course…</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                {loadingCourses && (
                  <span className="inline-flex items-center text-xs text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Loading your courses…
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scripture Analysis Essay"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm text-gray-900"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                maxLength={120}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Give students clear instructions and expectations for this assignment."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm text-gray-900"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Due date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm text-gray-900"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Max points</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={maxPoints}
                    onChange={(e) => setMaxPoints(Number(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm text-gray-900"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 rounded-lg text-white font-semibold text-sm shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: brandColors.primaryHex }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save as draft
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

export default AssignmentCreate;


