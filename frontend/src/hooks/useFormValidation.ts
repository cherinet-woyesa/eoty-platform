import { useState, useCallback, useEffect } from 'react';

/**
 * Validation rule function type
 */
export type ValidationRule<T = any> = (value: T, formData?: any) => string | null;

/**
 * Field validation configuration
 */
export interface FieldValidation {
  rules: ValidationRule[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

/**
 * Form validation configuration
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface FormValidationConfig {
  [key: string]: FieldValidation;
}

/**
 * Validation errors state
 */
export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Touched fields state
 */
export interface TouchedFields {
  [key: string]: boolean;
}

/**
 * Form validation hook return type
 */
export interface UseFormValidationReturn<T extends Record<string, any>> {
  errors: ValidationErrors;
  touched: TouchedFields;
  isValid: boolean;
  validateField: (fieldName: keyof T, value: any) => string | null;
  validateForm: (formData: T) => boolean;
  setFieldTouched: (fieldName: keyof T, isTouched?: boolean) => void;
  setFieldError: (fieldName: keyof T, error: string | null) => void;
  clearErrors: () => void;
  clearFieldError: (fieldName: keyof T) => void;
  resetValidation: () => void;
}

/**
 * Custom hook for form validation with debouncing and touch tracking
 * @param config - Validation configuration for each field
 * @returns Validation state and methods
 */
export function useFormValidation<T extends Record<string, any>>(
  config: FormValidationConfig
): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [debounceTimers, setDebounceTimers] = useState<Record<string, NodeJS.Timeout>>({});

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers).forEach(timer => clearTimeout(timer));
    };
  }, [debounceTimers]);

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (fieldName: keyof T, value: any, formData?: T): string | null => {
      const fieldConfig = config[fieldName as string];
      
      if (!fieldConfig) {
        return null;
      }

      // Run all validation rules for the field
      for (const rule of fieldConfig.rules) {
        const error = rule(value, formData);
        if (error) {
          return error;
        }
      }

      return null;
    },
    [config]
  );

  /**
   * Validate entire form
   */
  const validateForm = useCallback(
    (formData: T): boolean => {
      const newErrors: ValidationErrors = {};
      let isFormValid = true;

      Object.keys(config).forEach((fieldName) => {
        const error = validateField(fieldName as keyof T, formData[fieldName], formData);
        if (error) {
          newErrors[fieldName] = error;
          isFormValid = false;
        }
      });

      setErrors(newErrors);
      
      // Mark all fields as touched
      const allTouched: TouchedFields = {};
      Object.keys(config).forEach((fieldName) => {
        allTouched[fieldName] = true;
      });
      setTouched(allTouched);

      return isFormValid;
    },
    [config, validateField]
  );

  /**
   * Set field as touched
   */
  const setFieldTouched = useCallback((fieldName: keyof T, isTouched: boolean = true) => {
    setTouched((prev) => ({
      ...prev,
      [fieldName as string]: isTouched,
    }));
  }, []);

  /**
   * Set field error manually
   */
  const setFieldError = useCallback((fieldName: keyof T, error: string | null) => {
    setErrors((prev) => {
      if (error === null) {
        const { [fieldName as string]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [fieldName as string]: error,
      };
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((fieldName: keyof T) => {
    setErrors((prev) => {
      const { [fieldName as string]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Reset all validation state
   */
  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
    Object.values(debounceTimers).forEach(timer => clearTimeout(timer));
    setDebounceTimers({});
  }, [debounceTimers]);

  /**
   * Check if form is valid (no errors)
   */
  const isValid = Object.keys(errors).length === 0;

  return {
    errors,
    touched,
    isValid,
    validateField,
    validateForm,
    setFieldTouched,
    setFieldError,
    clearErrors,
    clearFieldError,
    resetValidation,
  };
}

/**
 * Common validation rules
 */
export const validationRules = {
  required: (message: string = 'This field is required'): ValidationRule => {
    return (value: any) => {
      if (value === null || value === undefined || value === '') {
        return message;
      }
      if (typeof value === 'string' && value.trim() === '') {
        return message;
      }
      return null;
    };
  },

  email: (message: string = 'Please enter a valid email address'): ValidationRule => {
    return (value: string) => {
      if (!value) return null; // Let required rule handle empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? null : message;
    };
  },

  minLength: (length: number, message?: string): ValidationRule => {
    return (value: string) => {
      if (!value) return null; // Let required rule handle empty values
      const errorMessage = message || `Must be at least ${length} characters`;
      return value.length >= length ? null : errorMessage;
    };
  },

  maxLength: (length: number, message?: string): ValidationRule => {
    return (value: string) => {
      if (!value) return null;
      const errorMessage = message || `Must be no more than ${length} characters`;
      return value.length <= length ? null : errorMessage;
    };
  },

  pattern: (regex: RegExp, message: string): ValidationRule => {
    return (value: string) => {
      if (!value) return null;
      return regex.test(value) ? null : message;
    };
  },

  matchField: (fieldName: string, message: string = 'Fields do not match'): ValidationRule => {
    return (value: any, formData?: any) => {
      if (!value || !formData) return null;
      return value === formData[fieldName] ? null : message;
    };
  },

  custom: (validatorFn: (value: any, formData?: any) => boolean, message: string): ValidationRule => {
    return (value: any, formData?: any) => {
      return validatorFn(value, formData) ? null : message;
    };
  },

  minValue: (min: number, message?: string): ValidationRule => {
    return (value: number) => {
      if (value === null || value === undefined) return null;
      const errorMessage = message || `Must be at least ${min}`;
      return value >= min ? null : errorMessage;
    };
  },

  maxValue: (max: number, message?: string): ValidationRule => {
    return (value: number) => {
      if (value === null || value === undefined) return null;
      const errorMessage = message || `Must be no more than ${max}`;
      return value <= max ? null : errorMessage;
    };
  },
};
