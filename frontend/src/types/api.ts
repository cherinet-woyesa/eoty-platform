/**
 * API Response Types
 * Common types used across API services
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
