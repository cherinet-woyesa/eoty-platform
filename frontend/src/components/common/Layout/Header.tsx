import * as React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { LogOut, Bell, Settings, User, Search, Menu } from 'lucide-react';
import LanguageSelector from '../LanguageSelector';

const Header: React.FC = () => {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left section - Search and navigation toggle */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            
            {/* Search bar */}
            <div className="relative hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-64 lg:w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Right section - User actions */}
          <div className="flex items-center space-x-3">
            {/* Language selector */}
            <LanguageSelector />
            
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors group">
              <Bell className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                3
              </span>
            </button>

            {/* Settings */}
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors group">
              <Settings className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
            </button>

            {/* User profile dropdown */}
            <div className="relative group">
              <button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                    <span className="text-white text-sm font-medium">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </span>
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.role}
                    </p>
                  </div>
                </div>
              </button>
              
              {/* Dropdown menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-2">
                  <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;