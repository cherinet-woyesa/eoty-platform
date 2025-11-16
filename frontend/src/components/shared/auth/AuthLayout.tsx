import React, { useEffect, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, Sparkles, Shield } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = memo(({ children, title, subtitle }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      {/* Background Image with Overlay - Same as Landing Page */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/eoc.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay for better text readability - Same as Landing Page */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FEFCF8]/85 via-[#FAF8F3]/80 to-[#F5F3ED]/85 backdrop-blur-[2px]" />
      </div>

      {/* Animated Background Elements - Same as Landing Page */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute top-20 left-10 w-72 h-72 bg-[#00FFC6]/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '0s', animationDuration: '4s' }}
        />
        <div 
          className="absolute top-40 right-20 w-96 h-96 bg-[#FFD700]/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s', animationDuration: '5s' }}
        />
        <div 
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-[#00FFFF]/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s', animationDuration: '6s' }}
        />
      </div>

      {/* Header - Same as Landing Page */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: 'rgba(254, 252, 248, 0.90)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          borderBottom: '1px solid rgba(220, 220, 220, 0.3)'
        }}
      >
        <div className="w-full">
          <div className="flex justify-between items-center py-4 px-4 lg:px-6">
            <Link to="/" className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-[#00FFC6]/15 rounded-lg blur-md group-hover:blur-lg transition-all" />
                <BookOpen className="relative h-10 w-10 text-[#00FFC6] transform group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-2xl font-bold text-slate-700">
                EOTY Platform
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              {title === "Welcome back" ? (
                <Link
                  to="/register"
                  className="text-slate-600 hover:text-slate-800 font-medium transition-all duration-200 hover:scale-105"
                >
                  Sign Up
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="text-slate-600 hover:text-slate-800 font-medium transition-all duration-200 hover:scale-105"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Centered Card Design */}
      <div className="relative min-h-screen flex items-center justify-center pt-20 z-10 px-4 py-12">
        <div className={`w-full max-w-md transform transition-all duration-700 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          {/* Auth Card with Glassmorphism */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-slate-50/90 via-stone-50/90 to-slate-100/90 backdrop-blur-sm px-8 pt-8 pb-6 text-center border-b border-slate-200/50">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#00FFC6]/20 rounded-2xl blur-lg" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00FFC6]/20 to-[#4FC3F7]/15 flex items-center justify-center border border-[#00FFC6]/30 backdrop-blur-sm">
                    <BookOpen className="h-8 w-8 text-[#00FFC6]" />
                  </div>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-700 mb-2">
                {title}
              </h2>
              {subtitle && (
                <p className="text-slate-600 text-base">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Form Content */}
            <div className="p-8">
              {children}

              {/* Back to landing */}
              <div className="mt-4 text-center">
                <Link
                  to="/"
                  className="text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  ← Back to landing page
                </Link>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-6 border-t border-slate-200/50">
                <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
                  <Shield className="h-4 w-4 text-[#00FFC6]" />
                  <span className="font-medium">Secure & encrypted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info Card */}
          <div className={`mt-6 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/40 transform transition-all duration-700 delay-200 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <div className="flex items-center justify-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#00FFC6]/20 rounded-lg backdrop-blur-sm">
                  <Heart className="h-4 w-4 text-[#00FFC6]" />
                </div>
                <span className="font-medium">Faith-Centered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#4FC3F7]/20 rounded-lg backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-[#4FC3F7]" />
                </div>
                <span className="font-medium">Community-Driven</span>
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