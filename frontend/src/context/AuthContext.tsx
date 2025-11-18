import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '@/services/api';
import { setAuthToken } from '@/services/api/apiClient';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  chapter: string;
  profilePicture?: string;
  preferences?: {
    theme?: string;
    notifications?: boolean;
    language?: string;
  };
  bio?: string;
  phone?: string;
  location?: string;
  specialties?: string[];
  teachingExperience?: number;
  education?: string;
  interests?: string[];
  learningGoals?: string;
  dateOfBirth?: string | null;
  profileCompletion?: {
    percentage: number;
    completedFields: number;
    totalFields: number;
    isComplete: boolean;
    missingFields: string[];
  };
}

interface AuthContextType {
  // Defines the shape of the authentication context
  user: User | null;
  token: string | null;
  permissions: string[];
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
  isRoleOrHigher: (role: string) => boolean;
  canAccessRoute: (path: string) => boolean;
  getRoleDashboard: () => string;
  refreshPermissions: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  loginWithGoogle: (googleData: { googleId: string; email: string; firstName: string; lastName: string; profilePicture?: string }) => Promise<void>;
  updateUserPreferences: (preferences: Partial<User['preferences']>) => Promise<void>;
  lastActivity: Date;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role hierarchy for permission checking
// NOTE: Base role has been generalized from 'student' to 'user'; 'student' is treated as a legacy alias.
const ROLE_HIERARCHY: Record<string, number> = {
  user: 1,
  student: 1, // legacy
  teacher: 2,
  admin: 3
};

// Permission groups for common functionality
const PERMISSION_GROUPS = {
  COURSE: {
    VIEW: 'course:view',
    CREATE: 'course:create',
    EDIT: 'course:edit',
    DELETE: 'course:delete',
    ENROLL: 'course:enroll'
  },
  USER: {
    VIEW: 'user:view',
    EDIT: 'user:edit',
    DELETE: 'user:delete'
  },
  CONTENT: {
    VIEW: 'content:view',
    CREATE: 'content:create',
    EDIT: 'content:edit',
    DELETE: 'content:delete'
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Controls when we actually show the full-screen splash; avoids flashing it for fast loads
  const [showInitialLoader, setShowInitialLoader] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  // Activity tracker to detect inactivity
  useEffect(() => {
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const updateActivity = () => setLastActivity(new Date());
    
    activities.forEach(event => {
      document.addEventListener(event, updateActivity);
    });
    
    return () => {
      activities.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // Auto-logout after 24 hours of inactivity
  useEffect(() => {
    const checkInactivity = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - lastActivity.getTime();
      const hoursInactive = diff / (1000 * 60 * 60);
      
      if (hoursInactive > 24) {
        console.log('Auto-logout due to inactivity');
        logout();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkInactivity);
  }, [lastActivity]);

  // Load permissions from API (no caching)
  const loadPermissions = async (): Promise<void> => {
    try {
      const response = await authApi.getUserPermissions();
      if (response.success) {
        setPermissions(response.data.permissions);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions([]);
    }
  };

  // Initialize auth - restore session from localStorage if present
  useEffect(() => {
    // Only show the big splash screen if initialization takes longer than a short delay
    const loaderTimeout = setTimeout(() => {
      setShowInitialLoader(true);
    }, 400); // 400ms threshold keeps fast loads clean

    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');

        if (storedToken && storedUser) {
          try {
            const parsedUser: User = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(parsedUser);
            setAuthToken(storedToken);
            setLastActivity(new Date());

            // Load permissions in the background so we don't block the initial UI
            // If this fails or is slow, the user still sees their dashboard quickly.
            void loadPermissions().catch(error => {
              console.error('Failed to load permissions during init:', error);
              setPermissions([]);
            });
          } catch (parseError) {
            console.error('Failed to parse stored auth user:', parseError);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
          }
        }
      } catch (error) {
        console.error('Error initializing auth from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
    return () => {
      clearTimeout(loaderTimeout);
    };
  }, []);

  // Login - persist session in memory and localStorage
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Clear any existing state and storage
      setUser(null);
      setToken(null);
      setPermissions([]);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      
      const response = await authApi.login(email, password);
      
      if (response.success && response.data) {
        const { token, user } = response.data;

        if (!token || !user) {
          throw new Error('Invalid response from server');
        }

        setToken(token);
        setUser(user);
        setLastActivity(new Date());
        
        // Update apiClient token store
        setAuthToken(token);
        
        // Persist to localStorage for session restoration
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        
        await loadPermissions();
        
        // Track login event for analytics
        console.log('User logged in successfully:', { 
          userId: user.id, 
          email: user.email,
          role: user.role 
        });
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed';
      const status = error.response?.status;

      switch (status) {
        case 401:
          errorMessage = 'Invalid email or password';
          break;
        case 403:
          errorMessage = 'Account is deactivated. Please contact administrator.';
          break;
        case 422:
          errorMessage = 'Validation error. Please check your input.';
          break;
        case 429:
          errorMessage = 'Too many login attempts. Please try again later.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 0:
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = error.response?.data?.message || error.message || 'Login failed';
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Register - persist session in memory and localStorage
  const register = async (userData: any): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Clear any existing state and storage
      setUser(null);
      setToken(null);
      setPermissions([]);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      
      const response = await authApi.register(userData);
      
      if (response.success && response.data) {
        const { token, user } = response.data;
        
        setToken(token);
        setUser(user);
        setLastActivity(new Date());
        
        // Update apiClient token store
        setAuthToken(token);
        
        // Persist to localStorage for session restoration
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        
        await loadPermissions();
        
        return;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        throw new Error('An account with this email already exists');
      }
      if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        if (errors) {
          throw new Error(Object.values(errors).flat().join(', '));
        }
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Google login - persist session in memory and localStorage
  const loginWithGoogle = async (googleData: { googleId: string; email: string; firstName: string; lastName: string; profilePicture?: string }) => {
    try {
      setIsLoading(true);
      const response = await authApi.googleLogin(googleData);
      
      if (response.success && response.data) {
        const { token, user } = response.data;
        
        setToken(token);
        setUser(user);
        setLastActivity(new Date());
        
        // Update apiClient token store
        setAuthToken(token);
        
        // Persist to localStorage for session restoration
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        
        await loadPermissions();
        
        return;
      } else {
        throw new Error(response.message || 'Google login failed');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout - clear state and localStorage
  const logout = (): void => {
    // Clear state
    setUser(null);
    setToken(null);
    setPermissions([]);
    
    // Clear persisted auth
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    // Clear apiClient token
    setAuthToken(null);
    
    // API cleanup
    authApi.logout();
    
    // Track logout for analytics
    console.log('User logged out');
  };

  // Enhanced permission checking with caching and groups
  const hasPermission = (permission: string): boolean => {
    // Check explicit permissions first
    if (permissions.includes(permission)) {
      return true;
    }
    
    // Fallback: Grant default permissions based on role if permissions haven't loaded yet
    if (!user) return false;
    
    // Teachers can create, edit, and delete their own courses/lessons/quizzes
    if (user.role === 'teacher') {
      const teacherPermissions = [
        'course:view', 'course:create', 'course:edit_own', 'course:delete_own', 'course:publish',
        'lesson:view', 'lesson:create', 'lesson:edit_own', 'lesson:delete_own', 'lesson:edit', 'lesson:delete',
        'video:upload', 'video:stream', 'video:manage', 'video:delete_own',
        'quiz:take', 'quiz:create', 'quiz:edit_own',
        'discussion:view', 'discussion:create',
        'content:manage', 'content:view',
        'user:edit_own', 'user:view', 'analytics:view_own',
        'progress:view', 'notes:create', 'notes:view_own'
      ];
      if (teacherPermissions.includes(permission)) {
        return true;
      }
    }
    
    // Admins have all permissions
    if (user.role === 'admin') {
      return true;
    }
    
    return false;
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => hasPermission(permission));
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  };

  const isRoleOrHigher = (role: string): boolean => {
    if (!user) return false;
    
    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[role] || 0;
    return userLevel >= requiredLevel;
  };

  const getRoleDashboard = (): string => {
    if (!user) return '/login';

    switch (user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      default:
        return '/student/dashboard';
    }
  };

  // Enhanced route access validation with parameter support
  const canAccessRoute = (path: string): boolean => {
    if (!user) return false;

    // Normalize path (remove trailing slash and query params)
    const normalizedPath = path.split('?')[0].replace(/\/$/, '');

    // Admin routes - require admin role
    if (normalizedPath.startsWith('/admin')) {
      return isRoleOrHigher('admin');
    }

    // Teacher routes - require teacher or higher
    if (normalizedPath.startsWith('/teacher')) {
      return isRoleOrHigher('teacher');
    }

    // Student routes - accessible by all authenticated users
    if (normalizedPath.startsWith('/student')) {
      return true;
    }

    // Shared routes accessible to all authenticated users
    const sharedRoutes = [
      '/dashboard',
      '/ai-assistant',
      '/forums',
      '/community',
      '/leaderboards',
      '/resources',
      '/help',
      '/profile',
      '/settings'
    ];

    for (const route of sharedRoutes) {
      if (normalizedPath === route || normalizedPath.startsWith(`${route}/`)) {
        return true;
      }
    }

    // Course-related routes with permission checking
    if (normalizedPath.startsWith('/courses')) {
      return hasPermission(PERMISSION_GROUPS.COURSE.VIEW);
    }

    // Default: deny access for unknown routes
    return false;
  };

  const refreshPermissions = async (): Promise<void> => {
    await loadPermissions();
  };

  // Refresh user data from backend
  const refreshUser = async (): Promise<void> => {
    try {
      const response = await authApi.getCurrentUser();
      if (response.success && response.data?.user) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  };

  // Update user preferences
  const updateUserPreferences = async (preferences: Partial<User['preferences']>): Promise<void> => {
    if (!user) return;

    try {
      const updatedUser = {
        ...user,
        preferences: {
          ...user.preferences,
          ...preferences
        }
      };
      
      setUser(updatedUser);
      
      // Sync with backend
      await authApi.updateUserPreferences(preferences);
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    permissions,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isRoleOrHigher,
    canAccessRoute,
    getRoleDashboard,
    refreshPermissions,
    refreshUser,
    isLoading,
    loginWithGoogle,
    updateUserPreferences,
    lastActivity
  };

  // While auth is initializing, optionally show a friendly splash.
  // We wait a short delay before showing it to avoid flashing for very fast loads.
  if (isLoading) {
    if (!showInitialLoader) {
      // Keep the screen clean for the first few hundred ms
      return null;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-700 font-medium">Signing you in…</p>
          <p className="text-xs text-gray-500 mt-1">This usually only takes a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper hook for common permission checks
export const usePermissions = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  
  return {
    canViewCourses: () => hasPermission(PERMISSION_GROUPS.COURSE.VIEW),
    canCreateCourses: () => hasPermission(PERMISSION_GROUPS.COURSE.CREATE),
    canEditCourses: () => hasPermission(PERMISSION_GROUPS.COURSE.EDIT),
    canManageUsers: () => hasAnyPermission([PERMISSION_GROUPS.USER.EDIT, PERMISSION_GROUPS.USER.DELETE]),
    canManageContent: () => hasAllPermissions([PERMISSION_GROUPS.CONTENT.VIEW, PERMISSION_GROUPS.CONTENT.EDIT])
  };
};