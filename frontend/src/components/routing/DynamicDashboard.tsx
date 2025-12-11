import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * DynamicDashboard component that redirects users to their role-appropriate dashboard
 * 
 * Features:
 * - Redirects based on user role
 * - Preserves query parameters during redirection
 * - Handles edge cases (no role, invalid role)
 */
const DynamicDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Preserve query parameters
  const search = location.search;

  // Redirect to role-specific dashboard
  if (user?.role === 'chapter_admin' || user?.role === 'admin') {
    return <Navigate to={`/admin/dashboard${search}`} replace />;
  }

  if (user?.role === 'teacher') {
    return <Navigate to={`/teacher/dashboard${search}`} replace />;
  }

  if (user?.role === 'user' || user?.role === 'student') {
    return <Navigate to={`/member/dashboard${search}`} replace />;
  }

  // Fallback for unknown roles - redirect to member dashboard
  return <Navigate to={`/member/dashboard${search}`} replace />;
};

export default DynamicDashboard;
