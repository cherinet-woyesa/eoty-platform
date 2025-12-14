import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import CourseCreationForm from '@/components/shared/courses/CourseCreationForm';

const CreateCourse: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <Link
              to="/teacher/courses"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('create_course_page.back_to_courses')}
            </Link>
            <Link
              to="/teacher/courses"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-lg transition-colors"
            >
              {t('courses.creation.view_my_courses')}
            </Link>
          </div>

          <CourseCreationForm
            headerTitle={t('courses.creation.create_course_title')}
            headerDescription={t('courses.creation.form_description')}
            showHeader={false}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateCourse;