import { AlertCircle, X, RefreshCw, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { formatErrorForDisplay, isRetryableError, retryWithBackoff } from '@/utils/errorHandler';

interface ErrorAlertProps {
  error: any;
  onDismiss?: () => void;
  onRetry?: () => Promise<void>;
  title?: string;
  className?: string;
  showRetry?: boolean;
}

type AlertType = 'error' | 'warning' | 'info' | 'success';

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onDismiss,
  onRetry,
  title,
  className = '',
  showRetry = true
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const errorMessage = formatErrorForDisplay(error);
  const retryable = showRetry && isRetryableError(error) && onRetry;
  
  let alertType: AlertType = 'error';
  let Icon = AlertCircle;
  let bgColor = 'bg-red-50/50 border-red-200';
  let textColor = 'text-red-700';
  let iconColor = 'text-red-600';

  // Determine alert type based on error
  if (error?.code === 'WARNING' || error?.severity === 'warning') {
    alertType = 'warning';
    Icon = AlertTriangle;
    bgColor = 'bg-yellow-50/50 border-yellow-200';
    textColor = 'text-yellow-700';
    iconColor = 'text-yellow-600';
  } else if (error?.code === 'INFO' || error?.severity === 'info') {
    alertType = 'info';
    Icon = Info;
    bgColor = 'bg-blue-50/50 border-blue-200';
    textColor = 'text-blue-700';
    iconColor = 'text-blue-600';
  } else if (error?.code === 'SUCCESS' || error?.severity === 'success') {
    alertType = 'success';
    Icon = CheckCircle;
    bgColor = 'bg-green-50/50 border-green-200';
    textColor = 'text-green-700';
    iconColor = 'text-green-600';
  }

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await retryWithBackoff(
        async () => {
          await onRetry();
        },
        {
          maxRetries: 3,
          onRetry: (attempt) => {
            console.log(`Retry attempt ${attempt}...`);
          }
        }
      );
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`p-4 rounded-xl border-2 ${bgColor} ${textColor} ${className} transition-all duration-200`}
      role="alert"
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-semibold mb-1 ${textColor}`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${textColor}`}>
            {errorMessage}
          </p>
          
          {retryable && (
            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className={`px-4 py-2 bg-white/90 border border-slate-300 rounded-lg ${textColor} hover:bg-white transition-all text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
              </button>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 p-1 ${textColor} hover:opacity-70 transition-opacity rounded`}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;


