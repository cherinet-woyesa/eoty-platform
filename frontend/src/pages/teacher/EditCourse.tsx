import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CourseEditor } from '@/components/shared/courses';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import type { Course } from '@/types/courses';
import { brandColors } from '@/theme/brand';

const EditCourse: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!courseId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-xl p-8 border border-gray-200 shadow-md max-w-md">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('edit_course.not_found_title')}</h2>
          <p className="text-gray-600 mb-4">{t('edit_course.not_found_description')}</p>
          <button
            onClick={() => navigate('/teacher/courses')}
            className="inline-flex items-center px-4 py-2 text-white rounded-lg transition-all font-semibold"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('edit_course.back_to_courses')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
       
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <CourseEditor
            courseId={courseId}
            onSave={(course: Course) => {
              console.log('Course saved:', course);
              // Stay on edit page after save - don't redirect
            }}
            onCancel={() => navigate(`/teacher/courses/${courseId}`)}
          />
        </div>
      </div>
    </div>
  );
};

export default EditCourse;