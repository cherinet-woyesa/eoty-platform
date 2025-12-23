// frontend/src/components/courses/ErrorNotification.tsx
import type { FC } from 'react';
import { AlertCircle, AlertTriangle, Info, X, CheckCircle } from 'lucide-react';
import { brandColors } from '@/theme/brand';

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
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  // Get styles based on type
  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          className: 'bg-red-50 border-red-200 border-l-red-600',
          textClass: 'text-red-800',
          iconClass: 'text-red-600',
          buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'warning':
        return {
          className: 'bg-yellow-50 border-yellow-200 border-l-yellow-600',
          textClass: 'text-yellow-800',
          iconClass: 'text-yellow-600',
          buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
      case 'info':
        return {
          style: {
            backgroundColor: `${brandColors.primaryHex}10`,
            borderColor: `${brandColors.primaryHex}30`,
            borderLeftColor: brandColors.primaryHex
          },
          textStyle: { color: '#1e2a55' },
          iconStyle: { color: brandColors.primaryHex },
          buttonStyle: { backgroundColor: brandColors.primaryHex, color: 'white' }
        };
      case 'success':
        return {
          style: {
            backgroundColor: `${brandColors.accentHex}10`,
            borderColor: `${brandColors.accentHex}30`,
            borderLeftColor: brandColors.accentHex
          },
          textStyle: { color: '#1e2a55' },
          iconStyle: { color: brandColors.accentHex },
          buttonStyle: { backgroundColor: brandColors.accentHex, color: 'white' }
        };
      default:
        return {
          className: 'bg-gray-50 border-gray-200 border-l-gray-600',
          textClass: 'text-gray-800',
          iconClass: 'text-gray-600',
          buttonClass: 'bg-gray-600 hover:bg-gray-700 text-white'
        };
    }
  };

  const styles = getStyles();
  const isCustom = 'style' in styles;

  return (
    <div
      className={`border-l-4 p-4 rounded-lg shadow-lg animate-slide-in-right ${!isCustom ? (styles as any).className : ''}`}
      style={isCustom ? (styles as any).style : {}}
      role="alert"
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className={`flex-shrink-0 ${!isCustom ? (styles as any).iconClass : ''}`} style={isCustom ? (styles as any).iconStyle : {}}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-semibold ${!isCustom ? (styles as any).textClass : ''}`} style={isCustom ? (styles as any).textStyle : {}}>
            {title}
          </h3>
          <p className={`mt-1 text-sm opacity-90 ${!isCustom ? (styles as any).textClass : ''}`} style={isCustom ? (styles as any).textStyle : {}}>
            {message}
          </p>

          {/* Recovery action button */}
          {recoveryAction && (
            <div className="mt-3">
              <button
                onClick={recoveryAction.onClick}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!isCustom ? (styles as any).buttonClass : ''}`}
                style={isCustom ? (styles as any).buttonStyle : {}}
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
            className={`flex-shrink-0 ml-3 hover:opacity-70 transition-opacity ${!isCustom ? (styles as any).iconClass : ''}`}
            style={isCustom ? (styles as any).iconStyle : {}}
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
