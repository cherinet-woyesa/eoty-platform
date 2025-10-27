import React from 'react';
import { useUser } from '../../context/UserContext';

interface RequireRoleProps {
  role: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RequireRole: React.FC<RequireRoleProps> = ({ 
  role, 
  children, 
  fallback = null 
}) => {
  const { hasRole } = useUser();

  if (hasRole(role)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default RequireRole;