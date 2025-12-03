import React, { useEffect, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Sparkles, Shield } from 'lucide-react';
import Header from '@/components/shared/Landing/Header';

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

      {/* Animated Background Elements - Updated with Green Theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-30">
        <div
          className="absolute top-20 left-10 w-72 h-72 bg-[#27AE60]/5 rounded-full blur-3xl"
        />
        <div
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-[#16A085]/5 rounded-full blur-3xl"
        />
      </div>

      {/* Shared Header */}
      <Header />

      {/* Main Content - Centered Card Design */}
      <div className="relative min-h-screen flex items-center justify-center pt-20 z-10 px-4 py-12">
        <div className={`w-full max-w-md transform transition-all duration-700 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          {/* Auth Card with Glassmorphism */}
          <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden relative">
            {/* Decorative top gradient */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#27AE60] via-[#2ECC71] to-[#16A085]" />
            
            {/* Header Section */}
            <div className="px-8 pt-10 pb-6 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="relative w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center shadow-sm border border-gray-100 overflow-hidden">
                    <img src="/eoc.jpg" alt="Logo" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Form Content */}
            <div className="px-8 pb-10">
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
                  <Shield className="h-4 w-4 text-[#27AE60]" />
                  <span className="font-medium">Secure & encrypted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info Card */}
          <div className={`mt-6 text-center transform transition-all duration-700 delay-200 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            
          </div>
        </div>
      </div>
    </div>
  );
});

AuthLayout.displayName = 'AuthLayout';

export default AuthLayout;