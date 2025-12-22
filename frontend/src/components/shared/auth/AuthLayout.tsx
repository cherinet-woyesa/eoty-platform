import React, { useEffect, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { brandColors } from '@/theme/brand';
import Header from '@/components/shared/Landing/Header';
import LanguageSelector from '@/components/common/LanguageSelector';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  footerText?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = memo(({ children, title, subtitle }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      {/* Inline language selector for auth pages (ensures visibility even when nav is minimal) */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector textColor="text-white" />
      </div>
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
        {/* Overlay for better text readability - Indigo brand */}
        <div
          className="absolute inset-0 backdrop-blur-[2px]"
          style={{
            background: `linear-gradient(135deg, rgba(30,27,75,0.82), rgba(49,46,129,0.62), rgba(255,255,255,0.82))`
          }}
        />
      </div>

      {/* Animated Background Elements - Enhanced landing page style */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Primary animated elements - matching landing page */}
        <div 
          className="absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl animate-float opacity-30"
          style={{ 
            background: `linear-gradient(135deg, ${brandColors.primaryHex}33, ${brandColors.accentHex}22)`,
            animationDuration: '10s'
          }}
        />
        <div 
          className="absolute bottom-20 left-1/3 w-80 h-80 rounded-full blur-3xl animate-float opacity-25"
          style={{ 
            background: `linear-gradient(135deg, ${brandColors.accentHex}33, ${brandColors.primaryHex}22)`,
            animationDuration: '12s',
            animationDelay: '4s'
          }}
        />
        {/* Additional subtle elements */}
        <div 
          className="absolute top-1/3 right-16 w-72 h-72 rounded-full blur-2xl animate-pulse opacity-20"
          style={{ 
            background: `linear-gradient(135deg, ${brandColors.primaryHex}25, transparent)`,
            animationDuration: '8s'
          }}
        />
        <div 
          className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full blur-2xl animate-pulse opacity-15"
          style={{ 
            background: `linear-gradient(135deg, ${brandColors.accentHex}25, transparent)`,
            animationDuration: '6s',
            animationDelay: '2s'
          }}
        />
      </div>

      {/* Shared Header */}
      <Header />

      {/* Main Content - Centered Card Design */}
      <div className="relative min-h-screen flex items-center justify-center pt-20 z-10 px-4 py-12">
        <div className={`w-full max-w-md transform transition-all duration-700 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          {/* Auth Card with Enhanced Glassmorphism - Landing Page Style */}
          <div 
            className="relative bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden transform transition-all duration-500 hover:shadow-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              boxShadow: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.6)`
            }}
          >
            {/* Enhanced decorative elements */}
            <div className="absolute inset-0 opacity-50">
              <div 
                className="absolute top-0 left-0 w-full h-1 rounded-t-[2.5rem]"
                style={{ 
                  background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.accentHex}, ${brandColors.primaryHoverHex})`
                }}
              />
              <div 
                className="absolute top-2 left-2 w-32 h-32 rounded-full blur-3xl opacity-30"
                style={{ 
                  background: `radial-gradient(circle, ${brandColors.primaryHex}25, transparent 70%)`
                }}
              />
              <div 
                className="absolute bottom-2 right-2 w-24 h-24 rounded-full blur-2xl opacity-25"
                style={{ 
                  background: `radial-gradient(circle, ${brandColors.accentHex}25, transparent 70%)`
                }}
              />
            </div>
            
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