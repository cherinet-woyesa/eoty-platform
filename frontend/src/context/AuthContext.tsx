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
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Load permissions for the user
        await loadPermissions();
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      
      if (response.success) {
        const { token, user } = response.data;
        
        setToken(token);
        setUser(user);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Load permissions after login
        await loadPermissions();
        
        return;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 403) {
        throw new Error('Account is deactivated. Please contact administrator.');
      }
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await authApi.register(userData);
      
      if (response.success) {
        const { token, user } = response.data;
        
        setToken(token);
        setUser(user);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
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
      
      if (response.success) {
        const { token, user } = response.data;
        
        setToken(token);
        setUser(user);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
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