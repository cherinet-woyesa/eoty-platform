import { useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';
import { parseApiError, getUserFriendlyErrorMessage } from '../utils/apiErrorHandler';

export const useApiError = () => {
  const { showNotification } = useNotification();

  const handleError = useCallback(
    (error: any, context?: string) => {
      const apiError = parseApiError(error);
      
      showNotification({
        type: 'error',
        title: context || 'Error',
        message: getUserFriendlyErrorMessage(error),
        duration: 5000,
      });

      return apiError;
    },
    [showNotification]
  );

  return { handleError, parseApiError, getUserFriendlyErrorMessage };
};
