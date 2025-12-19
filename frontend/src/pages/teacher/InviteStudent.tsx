import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Users, BookOpen, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { studentsApi } from '@/services/api/students';
import { coursesApi } from '@/services/api';
import { brandColors } from '@/theme/brand';

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
    <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Mail className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('invite_student.title')}</h1>
              <p className="text-gray-600 mt-1 text-sm">
                {t('invite_student.description')}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/teacher/students')}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-all font-medium text-sm shadow-sm"
          >
            <Users className="h-4 w-4 mr-2" />
            {t('invite_student.back_to_students')}
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}
          {successMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 mt-0.5" />
              <p>{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {t('invite_student.student_email')} *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('invite_student.student_email_placeholder')}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm text-gray-900"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('invite_student.student_email_help')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {t('invite_student.course_optional')}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm text-gray-900"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
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
                  <div className="inline-flex items-center text-xs text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    {t('invite_student.loading_courses')}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                {t('invite_student.course_help')}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="inline-flex items-center px-6 py-2.5 rounded-lg text-white font-medium text-sm shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: brandColors.primaryHex }}
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


