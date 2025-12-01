import React from 'react';
import CourseCreationForm from '@/components/shared/courses/CourseCreationForm';

const AdminCreateCourse: React.FC = () => {
  return (
    <div className="w-full space-y-2 p-2">
      <CourseCreationForm returnPath="/admin/all-content" />
    </div>
  );
};

export default AdminCreateCourse;
