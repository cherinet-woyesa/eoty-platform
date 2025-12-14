import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface SuccessNotificationModalProps {
  title: string;
  message: string;
  type?: NotificationType;
  progress?: number; // 0-100 for progress bar
  isOpen: boolean;
  onClose?: () => void;
  autoCloseDelay?: number; // in ms, set to 0 to disable auto-close
}

const SuccessNotificationModal: React.FC<SuccessNotificationModalProps> = ({
  title,
  message,
  type = 'success',
  progress,
  isOpen,
  onClose,
  autoCloseDelay = 5000
}) => {
  useEffect(() => {
    if (!isOpen || autoCloseDelay === 0) return;
    
    const timer = setTimeout(() => {
      onClose?.();
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [isOpen, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-12 w-12 text-amber-500" />;
      case 'loading':
        return <Loader className="h-12 w-12 text-blue-500 animate-spin" />;
      case 'info':
      default:
        return <CheckCircle className="h-12 w-12 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-900';
      case 'error':
        return 'text-red-900';
      case 'warning':
        return 'text-amber-900';
      case 'loading':
        return 'text-blue-900';
      case 'info':
      default:
        return 'text-blue-900';
    }
  };

  const getProgressBarColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      case 'warning':
        return 'bg-amber-600';
      case 'loading':
        return 'bg-blue-600';
      case 'info':
      default:
        return 'bg-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className={`bg-white rounded-2xl shadow-2xl border p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-300 ${getBackgroundColor()}`}>
        {/* Close Button */}
        {type !== 'loading' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Content */}
        <div className="flex flex-col items-center text-center space-y-4">
          {getIcon()}

          <div className="space-y-2">
            <h2 className={`text-xl font-bold ${getTitleColor()}`}>
              {title}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          {/* Progress Bar (if progress is provided) */}
          {progress !== undefined && (
            <div className="w-full mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">{progress}%</p>
            </div>
          )}

          {/* Loading spinner text */}
          {type === 'loading' && (
            <p className="text-xs text-gray-500 animate-pulse">
              Please wait...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuccessNotificationModal;
