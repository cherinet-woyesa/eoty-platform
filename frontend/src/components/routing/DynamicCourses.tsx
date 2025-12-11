import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * DynamicCourses component that redirects users to their role-appropriate courses page
 * 
 * Features:
 * - Redirects based on user role
 * - Preserves query parameters during redirection
 * - Handles edge cases (no role, invalid role)
 */
const DynamicCourses: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Preserve query parameters
  const search = location.search;

  // Redirect to role-specific courses page
  if (user?.role === 'chapter_admin' || user?.role === 'admin') {
    return <Navigate to={`/admin/courses${search}`} replace />;
  }

  if (user?.role === 'teacher') {
    return <Navigate to={`/teacher/courses${search}`} replace />;
  }

  if (user?.role === 'user' || user?.role === 'student') {
    return <Navigate to={`/member/browse-courses${search}`} replace />;
  }

  // Fallback for unknown roles - redirect to member browse courses
  return <Navigate to={`/member/browse-courses${search}`} replace />;
};

export default DynamicCourses;

