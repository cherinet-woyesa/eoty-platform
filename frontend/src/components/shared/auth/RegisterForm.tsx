import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, ArrowRight, Check, X, BookOpen, GraduationCap, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';
import { chaptersApi } from '@/services/api/chapters';
import FormInput from './FormInput';
import FormError from './FormError';
import LoadingButton from './LoadingButton';
import { errorMessages, extractErrorMessage } from '@/utils/errorMessages';

// Password strength calculation
const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;
  if (!/\s/.test(password)) strength += 1;
  return Math.min(strength, 5); // Cap at 5 (0-5 scale)
};

// Password strength criteria
interface PasswordCriteria {
  label: string;
  test: (password: string) => boolean;
}

const passwordCriteria: PasswordCriteria[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains number', test: (p) => /[0-9]/.test(p) },
  { label: 'Contains special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
  { label: 'No spaces allowed', test: (p) => !/\s/.test(p) },
];

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    chapter: '',
    role: 'user'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [chapters, setChapters] = useState<{id: number, name: string, location: string}[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [chapterError, setChapterError] = useState(false);
  
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  // Only redirect if we're on the /register route, not if we're on the landing page
  useEffect(() => {
    if (isAuthenticated && window.location.pathname === '/register') {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate]);

  // Fetch chapters with error handling and fallback
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await chaptersApi.getChapters();
        if (response.success) {
          setChapters(response.data.chapters);
          setChapterError(false);
        } else {
          throw new Error('Failed to fetch chapters');
        }
      } catch (err) {
        console.error('Failed to fetch chapters:', err);
        setChapterError(true);
        // Fallback data
        setChapters([
          { id: 1, name: 'addis-ababa', location: 'Addis Ababa, Ethiopia' },
          { id: 2, name: 'toronto', location: 'Toronto, Canada' },
          { id: 3, name: 'washington-dc', location: 'Washington DC, USA' },
          { id: 4, name: 'london', location: 'London, UK' },
        ]);
      } finally {
        setLoadingChapters(false);
      }
    };

    fetchChapters();
  }, []);

  // Validation
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.trim().length < 2) return 'First name must be at least 2 characters';
        return '';
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.trim().length < 2) return 'Last name must be at least 2 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        // Check for common email typos
        if (value.includes('gmail.com') && value.includes('@')) {
          const localPart = value.split('@')[0];
          if (localPart.includes('..') || localPart.startsWith('.') || localPart.endsWith('.')) {
            return 'Please check your email address format';
          }
        }
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters long';
        if (!/(?=.*[a-z])(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase and one lowercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
        if (!/(?=.*[^A-Za-z0-9])/.test(value)) return 'Password must contain at least one special character';
        if (/\s/.test(value)) return 'Password cannot contain spaces';
        if (value.toLowerCase().includes('password')) return 'Password cannot contain the word "password"';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      case 'chapter':
        if (!value) return 'Please select your local chapter';
        return '';
      default:
        return '';
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    Object.keys(formData).forEach(key => {
      if (key !== 'role') {
        const error = validateField(key, formData[key as keyof typeof formData]);
        if (error) {
          errors[key] = error;
        }
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Real-time validation with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Object.keys(touched).length > 0) {
        validateForm();
      }
    }, 300);
    
    // Update password strength immediately
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    } else {
      setPasswordStrength(0);
    }
    
    return () => clearTimeout(timeoutId);
  }, [formData, touched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const touchedFields: Record<string, boolean> = { 
      firstName: true, 
      lastName: true, 
      email: true, 
      password: true, 
      confirmPassword: true, 
      chapter: true 
    };
    
    setTouched(touchedFields);
    
    // Validate form
    if (!validateForm()) {
      // Auto-focus on first error field
      const firstErrorField = Object.keys(validationErrors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.focus();
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const registerData: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        chapter: parseInt(formData.chapter),
        role: formData.role
      };

      await register(registerData);
      
      // Show success message with email verification instruction
      setSuccessMessage(
        `Account created successfully! Please check your email (${formData.email}) and click the verification link to activate your account.`
      );

      // Store flag to show profile completion notification after redirect
      localStorage.setItem('show_profile_completion', 'true');

      // Redirect after 5 seconds (give time to read the message)
      setTimeout(() => {
        navigate('/dashboard');
      }, 5000);
    } catch (err: any) {
      console.error('Registration error:', err);

      // Use the comprehensive error extraction utility
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter key for better keyboard navigation
    if (e.key === 'Enter' && !isLoading) {
      const currentField = e.currentTarget.name;
      const fieldOrder = ['firstName', 'lastName', 'email', 'chapter', 'password', 'confirmPassword'];
      const currentIndex = fieldOrder.indexOf(currentField);
      
      if (currentIndex < fieldOrder.length - 1) {
        e.preventDefault();
        const nextField = fieldOrder[currentIndex + 1];
        const nextElement = document.getElementById(nextField);
        nextElement?.focus();
      } else if (currentField === 'confirmPassword') {
        // Let the form submit naturally
        e.currentTarget.form?.requestSubmit();
      }
    }
  };

  // Get password strength label and color - memoized for performance
  const strengthInfo = useMemo(() => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-600' };
      case 2:
        return { label: 'Weak', color: 'bg-red-400', textColor: 'text-red-600' };
      case 3:
        return { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
      case 4:
        return { label: 'Good', color: 'bg-[#27AE60]', textColor: 'text-[#27AE60]' };
      case 5:
        return { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600' };
      default:
        return { label: 'Very Weak', color: 'bg-gray-300', textColor: 'text-gray-600' };
    }
  }, [passwordStrength]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-label="Registration form">
        {/* Role Selection removed for Google sign up; email signup defaults to 'user' */}

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

        {/* Chapter loading error */}
        {chapterError && (
          <FormError
            type="warning"
            message="Unable to load chapters. You can still register, but please contact support if you encounter issues."
            size="sm"
            dismissible={true}
            onDismiss={() => setChapterError(false)}
          />
        )}
      </div>


      {/* Social Login Section - Moved to top for better UX */}
      <div className="space-y-4">
        <SocialLoginButtons />
        
        <div className="flex items-center gap-3 my-2">
          <div className="h-px flex-1 bg-gray-200"></div>
          <span className="text-xs sm:text-sm text-gray-500 font-medium">Or register with email</span>
          <div className="h-px flex-1 bg-gray-200"></div>
        </div>
      </div>

      {/* Personal Information Section - Grouped inputs */}
      <div className="space-y-5">
        <div className="hidden sm:block">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h3>
        </div>
        
        {/* Name Row - Single column on mobile, two columns on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            id="firstName"
            name="firstName"
            type="text"
            label="First Name"
            value={formData.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            error={validationErrors.firstName}
            touched={touched.firstName}
            required
            placeholder="First name"
            icon={<User className="h-4 w-4" />}
            autoComplete="given-name"
            disabled={isLoading}
          />

          <FormInput
            id="lastName"
            name="lastName"
            type="text"
            label="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            error={validationErrors.lastName}
            touched={touched.lastName}
            required
            placeholder="Last name"
            icon={<User className="h-4 w-4" />}
            autoComplete="family-name"
            disabled={isLoading}
          />
        </div>

        {/* Email Input */}
        <FormInput
          id="email"
          name="email"
          type="email"
          label="Email Address"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          error={validationErrors.email}
          touched={touched.email}
          required
          placeholder="email@example.com"
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          disabled={isLoading}
        />

        {/* Role Selection - Visual Cards */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-semibold text-gray-900">
            I want to join as
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* User Role Card (base user) */}
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, role: 'user' }));
                setTouched(prev => ({ ...prev, role: true }));
              }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                formData.role === 'user'
                  ? 'border-[#27AE60] bg-gradient-to-br from-[#27AE60]/10 to-[#16A085]/10 shadow-lg scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isLoading}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  formData.role === 'user' 
                    ? 'bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20' 
                    : 'bg-slate-100'
                }`}>
                  <BookOpen className={`h-5 w-5 ${
                    formData.role === 'user' 
                      ? 'text-[#27AE60]' 
                      : 'text-slate-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-slate-700">User</h3>
                    {formData.role === 'user' && (
                      <Check className="h-5 w-5 text-[#27AE60]" />
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* Teacher Role Card */}
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, role: 'teacher' }));
                setTouched(prev => ({ ...prev, role: true }));
              }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                formData.role === 'teacher'
                  ? 'border-[#16A085] bg-gradient-to-br from-[#16A085]/10 to-[#27AE60]/10 shadow-lg scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isLoading}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  formData.role === 'teacher' 
                    ? 'bg-gradient-to-br from-[#16A085]/20 to-[#27AE60]/20' 
                    : 'bg-slate-100'
                }`}>
                  <GraduationCap className={`h-5 w-5 ${
                    formData.role === 'teacher' 
                      ? 'text-[#16A085]' 
                      : 'text-slate-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-slate-700">Teacher</h3>
                    {formData.role === 'teacher' && (
                      <Check className="h-5 w-5 text-[#16A085]" />
                    )}
                  </div>
                </div>
              </div>
            </button>
          </div>
          {validationErrors.role && touched.role && (
            <p className="text-xs text-red-600 mt-1">{validationErrors.role}</p>
          )}
        </div>

        {/* Chapter Selection - Native select optimized for mobile */}
        <div className="space-y-1">
        <label htmlFor="chapter" className="block text-xs sm:text-sm font-semibold text-gray-900">
          Local Chapter
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
            <MapPin className={`h-4 w-4 transition-colors duration-200 ${
              validationErrors.chapter && touched.chapter 
                ? 'text-red-400' 
                : 'text-gray-400 group-focus-within:text-[#27AE60]'
            }`} />
          </div>
          <select
            id="chapter"
            name="chapter"
            autoComplete="country"
            required
            value={formData.chapter}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading && !loadingChapters) {
                e.preventDefault();
                const passwordField = document.getElementById('password');
                passwordField?.focus();
              }
            }}
            disabled={isLoading || loadingChapters}
            className={`
              block w-full pl-10 pr-10 py-2 sm:py-3
              border-2 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-[#27AE60]/20 
              transition-all duration-200 
              bg-gray-50/50 focus:bg-white 
              text-gray-900
              text-sm sm:text-base
              min-h-[44px]
              appearance-none
              ${validationErrors.chapter && touched.chapter 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-200 focus:border-[#27AE60]'}
              ${(isLoading || loadingChapters) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
            `}
            aria-invalid={!!(validationErrors.chapter && touched.chapter)}
            aria-describedby={validationErrors.chapter && touched.chapter ? 'chapter-error' : chapterError ? 'chapter-warning' : undefined}
            aria-required="true"
            aria-label="Select your local chapter"
          >
            <option value="">
              {loadingChapters ? 'Loading chapters...' : 'Select your chapter'}
            </option>
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name} - {chapter.location}
              </option>
            ))}
          </select>
          {/* Custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none" aria-hidden="true">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {validationErrors.chapter && touched.chapter ? (
          <p id="chapter-error" className="text-xs sm:text-sm text-red-600 flex items-center" role="alert" aria-live="polite">
            <span className="mr-1" aria-hidden="true">⚠</span>
            {validationErrors.chapter}
          </p>
        ) : chapterError ? (
          <p id="chapter-warning" className="text-xs sm:text-sm text-amber-600" role="status" aria-live="polite">
            Using fallback chapter list. Some chapters may be unavailable.
          </p>
        ) : null}
        </div>
      </div>

      {/* Security Section - Grouped password inputs */}
      <div className="space-y-3 sm:space-y-4 pt-2 border-t border-gray-100">
        <div className="hidden sm:block">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Security</h3>
        </div>
        
        {/* Password Input with Strength Indicator */}
        <div className="space-y-1">
        <FormInput
          id="password"
          name="password"
          type="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          error={validationErrors.password}
          touched={touched.password}
          required
          placeholder="Create password"
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
                  <div className="flex gap-1" role="progressbar" aria-valuenow={passwordStrength} aria-valuemin={0} aria-valuemax={5} aria-label={`Password strength: ${strengthInfo.label}`}>
                    {[1, 2, 3, 4, 5].map((level) => (
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
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          error={validationErrors.confirmPassword}
          touched={touched.confirmPassword}
          required
          placeholder="Confirm password"
          icon={<Lock className="h-4 w-4" />}
          showPasswordToggle
          autoComplete="new-password"
          disabled={isLoading}
        />
      </div>

      {/* Primary Action Section - Prominent submit button */}
      <div className="pt-3">
        <LoadingButton
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          loadingText="Creating your account..."
          icon={<ArrowRight className="w-4 h-4 ml-2" />}
        >
          Create Account
        </LoadingButton>
      </div>

      {/* Login Link */}
      <div className="text-center pt-4 sm:pt-5 border-t border-gray-200" role="navigation" aria-label="Sign in navigation">
        <p className="text-xs sm:text-sm text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="text-[#27AE60] hover:text-[#16A085] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:ring-offset-2 rounded px-1 py-1"
            aria-label="Sign in to your existing account"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;