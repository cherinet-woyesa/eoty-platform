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
        <div className="text-center bg-white/90 backdrop-blur-md rounded-xl p-8 border border-red-200 shadow-md max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Course Not Found</h2>
          <p className="text-stone-600 mb-4">The course you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/teacher/courses')}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#39FF14]/20 via-[#00FFC6]/20 to-[#00FFFF]/20 rounded-xl p-6 border border-[#39FF14]/30 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#39FF14]/30 rounded-lg blur-md"></div>
              <div className="relative p-3 bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 rounded-lg border border-[#39FF14]/30">
                <Edit3 className="h-6 w-6 text-[#39FF14]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-stone-800">Edit Course</h1>
              <p className="text-stone-600 mt-1">Update your course information and settings</p>
            </div>
          </div>
        </div>
        
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