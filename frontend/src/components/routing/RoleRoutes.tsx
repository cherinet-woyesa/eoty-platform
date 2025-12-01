import React from 'react';
import ProtectedRoute from './ProtectedRoute';

interface RoleRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  redirectTo?: string;
}

/**
 * MemberRoute - Accessible by base members and all higher roles
 * 
 * Role hierarchy: user/student (1) <= teacher (2) <= admin (3)
 * This route is accessible by: user, student (legacy), teacher, admin
 */
export const StudentRoute: React.FC<RoleRouteProps> = ({
  children,
  requiredPermission,
  redirectTo,
}) => {
  return (
    <ProtectedRoute
      allowedRoles={['user', 'student', 'teacher', 'admin']}
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
 * Role hierarchy: teacher (2) <= admin (3)
 * This route is accessible by: teacher, admin
 */
export const TeacherRoute: React.FC<RoleRouteProps> = ({
  children,
  requiredPermission,
  redirectTo,
}) => {
  return (
    <ProtectedRoute
      allowedRoles={['teacher', 'admin']}
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
 * Role hierarchy: admin (3)
 * This route is accessible by: admin
 */
export const AdminRoute: React.FC<RoleRouteProps> = ({
  children,
  requiredPermission,
  redirectTo,
}) => {
  return (
    <ProtectedRoute
      allowedRoles={['admin', 'chapter_admin']}
      requiredPermission={requiredPermission}
      redirectTo={redirectTo}
    >
      {children}
    </ProtectedRoute>
  );
};
