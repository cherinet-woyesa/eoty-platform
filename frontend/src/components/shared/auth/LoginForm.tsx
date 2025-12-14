import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';
import FormInput from './FormInput';
import FormError from './FormError';
import LoadingButton from './LoadingButton';
import { extractErrorMessage } from '@/utils/errorMessages';
import { useFormValidation, validationRules } from '@/hooks/useFormValidation';
import { brandColors } from '@/theme/brand';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const brandStyle = {
    ['--brand' as any]: brandColors.primaryHex,
    ['--brand-strong' as any]: brandColors.primaryHoverHex,
  };
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  const { login, verify2FA } = useAuth();
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
        validationRules.required(t('auth.login.validation.email_required')),
        validationRules.email(t('auth.login.validation.email_invalid')),
      ],
      validateOnBlur: true,
      debounceMs: 300,
    },
    password: {
      rules: [
        validationRules.required(t('auth.login.validation.password_required')),
        validationRules.minLength(6, t('auth.login.validation.password_min')),
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
  /* 
  useEffect(() => {
    // Don't redirect if we are in the middle of a 2FA flow
    if (isAuthenticated && window.location.pathname === '/login' && !requires2FA) {
      const dashboardPath = getRoleDashboard();
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, getRoleDashboard, navigate, requires2FA]);
  */

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
        setError(t('auth.login.validation.code_invalid'));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await verify2FA(userId!, twoFactorCode);
        setSuccessMessage(t('auth.login.messages.verified'));
        setToast({ type: 'success', message: t('auth.login.messages.verified') });
        // Navigation handled by PublicRoute
        // const dashboardPath = getRoleDashboard();
        // navigate(dashboardPath, { replace: true });
      } catch (err: any) {
        console.error('2FA error:', err);
        setError(extractErrorMessage(err)); // inline only to avoid duplicate toast
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
        setSuccessMessage(t('auth.login.twofa_subtitle'));
        setIsLoading(false);
        // Focus on code input after render
        setTimeout(() => codeRef.current?.focus(), 100);
        return;
      }

      setSuccessMessage(t('auth.login.messages.success'));
      setToast({ type: 'success', message: t('auth.login.messages.success_toast') });
      
      // Redirect immediately - Handled by PublicRoute
      // const dashboardPath = getRoleDashboard();
      // navigate(dashboardPath, { replace: true });
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
            {t('auth.login.messages.google_password')}{' '}
            <Link 
              to={`/forgot-password?email=${encodeURIComponent(formData.email)}`}
              className="underline font-semibold hover:text-red-800"
            >
              {t('auth.login.messages.google_password_link')}
            </Link>.
          </span> as any
        );
      } else {
        setError(errorMessage);
        // inline only to avoid duplicate toast
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

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  if (requires2FA) {
    return (
      <div className="relative" style={brandStyle}>
        {toast && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div
              className="pointer-events-auto px-5 py-3 rounded-xl shadow-2xl border text-white text-sm font-semibold"
              style={{
                background: toast.type === 'success'
                  ? `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})`
                  : 'linear-gradient(120deg, #ef4444, #b91c1c)',
                borderColor: toast.type === 'success' ? 'rgba(49,46,129,0.25)' : 'rgba(239,68,68,0.35)'
              }}
            >
              {toast.message}
            </div>
          </div>
        )}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-label="2FA Verification">
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900 text-center">{t('auth.login.twofa_title')}</h3>
          <p className="text-sm text-gray-500 text-center">
            {t('auth.login.twofa_subtitle')}
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
            label={t('auth.login.twofa_label')}
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            required
            placeholder={t('auth.login.twofa_placeholder')}
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
            loadingText={t('auth.login.twofa_verify_loading')}
            variant="primary"
            size="md"
            // fullWidth - Removed as it's not in props
          >
            {t('auth.login.twofa_verify')}
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
            {t('auth.login.twofa_back')}
          </button>
        </div>
      </form>
    </div>
    );
  }

  return (
    <div className="relative" style={brandStyle}>
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className="pointer-events-auto px-5 py-3 rounded-xl shadow-2xl border text-white text-sm font-semibold"
            style={{
              background: toast.type === 'success'
                ? `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})`
                : 'linear-gradient(120deg, #ef4444, #b91c1c)',
              borderColor: toast.type === 'success' ? 'rgba(49,46,129,0.25)' : 'rgba(239,68,68,0.35)'
            }}
          >
            {toast.message}
          </div>
        </div>
      )}
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
            message={t('auth.login.retry_help')}
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
          placeholder={t('auth.login.email_placeholder')}
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
          placeholder={t('auth.login.password_placeholder')}
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
            className="h-4 w-4 text-[color:var(--brand)] focus:ring-[color:var(--brand-strong)] border-gray-300 rounded transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="remember-me-description"
          />
          <label 
            htmlFor="remember-me" 
            className="ml-2 sm:ml-3 block text-xs sm:text-sm font-medium text-gray-700 cursor-pointer"
          >
            {t('auth.login.remember_me')}
          </label>
          <span id="remember-me-description" className="sr-only">
            {t('auth.login.remember_me_desc')}
          </span>
        </div>

        <div className="text-xs sm:text-sm min-h-[44px] flex items-center">
          <Link 
            to="/forgot-password" 
            className="text-[color:var(--brand)] hover:text-[color:var(--brand-strong)] font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/20 focus:ring-offset-2 rounded px-2 py-2"
            aria-label="Reset your password"
          >
            {t('auth.login.forgot_password')}
          </Link>
        </div>
      </div>

      {/* Primary Action Section - Prominent submit button */}
      <div className="pt-2">
        <LoadingButton
          type="submit"
          isLoading={isLoading}
          disabled={!isValid && Object.keys(touched).length > 0}
          loadingText={t('auth.login.loading')}
          variant="primary"
          size="md"
          icon={!isLoading ? <ArrowRight className="w-4 h-4 ml-2" /> : undefined}
        >
          {t('auth.login.login_button')}
        </LoadingButton>
      </div>

      {/* Alternative Login Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-gray-200"></div>
          <span className="text-xs sm:text-sm text-gray-500 font-medium">{t('auth.login.or_continue')}</span>
          <div className="h-px flex-1 bg-gray-200"></div>
        </div>

        <SocialLoginButtons 
          onRequires2FA={(uid) => {
            setRequires2FA(true);
            setUserId(uid);
            setSuccessMessage(t('auth.login.twofa_subtitle'));
            setTimeout(() => codeRef.current?.focus(), 100);
          }}
        />
      </div>

      {/* Sign up link */}
      <div className="text-center pt-4 sm:pt-5 border-t border-gray-200" role="navigation" aria-label="Sign up navigation">
        <p className="text-xs sm:text-sm text-gray-600">
          {t('auth.login.no_account')}{' '}
          <Link 
            to="/register" 
            className="text-[color:var(--brand)] hover:text-[color:var(--brand-strong)] font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/20 focus:ring-offset-2 rounded px-1 py-1"
            aria-label="Create a new account"
          >
            {t('auth.login.register_link')}
          </Link>
        </p>
      </div>
    </form>
    </div>
  );
};

export default LoginForm;
