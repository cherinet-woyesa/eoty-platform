import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { LogOut, Bell, Settings, User, Search, Menu, X, ChevronDown } from 'lucide-react';
import LanguageSelector from '../LanguageSelector';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200/60 shadow-sm sticky top-0 z-50">
      <div className="px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14">
          {/* Left section - Mobile menu and search */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mobile menu button */}
            <button 
              onClick={onToggleSidebar || (() => setIsMobileMenuOpen(!isMobileMenuOpen))}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4 text-gray-600" />
              ) : (
                <Menu className="h-4 w-4 text-gray-600" />
              )}
            </button>
            
            {/* Search bar - Responsive sizing */}
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses, lessons..."
                className="pl-8 pr-3 py-1.5 w-40 sm:w-48 md:w-56 lg:w-64 xl:w-72 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white"
              />
            </form>
          </div>

          {/* Right section - User actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Language Selector */}
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>
            
            {/* Notifications */}
            <button className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 group">
              <Bell className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-pulse">
                3
              </span>
            </button>

            {/* Settings */}
            <button className="hidden sm:block p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 group">
              <Settings className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
            </button>

            {/* User profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 group"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-white" />
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
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200/60 py-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <div className="py-1">
                    <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150">
                      <User className="mr-2 h-3.5 w-3.5" />
                      Profile
                    </button>
                    <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150">
                      <Settings className="mr-2 h-3.5 w-3.5" />
                      Settings
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                    >
                      <LogOut className="mr-2 h-3.5 w-3.5" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/20 z-40" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center space-x-3">
                <LanguageSelector />
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Settings className="h-4 w-4 text-gray-600" />
                </button>
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

export default Header;