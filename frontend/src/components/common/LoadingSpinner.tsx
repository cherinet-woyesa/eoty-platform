import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  overlay?: boolean;
  fullScreen?: boolean;
  color?: 'primary' | 'secondary' | 'white';
  variant?: 'spinner' | 'logo';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text, 
  className = '',
  overlay = false,
  fullScreen = false,
  color = 'primary',
  variant
}) => {
  // Determine if we should show the logo variant
  // Default to logo for large/fullscreen loaders unless specified otherwise
  const showLogo = variant === 'logo' || (!variant && (size === 'lg' || size === 'xl' || fullScreen));

  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-16 w-16', // Increased for logo visibility
    xl: 'h-24 w-24'  // Increased for logo visibility
  };

  const colorClasses = {
    primary: 'text-blue-600 border-blue-600',
    secondary: 'text-gray-600 border-gray-600',
    white: 'text-white border-white'
  };

  const renderContent = () => {
    if (showLogo) {
      return (
        <div className={`relative flex flex-col items-center justify-center ${className}`}>
          <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
            {/* Spinning outer ring */}
            <div className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${colorClasses[color].split(' ')[1] || 'border-blue-600'}`}></div>
            
            {/* Static Logo */}
            <div className="absolute inset-2 rounded-full overflow-hidden bg-white shadow-sm">
              <img 
                src="/eoc.jpg" 
                alt="Loading..." 
                className="w-full h-full object-cover opacity-90"
              />
            </div>
          </div>
          
          {text && (
            <p className={`mt-4 font-medium text-center animate-pulse ${
              size === 'xs' || size === 'sm' ? 'text-xs' : 'text-sm'
            } ${
              color === 'white' ? 'text-white' : 'text-stone-600'
            }`}>
              {text}
            </p>
          )}
        </div>
      );
    }

    // Standard spinner for smaller sizes
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <Loader2 
          className={`animate-spin ${sizeClasses[size]} ${colorClasses[color].split(' ')[0]}`} 
        />
        {text && (
          <p className={`mt-2 text-center max-w-xs ${
            size === 'xs' || size === 'sm' ? 'text-xs' : 'text-sm'
          } ${
            color === 'white' ? 'text-white' : 'text-gray-600'
          }`}>
            {text}
          </p>
        )}
      </div>
    );
  };

  if (overlay) {
    return (
      <div className={`fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 ${
        fullScreen ? 'min-h-screen' : ''
      }`}>
        {renderContent()}
      </div>
    );
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-stone-50 via-white to-stone-50 z-50">
        {renderContent()}
      </div>
    );
  }

  return renderContent();
};

// Skeleton loader component
export const SkeletonLoader: React.FC<{
  type?: 'card' | 'text' | 'image' | 'circle';
  count?: number;
  className?: string;
}> = ({ type = 'text', count = 1, className = '' }) => {
  const skeletons = Array.from({ length: count }, (_, i) => {
    switch (type) {
      case 'card':
        return (
          <div key={i} className={`bg-gray-200 rounded-lg animate-pulse ${className}`}>
            <div className="h-32 bg-gray-300 rounded-t-lg"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-full"></div>
              <div className="h-3 bg-gray-300 rounded w-2/3"></div>
            </div>
          </div>
        );
      case 'image':
        return (
          <div key={i} className={`bg-gray-200 rounded-lg animate-pulse ${className}`}>
            <div className="w-full h-full bg-gray-300 rounded-lg"></div>
          </div>
        );
      case 'circle':
        return (
          <div key={i} className={`bg-gray-200 rounded-full animate-pulse ${className}`}></div>
        );
      case 'text':
      default:
        return (
          <div key={i} className={`space-y-2 ${className}`}>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
          </div>
        );
    }
  });

  return <>{skeletons}</>;
};

// Progress bar component
export const ProgressBar: React.FC<{
  progress: number;
  className?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ progress, className = '', color = 'blue', showLabel = false, size = 'md' }) => {
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${heightClasses[size]}`}>
        <div 
          className={`${colorClasses[color]} ${heightClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

export default LoadingSpinner;