import React, { useState, forwardRef, memo } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export interface FormInputProps {
  id: string;
  name: string;
  type: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url';
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
  size?: 'sm' | 'md' | 'lg';
  showErrorInline?: boolean;
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
  size = 'md',
  showErrorInline = false,
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const hasError = !!(error && touched);
  const hasSuccess = !!(value && !error && successIndicator && touched);
  const inputType = type === 'password' && showPassword ? 'text' : type;

  // Size-based classes
  const sizeClasses = {
    sm: {
      container: 'space-y-1',
      label: 'text-sm font-medium',
      input: 'px-3 py-2 text-sm',
      icon: 'h-4 w-4',
      errorText: 'text-xs',
    },
    md: {
      container: 'space-y-2',
      label: 'text-sm font-medium',
      input: 'px-4 py-3 text-base',
      icon: 'h-5 w-5',
      errorText: 'text-sm',
    },
    lg: {
      container: 'space-y-2',
      label: 'text-base font-medium',
      input: 'px-4 py-4 text-lg',
      icon: 'h-6 w-6',
      errorText: 'text-sm',
    },
  };

  const currentSize = sizeClasses[size];

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
    <div className={currentSize.container}>
      {/* Label */}
      <label
        htmlFor={id}
        className={`block ${currentSize.label} text-gray-900`}
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
          <div className={`absolute inset-y-0 left-0 ${size === 'sm' ? 'pl-2.5' : 'pl-3'} flex items-center pointer-events-none`} aria-hidden="true">
            <div className={`${currentSize.icon} transition-colors duration-200 ${getIconColor()}`}>
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
            ${icon ? (size === 'sm' ? 'pl-9' : 'pl-10') : size === 'sm' ? 'pl-2.5' : 'pl-3'}
            ${showPasswordToggle ? 'pr-12' : hasSuccess ? 'pr-10' : size === 'sm' ? 'pr-2.5' : 'pr-4'}
            ${currentSize.input}
            border-2 rounded-lg
            placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500/20
            transition-all duration-200
            bg-gray-50/50 focus:bg-white
            text-gray-900
            min-h-[44px]
            ${getBorderColor()}
            ${disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
            ${hasError ? 'animate-in shake duration-300' : ''}
          `}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : helperText ? `${id}-help` : undefined}
          aria-required={required}
        />

        {/* Password Toggle Button */}
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            className={`absolute inset-y-0 right-0 ${size === 'sm' ? 'pr-2.5' : 'pr-3'} flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg min-w-[44px] min-h-[44px] justify-center`}
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls={id}
            tabIndex={0}
          >
            {showPassword ? (
              <EyeOff className={`${currentSize.icon} text-gray-400 hover:text-gray-600 transition-colors duration-200`} aria-hidden="true" />
            ) : (
              <Eye className={`${currentSize.icon} text-gray-400 hover:text-gray-600 transition-colors duration-200`} aria-hidden="true" />
            )}
          </button>
        )}

        {/* Success Indicator */}
        {hasSuccess && !showPasswordToggle && (
          <div className={`absolute inset-y-0 right-0 ${size === 'sm' ? 'pr-2.5' : 'pr-3'} flex items-center pointer-events-none`} aria-hidden="true">
            <CheckCircle className={`${currentSize.icon} text-green-500`} />
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && !showErrorInline && (
        <div className="flex items-start animate-in slide-in-from-left-1 duration-200">
          <AlertCircle className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-red-500 mt-0.5 mr-2 flex-shrink-0`} aria-hidden="true" />
          <p id={`${id}-error`} className={`${currentSize.errorText} text-red-700 font-medium`} role="alert" aria-live="polite">
            {error}
          </p>
        </div>
      )}

      {/* Inline Error (for forms that show errors inside the input area) */}
      {hasError && showErrorInline && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none" aria-hidden="true">
          <AlertCircle className="h-4 w-4 text-red-500" />
        </div>
      )}

      {/* Helper Text (only show if no error) */}
      {!hasError && helperText && (
        <p id={`${id}-help`} className={`${currentSize.errorText} text-gray-500`}>
          {helperText}
        </p>
      )}
    </div>
  );
}));

FormInput.displayName = 'FormInput';

export default FormInput;
