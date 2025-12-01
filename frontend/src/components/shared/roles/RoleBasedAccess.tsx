/**
 * FR7: Role-Based Access Component
 * REQUIREMENT: Youth, moderator, admin, guest roles
 */

import React from 'react';
import { useAuth } from '@/context/AuthContext';

interface RoleBasedAccessProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, user must have ALL roles; if false, user needs ANY role
}

/**
 * Component that renders children only if user has required role(s)
 */
export const RoleBasedAccess: React.FC<RoleBasedAccessProps> = ({
  allowedRoles,
  children,
  fallback = null,
  requireAll = false
}) => {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  const userRole = user.role?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

  // Role hierarchy (REQUIREMENT: Role-based access)
  const roleHierarchy: Record<string, number> = {
    'guest': 0,
    'youth': 1,
    'student': 1,
    'user': 1,
    'moderator': 2,
    'teacher': 2,
    'chapter_admin': 3,
    'admin': 4
  };

  const hasAccess = requireAll
    ? normalizedAllowedRoles.every(role => userRole === role)
    : normalizedAllowedRoles.some(role => {
        // Check exact match or hierarchy
        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[role] || 0;
        return userRole === role || userLevel >= requiredLevel;
      });

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

/**
 * Hook to check if user has required role(s)
 */
export const useRoleAccess = (allowedRoles: string[], requireAll = false) => {
  const { user } = useAuth();

  if (!user) {
    return { hasAccess: false, userRole: null };
  }

  const userRole = user.role?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

  const roleHierarchy: Record<string, number> = {
    'guest': 0,
    'youth': 1,
    'student': 1,
    'user': 1,
    'moderator': 2,
    'teacher': 2,
    'chapter_admin': 3,
    'admin': 4
  };

  const hasAccess = requireAll
    ? normalizedAllowedRoles.every(role => userRole === role)
    : normalizedAllowedRoles.some(role => {
        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[role] || 0;
        return userRole === role || userLevel >= requiredLevel;
      });

  return { hasAccess, userRole: user.role };
};

/**
 * Convenience components for specific roles
 */
export const YouthOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleBasedAccess allowedRoles={['youth', 'student']} fallback={fallback}>
    {children}
  </RoleBasedAccess>
);

export const ModeratorOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleBasedAccess allowedRoles={['moderator', 'admin']} fallback={fallback}>
    {children}
  </RoleBasedAccess>
);

export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleBasedAccess allowedRoles={['admin']} fallback={fallback}>
    {children}
  </RoleBasedAccess>
);

export const GuestOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleBasedAccess allowedRoles={['guest']} fallback={fallback}>
    {children}
  </RoleBasedAccess>
);

