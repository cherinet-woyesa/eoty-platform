import React, { memo } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface FormErrorProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
  dismissible?: boolean;
}

const FormError: React.FC<FormErrorProps> = memo(({
  message,
  type = 'error',
  onDismiss,
  dismissible = false,
}) => {
  // Determine styling based on type
  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-900',
          iconColor: 'text-red-600',
          icon: <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />,
          shadow: 'shadow-md shadow-red-100/50',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-300',
          text: 'text-amber-900',
          iconColor: 'text-amber-600',
          icon: <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />,
          shadow: 'shadow-md shadow-amber-100/50',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-900',
          iconColor: 'text-blue-600',
          icon: <Info className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />,
          shadow: 'shadow-md shadow-blue-100/50',
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-900',
          iconColor: 'text-red-600',
          icon: <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />,
          shadow: 'shadow-md shadow-red-100/50',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`
        ${styles.bg} 
        border-2 ${styles.border} 
        ${styles.text} 
        ${styles.shadow}
        px-4 sm:px-5 
        py-3 sm:py-4 
        rounded-lg sm:rounded-xl 
        flex items-start 
        animate-in slide-in-from-top-2 duration-300
        font-medium
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
      <div className="flex-1 text-sm sm:text-base leading-relaxed">
        <p>{message}</p>
      </div>

      {/* Dismiss Button */}
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
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
            focus:ring-${type === 'error' ? 'red' : type === 'warning' ? 'amber' : 'blue'}-500
            transition-colors
            min-w-[44px]
            min-h-[44px]
            items-center
            justify-center
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
