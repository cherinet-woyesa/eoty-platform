import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, ArrowLeft, Check, X, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/services/api';
import AuthLayout from '@/components/shared/auth/AuthLayout';
import FormInput from '@/components/shared/auth/FormInput';
import FormError from '@/components/shared/auth/FormError';
import LoadingButton from '@/components/shared/auth/LoadingButton';
import { extractErrorMessage } from '@/utils/errorMessages';

// Password strength calculation
const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 6) strength += 1;
  if (password.length >= 8) strength += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;
  return Math.min(strength, 4); // Cap at 4 (0-4 scale)
};

// Password strength criteria
interface PasswordCriteria {
  label: string;
  test: (password: string) => boolean;
}

const passwordCriteria: PasswordCriteria[] = [
  { label: 'At least 6 characters', test: (p) => p.length >= 6 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains number', test: (p) => /[0-9]/.test(p) },
  { label: 'Contains special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPassword: React.FC = () => {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Redirect if no token provided
  useEffect(() => {
    if (!token) {
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;

      try {
        await authApi.verifyResetToken(token);
        setTokenValid(true);
        setTokenVerified(true);
      } catch (err: any) {
        console.error('Token verification error:', err);
        setTokenValid(false);
        setTokenVerified(true);

        let errorMessage = 'Invalid or expired reset link';
        if (err.response?.status === 400) {
          errorMessage = 'Invalid reset token';
        } else if (err.response?.status === 410) {
          errorMessage = 'Reset link has expired. Please request a new one.';
        }

        setError(errorMessage);
      }
    };

    verifyToken();
  }, [token]);

  // Real-time validation and password strength
  useEffect(() => {
    // Update password strength immediately
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    } else {
      setPasswordStrength(0);
    }

    // Validate confirm password match
    if (touched.confirmPassword && formData.confirmPassword) {
      if (formData.confirmPassword !== formData.password) {
        setError('Passwords do not match');
      } else {
        setError(null);
      }
    }
  }, [formData.password, formData.confirmPassword, touched.confirmPassword]);

  // Get password strength label and color - memoized for performance
  const strengthInfo = useMemo(() => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-600' };
      case 2:
        return { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
      case 3:
        return { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600' };
      case 4:
        return { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600' };
      default:
        return { label: 'Weak', color: 'bg-gray-300', textColor: 'text-gray-600' };
    }
  }, [passwordStrength]);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.password) {
      errors.push('Password is required');
    } else if (formData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (!formData.confirmPassword) {
      errors.push('Please confirm your password');
    } else if (formData.confirmPassword !== formData.password) {
      errors.push('Passwords do not match');
    }

    if (errors.length > 0) {
      setError(errors.join('. '));
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !tokenValid) {
      setError('Invalid reset token. Please request a new password reset link.');
      return;
    }

    // Mark all fields as touched
    setTouched({ password: true, confirmPassword: true });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authApi.resetPassword(token, formData.password);

      setSuccessMessage('Password reset successfully! You can now sign in with your new password.');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err: any) {
      console.error('Password reset error:', err);

      // Use the comprehensive error extraction utility
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter key for better keyboard navigation
    if (e.key === 'Enter' && !isLoading) {
      const currentField = e.currentTarget.name;
      const fieldOrder = ['password', 'confirmPassword'];

      if (currentField === 'confirmPassword') {
        // Let the form submit naturally
        e.currentTarget.form?.requestSubmit();
      }
    }
  };

  // Show loading while verifying token
  if (!tokenVerified) {
    return (
      <AuthLayout
        title="Reset your password"
        subtitle="Verifying your reset link..."
      >
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
        </div>
      </AuthLayout>
    );
  }

  // Show error if token is invalid
  if (tokenValid === false) {
    return (
      <AuthLayout
        title="Reset your password"
        subtitle="The password reset link is invalid or has expired"
      >
        <div className="space-y-4">
          <FormError
            type="error"
            message={error || 'Invalid or expired reset link'}
          />

          <div className="text-center pt-4">
            <Link
              to="/forgot-password"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Request New Reset Link
            </Link>
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <Link
              to="/login"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your new password below"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate aria-label="Reset password form">
        {/* Messages Section */}
        <div className="space-y-3">
          {successMessage && (
            <FormError
              type="success"
              message={successMessage}
              size="md"
            />
          )}

          {error && (
            <FormError
              type="error"
              message={error}
              dismissible={true}
              onDismiss={() => setError(null)}
              size="md"
            />
          )}

          {/* Password requirements reminder */}
          {!error && !successMessage && (
            <FormError
              type="info"
              message="Choose a strong password with at least 6 characters, including uppercase, lowercase, and numbers."
              size="sm"
            />
          )}
        </div>

        {/* Password Section */}
        <div className="space-y-4">
          {/* New Password Input with Strength Indicator */}
          <div className="space-y-1">
            <FormInput
              id="password"
              name="password"
              type="password"
              label="New Password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              error={null} // We'll handle validation display separately
              touched={touched.password}
              required
              placeholder="Enter your new password"
              icon={<Lock className="h-4 w-4" />}
              showPasswordToggle
              autoComplete="new-password"
              disabled={isLoading}
            />

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2 pt-1" role="status" aria-live="polite" aria-atomic="true">
                {/* Strength Meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600" id="password-strength-label">Password strength:</span>
                    <span className={`text-xs font-semibold ${strengthInfo.textColor}`} aria-describedby="password-strength-label">
                      {strengthInfo.label}
                    </span>
                  </div>
                  <div className="flex gap-1" role="progressbar" aria-valuenow={passwordStrength} aria-valuemin={0} aria-valuemax={4} aria-label={`Password strength: ${strengthInfo.label}`}>
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          level <= passwordStrength ? strengthInfo.color : 'bg-gray-200'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>

                {/* Criteria Checklist */}
                <div className="space-y-1 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1.5" id="password-requirements">Password must have:</p>
                  <ul className="space-y-1" aria-labelledby="password-requirements">
                    {passwordCriteria.map((criterion, index) => {
                      const isMet = criterion.test(formData.password);
                      return (
                        <li key={index} className="flex items-center text-xs">
                          {isMet ? (
                            <Check className="h-3 w-3 text-green-500 mr-1.5 flex-shrink-0" aria-hidden="true" />
                          ) : (
                            <X className="h-3 w-3 text-gray-400 mr-1.5 flex-shrink-0" aria-hidden="true" />
                          )}
                          <span className={isMet ? 'text-green-700 font-medium' : 'text-gray-600'}>
                            {criterion.label}
                            <span className="sr-only">{isMet ? ' - met' : ' - not met'}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <FormInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm New Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            error={touched.confirmPassword && formData.confirmPassword !== formData.password ? 'Passwords do not match' : null}
            touched={touched.confirmPassword}
            required
            placeholder="Confirm your new password"
            icon={<Lock className="h-4 w-4" />}
            showPasswordToggle
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>

        {/* Primary Action Section */}
        <div className="pt-2">
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            disabled={isLoading}
            loadingText="Resetting password..."
            variant="primary"
            size="md"
            icon={!isLoading ? <ArrowRight className="w-4 h-4 ml-2" /> : undefined}
          >
            Reset Password
          </LoadingButton>
        </div>

        {/* Navigation Links */}
        <div className="text-center pt-4 border-t border-gray-200">
          <Link
            to="/login"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
