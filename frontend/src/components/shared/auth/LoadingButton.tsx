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
          bg-[#27AE60]
          hover:bg-[#219150]
          active:bg-[#1e8449]
          focus:ring-4 focus:ring-[#27AE60]/30
          shadow-lg hover:shadow-xl hover:shadow-[#27AE60]/20
          transform hover:-translate-y-0.5 active:translate-y-0
          font-bold
          relative overflow-hidden
          transition-all duration-200
        `;
      case 'secondary':
        return `
          text-slate-700 
          bg-white/90 
          backdrop-blur-sm
          hover:bg-white 
          active:bg-slate-50
          focus:ring-2 focus:ring-slate-500/50
          border-2 border-slate-300/50 hover:border-slate-400/50
        `;
      case 'outline':
        return `
          text-[#00FFC6] 
          bg-white/90 
          backdrop-blur-sm
          border-2 border-[#00FFC6] 
          hover:bg-[#00FFC6]/10 
          active:bg-[#00FFC6]/20
          focus:ring-2 focus:ring-[#00FFC6]/50
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
