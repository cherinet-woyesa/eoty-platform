import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingButtonProps {
  children: React.ReactNode;
  isLoading: boolean;
  disabled?: boolean;
  type?: 'submit' | 'button' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loadingText?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = memo(({
  children,
  isLoading,
  disabled = false,
  type = 'submit',
  variant = 'primary',
  size = 'md',
  loadingText,
  icon,
  onClick,
  className = '',
}) => {
  // Determine variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return `
          text-white 
          bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 
          hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 
          active:from-blue-800 active:via-indigo-800 active:to-purple-800
          focus:ring-4 focus:ring-blue-500/30
          shadow-lg hover:shadow-2xl
          transform hover:scale-[1.02] active:scale-[0.98]
          font-bold
          relative overflow-hidden
          before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0
          before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700
        `;
      case 'secondary':
        return `
          text-gray-700 
          bg-gray-100 
          hover:bg-gray-200 
          active:bg-gray-300
          focus:ring-2 focus:ring-gray-500/50
          border border-gray-300
        `;
      case 'outline':
        return `
          text-blue-600 
          bg-white 
          border-2 border-blue-600 
          hover:bg-blue-50 
          active:bg-blue-100
          focus:ring-2 focus:ring-blue-500/50
        `;
      default:
        return '';
    }
  };

  // Determine size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-2 px-3 text-xs sm:text-sm min-h-[40px]';
      case 'md':
        return 'py-3 sm:py-3.5 px-5 text-sm sm:text-base min-h-[48px] sm:min-h-[52px]';
      case 'lg':
        return 'py-3.5 sm:py-4 px-6 text-base sm:text-lg min-h-[52px] sm:min-h-[56px]';
      default:
        return 'py-3 sm:py-3.5 px-5 text-sm sm:text-base min-h-[48px] sm:min-h-[52px]';
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        w-full 
        flex 
        justify-center 
        items-center 
        border border-transparent 
        rounded-lg 
        font-semibold 
        focus:outline-none 
        focus:ring-2 
        focus:ring-offset-2 
        disabled:opacity-50 
        disabled:cursor-not-allowed 
        transition-all 
        duration-200
        disabled:transform-none
        disabled:hover:shadow-lg
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${className}
      `}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
      aria-live="polite"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" aria-hidden="true" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {icon && <span aria-hidden="true">{icon}</span>}
        </>
      )}
    </button>
  );
});

LoadingButton.displayName = 'LoadingButton';

export default LoadingButton;
