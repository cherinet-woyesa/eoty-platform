import React from 'react';
import CourseCreationForm from '../../components/courses/CourseCreationForm';

const CreateCourse: React.FC = () => {
  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header - match MyCourses style */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-3 sm:p-4 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-lg sm:text-xl font-bold">Create New Course</h1>
            </div>
            <p className="text-blue-100 text-xs sm:text-sm">
              Build your teaching curriculum and share knowledge
            </p>
          </div>
        </div>
      </div>

      {/* Course Form */}
      <div className="max-w-5xl">
        <CourseCreationForm />
      </div>
    </div>
  );
};

export default CreateCourse;