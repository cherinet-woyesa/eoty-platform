import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import CourseCreationForm from '@/components/shared/courses/CourseCreationForm';

const CreateCourse: React.FC = () => {
  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-[#27AE60]/30 rounded-lg blur-md"></div>
                <div className="relative p-3 bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20 rounded-lg border border-[#27AE60]/30">
                  <Sparkles className="h-6 w-6 text-[#27AE60]" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">Create New Course</h1>
                <p className="text-stone-600 mt-1">Build and publish your teaching content</p>
              </div>
            </div>
            <Link
              to="/teacher/courses"
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/50 text-stone-700 hover:text-[#27AE60] rounded-lg transition-all font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Link>
          </div>
        </div>
      
      <CourseCreationForm />
    </div>
  );
};

export default CreateCourse;