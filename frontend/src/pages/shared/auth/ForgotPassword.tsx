import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { authApi } from '@/services/api';
import AuthLayout from '@/components/shared/auth/AuthLayout';
import FormInput from '@/components/shared/auth/FormInput';
import FormError from '@/components/shared/auth/FormError';
import LoadingButton from '@/components/shared/auth/LoadingButton';
import { useFormValidation, validationRules } from '@/hooks/useFormValidation';
import { extractErrorMessage } from '@/utils/errorMessages';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
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
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate aria-label="Forgot password form">
        {/* Messages Section - Prominent positioning at top */}
        <div className="space-y-3">
          {/* Success Message */}
          {successMessage && (
            <FormError
              type="success"
              message={successMessage}
              size="md"
            />
          )}

          {/* Error Message */}
          {error && (
            <FormError
              type="error"
              message={error}
              dismissible={true}
              onDismiss={() => setError(null)}
              size="md"
            />
          )}

          {/* Additional help for common issues */}
          {error && error.includes('not found') && (
            <FormError
              type="info"
              message="If you're sure this email is registered, please check your spam folder or try again later."
              size="sm"
            />
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

        {/* Primary Action Section */}
        <div className="pt-2">
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            disabled={!isValid && Object.keys(touched).length > 0}
            loadingText="Sending reset email..."
            variant="primary"
            size="md"
            icon={!isLoading ? <ArrowRight className="w-4 h-4 ml-2" /> : undefined}
          >
            {emailSent ? 'Email Sent' : 'Send Reset Email'}
          </LoadingButton>
        </div>

        {/* Navigation Links */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          {/* Back to Login */}
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-2"
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
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-1"
                aria-label="Create a new account"
              >
                Create your account
              </Link>
            </p>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
