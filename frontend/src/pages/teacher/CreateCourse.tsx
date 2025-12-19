import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import CourseCreationForm from '@/components/shared/courses/CourseCreationForm';
import { brandColors } from '@/theme/brand';

interface CreateCourseProps {
  onBack?: () => void;
}

const CreateCourse: React.FC<CreateCourseProps> = ({ onBack }) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            {onBack ? (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-lg transition-colors"
                style={{ ':hover': { backgroundColor: `${brandColors.primaryHex}0D`, color: brandColors.primaryHex, borderColor: `${brandColors.primaryHex}33` } } as React.CSSProperties}
              >
                <ArrowLeft className="h-4 w-4" />
                {t('create_course_page.back_to_courses')}
              </button>
            ) : (
              <Link
                to="/teacher/courses"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-lg transition-colors"
                style={{ ':hover': { backgroundColor: `${brandColors.primaryHex}0D`, color: brandColors.primaryHex, borderColor: `${brandColors.primaryHex}33` } } as React.CSSProperties}
              >
                <ArrowLeft className="h-4 w-4" />
                {t('create_course_page.back_to_courses')}
              </Link>
            )}
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