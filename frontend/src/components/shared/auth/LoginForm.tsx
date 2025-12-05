import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';
import FormInput from './FormInput';
import FormError from './FormError';
import LoadingButton from './LoadingButton';
import { extractErrorMessage } from '@/utils/errorMessages';
import { useFormValidation, validationRules } from '@/hooks/useFormValidation';

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
  const [retryCount, setRetryCount] = useState(0);
  
  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  const { login, verify2FA, isAuthenticated, getRoleDashboard } = useAuth();
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

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

  // Redirect when authentication state changes
  // Only redirect if we're on the /login route, not if we're on the landing page
  useEffect(() => {
    // Don't redirect if we are in the middle of a 2FA flow
    if (isAuthenticated && window.location.pathname === '/login' && !requires2FA) {
      const dashboardPath = getRoleDashboard();
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, getRoleDashboard, navigate, requires2FA]);

  // Debug logging for 2FA state
  useEffect(() => {
    if (requires2FA) {
      console.log('LoginForm: 2FA state active, rendering verification screen');
    }
  }, [requires2FA]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle 2FA submission
    if (requires2FA) {
      if (!twoFactorCode || twoFactorCode.length !== 6) {
        setError('Please enter a valid 6-digit code');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await verify2FA(userId!, twoFactorCode);
        setSuccessMessage('Verification successful! Redirecting...');
        const dashboardPath = getRoleDashboard();
        navigate(dashboardPath, { replace: true });
      } catch (err: any) {
        console.error('2FA error:', err);
        setError(extractErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

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
      console.log('Attempting login for:', formData.email);
      const response = await login(formData.email, formData.password);
      console.log('Login response:', response);
      
      if (response?.requires2FA) {
        console.log('2FA required, switching state...');
        setRequires2FA(true);
        setUserId(response.data.userId);
        setSuccessMessage('Please enter the verification code sent to your email');
        setIsLoading(false);
        // Focus on code input after render
        setTimeout(() => codeRef.current?.focus(), 100);
        return;
      }

      setSuccessMessage('Welcome back! Redirecting to your dashboard...');
      
      // Redirect immediately
      const dashboardPath = getRoleDashboard();
      navigate(dashboardPath, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);

      // Increment retry count for better user feedback
      setRetryCount(prev => prev + 1);

      // Use error message utility to get user-friendly message
      const errorMessage = extractErrorMessage(err);
      
      // Check for specific Google account error
      if (err.response?.data?.code === 'GOOGLE_ACCOUNT_NO_PASSWORD') {
        setError(
          <span>
            This account was created with Google. To sign in with a password, please{' '}
            <Link 
              to={`/forgot-password?email=${encodeURIComponent(formData.email)}`}
              className="underline font-semibold hover:text-red-800"
            >
              set a password here
            </Link>.
          </span> as any
        );
      } else {
        setError(errorMessage);
      }

      // Clear password field on authentication errors (but not network errors)
      if (passwordRef.current && !errorMessage.includes('Network') && !errorMessage.includes('connection')) {
        passwordRef.current.value = '';
        formData.password = '';
      }

      // Auto-focus on appropriate field for retry
      if (errorMessage.includes('email') && emailRef.current) {
        emailRef.current.focus();
      } else if (errorMessage.includes('password') && passwordRef.current) {
        passwordRef.current.focus();
      } else if (emailRef.current) {
        // Default to email field
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

  if (requires2FA) {
    return (
      <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-label="2FA Verification">
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900 text-center">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-500 text-center">
            Please enter the 6-digit code sent to your email.
          </p>
          
          {error && (
            <FormError
              type="error"
              message={error}
              dismissible={true}
              size="md"
              onDismiss={() => setError(null)}
            />
          )}
          
          {successMessage && (
            <FormError
              type="success"
              message={successMessage}
              autoDismiss={true}
              autoDismissDelay={4000}
              size="md"
            />
          )}
        </div>

        <div className="space-y-5">
          <FormInput
            ref={codeRef}
            id="twoFactorCode"
            name="twoFactorCode"
            type="text"
            label="Verification Code"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            required
            placeholder="123456"
            // maxLength={6} - Removed as it's not in props
            // className="text-center tracking-widest text-lg" - Removed as it's not in props
            autoComplete="one-time-code"
            disabled={isLoading}
          />
        </div>

        <div className="pt-2 space-y-3">
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            disabled={twoFactorCode.length !== 6}
            loadingText="Verifying..."
            variant="primary"
            size="md"
            // fullWidth - Removed as it's not in props
          >
            Verify Code
          </LoadingButton>
          
          <button
            type="button"
            onClick={() => {
              setRequires2FA(false);
              setTwoFactorCode('');
              setError(null);
              setSuccessMessage(null);
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Back to Login
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-label="Login form">
      {/* Messages Section - Prominent positioning at top */}
      <div className="space-y-3">
        {/* Success Message */}
        {successMessage && (
          <FormError
            type="success"
            message={successMessage}
            autoDismiss={true}
            autoDismissDelay={4000}
            size="md"
          />
        )}

        {/* Error Message with enhanced feedback */}
        {error && (
          <FormError
            type="error"
            message={error}
            dismissible={true}
            size="md"
            onDismiss={() => setError(null)}
          />
        )}

        {/* Retry count warning for multiple failed attempts */}
        {retryCount > 2 && !error?.includes('Network') && (
          <FormError
            type="warning"
            message={`Having trouble logging in? Try resetting your password or contact support if the problem persists.`}
            size="sm"
          />
        )}
      </div>
      
      {/* Credentials Section - Grouped inputs */}
      <div className="space-y-5">
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
            className="h-4 w-4 text-[#27AE60] focus:ring-[#27AE60] border-gray-300 rounded transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
            className="text-[#27AE60] hover:text-[#16A085] font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:ring-offset-2 rounded px-2 py-2"
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
        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-gray-200"></div>
          <span className="text-xs sm:text-sm text-gray-500 font-medium">Or continue with</span>
          <div className="h-px flex-1 bg-gray-200"></div>
        </div>

        <SocialLoginButtons 
          onRequires2FA={(uid) => {
            setRequires2FA(true);
            setUserId(uid);
            setSuccessMessage('Please enter the verification code sent to your email');
            setTimeout(() => codeRef.current?.focus(), 100);
          }}
        />
      </div>

      {/* Sign up link */}
      <div className="text-center pt-4 sm:pt-5 border-t border-gray-200" role="navigation" aria-label="Sign up navigation">
        <p className="text-xs sm:text-sm text-gray-600">
          New to our community?{' '}
          <Link 
            to="/register" 
            className="text-[#27AE60] hover:text-[#16A085] font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:ring-offset-2 rounded px-1 py-1"
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
