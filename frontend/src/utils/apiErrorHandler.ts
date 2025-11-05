export interface ApiError {
  type: 'network' | 'validation' | 'authorization' | 'server' | 'unknown';
  message: string;
  statusCode?: number;
  details?: Record<string, string>;
}

export const parseApiError = (error: any): ApiError => {
  // Network error (no response)
  if (!error.response) {
    return {
      type: 'network',
      message: 'Unable to connect to the server. Please check your internet connection.',
    };
  }

  const statusCode = error.response.status;
  const data = error.response.data;

  // Validation error (400)
  if (statusCode === 400) {
    return {
      type: 'validation',
      message: data?.message || 'Invalid data provided. Please check your input.',
      statusCode,
      details: data?.details || data?.errors,
    };
  }

  // Authorization error (401, 403)
  if (statusCode === 401 || statusCode === 403) {
    return {
      type: 'authorization',
      message: statusCode === 401
        ? 'Your session has expired. Please log in again.'
        : "You don't have permission to perform this action.",
      statusCode,
    };
  }

  // Not found (404)
  if (statusCode === 404) {
    return {
      type: 'server',
      message: data?.message || 'The requested resource was not found.',
      statusCode,
    };
  }

  // Server error (500+)
  if (statusCode >= 500) {
    return {
      type: 'server',
      message: 'A server error occurred. Please try again later.',
      statusCode,
    };
  }

  // Unknown error
  return {
    type: 'unknown',
    message: data?.message || 'An unexpected error occurred. Please try again.',
    statusCode,
  };
};

export const handleApiError = (error: any, customHandler?: (error: ApiError) => void) => {
  const apiError = parseApiError(error);

  // If custom handler provided, use it
  if (customHandler) {
    customHandler(apiError);
    return;
  }

  // Default handling - log to console
  console.error('API Error:', apiError);

  // In production, you might want to send to error tracking service
  if (import.meta.env.PROD) {
    // Example: Sentry.captureException(error);
  }

  return apiError;
};

export const getErrorMessage = (error: any): string => {
  const apiError = parseApiError(error);
  return apiError.message;
};

export const getUserFriendlyErrorMessage = (error: any): string => {
  const apiError = parseApiError(error);
  
  const friendlyMessages: Record<string, string> = {
    network: 'Connection lost. Please check your internet and try again.',
    validation: 'Please check your input and try again.',
    authorization: 'Access denied. Please log in and try again.',
    server: 'Something went wrong on our end. Please try again later.',
    unknown: 'An unexpected error occurred. Please try again.',
  };

  return apiError.message || friendlyMessages[apiError.type];
};

// Hook for handling errors with notifications
export const createErrorHandler = (showNotification?: (notification: any) => void) => {
  return (error: any, context?: string) => {
    const apiError = parseApiError(error);
    
    if (showNotification) {
      showNotification({
        type: 'error',
        title: context || 'Error',
        message: getUserFriendlyErrorMessage(error),
        duration: 5000,
      });
    }

    return apiError;
  };
};
