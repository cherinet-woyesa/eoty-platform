import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CourseEditor } from '@/components/shared/courses';
import { ArrowLeft, Edit3, AlertCircle } from 'lucide-react';

const EditCourse: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  if (!courseId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
      <div className="text-center bg-white/90 backdrop-blur-md rounded-xl p-8 border border-slate-200 shadow-md max-w-md">
        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Course Not Found</h2>
        <p className="text-slate-600 mb-4">The course you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/teacher/courses')}
          className="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </button>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
       
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-6">
          <CourseEditor
            courseId={courseId}
            onSave={(course) => {
              console.log('Course saved:', course);
              navigate(`/teacher/courses/${courseId}`);
            }}
            onCancel={() => navigate(`/teacher/courses/${courseId}`)}
          />
        </div>
      </div>
    </div>
  );
};

export default EditCourse;