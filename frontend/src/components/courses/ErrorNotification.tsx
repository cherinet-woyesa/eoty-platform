// frontend/src/components/courses/ErrorNotification.tsx
import type { FC } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

interface ErrorNotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  recoveryAction?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const ErrorNotification: FC<ErrorNotificationProps> = ({
  type,
  title,
  message,
  recoveryAction,
  onDismiss,
  autoHide = false,
  autoHideDelay = 5000
}) => {
  // Auto-hide functionality
  if (autoHide && onDismiss) {
    setTimeout(() => {
      onDismiss();
    }, autoHideDelay);
  }

  // Get icon based on type
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      case 'success':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  // Get colors based on type
  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: 'text-green-600',
          button: 'bg-green-600 hover:bg-green-700'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: 'text-gray-600',
          button: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`${colors.bg} ${colors.border} border-l-4 p-4 rounded-lg shadow-lg animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className={`flex-shrink-0 ${colors.icon}`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-semibold ${colors.text}`}>
            {title}
          </h3>
          <p className={`mt-1 text-sm ${colors.text} opacity-90`}>
            {message}
          </p>

          {/* Recovery action button */}
          {recoveryAction && (
            <div className="mt-3">
              <button
                onClick={recoveryAction.onClick}
                className={`${colors.button} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
              >
                {recoveryAction.label}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ml-3 ${colors.icon} hover:opacity-70 transition-opacity`}
            aria-label="Dismiss notification"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorNotification;
