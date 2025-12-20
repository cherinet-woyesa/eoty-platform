import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/services/api';
import { useAuth } from './AuthContext'; // Import useAuth

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'student' | 'teacher' | 'chapter_admin' | 'admin';
  chapter: string;
  permissions: string[];
  bio?: string;
  phone?: string;
  location?: string;
  profilePicture?: string;
  specialties?: string[];
  teachingExperience?: number;
  education?: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const getDefaultPermissions = (role: string): string[] => {
  const permissionMap: { [key: string]: string[] } = {
    user: [
      'course:view', 'lesson:view', 'quiz:take', 
      'discussion:view', 'discussion:create', 'user:edit_own'
    ],
    teacher: [
      'course:view', 'course:create', 'course:edit_own', 'course:delete_own',
      'lesson:view', 'lesson:create', 'lesson:edit_own', 'lesson:delete_own',
      'video:upload', 'video:delete_own',
      'quiz:take', 'quiz:create', 'quiz:edit_own',
      'discussion:view', 'discussion:create',
      'user:edit_own'
    ],
    chapter_admin: [
      'course:view', 'course:create', 'course:edit_own', 'course:edit_any', 'course:delete_own', 'course:delete_any',
      'lesson:view', 'lesson:create', 'lesson:edit_own', 'lesson:edit_any', 'lesson:delete_own', 'lesson:delete_any',
      'video:upload', 'video:delete_own', 'video:delete_any',
      'quiz:take', 'quiz:create', 'quiz:edit_own', 'quiz:edit_any',
      'discussion:view', 'discussion:create', 'discussion:moderate', 'discussion:delete_any',
      'user:view', 'user:edit_own', 'user:edit_any',
      'chapter:view', 'chapter:manage',
      'analytics:view'
    ],
    admin: ['system:admin']
  };

    return permissionMap[role] || permissionMap.user;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user: authUser } = useAuth(); // Get auth state and user

  const loadUser = React.useCallback(async () => {
    try {
      // Only load if authenticated (no localStorage check)
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      const response = await authApi.getCurrentUser();
      if (response.success) {
        // For now, we'll set default permissions based on role
        // In production, you'd fetch actual permissions from backend
        const userData = response.data.user;
        const permissions = getDefaultPermissions(userData.role);
        
        setUser({
          ...userData,
          permissions
        });
      }
    } catch (error: any) {
      console.error('Failed to load user:', error);
      // On 401, user will be logged out by AuthContext
      if (error?.response?.status === 401) {
        console.warn('Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const hasPermission = React.useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.permissions.includes('system:admin')) return true;
    return user.permissions.includes(permission);
  }, [user]);

  const hasRole = React.useCallback((role: string | string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    if (typeof role === 'string') {
      return user.role === role;
    }
    return role.includes(user.role);
  }, [user]);

  const refreshUser = React.useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  // Load user when component mounts
  useEffect(() => {
    loadUser();
  }, []);

  // Update user when auth state changes
  useEffect(() => {
    if (isAuthenticated && authUser) {
      // Create user object compatible with UserContext from AuthContext user
      const userWithPermissions = {
        ...authUser, // Spread all properties from authUser to include profile fields
        role: authUser.role as 'user' | 'student' | 'teacher' | 'chapter_admin' | 'admin',
        permissions: getDefaultPermissions(authUser.role)
      };
      setUser(userWithPermissions);
      setLoading(false);
    } else if (!isAuthenticated) {
      setUser(null);
    }
  }, [isAuthenticated, authUser]);

  const value = React.useMemo(() => ({
    user,
    loading,
    hasPermission,
    hasRole,
    refreshUser
  }), [user, loading, hasPermission, hasRole, refreshUser]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};