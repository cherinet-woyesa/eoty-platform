/**
 * Error message mapping utility
 * Maps backend error codes and HTTP status codes to user-friendly messages
 */

export interface ErrorMessageMap {
  [key: string]: string;
}

export const errorMessages: ErrorMessageMap = {
  // Network errors
  'NETWORK_ERROR': 'Unable to connect. Please check your internet connection and try again.',
  'TIMEOUT': 'The request took too long. Please try again.',
  'ERR_NETWORK': 'Unable to connect. Please check your internet connection and try again.',
  'ERR_CONNECTION_REFUSED': 'Unable to connect to the server. Please try again later.',
  
  // Authentication errors
  '401': 'The email or password you entered is incorrect. Please check your credentials and try again.',
  'INVALID_CREDENTIALS': 'The email or password you entered is incorrect. Please check your credentials and try again.',
  '403': 'Your account has been deactivated. Please contact support for assistance.',
  'FORBIDDEN': 'You do not have permission to access this resource.',
  '409': 'An account with this email already exists. Please try logging in instead.',
  'DUPLICATE_EMAIL': 'An account with this email already exists. Please try logging in instead.',
  '429': 'Too many attempts. Please wait a few minutes before trying again.',
  'TOO_MANY_REQUESTS': 'Too many attempts. Please wait a few minutes before trying again.',
  
  // Server errors
  '500': 'Our servers are temporarily unavailable. Please try again in a few minutes.',
  'INTERNAL_SERVER_ERROR': 'Our servers are temporarily unavailable. Please try again in a few minutes.',
  '502': 'The server is temporarily unavailable. Please try again in a few minutes.',
  'BAD_GATEWAY': 'The server is temporarily unavailable. Please try again in a few minutes.',
  '503': 'The service is currently under maintenance. Please try again later.',
  'SERVICE_UNAVAILABLE': 'The service is currently under maintenance. Please try again later.',
  '504': 'The server took too long to respond. Please try again.',
  'GATEWAY_TIMEOUT': 'The server took too long to respond. Please try again.',
  
  // Validation errors
  'INVALID_EMAIL': 'Please enter a valid email address.',
  'PASSWORD_MISMATCH': 'Passwords do not match.',
  'REQUIRED_FIELD': 'This field is required.',
  'INVALID_INPUT': 'Please check your input and try again.',
  'VALIDATION_ERROR': 'Please check your input and try again.',
  
  // Registration specific errors
  'INVALID_CHAPTER': 'Please select a valid chapter.',
  'INVALID_NAME': 'Please enter a valid name (minimum 2 characters).',
  'PASSWORD_TOO_SHORT': 'Password must be at least 6 characters long.',
  'EMAIL_EXISTS': 'This email address is already registered. Please try logging in instead.',
  'WEAK_PASSWORD': 'Password is too weak. Please choose a stronger password.',
  'User with this email already exists': 'This email address is already registered. Please try logging in instead.',

  // Password reset specific errors
  'INVALID_RESET_TOKEN': 'This password reset link is invalid or has expired.',
  'EXPIRED_RESET_TOKEN': 'This password reset link has expired. Please request a new one.',
  'RESET_TOKEN_USED': 'This password reset link has already been used.',
  'EMAIL_NOT_FOUND': 'No account found with this email address.',

  // Email verification errors
  'INVALID_VERIFICATION_TOKEN': 'This verification link is invalid or has expired.',
  'EMAIL_ALREADY_VERIFIED': 'This email address is already verified.',
  'VERIFICATION_EXPIRED': 'This verification link has expired. Please request a new one.',

  // Social login errors
  'GOOGLE_AUTH_FAILED': 'Google authentication failed. Please try again.',
  'FACEBOOK_AUTH_FAILED': 'Facebook authentication failed. Please try again.',
  'SOCIAL_ACCOUNT_EXISTS': 'An account with this email already exists. Please log in with your password.',
  // 'GOOGLE_ACCOUNT_NO_PASSWORD': 'This account was created with Google. Please use "Continue with Google" to sign in.',

  // Account status errors
  'ACCOUNT_SUSPENDED': 'Your account has been suspended. Please contact support.',
  'ACCOUNT_LOCKED': 'Your account is temporarily locked due to too many failed attempts.',
  'EMAIL_NOT_VERIFIED': 'Please verify your email address before logging in.',
  'AUTHENTICATION_REQUIRED': 'Authentication required. Please sign in to continue.',

  // Network and server errors
  'MAINTENANCE': 'The service is currently under maintenance. Please try again later.',
  'RATE_LIMITED': 'Too many requests. Please wait a few minutes before trying again.',
  'SESSION_EXPIRED': 'Your session has expired. Please log in again.',

  // Generic fallback
  'UNKNOWN_ERROR': 'Something went wrong. Please try again.',
  'DEFAULT': 'An unexpected error occurred. Please try again.',
};

/**
 * Get a user-friendly error message from an error code or HTTP status
 * @param errorCode - The error code or HTTP status code
 * @param fallbackMessage - Optional fallback message if code not found
 * @returns User-friendly error message
 */
export const getErrorMessage = (
  errorCode: string | number,
  fallbackMessage?: string
): string => {
  const code = String(errorCode);
  return errorMessages[code] || fallbackMessage || errorMessages['DEFAULT'];
};

/**
 * Extract error message from various error formats
 * @param error - Error object from API or validation
 * @returns User-friendly error message
 */
export const extractErrorMessage = (error: any): string => {
  // Handle axios error format
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // Check for user-friendly message first (highest priority)
    if (data?.userMessage) {
      return data.userMessage;
    }

    // Check for custom error code in response
    if (data?.code) {
      return getErrorMessage(data.code, data.message);
    }

    // Check for error message in response
    if (data?.error) {
      return getErrorMessage(data.error);
    }

    if (data?.message) {
      return getErrorMessage(data.message, data.message);
    }
    
    // Fall back to HTTP status code
    return getErrorMessage(status);
  }
  
  // Handle network errors
  if (error.code) {
    return getErrorMessage(error.code);
  }
  
  // Handle error message string
  if (error.message) {
    return getErrorMessage(error.message, error.message);
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return getErrorMessage(error, error);
  }
  
  // Default fallback
  return errorMessages['DEFAULT'];
};
