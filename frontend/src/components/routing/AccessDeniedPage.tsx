import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Home, ArrowLeft, Mail } from 'lucide-react';

interface AccessDeniedPageProps {
  requiredRole?: string | string[];
  attemptedRoute?: string;
  message?: string;
}

/**
 * Enhanced Access Denied page with helpful error messages and suggestions
 * Provides context-specific guidance based on user role and attempted access
 */
const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  requiredRole,
  attemptedRoute,
  message,
}) => {
  const navigate = useNavigate();
  const { user, getRoleDashboard } = useAuth();

  const userRole = user?.role || 'unknown';
  const dashboard = getRoleDashboard();

  // Generate helpful suggestions based on role and attempted route
  const getSuggestions = (): string[] => {
    const suggestions: string[] = [];

    if (attemptedRoute?.startsWith('/admin')) {
      suggestions.push('Admin features are only available to administrators.');
      if (userRole === 'teacher') {
        suggestions.push('As a teacher, you can manage your courses from the Teacher Dashboard.');
      } else if (userRole === 'student') {
        suggestions.push('Students can browse courses and track their learning progress.');
      }
    } else if (attemptedRoute?.startsWith('/teacher')) {
      suggestions.push('Teacher features require a teacher account or higher.');
      if (userRole === 'student') {
        suggestions.push('If you\'d like to become a teacher, please contact your administrator.');
      }
    }

    return suggestions;
  };

  const suggestions = getSuggestions();

  // Get alternative routes the user can access
  const getAlternativeRoutes = () => {
    const routes: Array<{ name: string; path: string; description: string }> = [];

    if (userRole === 'student') {
      routes.push(
        { name: 'My Dashboard', path: '/student/dashboard', description: 'View your learning overview' },
        { name: 'Browse Courses', path: '/student/courses', description: 'Discover new courses' },
        { name: 'My Progress', path: '/student/progress', description: 'Track your learning' }
      );
    } else if (userRole === 'teacher' || userRole === 'chapter_admin' || userRole === 'admin') {
      routes.push(
        { name: 'Teacher Dashboard', path: '/teacher/dashboard', description: 'Manage your teaching' },
        { name: 'My Courses', path: '/teacher/courses', description: 'View and edit your courses' },
        { name: 'Students', path: '/teacher/students', description: 'Manage your students' }
      );
    }

    if (userRole === 'chapter_admin' || userRole === 'admin') {
      routes.push(
        { name: 'Admin Dashboard', path: '/admin/dashboard', description: 'System administration' }
      );
    }

    return routes;
  };

  const alternativeRoutes = getAlternativeRoutes();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 p-4 rounded-full">
                <ShieldAlert className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center mb-2">Access Denied</h1>
            <p className="text-center text-red-100">
              You don't have permission to access this resource
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Your Role:</span>
                  <span className="ml-2 font-semibold text-gray-900 capitalize">
                    {userRole.replace('_', ' ')}
                  </span>
                </div>
                {requiredRole && (
                  <div>
                    <span className="text-gray-500">Required Role:</span>
                    <span className="ml-2 font-semibold text-gray-900 capitalize">
                      {Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}
                    </span>
                  </div>
                )}
              </div>
              {attemptedRoute && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-gray-500 text-sm">Attempted Route:</span>
                  <code className="ml-2 text-sm font-mono bg-gray-200 px-2 py-1 rounded">
                    {attemptedRoute}
                  </code>
                </div>
              )}
            </div>

            {/* Custom Message */}
            {message && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-900 text-sm">{message}</p>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Why can't I access this?</h3>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start text-gray-700">
                      <span className="text-orange-500 mr-2">•</span>
                      <span className="text-sm">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alternative Routes */}
            {alternativeRoutes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Where can I go instead?</h3>
                <div className="space-y-2">
                  {alternativeRoutes.map((route, index) => (
                    <button
                      key={index}
                      onClick={() => navigate(route.path)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 group-hover:text-blue-700">
                            {route.name}
                          </div>
                          <div className="text-sm text-gray-500">{route.description}</div>
                        </div>
                        <ArrowLeft className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transform rotate-180" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Support */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Need access?</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    If you believe you should have access to this resource, please contact your administrator.
                  </p>
                  <a
                    href="mailto:support@example.com"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Contact Support →
                  </a>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </button>
              <button
                onClick={() => navigate(dashboard)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center shadow-lg shadow-blue-500/30"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          This access attempt has been logged for security purposes.
        </p>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
