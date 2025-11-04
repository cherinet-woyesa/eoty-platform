import React, { useState, forwardRef, memo } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export interface FormInputProps {
  id: string;
  name: string;
  type: 'text' | 'email' | 'password' | 'tel';
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  error?: string;
  touched?: boolean;
  required?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  helperText?: string;
  successIndicator?: boolean;
}

const FormInput = memo(forwardRef<HTMLInputElement, FormInputProps>(({
  id,
  name,
  type,
  label,
  value,
  onChange,
  onBlur,
  onKeyDown,
  error,
  touched = false,
  required = false,
  placeholder,
  icon,
  showPasswordToggle = false,
  autoComplete,
  disabled = false,
  helperText,
  successIndicator = true,
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  
  const hasError = !!(error && touched);
  const hasSuccess = !!(value && !error && successIndicator && touched);
  const inputType = type === 'password' && showPassword ? 'text' : type;

  // Determine icon color based on state
  const getIconColor = () => {
    if (hasError) return 'text-red-400';
    if (hasSuccess) return 'text-green-500';
    return 'text-gray-400 group-focus-within:text-blue-500';
  };

  // Determine border color based on state
  const getBorderColor = () => {
    if (hasError) return 'border-red-300 focus:border-red-500';
    if (hasSuccess) return 'border-green-300 focus:border-green-500';
    return 'border-gray-200 focus:border-blue-500';
  };

  return (
    <div className="space-y-1">
      {/* Label */}
      <label 
        htmlFor={id} 
        className="block text-xs sm:text-sm font-semibold text-gray-900"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        )}
      </label>

      {/* Input Container */}
      <div className="relative group">
        {/* Left Icon */}
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
            <div className={`h-4 w-4 transition-colors duration-200 ${getIconColor()}`}>
              {icon}
            </div>
          </div>
        )}

        {/* Input Field */}
        <input
          ref={ref}
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            block w-full 
            ${icon ? 'pl-10' : 'pl-3'} 
            ${showPasswordToggle ? 'pr-12' : hasSuccess ? 'pr-10' : 'pr-4'}
            py-2 sm:py-3
            border-2 rounded-lg 
            placeholder-gray-400 
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 
            transition-all duration-200 
            bg-gray-50/50 focus:bg-white 
            text-gray-900
            text-sm sm:text-base
            min-h-[44px]
            ${getBorderColor()}
            ${disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
          `}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : helperText ? `${id}-help` : undefined}
          aria-required={required}
        />

        {/* Password Toggle Button */}
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg min-w-[44px] min-h-[44px] justify-center"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls={id}
            tabIndex={0}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" aria-hidden="true" />
            )}
          </button>
        )}

        {/* Success Indicator */}
        {hasSuccess && !showPasswordToggle && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none" aria-hidden="true">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError ? (
        <p id={`${id}-error`} className="text-xs sm:text-sm text-red-600 flex items-center" role="alert" aria-live="polite">
          <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-help`} className="text-xs sm:text-sm text-gray-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}));

FormInput.displayName = 'FormInput';

export default FormInput;
