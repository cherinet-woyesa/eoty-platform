import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface RoleRedirectProps {
  message?: string;
  delay?: number;
}

/**
 * RoleRedirect component for automatic redirection based on user role
 * 
 * Features:
 * - Redirects users to their role-appropriate dashboard
 * - Shows brief feedback message during redirect
 * - Preserves query parameters when redirecting
 * - Supports custom delay before redirect
 */
const RoleRedirect: React.FC<RoleRedirectProps> = ({
  message = 'Redirecting to your dashboard...',
  delay = 1000,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Get role-appropriate dashboard path
  const getRoleDashboard = (): string => {
    if (!user) return '/login';

    // Handle both 'admin' and 'platform_admin' for backwards compatibility
    if (user.role === 'platform_admin' || user.role === 'chapter_admin' || user.role === 'admin') {
      return '/admin/dashboard';
    }
    if (user.role === 'teacher') {
      return '/teacher/dashboard';
    }
    return '/student/dashboard';
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRedirect(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (shouldRedirect) {
    const dashboardPath = getRoleDashboard();
    // Preserve query parameters
    const search = location.search;
    return <Navigate to={`${dashboardPath}${search}`} replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-t-4 border-blue-600 border-solid rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-700 text-lg font-medium">{message}</p>
        {user && (
          <p className="text-gray-500 text-sm mt-2">
            Redirecting to {user.role} dashboard...
          </p>
        )}
      </div>
    </div>
  );
};

export default RoleRedirect;
