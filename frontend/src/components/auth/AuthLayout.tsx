import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Background Imag*/}
      <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-blue-900 to-purple-900">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: 'url("/eoc.jpg")' }}
        />
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="max-w-md text-center">
            <h1 className="text-4xl font-bold mb-4 font-serif">EOTY Platform</h1>
            <p className="text-xl opacity-90">
              Ethiopian Orthodox Teaching Youth Platform
            </p>
            <p className="mt-4 text-lg opacity-80">
              Join our faith-based learning community and grow spiritually
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                EOTY
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">EOTY Platform</h2>
            <p className="text-gray-600 mt-2">Ethiopian Orthodox Teaching Youth</p>
          </div>

          {/* Auth Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
              {subtitle && (
                <p className="mt-2 text-gray-600">{subtitle}</p>
              )}
            </div>

            {children}

            {/* Footer Links */}
            <div className="mt-8 text-center text-sm text-gray-600">
              <p>
                By continuing, you agree to our{' '}
                <Link to="/terms" className="text-blue-600 hover:text-blue-500 font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-blue-600 hover:text-blue-500 font-medium">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;