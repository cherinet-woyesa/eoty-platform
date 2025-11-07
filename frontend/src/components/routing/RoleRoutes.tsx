import React from 'react';
import ProtectedRoute from './ProtectedRoute';

interface RoleRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  redirectTo?: string;
}

/**
 * StudentRoute - Accessible by students and all higher roles
 * 
 * Role hierarchy: student (1) <= teacher (2) <= chapter_admin (3) <= platform_admin (4)
 * This route is accessible by: student, teacher, chapter_admin, platform_admin
 */
export const StudentRoute: React.FC<RoleRouteProps> = ({
  children,
  requiredPermission,
  redirectTo,
}) => {
  return (
    <ProtectedRoute
      allowedRoles={['student', 'teacher', 'chapter_admin', 'platform_admin']}
      requiredPermission={requiredPermission}
      redirectTo={redirectTo}
    >
      {children}
    </ProtectedRoute>
  );
};

/**
 * TeacherRoute - Accessible by teachers and all higher roles
 * 
 * Role hierarchy: teacher (2) <= chapter_admin (3) <= platform_admin (4)
 * This route is accessible by: teacher, chapter_admin, platform_admin
 */
export const TeacherRoute: React.FC<RoleRouteProps> = ({
  children,
  requiredPermission,
  redirectTo,
}) => {
  return (
    <ProtectedRoute
      allowedRoles={['teacher', 'chapter_admin', 'platform_admin']}
      requiredPermission={requiredPermission}
      redirectTo={redirectTo}
    >
      {children}
    </ProtectedRoute>
  );
};

/**
 * AdminRoute - Accessible by admins only
 * 
 * Role hierarchy: chapter_admin (3) <= platform_admin (4)
 * This route is accessible by: chapter_admin, platform_admin
 */
export const AdminRoute: React.FC<RoleRouteProps> = ({
  children,
  requiredPermission,
  redirectTo,
}) => {
  return (
    <ProtectedRoute
      allowedRoles={['chapter_admin', 'platform_admin']}
      requiredPermission={requiredPermission}
      redirectTo={redirectTo}
    >
      {children}
    </ProtectedRoute>
  );
};
