import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navigation from './Navigation';
import LanguageSelector from '@/components/common/LanguageSelector';
import { brandColors } from '@/theme/brand';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  activeSection?: string;
  onScrollToSection?: (sectionId: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeSection, onScrollToSection }) => {
  const { isAuthenticated, getRoleDashboard } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { t } = useTranslation();

  useEffect(() => {
    let ticking = false;

    const updateScrollState = () => {
      setIsScrolled(window.scrollY > 20);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollState);
        ticking = true;
      }
    };

    updateScrollState(); // initialize based on current position
    window.addEventListener('scroll', handleScroll, { passive: true });
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
          <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 gap-2">
            <Link to="/" className="flex items-center space-x-3 group cursor-pointer min-w-0">
              <div className="relative flex-shrink-0">
                <div className={`absolute inset-0 rounded-lg blur-md transition-all ${showTransparent ? 'bg-white/10' : 'bg-[color:var(--brand)]/12'}`} style={{ ['--brand' as any]: brandColors.primaryHex }} />
                <img src="/eoc.jpg" alt="EOTY Logo" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover transform group-hover:scale-110 transition-transform" />
              </div>
              <span className={`text-xl sm:text-2xl font-bold truncate transition-colors ${showTransparent ? 'text-white' : 'text-gray-800'}`}>
                EOTY Platform
              </span>
            </Link>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="hidden xs:block">
                <LanguageSelector textColor={showTransparent ? 'text-white' : 'text-gray-700'} />
              </div>
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    className={`text-sm sm:text-base font-medium transition-colors duration-200 ${showTransparent ? 'text-white/90 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {t('landing.header.sign_in')}
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    style={{
                      backgroundColor: brandColors.primaryHex,
                      color: brandColors.textOnPrimary,
                      boxShadow: `0 10px 30px ${brandColors.primaryHex}33`
                    }}
                  >
                    {t('landing.header.sign_up')}
                  </Link>
                </>
              ) : (
                <Link
                  to={getRoleDashboard()}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  style={{
                    backgroundColor: brandColors.primaryHex,
                    color: brandColors.textOnPrimary,
                    boxShadow: `0 10px 30px ${brandColors.primaryHex}33`
                  }}
                >
                  {t('landing.header.dashboard')}
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
