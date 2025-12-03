import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import CourseCreationForm from '@/components/shared/courses/CourseCreationForm';

const CreateCourse: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full space-y-4 p-2 sm:p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{t('create_course_page.title')}</h1>
          <p className="text-sm text-stone-600 mt-1">{t('create_course_page.description')}</p>
        </div>
        <Link to="/teacher/courses" className="inline-flex items-center px-4 py-2 bg-white border border-stone-300 text-stone-700 rounded-md hover:bg-stone-50 text-sm font-medium">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('create_course_page.back_to_courses')}
        </Link>
      </div>
      <CourseCreationForm />
    </div>
  );
};

export default CreateCourse;