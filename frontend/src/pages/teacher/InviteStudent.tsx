import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Users, BookOpen, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { studentsApi } from '@/services/api/students';
import { coursesApi } from '@/services/api';

interface CourseOption {
  id: number;
  title: string;
}

const InviteStudent: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        const response = await coursesApi.getCourses();
        const list = response.data?.courses || [];
        setCourses(
          list.map((c: any) => ({
            id: c.id,
            title: c.title,
          }))
        );
      } catch (error: any) {
        console.error('Failed to load courses for invite:', error);
        setErrorMessage(t('invite_student.error_load_courses'));
      } finally {
        setLoadingCourses(false);
      }
    };

    void loadCourses();
  }, [t]);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!validateEmail(email)) {
      setErrorMessage(t('invite_student.error_invalid_email'));
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        email: email.trim(),
        courseId: courseId ? Number(courseId) : null,
      };
      const response = await studentsApi.inviteStudent(payload);
      setSuccessMessage(response.message || t('invite_student.success_message'));
      setEmail('');
      setCourseId('');
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          t('invite_student.error_send_invite')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/20 via-[#16A085]/20 to-[#2980B9]/20 rounded-xl p-6 border border-[#27AE60]/30 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#27AE60]/30 rounded-lg blur-md"></div>
              <div className="relative p-3 bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20 rounded-lg border border-[#27AE60]/30">
                <Mail className="h-6 w-6 text-[#27AE60]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">{t('invite_student.title')}</h1>
              <p className="text-stone-600 mt-1 text-sm">
                {t('invite_student.description')}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/teacher/students')}
            className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/60 text-stone-700 hover:text-[#27AE60] rounded-lg transition-all font-semibold text-sm"
          >
            <Users className="h-4 w-4 mr-2" />
            {t('invite_student.back_to_students')}
          </button>
        </div>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 shadow-md p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}
          {successMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4 mt-0.5" />
              <p>{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1">
                {t('invite_student.student_email')} *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('invite_student.student_email_placeholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#27AE60]/60 focus:border-transparent text-sm text-stone-800"
                required
              />
              <p className="mt-1 text-xs text-stone-500">
                {t('invite_student.student_email_help')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1">
                {t('invite_student.course_optional')}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#16A085]/60 focus:border-transparent text-sm text-stone-800"
                    disabled={loadingCourses}
                  >
                    <option value="">{t('invite_student.no_specific_course')}</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                {loadingCourses && (
                  <div className="inline-flex items-center text-xs text-stone-500">
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    {t('invite_student.loading_courses')}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-500 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                {t('invite_student.course_help')}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 font-semibold text-sm shadow-md hover:shadow-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('invite_student.sending_invitation')}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {t('invite_student.send_invitation')}
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

export default InviteStudent;


