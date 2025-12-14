import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { brandColors } from '@/theme/brand';

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
  const brandVars = {
    ['--brand' as any]: brandColors.primaryHex,
    ['--brand-hover' as any]: brandColors.primaryHoverHex,
    ['--brand-accent' as any]: brandColors.accentHex,
  };

  // Determine variant styles using brand palette
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return `
          text-white 
          bg-[color:var(--brand)]
          hover:bg-[color:var(--brand-hover)]
          active:bg-[color:var(--brand-hover)]
          focus:ring-4 focus:ring-[color:var(--brand)]/30
          shadow-lg hover:shadow-xl hover:shadow-[rgba(30,27,75,0.35)]
          transform hover:-translate-y-0.5 active:translate-y-0
          font-bold
          relative overflow-hidden
          transition-all duration-200
        `;
      case 'secondary':
        return `
          text-[color:var(--brand)]
          bg-white/95
          backdrop-blur-sm
          hover:bg-white 
          active:bg-slate-50
          focus:ring-2 focus:ring-[color:var(--brand)]/20
          border-2 border-[color:var(--brand)]/30 hover:border-[color:var(--brand-hover)]/40
        `;
      case 'outline':
        return `
          text-[color:var(--brand)]
          bg-transparent
          border-2 border-[color:var(--brand)]
          hover:bg-[color:var(--brand)]/5 
          active:bg-[color:var(--brand)]/10
          focus:ring-2 focus:ring-[color:var(--brand)]/20
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
      style={brandVars}
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
