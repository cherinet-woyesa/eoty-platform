import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CourseEditor } from '@/components/shared/courses';
import { ArrowLeft } from 'lucide-react';

const EditCourse: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  if (!courseId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Not Found</h2>
          <p className="text-gray-600 mb-4">The course you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/teacher/courses')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <CourseEditor
          courseId={courseId}
          onSave={(course) => {
            console.log('Course saved:', course);
            navigate(`/teacher/courses/${courseId}`);
          }}
          onCancel={() => navigate('/teacher/courses')}
        />
      </div>
    </div>
  );
};

export default EditCourse;