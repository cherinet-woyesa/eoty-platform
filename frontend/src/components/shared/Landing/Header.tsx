import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Navigation from './Navigation';

interface HeaderProps {
  activeSection?: string;
  onScrollToSection?: (sectionId: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeSection, onScrollToSection }) => {
  const { isAuthenticated, getRoleDashboard } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showTransparent = isHomePage && !isScrolled;

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showTransparent 
            ? 'bg-black/40 backdrop-blur-md border-b border-white/10 py-4' 
            : 'bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg py-2'
        }`}
      >
        <div className="w-full">
          <div className="flex justify-between items-center px-4 lg:px-6">
            <Link to="/" className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <div className={`absolute inset-0 rounded-lg blur-md transition-all ${showTransparent ? 'bg-white/10' : 'bg-[#00FFC6]/20'}`} />
                <BookOpen className={`relative h-10 w-10 transform group-hover:scale-110 transition-transform ${showTransparent ? 'text-white' : 'text-gray-700'}`} />
              </div>
              <span className={`text-2xl font-bold transition-colors ${showTransparent ? 'text-white' : 'text-gray-800'}`}>
                EOTY Platform
              </span>
            </Link>

            <div className="flex items-center space-x-4">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    className={`font-medium transition-colors duration-200 ${showTransparent ? 'text-white/90 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-6 py-2.5 rounded-full bg-[#27AE60] text-white hover:bg-[#219150] font-semibold transition-all duration-200 shadow-lg shadow-[#27AE60]/30 hover:shadow-[#27AE60]/50 hover:-translate-y-0.5"
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <Link
                  to={getRoleDashboard()}
                  className="px-6 py-2.5 rounded-full bg-[#27AE60] text-white hover:bg-[#219150] font-semibold transition-all duration-200 shadow-lg shadow-[#27AE60]/30 hover:shadow-[#27AE60]/50 hover:-translate-y-0.5"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {isHomePage && onScrollToSection && (
        <Navigation 
          activeNavTab={activeSection || 'hero'} 
          onScrollToSection={onScrollToSection} 
        />
      )}
    </>
  );
};

export default Header;
