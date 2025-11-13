import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/services/api';
import { useAuth } from './AuthContext'; // Import useAuth

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'chapter_admin' | 'platform_admin';
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

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user: authUser } = useAuth(); // Get auth state and user

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
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
      // Only clear token on 401 (unauthorized) errors, not on 500 (server) errors
      if (error?.response?.status === 401) {
        console.warn('Authentication failed, clearing token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
      } else {
        // For 500 errors or other server errors, don't clear token
        // The user is still authenticated, just the server had an issue
        console.warn('Server error loading user, but user is still authenticated');
      }
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPermissions = (role: string): string[] => {
    const permissionMap: { [key: string]: string[] } = {
      student: [
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
      platform_admin: ['system:admin']
    };

    return permissionMap[role] || permissionMap.student;
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.permissions.includes('system:admin')) return true;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    if (user.role === 'platform_admin') return true;
    
    if (typeof role === 'string') {
      return user.role === role;
    }
    return role.includes(user.role);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  // Load user when component mounts
  useEffect(() => {
    loadUser();
  }, []);

  // Update user when auth state changes
  useEffect(() => {
    if (isAuthenticated && authUser) {
      // Create user object compatible with UserContext from AuthContext user
      const userWithPermissions = {
        id: authUser.id,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        email: authUser.email,
        role: authUser.role as 'student' | 'teacher' | 'chapter_admin' | 'platform_admin',
        chapter: authUser.chapter,
        permissions: getDefaultPermissions(authUser.role)
      };
      setUser(userWithPermissions);
      setLoading(false);
    } else if (!isAuthenticated) {
      setUser(null);
    }
  }, [isAuthenticated, authUser]);

  return (
    <UserContext.Provider value={{ user, loading, hasPermission, hasRole, refreshUser }}>
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