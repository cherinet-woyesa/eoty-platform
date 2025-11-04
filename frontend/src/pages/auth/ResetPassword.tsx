import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, ArrowLeft, Check, X } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import { authApi } from '../../services/api';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: 'Too weak',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) {
      return { score, label: 'Too weak', color: 'text-red-600', bgColor: 'bg-red-500' };
    } else if (score <= 4) {
      return { score, label: 'Weak', color: 'text-orange-600', bgColor: 'bg-orange-500' };
    } else if (score <= 5) {
      return { score, label: 'Good', color: 'text-yellow-600', bgColor: 'bg-yellow-500' };
    } else {
      return { score, label: 'Strong', color: 'text-green-600', bgColor: 'bg-green-500' };
    }
  };

  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    }
  }, [formData.password]);

  const validatePassword = (password: string): string => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return '';
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;
    
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      validateForm();
    }
  }, [formData, touched]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError(null);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }
    
    setTouched({ password: true, confirmPassword: true });
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await authApi.resetPassword(token, formData.password);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (err.response?.status === 400) {
        errorMessage = 'Invalid or expired reset token. Please request a new password reset link.';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many password reset attempts. Please wait a few minutes before trying again.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Our servers are temporarily unavailable. Please try again in a few minutes.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(formData.password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(formData.password) },
    { label: 'One number', met: /[0-9]/.test(formData.password) },
  ];

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your new password below"
    >
      {success ? (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-xl flex items-start">
            <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Password reset successful!</p>
              <p className="text-sm mt-1">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <p className="text-sm mt-2 text-green-700">
                Redirecting to login page...
              </p>
            </div>
          </div>

          <Link
            to="/login"
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 hover:from-blue-700 hover:via-blue-800 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
          >
            Go to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div 
              className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start animate-in slide-in-from-top-2 duration-300"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Reset Failed</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* New Password Input */}
          <div className="space-y-1">
            <label 
              htmlFor="password" 
              className="block text-sm font-semibold text-gray-900"
            >
              New Password
              <span className="text-red-500 ml-1" aria-label="required">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className={`h-4 w-4 transition-colors duration-200 ${
                  validationErrors.password && touched.password 
                    ? 'text-red-400' 
                    : formData.password && !validationErrors.password 
                    ? 'text-green-500' 
                    : 'text-gray-400 group-focus-within:text-blue-500'
                }`} />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full pl-10 pr-12 py-3 border-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 ${
                  validationErrors.password && touched.password 
                    ? 'border-red-300 focus:border-red-500' 
                    : formData.password && !validationErrors.password 
                    ? 'border-green-300 focus:border-green-500' 
                    : 'border-gray-200 focus:border-blue-500'
                }`}
                placeholder="Enter your new password"
                aria-invalid={!!(validationErrors.password && touched.password)}
                aria-describedby={validationErrors.password && touched.password ? "password-error" : undefined}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                )}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Password strength:</span>
                  <span className={`text-xs font-semibold ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.bgColor}`}
                    style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Password Requirements */}
            {formData.password && (
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center text-xs">
                    {req.met ? (
                      <Check className="h-3 w-3 text-green-500 mr-2" />
                    ) : (
                      <X className="h-3 w-3 text-gray-400 mr-2" />
                    )}
                    <span className={req.met ? 'text-green-700' : 'text-gray-600'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {validationErrors.password && touched.password && (
              <p id="password-error" className="text-xs text-red-600 flex items-center mt-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                {validationErrors.password}
              </p>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1">
            <label 
              htmlFor="confirmPassword" 
              className="block text-sm font-semibold text-gray-900"
            >
              Confirm New Password
              <span className="text-red-500 ml-1" aria-label="required">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className={`h-4 w-4 transition-colors duration-200 ${
                  validationErrors.confirmPassword && touched.confirmPassword 
                    ? 'text-red-400' 
                    : formData.confirmPassword && !validationErrors.confirmPassword 
                    ? 'text-green-500' 
                    : 'text-gray-400 group-focus-within:text-blue-500'
                }`} />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full pl-10 pr-12 py-3 border-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 ${
                  validationErrors.confirmPassword && touched.confirmPassword 
                    ? 'border-red-300 focus:border-red-500' 
                    : formData.confirmPassword && !validationErrors.confirmPassword 
                    ? 'border-green-300 focus:border-green-500' 
                    : 'border-gray-200 focus:border-blue-500'
                }`}
                placeholder="Confirm your new password"
                aria-invalid={!!(validationErrors.confirmPassword && touched.confirmPassword)}
                aria-describedby={validationErrors.confirmPassword && touched.confirmPassword ? "confirm-password-error" : undefined}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                )}
              </button>
            </div>
            {validationErrors.confirmPassword && touched.confirmPassword && (
              <p id="confirm-password-error" className="text-xs text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {validationErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !token || Object.keys(validationErrors).length > 0}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 hover:from-blue-700 hover:via-blue-800 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.01] hover:shadow-xl disabled:transform-none disabled:hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetting password...
              </>
            ) : (
              'Reset password'
            )}
          </button>

          <div className="text-center pt-4 border-t border-gray-200">
            <Link 
              to="/login" 
              className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
