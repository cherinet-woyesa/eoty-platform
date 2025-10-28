import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Heart, BookOpen, Users, Star } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Left side - Enhanced Background with Features */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
          <div className="absolute inset-0 bg-[url('/eoc.jpg')] bg-cover bg-center bg-no-repeat opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-purple-900/70 to-indigo-900/70" />
        </div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-16 left-16 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute top-32 right-24 w-20 h-20 bg-blue-400/20 rounded-full blur-lg animate-bounce" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-24 left-12 w-32 h-32 bg-purple-400/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-6">
          <div className={`max-w-md text-center transform transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            {/* Logo */}
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-3 font-serif bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                EOTY Platform
              </h1>
              <p className="text-lg opacity-90 font-medium">
                Ethiopian Orthodox Teaching Youth
              </p>
            </div>

            {/* Features - Compact */}
            <div className="space-y-4 text-left">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Spiritual Learning</h3>
                  <p className="text-blue-100 text-xs">Comprehensive Orthodox teachings</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Community</h3>
                  <p className="text-blue-100 text-xs">Connect with believers</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-green-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Faith Growth</h3>
                  <p className="text-blue-100 text-xs">Guided spiritual journey</p>
                </div>
              </div>
            </div>

            {/* Trust Indicators - Compact */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="flex items-center justify-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-yellow-200">4.9/5</span>
                </div>
                <div className="w-px h-3 bg-white/30" />
                <div className="text-blue-200">10K+ Students</div>
                <div className="w-px h-3 bg-white/30" />
                <div className="text-blue-200">50+ Chapters</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Enhanced Auth Form */}
      <div className="flex-1 flex flex-col justify-center py-4 px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo */}
          <div className={`lg:hidden text-center mb-6 transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-2xl">
                <Shield className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">EOTY Platform</h2>
            <p className="text-gray-600">Ethiopian Orthodox Teaching Youth</p>
          </div>

          {/* Auth Content */}
          <div className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
              {subtitle && (
                <p className="text-gray-600 leading-relaxed">{subtitle}</p>
              )}
            </div>

            {children}

            {/* Enhanced Footer Links - Compact */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-center text-xs text-gray-600">
                <p className="mb-2">
                  By continuing, you agree to our{' '}
                  <Link 
                    to="/terms" 
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                    aria-label="Read our Terms of Service"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link 
                    to="/privacy" 
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                    aria-label="Read our Privacy Policy"
                  >
                    Privacy Policy
                  </Link>
                </p>
                <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                  <Shield className="w-3 h-3" />
                  <span>Your data is secure and encrypted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Mobile Features - Compact */}
          <div className="lg:hidden mt-4 text-center">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span>4.9/5</span>
              </div>
              <div className="w-px h-3 bg-gray-300" />
              <div>10K+ Students</div>
              <div className="w-px h-3 bg-gray-300" />
              <div>50+ Chapters</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;