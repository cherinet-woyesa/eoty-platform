import React, { useEffect, useState, memo } from 'react';
import { Shield, Heart, BookOpen, Users } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = memo(({ children, title, subtitle }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [bgImageLoaded, setBgImageLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Lazy load background image
  useEffect(() => {
    const img = new Image();
    img.src = '/eoc.jpg';
    img.onload = () => {
      setBgImageLoaded(true);
    };
    img.onerror = () => {
      // Fallback: still set to true to show gradient
      setBgImageLoaded(true);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100/90 transition-all duration-300">
      {/* Decorative Sidebar - Hidden on mobile (< 768px), compact on tablet (768-1024px), full on desktop (> 1024px) */}
      <div className="hidden md:flex md:w-2/5 lg:flex-1 relative overflow-hidden">
        {/* Background with lazy loading */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-purple-900/90 to-indigo-900/95">
          {bgImageLoaded && (
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-0 animate-in fade-in duration-700"
              style={{
                backgroundImage: "url('/eoc.jpg')",
                backgroundPosition: 'center center',
                backgroundSize: 'cover',
                opacity: 0.2,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/70 to-indigo-900/85" />
        </div>

        {/* Content Container - Responsive padding */}
        <div className="relative z-10 flex flex-col justify-center items-center text-white w-full p-6 md:p-8 lg:p-12">
          <div className={`max-w-md w-full text-center transform transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            {/* Logo Section - Responsive sizing */}
            <div className="mb-6 md:mb-8">
              <div className="flex justify-center mb-3 md:mb-4">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg transition-all duration-300">
                  <Shield className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 font-serif text-white transition-all duration-300">
                EOTY Platform
              </h1>
              <p className="text-base md:text-lg opacity-90 text-blue-100 transition-all duration-300">
                Ethiopian Orthodox Teaching Youth
              </p>
            </div>

            {/* Features - Responsive spacing and sizing, simplified on tablet */}
            <div className="space-y-5 md:space-y-4 lg:space-y-6 text-center mb-4 md:mb-6">
              <div className="flex flex-col items-center space-y-2 transition-all duration-300">
                <div className="w-10 h-10 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                  <BookOpen className="w-5 h-5 md:w-5 md:h-5 lg:w-6 lg:h-6 text-blue-300" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-white text-base md:text-base lg:text-lg mb-1">Spiritual Learning</h3>
                  <p className="text-blue-100/80 text-xs md:text-xs lg:text-sm hidden lg:block">Comprehensive Orthodox teachings</p>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-2 transition-all duration-300">
                <div className="w-10 h-10 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-400/30">
                  <Users className="w-5 h-5 md:w-5 md:h-5 lg:w-6 lg:h-6 text-purple-300" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-white text-base md:text-base lg:text-lg mb-1">Community</h3>
                  <p className="text-blue-100/80 text-xs md:text-xs lg:text-sm hidden lg:block">Connect with believers worldwide</p>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-2 transition-all duration-300">
                <div className="w-10 h-10 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-400/30">
                  <Heart className="w-5 h-5 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-300" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-white text-base md:text-base lg:text-lg mb-1">Faith Growth</h3>
                  <p className="text-blue-100/80 text-xs md:text-xs lg:text-sm hidden lg:block">Guided spiritual journey</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container - Mobile-first responsive layout */}
      <div className="flex-1 flex flex-col justify-center py-6 px-4 sm:py-8 sm:px-6 md:px-8 lg:px-12 transition-all duration-300">
        <div className="mx-auto w-full max-w-sm md:max-w-md">
          {/* Auth Card - Responsive padding and spacing */}
          <div className={`transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="bg-white rounded-xl shadow-lg md:shadow-xl overflow-hidden border border-gray-100 transition-all duration-300">
              {/* Compact Mobile Header - Only visible on mobile (< 768px) */}
              <div className="md:hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 py-6 px-5 text-center">
                <div className="flex items-center justify-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-white/25 backdrop-blur-sm flex items-center justify-center text-white shadow-lg border border-white/40">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {title === "Welcome back" ? "Welcome" : "Join Us"}
                  </h2>
                </div>
                <p className="text-blue-100 text-base font-medium">
                  {title === "Welcome back" ? "Sign in to EOYP" : "Create your EOYP account"}
                </p>
              </div>

              {/* Form Content */}
              <div className="p-5 sm:p-6 md:p-8">
                {/* Title section - Hidden on mobile, shown on tablet/desktop */}
                <div className="hidden md:block text-center mb-5 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl md:text-2xl font-bold text-gray-900 mb-2 transition-all duration-300">{title}</h2>
                  {subtitle && (
                    <p className="text-gray-600 text-sm sm:text-base transition-all duration-300">{subtitle}</p>
                  )}
                </div>

                {children}

                {/* Footer - Responsive spacing, minimal on mobile */}
                <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-gray-200">
                  <div className="text-center text-xs text-gray-600">
                    <div className="flex items-center justify-center space-x-1.5 text-gray-500">
                      <Shield className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs font-medium">Secure & encrypted</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AuthLayout.displayName = 'AuthLayout';

export default AuthLayout;