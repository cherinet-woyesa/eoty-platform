import React from 'react';
import { useAuth } from '../../context/AuthContext';
import MyCourses from '../courses/MyCourses';
import StudentCourses from '../courses/StudentCourses';

const AllCourses: React.FC = () => {
  const { user } = useAuth();
  
  // Admins see all courses (teacher view)
  // Students see only enrolled courses
  const isAdmin = user?.role === 'chapter_admin' || user?.role === 'platform_admin';
  const isTeacher = user?.role === 'teacher';
  
  if (isAdmin || isTeacher) {
    return <MyCourses />;
  }
  
  return <StudentCourses />;
};

export default AllCourses;
