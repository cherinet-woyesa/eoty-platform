import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import CourseCreationForm from '@/components/shared/courses/CourseCreationForm';

const CreateCourse: React.FC = () => {
  return (
    <div className="w-full space-y-2 p-2">
      <CourseCreationForm />
    </div>
  );
};

export default CreateCourse;