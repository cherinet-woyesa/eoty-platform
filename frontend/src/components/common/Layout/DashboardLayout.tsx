import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import AdminSidebar from '../../admin/AdminSidebar';
import StudentSidebar from './StudentSidebar';
import TeacherSidebar from './TeacherSidebar';
import { useOnboarding } from '../../../context/OnboardingContext';
import WelcomeMessage from '../../onboarding/WelcomeMessage';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const { hasOnboarding, isCompleted } = useOnboarding();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Determine user roles
  const isAdminUser = user?.role === 'platform_admin' || user?.role === 'chapter_admin';
  const isTeacher = user?.role === 'teacher' || user?.role === 'chapter_admin' || user?.role === 'platform_admin';
  const isStudent = user?.role === 'student';
  
  // Check if current route is admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Show welcome message for new users
  const showWelcome = hasOnboarding && !isCompleted;

  const handleDismissWelcome = () => {
    // User dismissed the welcome message, but we can show it again later
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Sidebar - Dynamic width based on collapse state */}
      <div className={`
        fixed inset-y-0 left-0 z-40 
        lg:static lg:z-auto
        transform transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex-shrink-0
      `}>
        {isAdminRoute && isAdminUser ? (
          <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl">
            <AdminSidebar />
          </div>
        ) : isTeacher ? (
          <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl">
            <TeacherSidebar 
              isCollapsed={sidebarCollapsed} 
              onToggleCollapse={handleToggleSidebar} 
            />
          </div>
        ) : isStudent ? (
          <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl">
            <StudentSidebar 
              isCollapsed={sidebarCollapsed} 
              onToggleCollapse={handleToggleSidebar} 
            />
          </div>
        ) : (
          <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl">
            <Sidebar />
          </div>
        )}
      </div>

      {/* Main content area - Takes remaining space */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky header */}
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Main content - Full width with proper scrolling */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Content container - Full width, no max-width constraints */}
          <div className="w-full min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 z-30 backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Onboarding Components */}
      {showWelcome && user && (
        <WelcomeMessage 
          userName={user.firstName}
          onDismiss={handleDismissWelcome}
          onStartOnboarding={() => {}}
        />
      )}
    </div>
  );
};

export default DashboardLayout;