import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import CourseCreationForm from '@/components/shared/courses/CourseCreationForm';

const CreateCourse: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#39FF14]/20 via-[#00FFC6]/20 to-[#00FFFF]/20 rounded-xl p-6 border border-[#39FF14]/30 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-[#39FF14]/30 rounded-lg blur-md"></div>
                <div className="relative p-3 bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 rounded-lg border border-[#39FF14]/30">
                  <Sparkles className="h-6 w-6 text-[#39FF14]" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">Create New Course</h1>
                <p className="text-stone-600 mt-1">Build and publish your teaching content</p>
              </div>
            </div>
            <Link
              to="/teacher/courses"
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#39FF14]/50 text-stone-700 hover:text-[#39FF14] rounded-lg transition-all font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Link>
          </div>
        </div>
        
        <CourseCreationForm />
      </div>
    </div>
  );
};

export default CreateCourse;