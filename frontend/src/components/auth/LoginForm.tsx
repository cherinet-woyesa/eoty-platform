import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';
import FormInput from './FormInput';
import FormError from './FormError';
import LoadingButton from './LoadingButton';
import { extractErrorMessage } from '../../utils/errorMessages';
import { useFormValidation, validationRules } from '../../hooks/useFormValidation';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { login } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Form validation configuration with debouncing
  const {
    errors,
    touched,
    isValid,
    validateField,
    validateForm,
    setFieldTouched,
    clearFieldError,
  } = useFormValidation<LoginFormData>({
    email: {
      rules: [
        validationRules.required('Email address is required'),
        validationRules.email('Please enter a valid email address'),
      ],
      validateOnBlur: true,
      debounceMs: 300,
    },
    password: {
      rules: [
        validationRules.required('Password is required'),
        validationRules.minLength(6, 'Password must be at least 6 characters long'),
      ],
      validateOnBlur: true,
      debounceMs: 300,
    },
  });

  // Debounced validation for real-time feedback
  const [validationTimers, setValidationTimers] = useState<Record<string, NodeJS.Timeout>>({});

  const debouncedValidate = useCallback((fieldName: keyof LoginFormData, value: string) => {
    // Clear existing timer for this field
    if (validationTimers[fieldName]) {
      clearTimeout(validationTimers[fieldName]);
    }

    // Set new timer
    const timer = setTimeout(() => {
      if (touched[fieldName]) {
        validateField(fieldName, value);
      }
    }, 300);

    setValidationTimers(prev => ({
      ...prev,
      [fieldName]: timer,
    }));
  }, [touched, validateField, validationTimers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const isFormValid = validateForm(formData);
    
    if (!isFormValid) {
      // Auto-focus on first error field
      const firstErrorField = Object.keys(errors)[0] as keyof LoginFormData;
      if (firstErrorField === 'email' && emailRef.current) {
        emailRef.current.focus();
      } else if (firstErrorField === 'password' && passwordRef.current) {
        passwordRef.current.focus();
      }
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await login(formData.email, formData.password);
      setSuccessMessage('Welcome back! Redirecting to your dashboard...');
      
      // Display success message for 1 second before redirect
      setTimeout(() => {
        // PublicRoute will handle redirection to /dashboard based on isAuthenticated status
      }, 1000);
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Use error message utility to get user-friendly message
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      
      // Auto-focus on email field for retry
      if (emailRef.current) {
        emailRef.current.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof LoginFormData;
    
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear global error when user starts typing
    if (error) {
      setError(null);
    }
    if (successMessage) {
      setSuccessMessage(null);
    }

    // Clear field error immediately when user starts correcting
    if (errors[fieldName] && touched[fieldName]) {
      clearFieldError(fieldName);
    }

    // Debounced validation for real-time feedback
    if (touched[fieldName]) {
      debouncedValidate(fieldName, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const fieldName = name as keyof LoginFormData;
    
    // Mark field as touched
    setFieldTouched(fieldName, true);
    
    // Validate field immediately on blur
    validateField(fieldName, formData[fieldName]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter key for better keyboard navigation
    if (e.key === 'Enter' && !isLoading) {
      if (e.currentTarget.name === 'email' && passwordRef.current) {
        e.preventDefault();
        passwordRef.current.focus();
      } else if (e.currentTarget.name === 'password') {
        // Let the form submit naturally
        e.currentTarget.form?.requestSubmit();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate aria-label="Login form">
      {/* Messages Section - Prominent positioning at top */}
      <div className="space-y-3">
        {/* Success Message */}
        {successMessage && (
          <FormError
            type="info"
            message={successMessage}
          />
        )}

        {/* Error Message */}
        {error && (
          <FormError
            type="error"
            message={error}
          />
        )}
      </div>
      
      {/* Credentials Section - Grouped inputs */}
      <div className="space-y-4">
        {/* Email Input */}
        <FormInput
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          label="Email Address"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          error={errors.email}
          touched={touched.email}
          required
          placeholder="Enter your email address"
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          successIndicator
          disabled={isLoading}
        />

        {/* Password Input */}
        <FormInput
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          touched={touched.password}
          required
          placeholder="Enter your password"
          icon={<Lock className="h-4 w-4" />}
          showPasswordToggle
          autoComplete="current-password"
          successIndicator
          disabled={isLoading}
        />
      </div>

      {/* Remember me & Forgot password */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex items-center min-h-[44px]">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            disabled={isLoading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="remember-me-description"
          />
          <label 
            htmlFor="remember-me" 
            className="ml-2 sm:ml-3 block text-xs sm:text-sm font-medium text-gray-700 cursor-pointer"
          >
            Remember me for 30 days
          </label>
          <span id="remember-me-description" className="sr-only">
            Keep me signed in on this device for 30 days
          </span>
        </div>

        <div className="text-xs sm:text-sm min-h-[44px] flex items-center">
          <Link 
            to="/forgot-password" 
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-2"
            aria-label="Reset your password"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Primary Action Section - Prominent submit button */}
      <div className="pt-2">
        <LoadingButton
          type="submit"
          isLoading={isLoading}
          disabled={!isValid && Object.keys(touched).length > 0}
          loadingText="Signing you in..."
          variant="primary"
          size="md"
          icon={!isLoading ? <ArrowRight className="w-4 h-4 ml-2" /> : undefined}
        >
          Sign in to your account
        </LoadingButton>
      </div>

      {/* Alternative Login Section */}
      <div className="space-y-4 pt-2">
        <div className="relative" role="separator" aria-label="Or continue with social login">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-xs sm:text-sm">
            <span className="px-3 bg-white text-gray-500 font-medium">Or continue with</span>
          </div>
        </div>

        <SocialLoginButtons />
      </div>

      {/* Sign up link */}
      <div className="text-center pt-4 sm:pt-5 border-t border-gray-200" role="navigation" aria-label="Sign up navigation">
        <p className="text-xs sm:text-sm text-gray-600">
          New to our community?{' '}
          <Link 
            to="/register" 
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-1"
            aria-label="Create a new account"
          >
            Create your account
          </Link>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;
