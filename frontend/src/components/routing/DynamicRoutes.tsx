import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * DynamicRoutes component that redirects users to their role-appropriate routes
 * Used for legacy routes that need role-based redirection
 */
export const DynamicAIAssistant: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const search = location.search;

  if (user?.role === 'teacher' || user?.role === 'admin') {
    return <Navigate to={`/teacher/ai-assistant${search}`} replace />;
  }

  if (user?.role === 'user' || user?.role === 'student') {
    return <Navigate to={`/student/ai-assistant${search}`} replace />;
  }

  return <Navigate to={`/student/ai-assistant${search}`} replace />;
};

export const DynamicForums: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const search = location.search;

  if (user?.role === 'teacher' || user?.role === 'admin') {
    return <Navigate to={`/teacher/community${search}`} replace />;
  }

  if (user?.role === 'user' || user?.role === 'student') {
    return <Navigate to={`/student/forums${search}`} replace />;
  }

  return <Navigate to={`/student/forums${search}`} replace />;
};

export const DynamicResources: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const search = location.search;

  if (user?.role === 'teacher' || user?.role === 'admin') {
    return <Navigate to={`/teacher/resources${search}`} replace />;
  }

  if (user?.role === 'user' || user?.role === 'student') {
    return <Navigate to={`/student/resources${search}`} replace />;
  }

  return <Navigate to={`/student/resources${search}`} replace />;
};

export const DynamicChapters: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const search = location.search;

  if (user?.role === 'teacher' || user?.role === 'admin') {
    return <Navigate to={`/teacher/chapters${search}`} replace />;
  }

  if (user?.role === 'user' || user?.role === 'student') {
    return <Navigate to={`/student/chapters${search}`} replace />;
  }

  return <Navigate to={`/student/chapters${search}`} replace />;
};

export const DynamicAchievements: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const search = location.search;

  if (user?.role === 'teacher' || user?.role === 'admin') {
    return <Navigate to={`/teacher/achievements${search}`} replace />;
  }

  if (user?.role === 'user' || user?.role === 'student') {
    return <Navigate to={`/student/achievements${search}`} replace />;
  }

  return <Navigate to={`/student/achievements${search}`} replace />;
};

