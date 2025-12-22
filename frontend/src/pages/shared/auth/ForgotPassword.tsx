import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { authApi } from '@/services/api';
import AuthLayout from '@/components/shared/auth/AuthLayout';
import FormInput from '@/components/shared/auth/FormInput';
import FormError from '@/components/shared/auth/FormError';
import LoadingButton from '@/components/shared/auth/LoadingButton';
import { useFormValidation, validationRules } from '@/hooks/useFormValidation';
import { extractErrorMessage } from '@/utils/errorMessages';
import { brandColors } from '@/theme/brand';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: searchParams.get('email') || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);

  // Form validation configuration
  const {
    errors,
    touched,
    isValid,
    validateField,
    validateForm,
    setFieldTouched,
    clearFieldError,
  } = useFormValidation<ForgotPasswordFormData>({
    email: {
      rules: [
        validationRules.required('Email address is required'),
        validationRules.email('Please enter a valid email address'),
      ],
      validateOnBlur: true,
      debounceMs: 300,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const isFormValid = validateForm(formData);

    if (!isFormValid) {
      // Auto-focus on first error field
      if (errors.email && emailRef.current) {
        emailRef.current.focus();
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authApi.forgotPassword(formData.email);
      setEmailSent(true);
      setSuccessMessage(
        `Password reset instructions have been sent to ${formData.email}. Please check your email and follow the link to reset your password.`
      );
    } catch (err: any) {
      console.error('Forgot password error:', err);

      // Use the comprehensive error extraction utility
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
    const fieldName = name as keyof ForgotPasswordFormData;

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
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const fieldName = name as keyof ForgotPasswordFormData;

    // Mark field as touched
    setFieldTouched(fieldName, true);

    // Validate field immediately on blur
    validateField(fieldName, formData[fieldName]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter key for better keyboard navigation
    if (e.key === 'Enter' && !isLoading) {
      e.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email address and we'll send you a link to reset your password"
    >
      <div className="relative z-10">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-label="Forgot password form">
          {/* Messages Section - Enhanced styling */}
          <div className="space-y-4">
            {/* Success Message */}
            {successMessage && (
              <div 
                className="p-4 rounded-xl border backdrop-blur-sm transform transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)',
                  borderColor: 'rgba(34,197,94,0.2)',
                  color: '#166534'
                }}
              >
                <p className="text-sm font-medium">{successMessage}</p>
              </div>
            )}

            {/* Error Message with enhanced feedback */}
            {error && (
              <div 
                className="p-4 rounded-xl border backdrop-blur-sm transform transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%)',
                  borderColor: 'rgba(239,68,68,0.2)',
                  color: '#991b1b'
                }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium flex-1">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Additional help for common issues */}
            {error && error.includes('not found') && (
              <div 
                className="p-3 rounded-lg border backdrop-blur-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)',
                  borderColor: 'rgba(59,130,246,0.2)',
                  color: '#1e40af'
                }}
              >
                <p className="text-xs font-medium">If you're sure this email is registered, please check your spam folder or try again later.</p>
              </div>
            )}
          </div>

        {/* Email Input Section */}
        <div className="space-y-4">
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
            disabled={isLoading || emailSent}
          />
        </div>

        {/* Primary Action Section - Enhanced landing page style button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading || (!isValid && Object.keys(touched).length > 0)}
            className="w-full relative group overflow-hidden rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})`,
              boxShadow: `0 4px 14px 0 ${brandColors.primaryHex}40`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <div className="relative px-6 py-4 flex items-center justify-center">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3" />
                  Sending reset email...
                </>
              ) : (
                <>
                  {emailSent ? 'Email Sent' : 'Send Reset Email'}
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </div>
          </button>
        </div>

        {/* Navigation Links - Enhanced styling */}
        <div className="space-y-4 pt-4">
          {/* Back to landing */}
          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              ← Back to landing page
            </Link>
          </div>

          {/* Enhanced divider */}
          <div className="flex items-center gap-3 my-6">
            <div 
              className="h-px flex-1"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(156,163,175,0.5), transparent)' }}
            />
            <span className="text-xs sm:text-sm text-gray-500 font-medium px-3">or</span>
            <div 
              className="h-px flex-1"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(156,163,175,0.5), transparent)' }}
            />
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{ 
                color: brandColors.primaryHex,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = brandColors.primaryHoverHex;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = brandColors.primaryHex;
              }}
              aria-label="Back to sign in"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Link>
          </div>

          {/* Sign up link */}
          <div className="text-center pt-2" role="navigation" aria-label="Sign up navigation">
            <p className="text-xs sm:text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{ 
                  color: brandColors.primaryHex,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = brandColors.primaryHoverHex;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = brandColors.primaryHex;
                }}
                aria-label="Create a new account"
              >
                Create your account
              </Link>
            </p>
          </div>
        </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
