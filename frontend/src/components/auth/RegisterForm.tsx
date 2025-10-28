import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, MapPin, AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';
import { chaptersApi } from '../../services/api/chapters';

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    chapter: '',
    role: 'student' // Default to student for public registration
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [chapters, setChapters] = useState<{id: number, name: string, location: string}[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  
  // Refs for focus management
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const chapterRef = useRef<HTMLSelectElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Small delay to ensure state is fully updated
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate]);

  // Fetch chapters from backend
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await chaptersApi.getAllChapters();
        if (response.success) {
          setChapters(response.data.chapters);
        } else {
          throw new Error('Failed to fetch chapters');
        }
      } catch (err) {
        console.error('Failed to fetch chapters:', err);
        // Fallback to static chapters
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

  // Password strength calculation
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  // Enhanced validation with better error messages
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) {
          return 'First name is required';
        }
        if (value.trim().length < 2) {
          return 'First name must be at least 2 characters';
        }
        if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) {
          return 'First name can only contain letters, spaces, hyphens, and apostrophes';
        }
        return '';
      case 'lastName':
        if (!value.trim()) {
          return 'Last name is required';
        }
        if (value.trim().length < 2) {
          return 'Last name must be at least 2 characters';
        }
        if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) {
          return 'Last name can only contain letters, spaces, hyphens, and apostrophes';
        }
        return '';
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
        if (value.length < 8) {
          return 'For better security, use at least 8 characters';
        }
        return '';
      case 'confirmPassword':
        if (!value) {
          return 'Please confirm your password';
        }
        if (value !== formData.password) {
          return 'Passwords do not match';
        }
        return '';
      case 'chapter':
        if (!value) {
          return 'Please select your local chapter';
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

  // Real-time validation and password strength
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      validateForm();
    }
    
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    } else {
      setPasswordStrength(0);
    }
  }, [formData, touched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ 
      firstName: true, 
      lastName: true, 
      email: true, 
      password: true, 
      confirmPassword: true, 
      chapter: true 
    });
    
    if (!validateForm()) {
      // Focus on first error field
      const firstErrorField = Object.keys(validationErrors)[0];
      const fieldRefs = {
        firstName: firstNameRef,
        lastName: lastNameRef,
        email: emailRef,
        password: passwordRef,
        confirmPassword: confirmPasswordRef,
        chapter: chapterRef
      };
      
      const fieldRef = fieldRefs[firstErrorField as keyof typeof fieldRefs];
      if (fieldRef?.current) {
        fieldRef.current.focus();
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        chapter: parseInt(formData.chapter),
        role: formData.role
      });
      
      setSuccessMessage('Account created successfully! Welcome to our community. Redirecting...');
      
      // Small delay to show success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Enhanced error messages that are actionable and non-technical
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (err.response?.status === 409) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Please check your information and try again.';
      } else if (err.response?.status === 422) {
        errorMessage = 'Please make sure all fields are filled correctly.';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      const form = e.currentTarget.closest('form');
      const inputs = form?.querySelectorAll('input, select') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
      const currentIndex = Array.from(inputs).indexOf(e.target as HTMLInputElement | HTMLSelectElement);
      
      if (currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus();
      } else if (submitRef.current) {
        submitRef.current.click();
      }
    }
  };

  const getPasswordStrengthText = (strength: number): string => {
    if (strength <= 2) return 'Weak';
    if (strength <= 4) return 'Fair';
    if (strength <= 5) return 'Good';
    return 'Strong';
  };

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 4) return 'bg-yellow-500';
    if (strength <= 5) return 'bg-blue-500';
    return 'bg-green-500';
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
            <p className="font-medium">Registration Failed</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}
      
      {/* Name Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label 
            htmlFor="firstName" 
            className="block text-sm font-semibold text-gray-900"
          >
            First Name
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className={`h-4 w-4 transition-colors duration-200 ${
                validationErrors.firstName && touched.firstName 
                  ? 'text-red-400' 
                  : formData.firstName && !validationErrors.firstName 
                  ? 'text-green-500' 
                  : 'text-gray-400 group-focus-within:text-blue-500'
              }`} />
            </div>
            <input
              ref={firstNameRef}
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`block w-full pl-10 pr-4 py-3 border-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 ${
                validationErrors.firstName && touched.firstName 
                  ? 'border-red-300 focus:border-red-500' 
                  : formData.firstName && !validationErrors.firstName 
                  ? 'border-green-300 focus:border-green-500' 
                  : 'border-gray-200 focus:border-blue-500'
              }`}
              placeholder="Enter your first name"
              aria-invalid={!!(validationErrors.firstName && touched.firstName)}
              aria-describedby={validationErrors.firstName && touched.firstName ? "firstName-error" : "firstName-help"}
            />
            {formData.firstName && !validationErrors.firstName && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            )}
          </div>
          {validationErrors.firstName && touched.firstName ? (
            <p id="firstName-error" className="text-xs text-red-600 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {validationErrors.firstName}
            </p>
          ) : (
            <p id="firstName-help" className="text-xs text-gray-500">
              Your given name
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label 
            htmlFor="lastName" 
            className="block text-sm font-semibold text-gray-900"
          >
            Last Name
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className={`h-4 w-4 transition-colors duration-200 ${
                validationErrors.lastName && touched.lastName 
                  ? 'text-red-400' 
                  : formData.lastName && !validationErrors.lastName 
                  ? 'text-green-500' 
                  : 'text-gray-400 group-focus-within:text-blue-500'
              }`} />
            </div>
            <input
              ref={lastNameRef}
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`block w-full pl-10 pr-4 py-3 border-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 ${
                validationErrors.lastName && touched.lastName 
                  ? 'border-red-300 focus:border-red-500' 
                  : formData.lastName && !validationErrors.lastName 
                  ? 'border-green-300 focus:border-green-500' 
                  : 'border-gray-200 focus:border-blue-500'
              }`}
              placeholder="Enter your last name"
              aria-invalid={!!(validationErrors.lastName && touched.lastName)}
              aria-describedby={validationErrors.lastName && touched.lastName ? "lastName-error" : "lastName-help"}
            />
            {formData.lastName && !validationErrors.lastName && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            )}
          </div>
          {validationErrors.lastName && touched.lastName ? (
            <p id="lastName-error" className="text-xs text-red-600 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {validationErrors.lastName}
            </p>
          ) : (
            <p id="lastName-help" className="text-xs text-gray-500">
              Your family name
            </p>
          )}
        </div>
      </div>

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
            We'll use this to send you important updates
          </p>
        )}
      </div>

      {/* Chapter Selection */}
      <div className="space-y-2">
        <label 
          htmlFor="chapter" 
          className="block text-sm font-semibold text-gray-900"
        >
          Local Chapter
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MapPin className={`h-5 w-5 transition-colors duration-200 ${
              validationErrors.chapter && touched.chapter 
                ? 'text-red-400' 
                : formData.chapter && !validationErrors.chapter 
                ? 'text-green-500' 
                : 'text-gray-400 group-focus-within:text-blue-500'
            }`} />
          </div>
          <select
            ref={chapterRef}
            id="chapter"
            name="chapter"
            autoComplete="country"
            required
            value={formData.chapter}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`block w-full pl-12 pr-12 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 appearance-none ${
              validationErrors.chapter && touched.chapter 
                ? 'border-red-300 focus:border-red-500' 
                : formData.chapter && !validationErrors.chapter 
                ? 'border-green-300 focus:border-green-500' 
                : 'border-gray-200 focus:border-blue-500'
            }`}
            aria-invalid={!!(validationErrors.chapter && touched.chapter)}
            aria-describedby={validationErrors.chapter && touched.chapter ? "chapter-error" : "chapter-help"}
          >
            <option value="">Select your local chapter</option>
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name} ({chapter.location})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {formData.chapter && !validationErrors.chapter && (
            <div className="absolute inset-y-0 right-0 pr-8 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>
        {validationErrors.chapter && touched.chapter ? (
          <p id="chapter-error" className="text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {validationErrors.chapter}
          </p>
        ) : loadingChapters ? (
          <p id="chapter-help" className="text-xs text-gray-500 flex items-center">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Loading chapters...
          </p>
        ) : (
          <p id="chapter-help" className="text-xs text-gray-500">
            Choose the chapter closest to your location
          </p>
        )}
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <label 
          htmlFor="password" 
          className="block text-sm font-semibold text-gray-900"
        >
          Password
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock className={`h-5 w-5 transition-colors duration-200 ${
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
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`block w-full pl-12 pr-14 py-4 border-2 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 ${
              validationErrors.password && touched.password 
                ? 'border-red-300 focus:border-red-500' 
                : formData.password && !validationErrors.password 
                ? 'border-green-300 focus:border-green-500' 
                : 'border-gray-200 focus:border-blue-500'
            }`}
            placeholder="Create a secure password"
            aria-invalid={!!(validationErrors.password && touched.password)}
            aria-describedby={validationErrors.password && touched.password ? "password-error" : "password-help"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={0}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
            )}
          </button>
        </div>
        
        {/* Password Strength Indicator */}
        {formData.password && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                  style={{ width: `${(passwordStrength / 6) * 100}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${
                passwordStrength <= 2 ? 'text-red-600' :
                passwordStrength <= 4 ? 'text-yellow-600' :
                passwordStrength <= 5 ? 'text-blue-600' : 'text-green-600'
              }`}>
                {getPasswordStrengthText(passwordStrength)}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {passwordStrength < 4 && 'Include uppercase, lowercase, numbers, and symbols for better security'}
            </div>
          </div>
        )}
        
        {validationErrors.password && touched.password ? (
          <p id="password-error" className="text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {validationErrors.password}
          </p>
        ) : (
          <p id="password-help" className="text-xs text-gray-500">
            Minimum 8 characters recommended for better security
          </p>
        )}
      </div>

      {/* Confirm Password Input */}
      <div className="space-y-2">
        <label 
          htmlFor="confirmPassword" 
          className="block text-sm font-semibold text-gray-900"
        >
          Confirm Password
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock className={`h-5 w-5 transition-colors duration-200 ${
              validationErrors.confirmPassword && touched.confirmPassword 
                ? 'text-red-400' 
                : formData.confirmPassword && !validationErrors.confirmPassword 
                ? 'text-green-500' 
                : 'text-gray-400 group-focus-within:text-blue-500'
            }`} />
          </div>
          <input
            ref={confirmPasswordRef}
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`block w-full pl-12 pr-14 py-4 border-2 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 ${
              validationErrors.confirmPassword && touched.confirmPassword 
                ? 'border-red-300 focus:border-red-500' 
                : formData.confirmPassword && !validationErrors.confirmPassword 
                ? 'border-green-300 focus:border-green-500' 
                : 'border-gray-200 focus:border-blue-500'
            }`}
            placeholder="Confirm your password"
            aria-invalid={!!(validationErrors.confirmPassword && touched.confirmPassword)}
            aria-describedby={validationErrors.confirmPassword && touched.confirmPassword ? "confirmPassword-error" : "confirmPassword-help"}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            tabIndex={0}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
            )}
          </button>
        </div>
        {validationErrors.confirmPassword && touched.confirmPassword ? (
          <p id="confirmPassword-error" className="text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {validationErrors.confirmPassword}
          </p>
        ) : (
          <p id="confirmPassword-help" className="text-xs text-gray-500">
            Re-enter your password to confirm
          </p>
        )}
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
            Creating your account...
          </>
        ) : (
          <>
            Create your account
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </button>
      <p id="submit-help" className="text-xs text-gray-500 text-center">
        {isLoading ? 'Please wait while we create your account...' : 'Join our spiritual learning community'}
      </p>

      {/* Social Login */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <SocialLoginButtons />
      </div>

      {/* Login Link */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
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