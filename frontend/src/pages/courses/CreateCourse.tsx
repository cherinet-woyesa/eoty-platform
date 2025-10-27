import React from 'react';
import CourseCreationForm from '../../components/courses/CourseCreationForm';

const CreateCourse: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
          <p className="text-gray-600 mt-1">Build your teaching curriculum and share knowledge</p>
        </div>
      </div>

      {/* Course Form */}
      <div className="max-w-4xl">
        <CourseCreationForm />
      </div>

      {/* Quick Tips */}
      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Course Structure</h4>
          <p className="text-sm text-blue-800">
            Plan 5-10 lessons per course. Each lesson should be 10-15 minutes long.
          </p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2">Engaging Content</h4>
          <p className="text-sm text-green-800">
            Include real-life examples and interactive elements in your lessons.
          </p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <h4 className="font-semibold text-purple-900 mb-2">Student Success</h4>
          <p className="text-sm text-purple-800">
            Clear objectives and practical applications help students learn better.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateCourse;