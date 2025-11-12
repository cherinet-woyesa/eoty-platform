import React, { useState, useCallback, memo } from 'react';
import { useAuth } from '@/context/AuthContext';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import { Menu, X } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import BreadcrumbNav from './BreadcrumbNav';
import QuickActions from './QuickActions';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, sidebarCollapsed }) => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isOnline = useOnlineStatus();

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200/60 shadow-sm sticky top-0 z-50">
      <div className="px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14">
          {/* Left section - Mobile menu and breadcrumbs */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            {/* Mobile menu button */}
            <button 
              onClick={onToggleSidebar || handleMobileMenuToggle}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4 text-gray-600" />
              ) : (
                <Menu className="h-4 w-4 text-gray-600" />
              )}
            </button>
            
            {/* Breadcrumb navigation - Hidden on mobile */}
            <div className="hidden md:block flex-1 min-w-0">
              <BreadcrumbNav />
            </div>
          </div>

          {/* Right section - User actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Quick Actions - Hidden on mobile */}
            <div className="hidden lg:block">
              <QuickActions />
            </div>
            
            {/* Language Selector */}
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>
            
            {/* Notifications */}
            <NotificationBell />
            
            {/* User profile dropdown */}
            <UserMenu />
          </div>
        </div>

        {/* Mobile breadcrumb - Only show on mobile */}
        <div className="md:hidden pb-2">
          <BreadcrumbNav />
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/20 z-40" onClick={handleCloseMobileMenu}>
          <div 
            className="absolute top-14 left-0 right-0 bg-white border-t border-gray-200 shadow-lg animate-in slide-in-from-top-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center space-x-3">
                <LanguageSelector />
              </div>
              <div className="border-t border-gray-200 pt-3">
                <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default memo(Header);