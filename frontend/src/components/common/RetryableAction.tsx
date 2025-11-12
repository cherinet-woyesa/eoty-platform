import { useState, ReactNode } from 'react';
import { retryWithBackoff, parseApiError, formatErrorForDisplay } from '@/utils/errorHandler';
import ErrorAlert from './ErrorAlert';

interface RetryableActionProps {
  action: () => Promise<any>;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  children: (props: {
    execute: () => Promise<void>;
    isLoading: boolean;
    error: any;
    clearError: () => void;
  }) => ReactNode;
  maxRetries?: number;
  showErrorAlert?: boolean;
}

const RetryableAction: React.FC<RetryableActionProps> = ({
  action,
  onSuccess,
  onError,
  children,
  maxRetries = 3,
  showErrorAlert = true
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const execute = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await retryWithBackoff(
        action,
        {
          maxRetries,
          onRetry: (attempt, error) => {
            console.log(`Retry attempt ${attempt} after error:`, error);
          }
        }
      );

      onSuccess?.(result);
    } catch (err) {
      const errorInfo = parseApiError(err);
      setError(errorInfo);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <>
      {showErrorAlert && error && (
        <ErrorAlert
          error={error}
          onDismiss={clearError}
          onRetry={execute}
          className="mb-4"
        />
      )}
      {children({ execute, isLoading, error, clearError })}
    </>
  );
};

export default RetryableAction;


