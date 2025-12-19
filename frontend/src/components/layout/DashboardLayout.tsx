import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';
import Header from './Header/Header';

import Sidebar from './Sidebar/BaseSidebar';
import AdminSidebar from './Sidebar/AdminSidebar';
import StudentSidebar from './Sidebar/StudentSidebar';
import TeacherSidebar from './Sidebar/TeacherSidebar';
import { useOnboarding } from '@/context/OnboardingContext';
import WelcomeMessage from '@/components/shared/onboarding/WelcomeMessage';
import ReminderNotification from '@/components/shared/onboarding/ReminderNotification';
import ContextualHelp from '@/components/shared/onboarding/ContextualHelp';
import OnboardingModal from '@/components/shared/onboarding/OnboardingModal';
import { useHotkeys } from '@/hooks/useHotkeys';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { HelpCircle } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, hideHeader = false }) => {
  const { user, isLoading } = useAuth();
  const { hasOnboarding, isCompleted, flow, progress } = useOnboarding();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Initialize from localStorage for persistence
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  // Determine user roles with memoization
  const isAdminUser = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  // Base members (user/legacy student) use the student dashboard/sidebar
  const isStudent = user?.role === 'user' || user?.role === 'student';

  // Check if current route is admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Show welcome message for new users, but don't auto-open the full training modal.
  // The user must explicitly start onboarding from the welcome card or reminder to avoid intrusive UI.
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

  // Render appropriate sidebar based on route prefix first, then fallback to user role
  const renderSidebar = () => {
    const isTeacherRoute = location.pathname.startsWith('/teacher');
    const isStudentRoute = location.pathname.startsWith('/member') || location.pathname.startsWith('/classroom') || location.pathname.startsWith('/catalog');

    if (isAdminRoute && isAdminUser) {
      return (
        <AdminSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      );
    }

    if (isTeacherRoute && isTeacher) {
      return (
        <TeacherSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      );
    }

    if (isStudentRoute) {
      return (
        <StudentSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      );
    }

    // Fallback based on role if no specific prefix matched
    if (isAdminUser) {
      return (
        <AdminSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      );
    } else if (isTeacher) {
      return (
        <TeacherSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      );
    } else if (isStudent) {
      return (
        <StudentSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      );
    } else {
      return (
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen bg-[#fdfbf7] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#fdfbf7]">
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
        {!hideHeader && (
          <Header
            onToggleSidebar={handleMobileSidebarToggle}
            sidebarCollapsed={sidebarCollapsed}
          />
        )}

        {/* Main content - Full width with proper scrolling */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent flex flex-col">
          {/* Content container - Full width, no max-width constraints */}
          <div className="w-full flex-1 min-h-full">
            {children}
          </div>

          {/* Footer */}

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
      {/* Reminder notifications (REQUIREMENT: Follow-up reminders) */}
      <ReminderNotification
        onResume={() => {
          // Open onboarding modal when user clicks resume (REQUIREMENT: Auto-resume)
          setShowOnboardingModal(true);
        }}
      />

      {showWelcome && user && (
        <WelcomeMessage
          userName={user.firstName}
          onDismiss={handleDismissWelcome}
          onStartOnboarding={() => {
            // Open onboarding modal
            setShowOnboardingModal(true);
          }}
        />
      )}

      {/* Onboarding Modal (REQUIREMENT: Step-by-step guide, auto-resume) */}
      {hasOnboarding && flow && progress && (
        <OnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => {
            setShowOnboardingModal(false);
            // If onboarding is completed, don't show again
            if (isCompleted) {
              setShowOnboardingModal(false);
            }
          }}
        />
      )}

      {/* Help button - Always accessible (REQUIREMENT: Help content always accessible from dashboard) */}
      <div className="fixed bottom-4 left-4 z-50">
        <ContextualHelp
          component="dashboard"
          page={location.pathname}
          position="right"
        >
          <button
            className="bg-white hover:bg-gray-50 text-gray-600 hover:text-[#27AE60] border border-gray-200 rounded-full p-3 shadow-lg transition-all hover:scale-110 hover:shadow-xl"
            aria-label="Get help"
            title="Get help"
          >
            <HelpCircle className="h-6 w-6" />
          </button>
        </ContextualHelp>
      </div>

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

export default DashboardLayout;