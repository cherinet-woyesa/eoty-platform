import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
  redirectTo?: string;
  allowedRoles?: string[];
}

// Role hierarchy for access control
// NOTE: `platform_admin` removed; `admin` is the single top-level admin role.
const ROLE_HIERARCHY: Record<string, number> = {
  // Base members
  user: 1,
  // Legacy alias kept for compatibility
  student: 1,
  // Elevated roles
  teacher: 2,
  chapter_admin: 3,
  admin: 4
};

/**
 * Enhanced ProtectedRoute component with role validation and hierarchy support
 * 
 * Features:
 * - Validates user authentication status
 * - Checks role requirements with hierarchy support (higher roles can access lower-level routes)
 * - Handles loading states during auth check
 * - Provides clear error messages on access denial
 * - Supports custom redirect paths
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  redirectTo,
  allowedRoles,
}) => {
  const { isAuthenticated, user, hasPermission, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-t-4 border-blue-600 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  // Helper function to check if user's role is equal to or higher than required role
  const isRoleOrHigher = (userRole: string, requiredRole: string): boolean => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
  };

  // Check role requirement with hierarchy support
  const roles = allowedRoles || (requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : []);

  if (roles.length > 0) {
    // Check if user has any of the required roles (with hierarchy)
    const hasRequiredRole = roles.some(role => isRoleOrHigher(user.role, role));

    if (!hasRequiredRole) {
      // Get the user's role-appropriate dashboard
      const getRoleDashboard = (): string => {
        if (user.role === 'admin' || user.role === 'chapter_admin') {
          return '/admin/dashboard';
        }
        if (user.role === 'teacher') {
          return '/teacher/dashboard';
        }
        return '/student/dashboard';
      };

      const dashboardPath = getRoleDashboard();

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
            <div className="mb-6">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have the required role to access this page.
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Your role:</span>{' '}
                <span className="text-blue-600">{user.role}</span>
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-semibold">Required role:</span>{' '}
                <span className="text-red-600">{roles.join(' or ')}</span>
              </p>
            </div>
            <button
              onClick={() => (window.location.href = redirectTo || dashboardPath)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Get the user's role-appropriate dashboard
    const getRoleDashboard = (): string => {
      if (user.role === 'admin') {
        return '/admin/dashboard';
      }
      if (user.role === 'teacher') {
        return '/teacher/dashboard';
      }
      return '/student/dashboard';
    };

    const dashboardPath = getRoleDashboard();

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="mb-6">
            <svg
              className="w-16 h-16 text-orange-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Permission Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have the required permissions to access this page.
          </p>
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Required permission:</span>{' '}
              <span className="text-orange-600">{requiredPermission}</span>
            </p>
          </div>
          <button
            onClick={() => (window.location.href = redirectTo || dashboardPath)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
};

export default ProtectedRoute;
