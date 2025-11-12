/**
 * Centralized Error Handling Utility
 * 
 * Provides user-friendly error messages, retry mechanisms,
 * and consistent error handling across the application
 */

export interface ErrorInfo {
  code?: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  statusCode?: number;
  originalError?: any;
}

export class AppError extends Error {
  code?: string;
  userMessage: string;
  retryable: boolean;
  statusCode?: number;
  originalError?: any;

  constructor(info: ErrorInfo) {
    super(info.message);
    this.name = 'AppError';
    this.code = info.code;
    this.userMessage = info.userMessage;
    this.retryable = info.retryable;
    this.statusCode = info.statusCode;
    this.originalError = info.originalError;
  }
}

/**
 * Parse API errors into user-friendly messages
 */
export function parseApiError(error: any): ErrorInfo {
  // Network errors
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
      retryable: true,
      originalError: error
    };
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      code: 'TIMEOUT_ERROR',
      message: 'Request timeout',
      userMessage: 'The request took too long to complete. Please try again.',
      retryable: true,
      originalError: error
    };
  }

  // HTTP errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return {
          code: 'VALIDATION_ERROR',
          message: data?.message || 'Invalid request',
          userMessage: data?.message || 'Please check your input and try again.',
          retryable: false,
          statusCode: status,
          originalError: error
        };

      case 401:
        return {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          userMessage: 'Your session has expired. Please sign in again.',
          retryable: false,
          statusCode: status,
          originalError: error
        };

      case 403:
        return {
          code: 'FORBIDDEN',
          message: 'Access denied',
          userMessage: 'You don\'t have permission to perform this action.',
          retryable: false,
          statusCode: status,
          originalError: error
        };

      case 404:
        return {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          userMessage: 'The requested resource could not be found.',
          retryable: false,
          statusCode: status,
          originalError: error
        };

      case 409:
        return {
          code: 'CONFLICT',
          message: data?.message || 'Conflict',
          userMessage: data?.message || 'This action conflicts with existing data. Please refresh and try again.',
          retryable: false,
          statusCode: status,
          originalError: error
        };

      case 413:
        return {
          code: 'FILE_TOO_LARGE',
          message: 'File too large',
          userMessage: 'The file you\'re trying to upload is too large. Please use a smaller file.',
          retryable: false,
          statusCode: status,
          originalError: error
        };

      case 429:
        return {
          code: 'RATE_LIMIT',
          message: 'Too many requests',
          userMessage: 'You\'re making requests too quickly. Please wait a moment and try again.',
          retryable: true,
          statusCode: status,
          originalError: error
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          code: 'SERVER_ERROR',
          message: 'Server error',
          userMessage: 'The server encountered an error. Please try again in a moment.',
          retryable: true,
          statusCode: status,
          originalError: error
        };

      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: data?.message || `Error ${status}`,
          userMessage: data?.message || 'An unexpected error occurred. Please try again.',
          retryable: status >= 500,
          statusCode: status,
          originalError: error
        };
    }
  }

  // Generic error
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: false,
    originalError: error
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      const errorInfo = parseApiError(error);
      if (!errorInfo.retryable) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );

      onRetry?.(attempt + 1, error);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: any): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }

  const errorInfo = parseApiError(error);
  return errorInfo.userMessage;
}

/**
 * Log error for debugging
 */
export function logError(error: any, context?: string) {
  const errorInfo = parseApiError(error);
  
  console.error(`[Error${context ? ` - ${context}` : ''}]`, {
    code: errorInfo.code,
    message: errorInfo.message,
    userMessage: errorInfo.userMessage,
    retryable: errorInfo.retryable,
    statusCode: errorInfo.statusCode,
    originalError: errorInfo.originalError
  });

  // In production, you might want to send this to an error tracking service
  // e.g., Sentry, LogRocket, etc.
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof AppError) {
    return error.retryable;
  }
  
  const errorInfo = parseApiError(error);
  return errorInfo.retryable;
}

/**
 * Get error code
 */
export function getErrorCode(error: any): string {
  if (error instanceof AppError) {
    return error.code || 'UNKNOWN_ERROR';
  }
  
  const errorInfo = parseApiError(error);
  return errorInfo.code || 'UNKNOWN_ERROR';
}


