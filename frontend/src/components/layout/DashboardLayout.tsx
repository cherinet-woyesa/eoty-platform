import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import Header from './Header/Header';
import Sidebar from './Sidebar/BaseSidebar';
import AdminSidebar from './Sidebar/AdminSidebar';
import StudentSidebar from './Sidebar/StudentSidebar';
import TeacherSidebar from './Sidebar/TeacherSidebar';
import { useOnboarding } from '../../context/OnboardingContext';
import WelcomeMessage from '../onboarding/WelcomeMessage';
import { useHotkeys } from '../../hooks/useHotkeys';
import LoadingSpinner from '../common/LoadingSpinner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { hasOnboarding, isCompleted } = useOnboarding();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Initialize from localStorage for persistence
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  // Determine user roles with memoization
  const isAdminUser = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isStudent = user?.role === 'student';
  
  // Check if current route is admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Show welcome message for new users
  const showWelcome = hasOnboarding && !isCompleted;

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  // Keyboard shortcuts
  useHotkeys([
    {
      keys: ['ctrl', 'b'],
      callback: () => setSidebarCollapsed(prev => !prev),
      description: 'Toggle sidebar'
    },
    {
      keys: ['escape'],
      callback: () => setSidebarOpen(false),
      description: 'Close sidebar'
    }
  ]);

  const handleDismissWelcome = useCallback(() => {
    // User dismissed the welcome message
    console.log('Welcome message dismissed');
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleMobileSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleOverlayClick = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Render appropriate sidebar based on user role and route
  const renderSidebar = () => {
    if (isAdminRoute && isAdminUser) {
      return (
        <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl">
          <AdminSidebar 
            isCollapsed={sidebarCollapsed} 
            onToggleCollapse={handleToggleSidebar} 
          />
        </div>
      );
    } else if (isTeacher) {
      return (
        <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl">
          <TeacherSidebar 
            isCollapsed={sidebarCollapsed} 
            onToggleCollapse={handleToggleSidebar} 
          />
        </div>
      );
    } else if (isStudent) {
      return (
        <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl">
          <StudentSidebar 
            isCollapsed={sidebarCollapsed} 
            onToggleCollapse={handleToggleSidebar} 
          />
        </div>
      );
    } else {
      return (
        <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl">
          <Sidebar 
            isCollapsed={sidebarCollapsed} 
            onToggleCollapse={handleToggleSidebar} 
          />
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Sidebar - Dynamic width based on collapse state */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-40 
          lg:static lg:z-auto
          transform transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex-shrink-0
          select-none
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {renderSidebar()}
      </div>

      {/* Main content area - Takes remaining space */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky header */}
        <Header 
          onToggleSidebar={handleMobileSidebarToggle}
          sidebarCollapsed={sidebarCollapsed}
        />
        
        {/* Main content - Full width with proper scrolling */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent">
          {/* Content container - Full width, no max-width constraints */}
          <div className="w-full min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 z-30 backdrop-blur-sm transition-opacity duration-300" 
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* Onboarding Components */}
      {showWelcome && user && (
        <WelcomeMessage 
          userName={user.firstName}
          onDismiss={handleDismissWelcome}
          onStartOnboarding={() => {
            // Navigate to onboarding flow
            console.log('Start onboarding');
          }}
        />
      )}

      {/* Performance monitoring - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-black/80 text-white text-xs px-2 py-1 rounded">
            {sidebarCollapsed ? 'Collapsed' : 'Expanded'}
          </div>
        </div>
      )}
    </div>
  );
};

// Add display name for better debugging
DashboardLayout.displayName = 'DashboardLayout';

export default React.memo(DashboardLayout);