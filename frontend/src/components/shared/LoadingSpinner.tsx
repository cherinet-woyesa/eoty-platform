import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'logo';
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'md',
  variant = 'logo',
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const renderContent = () => {
    if (variant === 'logo') {
      return (
        <div className="relative flex flex-col items-center justify-center">
          <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
            {/* Spinning outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-brand-primary border-t-transparent animate-spin"></div>

            {/* Static Logo */}
            <div className="absolute inset-1.5 rounded-full overflow-hidden bg-white shadow-sm">
              <img
                src="/eoc.jpg"
                alt="Loading..."
                className="w-full h-full object-cover opacity-90"
              />
            </div>
          </div>

          {message && (
            <p className="mt-4 font-medium text-center animate-pulse text-sm text-stone-600">
              {message}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-6 text-brand-primary">
        <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
        {message && <p className="mt-3 text-slate-500 text-sm">{message}</p>}
      </div>
    );
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full h-full">
      {renderContent()}
    </div>
  );
};

export default LoadingSpinner;
