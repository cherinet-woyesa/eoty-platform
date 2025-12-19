import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    setIsProfileOpen(false);
  }, [logout]);

  const handleToggleProfile = useCallback(() => {
    setIsProfileOpen(prev => !prev);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setIsProfileOpen(false);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleCloseProfile();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleCloseProfile]);

  const handleProfileClick = () => {
    // Navigate to the appropriate profile page based on user role
    if (user?.role === 'admin' || user?.role === 'chapter_admin') {
      navigate('/admin/profile');
    } else if (user?.role === 'teacher') {
      navigate('/teacher/profile');
    } else {
      // Base members (user/legacy student) share the student profile area
      navigate('/member/profile');
    }
    handleCloseProfile();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggleProfile}
        className="flex items-center space-x-2 p-1.5 rounded-lg transition-colors duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        aria-label="User menu"
        aria-expanded={isProfileOpen}
        aria-haspopup="true"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm">
          {user?.profilePicture ? (
            <img 
              src={user.profilePicture} 
              alt="Profile" 
              className="w-7 h-7 rounded-full object-cover"
              loading="lazy"
              decoding="async"
              width={28}
              height={28}
            />
          ) : (
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-gray-900 leading-tight">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {user?.role}
          </p>
        </div>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown menu */}
      {isProfileOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200/60 py-2 z-50 animate-in slide-in-from-top-2">
          {/* User info section */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-md">
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                    width={48}
                    height={48}
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize truncate">
                  {user?.role}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-2">
            <button
              onClick={handleProfileClick}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:bg-gray-50"
            >
              <User className="mr-3 h-5 w-5 text-blue-600" />
              <span className="font-medium">Profile</span>
            </button>
          </div>

          {/* Logout section */}
          <div className="px-4 py-2 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-2 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 focus:outline-none"
            >
              <LogOut className="mr-3 h-5 w-5" />
              <span className="font-medium">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(UserMenu);