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
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100/90">
      {/* Left side - Better Spaced EOTY Platform Section */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-purple-900/90 to-indigo-900/95">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
            style={{
              backgroundImage: "url('/eoc.jpg')",
              backgroundPosition: 'center center',
              backgroundSize: 'cover',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/70 to-indigo-900/85" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col justify-center items-center text-white w-full p-8">
          <div className={`max-w-md w-full text-center transform transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            {/* Better Spaced Logo Section */}
            <div className="mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-2 font-serif text-white">
                EOTY Platform
              </h1>
              <p className="text-lg opacity-90 text-blue-100">
                Ethiopian Orthodox Teaching Youth
              </p>
            </div>

            {/* Better Spaced Features */}
            <div className="space-y-6 text-center mb-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                  <BookOpen className="w-6 h-6 text-blue-300" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-white text-lg mb-1">Spiritual Learning</h3>
                  <p className="text-blue-100/80 text-sm">Comprehensive Orthodox teachings</p>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-400/30">
                  <Users className="w-6 h-6 text-purple-300" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-white text-lg mb-1">Community</h3>
                  <p className="text-blue-100/80 text-sm">Connect with believers worldwide</p>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-400/30">
                  <Heart className="w-6 h-6 text-green-300" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-white text-lg mb-1">Faith Growth</h3>
                  <p className="text-blue-100/80 text-sm">Guided spiritual journey</p>
                </div>
              </div>
            </div>

            
          </div>
        </div>
      </div>

      {/* Right side - Compact Auth Form (unchanged) */}
      <div className="flex-1 flex flex-col justify-center py-4 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile Logo */}
          <div className={`lg:hidden text-center mb-4 transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white">
                <Shield className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">EOTY Platform</h2>
            <p className="text-gray-600 text-sm">Ethiopian Orthodox Teaching Youth</p>
          </div>

          {/* Compact Auth Card */}
          <div className={`transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="bg-white rounded-lg shadow-md p-5 border border-gray-100">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
                {subtitle && (
                  <p className="text-gray-600 text-sm">{subtitle}</p>
                )}
              </div>

              {children}

              {/* Compact Footer Links */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-center text-xs text-gray-600">
                  {/* <p className="mb-2">
                    By continuing, you agree to our{' '}
                    <Link 
                      to="/terms" 
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link 
                      to="/privacy" 
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Privacy
                    </Link>
                  </p> */}
                  {/* <div className="flex items-center justify-center space-x-1 text-gray-500">
                    <Shield className="w-3 h-3 text-green-500" />
                    <span className="text-xs">Secure & encrypted</span>
                  </div> */}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Features */}
         
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;