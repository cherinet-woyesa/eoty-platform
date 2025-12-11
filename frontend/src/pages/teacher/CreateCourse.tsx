import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen } from 'lucide-react';
import CourseCreationForm from '@/components/shared/courses/CourseCreationForm';

const CreateCourse: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="sticky top-3 z-30 bg-white/85 backdrop-blur border border-indigo-100 rounded-2xl px-3 py-2 shadow-sm flex items-center justify-between gap-3">
          <Link
            to="/teacher/courses"
            className="inline-flex items-center px-3 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-100 rounded-xl shadow-sm hover:border-indigo-200 hover:shadow transition-all"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('create_course_page.back_to_courses')}
          </Link>
          <span className="text-xs font-medium text-indigo-600 bg-white border border-indigo-100 rounded-full px-3 py-1 shadow-sm">
            {t('create_course_page.title')}
          </span>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400 text-white shadow-lg">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/15 border border-white/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">{t('create_course_page.title')}</h1>
                <p className="text-sm text-indigo-100 mt-1 max-w-2xl">{t('create_course_page.description')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-medium">
              <span className="px-3 py-2 rounded-xl bg-white/15 border border-white/10 text-center">
                {t('courses.creation.course_title')}
              </span>
              <span className="px-3 py-2 rounded-xl bg-white/15 border border-white/10 text-center">
                {t('courses.creation.course_description')}
              </span>
              <span className="px-3 py-2 rounded-xl bg-white/15 border border-white/10 text-center">
                {t('courses.creation.category')}
              </span>
            </div>
          </div>
        </div>

        <CourseCreationForm />
      </div>
    </div>
  );
};

export default CreateCourse;