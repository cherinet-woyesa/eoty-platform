import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../services/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  chapter: string;
  profilePicture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[];
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  isRoleOrHigher: (role: string) => boolean;
  canAccessRoute: (path: string) => boolean;
  getRoleDashboard: () => string;
  refreshPermissions: () => Promise<void>;
  isLoading: boolean;
  // Google login function
  loginWithGoogle: (googleData: { googleId: string; email: string; firstName: string; lastName: string; profilePicture?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user permissions
  const loadPermissions = async () => {
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

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedRole = localStorage.getItem('userRole');
      
      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        
        // Check for role change - if stored role differs from current user role
        if (storedRole && storedRole !== parsedUser.role) {
          console.warn('Role change detected. Clearing authentication state.');
          // Clear auth state and force re-authentication
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
          setLoading(false);
          return;
        }
        
        setToken(storedToken);
        setUser(parsedUser);
        
        // Store current role for change detection
        localStorage.setItem('userRole', parsedUser.role);
        
        // Load permissions for the user
        await loadPermissions();
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Monitor for role changes in user object
  useEffect(() => {
    if (user) {
      const storedRole = localStorage.getItem('userRole');
      
      // If role has changed, invalidate session
      if (storedRole && storedRole !== user.role) {
        console.warn('User role changed. Forcing re-authentication.');
        logout();
        window.location.href = '/login';
      } else {
        // Update stored role
        localStorage.setItem('userRole', user.role);
      }
    }
  }, [user?.role]);

  const login = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Attempting login with:', { email });
      
      const response = await authApi.login(email, password);
      console.log('AuthContext: Raw API response:', response);

      // FIXED: Handle the correct response format from backend
      let token, user;

      if (response.success && response.data) {
        // Your backend format: { success: true, data: { user, token } }
        token = response.data.token;
        user = response.data.user;
      } else {
        console.error('AuthContext: Unexpected response format:', response);
        throw new Error('Unexpected response format from server');
      }

      // Validate required fields
      if (!token || !user) {
        console.error('AuthContext: Missing token or user in response:', response);
        throw new Error('Invalid response from server: missing token or user data');
      }

      console.log('AuthContext: Login successful', { token, user });
      
      setToken(token);
      setUser(user);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userRole', user.role);
      
      // Load permissions after login
      await loadPermissions();
      
    } catch (error: any) {
      console.error('AuthContext: Login error:', error);
      
      let errorMessage = 'Login failed';

      // Extract error message from different response formats
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Handle specific status codes
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error.response?.status === 403) {
        errorMessage = 'Account is deactivated. Please contact administrator.';
      } else if (error.response?.status === 422) {
        errorMessage = 'Validation error. Please check your input.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      throw new Error(errorMessage);
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await authApi.register(userData);
      
      // FIXED: Use the same response format handling
      if (response.success && response.data) {
        const { token, user } = response.data;
        
        setToken(token);
        setUser(user);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userRole', user.role);
        
        // Load permissions after registration
        await loadPermissions();
        
        return;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 409) {
        throw new Error('An account with this email already exists');
      }
      throw error;
    }
  };

  const loginWithGoogle = async (googleData: { googleId: string; email: string; firstName: string; lastName: string; profilePicture?: string }) => {
    try {
      const response = await authApi.googleLogin(googleData);
      
      // FIXED: Use the same response format handling
      if (response.success && response.data) {
        const { token, user } = response.data;
        
        setToken(token);
        setUser(user);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userRole', user.role);
        
        // Load permissions after Google login
        await loadPermissions();
        
        return;
      } else {
        throw new Error(response.message || 'Google login failed');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    authApi.logout();
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  };

  // Role hierarchy constants
  const ROLE_HIERARCHY: Record<string, number> = {
    student: 1,
    teacher: 2,
    admin: 3,
  };

  /**
   * Check if user's role is equal to or higher than the specified role
   * Uses role hierarchy: student < teacher < chapter_admin < platform_admin
   */
  const isRoleOrHigher = (role: string): boolean => {
    if (!user) return false;
    
    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[role] || 0;
    return userLevel >= requiredLevel;
  };

  /**
   * Get the dashboard path appropriate for the user's role
   */
  const getRoleDashboard = (): string => {
    if (!user) return '/login';

    if (user.role === 'admin') {
      return '/admin/dashboard';
    }
    if (user.role === 'teacher') {
      return '/teacher/dashboard';
    }
    return '/student/dashboard';
  };

  /**
   * Enhanced route access validation
   * Maps routes to required roles with wildcard and parameterized route support
   */
  const canAccessRoute = (path: string): boolean => {
    if (!user) return false;

    // Normalize path (remove trailing slash and query params)
    const normalizedPath = path.split('?')[0].replace(/\/$/, '');

    // Admin routes - require admin role
    if (normalizedPath.startsWith('/admin')) {
      return user.role === 'admin';
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
    ];

    for (const route of sharedRoutes) {
      if (normalizedPath === route || normalizedPath.startsWith(`${route}/`)) {
        return true;
      }
    }

    // Legacy routes that should redirect
    const legacyRoutes = [
      '/courses',
      '/catalog',
      '/progress',
      '/achievements',
      '/record',
      '/students',
      '/analytics',
    ];

    for (const route of legacyRoutes) {
      if (normalizedPath === route || normalizedPath.startsWith(`${route}/`)) {
        // Allow access but these will redirect to namespaced routes
        return true;
      }
    }

    // Default: deny access for unknown routes
    return false;
  };

  const refreshPermissions = async () => {
    await loadPermissions();
  };

  const value = {
    user,
    token,
    permissions,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
    hasPermission,
    hasRole,
    isRoleOrHigher,
    canAccessRoute,
    getRoleDashboard,
    refreshPermissions,
    isLoading: loading,
    loginWithGoogle
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
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