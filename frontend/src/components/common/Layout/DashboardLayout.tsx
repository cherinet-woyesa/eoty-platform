import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AdminSidebar from '../../admin/AdminSidebar';
import { useAuth } from '../../../context/AuthContext';
import { useOnboarding } from '../../../context/OnboardingContext';
import OnboardingModal from '../../onboarding/OnboardingModal';
import WelcomeMessage from '../../onboarding/WelcomeMessage';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const { hasOnboarding, isCompleted, progress } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const location = useLocation();
  
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminUser = user?.role === 'chapter_admin' || user?.role === 'platform_admin';

  useEffect(() => {
    // Show welcome message for new users who haven't completed onboarding
    if (user && hasOnboarding && !isCompleted && progress?.progress === 0) {
      setShowWelcome(true);
    }
  }, [user, hasOnboarding, isCompleted, progress]);

  const handleStartOnboarding = () => {
    setShowOnboarding(true);
  };

  const handleDismissWelcome = () => {
    // User dismissed the welcome message, but we can show it again later
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Sidebar - Collapsible on mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-50 
        lg:static lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isAdminRoute && isAdminUser ? 'w-64' : 'w-64'}
      `}>
        {isAdminRoute && isAdminUser ? (
          <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl">
            <AdminSidebar />
          </div>
        ) : (
          <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl">
            <Sidebar />
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
          <Header />
        </div>
        
        {/* Main content with smooth scrolling */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {/* Animated page transition container */}
            <div className="animate-fade-in-up">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" />

      {/* Onboarding Components */}
      {showWelcome && user && (
        <WelcomeMessage 
          userName={user.firstName}
          onDismiss={handleDismissWelcome}
          onStartOnboarding={handleStartOnboarding}
        />
      )}
      
      <OnboardingModal 
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
};

export default DashboardLayout;