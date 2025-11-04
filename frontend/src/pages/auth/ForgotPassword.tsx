import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import { authApi } from '../../services/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [touched, setTouched] = useState(false);

  const validateEmail = (value: string): string => {
    if (!value.trim()) {
      return 'Email address is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    if (error) setError(null);
    if (success) setSuccess(false);
    
    if (touched) {
      setValidationError(validateEmail(value));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setValidationError(validateEmail(email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched(true);
    const emailError = validateEmail(email);
    
    if (emailError) {
      setValidationError(emailError);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (err.response?.status === 429) {
        errorMessage = 'Too many password reset requests. Please wait a few minutes before trying again.';
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

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email address and we'll send you a link to reset your password"
    >
      {success ? (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-xl flex items-start">
            <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Check your email</p>
              <p className="text-sm mt-1">
                We've sent a password reset link to <strong>{email}</strong>. 
                The link will expire in 1 hour.
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl">
            <p className="text-sm">
              <strong>Didn't receive the email?</strong>
            </p>
            <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
            </ul>
          </div>

          <button
            onClick={() => {
              setSuccess(false);
              setEmail('');
              setTouched(false);
              setValidationError('');
            }}
            className="w-full flex justify-center items-center py-3 px-4 border-2 border-blue-600 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
          >
            Send another reset link
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
                <p className="font-medium">Request Failed</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

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
                  validationError && touched 
                    ? 'text-red-400' 
                    : email && !validationError 
                    ? 'text-green-500' 
                    : 'text-gray-400 group-focus-within:text-blue-500'
                }`} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full pl-10 pr-4 py-3 border-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 ${
                  validationError && touched 
                    ? 'border-red-300 focus:border-red-500' 
                    : email && !validationError 
                    ? 'border-green-300 focus:border-green-500' 
                    : 'border-gray-200 focus:border-blue-500'
                }`}
                placeholder="Enter your email address"
                aria-invalid={!!(validationError && touched)}
                aria-describedby={validationError && touched ? "email-error" : undefined}
              />
              {email && !validationError && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>
            {validationError && touched && (
              <p id="email-error" className="text-xs text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {validationError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !!validationError}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 hover:from-blue-700 hover:via-blue-800 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.01] hover:shadow-xl disabled:transform-none disabled:hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending reset link...
              </>
            ) : (
              'Send reset link'
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

export default ForgotPassword;
