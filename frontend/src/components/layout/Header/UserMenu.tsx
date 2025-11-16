import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Settings, User, ChevronDown, Mail, CreditCard, HelpCircle, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  const menuItems = [
    {
      icon: User,
      label: 'Profile',
      onClick: () => {
        // Navigate to the appropriate profile page based on user role
        if (user?.role === 'teacher') {
          navigate('/teacher/profile');
        } else {
          // Base members (user/legacy student) share the student profile area
          navigate('/student/profile');
        }
        handleCloseProfile();
      },
      description: 'View and edit your profile'
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        console.log('Navigate to settings');
        handleCloseProfile();
      },
      description: 'Account preferences'
    },
    {
      icon: Mail,
      label: 'Messages',
      onClick: () => {
        console.log('Navigate to messages');
        handleCloseProfile();
      },
      description: 'Check your inbox',
      badge: '3'
    },
    {
      icon: CreditCard,
      label: 'Billing',
      onClick: () => {
        console.log('Navigate to billing');
        handleCloseProfile();
      },
      description: 'Manage subscription'
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onClick: () => {
        console.log('Navigate to help');
        handleCloseProfile();
      },
      description: 'Get assistance'
    }
  ];

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
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 transition-colors duration-150 group focus:outline-none focus:bg-gray-50"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <item.icon className="mr-3 h-4 w-4 text-gray-500" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <div className="px-4 py-2 border-t border-gray-100">
            <button
              onClick={() => {
                toggleTheme();
                handleCloseProfile();
              }}
              className="flex items-center w-full px-2 py-2 text-sm text-gray-700 rounded-lg transition-colors duration-150 focus:outline-none focus:bg-gray-50"
            >
              {theme === 'dark' ? (
                <Sun className="mr-3 h-4 w-4 text-gray-500" />
              ) : (
                <Moon className="mr-3 h-4 w-4 text-gray-500" />
              )}
              <span>Switch to {theme === 'dark' ? 'light' : 'dark'} theme</span>
            </button>
          </div>

          {/* Logout section */}
          <div className="px-4 py-2 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-2 py-2 text-sm text-red-600 rounded-lg transition-colors duration-150 focus:outline-none focus:bg-red-50"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(UserMenu);