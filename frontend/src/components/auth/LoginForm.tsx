import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  // Enhanced validation with better error messages
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value.trim()) {
          return 'Email address is required';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        return '';
      case 'password':
        if (!value) {
          return 'Password is required';
        }
        if (value.length < 6) {
          return 'Password must be at least 6 characters long';
        }
        return '';
      default:
        return '';
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        errors[key] = error;
      }
    });
    
    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    setIsFormValid(isValid);
    return isValid;
  };

  // Real-time validation
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      validateForm();
    }
  }, [formData, touched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ email: true, password: true });
    
    if (!validateForm()) {
      // Focus on first error field
      const firstErrorField = Object.keys(validationErrors)[0];
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
      
      // Small delay to show success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Enhanced error messages that are actionable and non-technical
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (err.response?.status === 401) {
        errorMessage = 'The email or password you entered is incorrect. Please check your credentials and try again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Your account has been deactivated. Please contact support for assistance.';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Our servers are temporarily unavailable. Please try again in a few minutes.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Focus on email field for retry
      if (emailRef.current) {
        emailRef.current.focus();
      }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      if (e.target === emailRef.current && passwordRef.current) {
        passwordRef.current.focus();
      } else if (e.target === passwordRef.current && submitRef.current) {
        submitRef.current.click();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Success Message */}
      {successMessage && (
        <div 
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-start animate-in slide-in-from-top-2 duration-300"
          role="alert"
          aria-live="polite"
        >
          <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div 
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start animate-in slide-in-from-top-2 duration-300"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Login Failed</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}
      
      {/* Email Input */}
      <div className="space-y-1">
        <label 
          htmlFor="email" 
          className="block text-sm font-semibold text-gray-900"
        >
          Email Address
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className={`h-4 w-4 transition-colors duration-200 ${
              validationErrors.email && touched.email 
                ? 'text-red-400' 
                : formData.email && !validationErrors.email 
                ? 'text-green-500' 
                : 'text-gray-400 group-focus-within:text-blue-500'
            }`} />
          </div>
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`block w-full pl-10 pr-4 py-3 border-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 ${
              validationErrors.email && touched.email 
                ? 'border-red-300 focus:border-red-500' 
                : formData.email && !validationErrors.email 
                ? 'border-green-300 focus:border-green-500' 
                : 'border-gray-200 focus:border-blue-500'
            }`}
            placeholder="Enter your email address"
            aria-invalid={!!(validationErrors.email && touched.email)}
            aria-describedby={validationErrors.email && touched.email ? "email-error" : "email-help"}
          />
          {formData.email && !validationErrors.email && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          )}
        </div>
        {validationErrors.email && touched.email ? (
          <p id="email-error" className="text-xs text-red-600 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {validationErrors.email}
          </p>
        ) : (
          <p id="email-help" className="text-xs text-gray-500">
            We'll never share your email with anyone else
          </p>
        )}
      </div>

      {/* Password Input */}
      <div className="space-y-1">
        <label 
          htmlFor="password" 
          className="block text-sm font-semibold text-gray-900"
        >
          Password
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
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`block w-full pl-10 pr-12 py-3 border-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 ${
              validationErrors.password && touched.password 
                ? 'border-red-300 focus:border-red-500' 
                : formData.password && !validationErrors.password 
                ? 'border-green-300 focus:border-green-500' 
                : 'border-gray-200 focus:border-blue-500'
            }`}
            placeholder="Enter your password"
            aria-invalid={!!(validationErrors.password && touched.password)}
            aria-describedby={validationErrors.password && touched.password ? "password-error" : "password-help"}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={0}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
            )}
          </button>
        </div>
        {validationErrors.password && touched.password ? (
          <p id="password-error" className="text-xs text-red-600 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {validationErrors.password}
          </p>
        ) : (
          <p id="password-help" className="text-xs text-gray-500">
            Minimum 6 characters required
          </p>
        )}
      </div>

      {/* Remember me & Forgot password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
          />
          <label htmlFor="remember-me" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
            Remember me for 30 days
          </label>
        </div>

        <div className="text-sm">
          <Link 
            to="/forgot-password" 
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Reset your password"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Submit Button */}
      <button
        ref={submitRef}
        type="submit"
        disabled={isLoading || !isFormValid}
        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 hover:from-blue-700 hover:via-blue-800 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.01] hover:shadow-xl disabled:transform-none disabled:hover:shadow-lg"
        aria-describedby="submit-help"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing you in...
          </>
        ) : (
          <>
            Sign in to your account
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </button>
      <p id="submit-help" className="text-xs text-gray-500 text-center">
        {isLoading ? 'Please wait while we sign you in...' : 'Click to access your spiritual learning journey'}
      </p>

      {/* Social Login Buttons */}
      <SocialLoginButtons />

      {/* Sign up link */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          New to our community?{' '}
          <Link 
            to="/register" 
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
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