import React, { memo, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

export interface FormErrorProps {
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  onDismiss?: () => void;
  dismissible?: boolean;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
  size?: 'sm' | 'md' | 'lg';
}

const FormError: React.FC<FormErrorProps> = memo(({
  message,
  type = 'error',
  onDismiss,
  dismissible = false,
  autoDismiss = false,
  autoDismissDelay = 5000,
  size = 'md',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss functionality
  useEffect(() => {
    if (autoDismiss && dismissible && onDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, dismissible, onDismiss, autoDismissDelay]);

  // Handle manual dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  // Don't render if not visible (for auto-dismiss)
  if (!isVisible) return null;

  // Determine styling based on type and size
  const getStyles = () => {
    const sizeClasses = {
      sm: {
        padding: 'px-3 py-2',
        icon: 'h-4 w-4',
        text: 'text-sm',
        border: 'border-1',
      },
      md: {
        padding: 'px-4 sm:px-5 py-3 sm:py-4',
        icon: 'h-5 w-5 sm:h-6 sm:w-6',
        text: 'text-sm sm:text-base',
        border: 'border-2',
      },
      lg: {
        padding: 'px-6 py-5',
        icon: 'h-6 w-6',
        text: 'text-base',
        border: 'border-2',
      },
    };

    const currentSize = sizeClasses[size];

    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: `border-red-300 ${currentSize.border}`,
          text: `text-red-900 ${currentSize.text}`,
          iconColor: 'text-red-600',
          icon: <AlertCircle className={`${currentSize.icon} flex-shrink-0`} />,
          shadow: 'shadow-md shadow-red-100/50',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: `border-amber-300 ${currentSize.border}`,
          text: `text-amber-900 ${currentSize.text}`,
          iconColor: 'text-amber-600',
          icon: <AlertTriangle className={`${currentSize.icon} flex-shrink-0`} />,
          shadow: 'shadow-md shadow-amber-100/50',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: `border-blue-300 ${currentSize.border}`,
          text: `text-blue-900 ${currentSize.text}`,
          iconColor: 'text-blue-600',
          icon: <Info className={`${currentSize.icon} flex-shrink-0`} />,
          shadow: 'shadow-md shadow-blue-100/50',
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: `border-green-300 ${currentSize.border}`,
          text: `text-green-900 ${currentSize.text}`,
          iconColor: 'text-green-600',
          icon: <CheckCircle className={`${currentSize.icon} flex-shrink-0`} />,
          shadow: 'shadow-md shadow-green-100/50',
        };
      default:
        return {
          bg: 'bg-red-50',
          border: `border-red-300 ${currentSize.border}`,
          text: `text-red-900 ${currentSize.text}`,
          iconColor: 'text-red-600',
          icon: <AlertCircle className={`${currentSize.icon} flex-shrink-0`} />,
          shadow: 'shadow-md shadow-red-100/50',
        };
    }
  };

  const styles = getStyles();

  const getRoundedClasses = () => {
    switch (size) {
      case 'sm': return 'rounded-md';
      case 'md': return 'rounded-lg sm:rounded-xl';
      case 'lg': return 'rounded-xl';
      default: return 'rounded-lg sm:rounded-xl';
    }
  };

  return (
    <div
      className={`
        ${styles.bg}
        ${styles.border}
        ${styles.text}
        ${styles.shadow}
        ${getRoundedClasses()}
        ${size === 'sm' ? 'px-3 py-2' : size === 'lg' ? 'px-6 py-5' : 'px-4 sm:px-5 py-3 sm:py-4'}
        flex items-start
        animate-in slide-in-from-top-2 duration-300
        font-medium
        ${!isVisible ? 'animate-out slide-out-to-top-2 duration-200' : ''}
      `}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {/* Icon */}
      <div className={`mr-3 mt-0.5 ${styles.iconColor}`} aria-hidden="true">
        {styles.icon}
      </div>

      {/* Message */}
      <div className={`flex-1 leading-relaxed ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm sm:text-base'}`}>
        <p>{message}</p>
      </div>

      {/* Dismiss Button */}
      {dismissible && (onDismiss || autoDismiss) && (
        <button
          type="button"
          onClick={handleDismiss}
          className={`
            ml-3
            flex-shrink-0
            inline-flex
            rounded-lg
            p-1.5
            ${styles.text}
            hover:bg-black/10
            focus:outline-none
            focus:ring-2
            focus:ring-offset-2
            focus:ring-${type === 'error' ? 'red' : type === 'warning' ? 'amber' : type === 'success' ? 'green' : 'blue'}-500
            transition-colors
            min-w-[44px]
            min-h-[44px]
            items-center
            justify-center
            opacity-70 hover:opacity-100
          `}
          aria-label="Dismiss message"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

FormError.displayName = 'FormError';

export default FormError;
