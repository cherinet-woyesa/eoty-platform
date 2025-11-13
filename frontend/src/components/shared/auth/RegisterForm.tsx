import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, ArrowRight, Check, X, BookOpen, GraduationCap, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';
import { chaptersApi } from '@/services/api/chapters';
import FormInput from './FormInput';
import FormError from './FormError';
import LoadingButton from './LoadingButton';
import { errorMessages } from '@/utils/errorMessages';

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

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    chapter: '',
    role: 'student',
    // Teacher application fields
    applicationText: '',
    qualifications: '',
    experience: '',
    subjectAreas: ''
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
  useEffect(() => {
    if (isAuthenticated) {
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
        const response = await chaptersApi.getAllChapters();
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
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters long';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      case 'chapter':
        if (!value) return 'Please select your local chapter';
        return '';
      case 'applicationText':
        if (formData.role === 'teacher') {
          if (!value.trim()) return 'Please explain why you want to teach';
          if (value.trim().length < 20) return 'Please provide at least 20 characters';
        }
        return '';
      case 'qualifications':
        if (formData.role === 'teacher') {
          if (!value.trim()) return 'Please provide your qualifications';
          if (value.trim().length < 10) return 'Please provide at least 10 characters';
        }
        return '';
      default:
        return '';
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    Object.keys(formData).forEach(key => {
      if (key !== 'role' && key !== 'experience' && key !== 'subjectAreas') { // Skip role and optional fields
        const error = validateField(key, formData[key as keyof typeof formData]);
        if (error) {
          errors[key] = error;
        }
      }
    });
    
    // Additional validation for teacher role
    if (formData.role === 'teacher') {
      const appError = validateField('applicationText', formData.applicationText);
      if (appError) errors.applicationText = appError;
      
      const qualError = validateField('qualifications', formData.qualifications);
      if (qualError) errors.qualifications = qualError;
    }
    
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
    
    // Mark teacher fields as touched if teacher role
    if (formData.role === 'teacher') {
      touchedFields.applicationText = true;
      touchedFields.qualifications = true;
    }
    
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

      // Add teacher application fields if teacher role is selected
      if (formData.role === 'teacher') {
        registerData.applicationText = formData.applicationText.trim();
        registerData.qualifications = formData.qualifications.trim();
        registerData.experience = formData.experience.trim() || undefined;
        registerData.subjectAreas = formData.subjectAreas.trim() || undefined;
      }

      await register(registerData);
      
      // Show appropriate success message
      if (formData.role === 'teacher') {
        setSuccessMessage('Account created! Your teacher application is pending review. You can use the platform as a student while waiting for approval.');
      } else {
        setSuccessMessage('Account created successfully! Redirecting...');
      }
      
      // Store flag to show profile completion notification after redirect
      localStorage.setItem('show_profile_completion', 'true');
      
      // Redirect after 2 seconds (longer for teacher applications to read message)
      setTimeout(() => {
        navigate('/dashboard');
      }, formData.role === 'teacher' ? 2000 : 1000);
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Map error to user-friendly message
      let errorMessage = errorMessages.DEFAULT || 'Something went wrong. Please try again.';
      
      if (err.response?.status) {
        const statusCode = err.response.status.toString();
        errorMessage = errorMessages[statusCode] || errorMessage;
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        errorMessage = errorMessages.NETWORK_ERROR;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate aria-label="Registration form">
      {/* Messages Section - Prominent positioning at top */}
      <div className="space-y-3">
        {/* Success Message */}
        {successMessage && (
          <FormError
            type="info"
            message={successMessage}
          />
        )}

        {/* Error Message */}
        {error && (
          <FormError
            type="error"
            message={error}
            dismissible
            onDismiss={() => setError(null)}
          />
        )}
      </div>
      
      {/* Personal Information Section - Grouped inputs */}
      <div className="space-y-3 sm:space-y-4">
        <div className="hidden sm:block">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h3>
        </div>
        
        {/* Name Row - Single column on mobile, two columns on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
            {/* Student Role Card */}
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, role: 'student' }));
                setTouched(prev => ({ ...prev, role: true }));
              }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                formData.role === 'student'
                  ? 'border-[#00FFC6] bg-gradient-to-br from-[#00FFC6]/10 to-[#4FC3F7]/10 shadow-lg scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isLoading}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  formData.role === 'student' 
                    ? 'bg-gradient-to-br from-[#00FFC6]/20 to-[#4FC3F7]/20' 
                    : 'bg-slate-100'
                }`}>
                  <BookOpen className={`h-5 w-5 ${
                    formData.role === 'student' 
                      ? 'text-[#00FFC6]' 
                      : 'text-slate-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-slate-700">Student</h3>
                    {formData.role === 'student' && (
                      <Check className="h-5 w-5 text-[#00FFC6]" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    Start learning immediately
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li className="flex items-center">
                      <span className="mr-1">✓</span>
                      Enroll in courses
                    </li>
                    <li className="flex items-center">
                      <span className="mr-1">✓</span>
                      Track progress
                    </li>
                    <li className="flex items-center">
                      <span className="mr-1">✓</span>
                      Join discussions
                    </li>
                  </ul>
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
                  ? 'border-[#4FC3F7] bg-gradient-to-br from-[#4FC3F7]/10 to-[#81D4FA]/10 shadow-lg scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isLoading}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  formData.role === 'teacher' 
                    ? 'bg-gradient-to-br from-[#4FC3F7]/20 to-[#81D4FA]/20' 
                    : 'bg-slate-100'
                }`}>
                  <GraduationCap className={`h-5 w-5 ${
                    formData.role === 'teacher' 
                      ? 'text-[#4FC3F7]' 
                      : 'text-slate-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-slate-700">Teacher</h3>
                    {formData.role === 'teacher' && (
                      <Check className="h-5 w-5 text-[#4FC3F7]" />
                    )}
                  </div>
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium mb-2">
                    <Shield className="h-3 w-3 mr-1" />
                    Approval Required
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    Share your knowledge
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li className="flex items-center">
                      <span className="mr-1">✓</span>
                      Create courses
                    </li>
                    <li className="flex items-center">
                      <span className="mr-1">✓</span>
                      Manage students
                    </li>
                    <li className="flex items-center">
                      <span className="mr-1">✓</span>
                      Access analytics
                    </li>
                  </ul>
                </div>
              </div>
            </button>
          </div>
          {validationErrors.role && touched.role && (
            <p className="text-xs text-red-600 mt-1">{validationErrors.role}</p>
          )}
          {formData.role === 'teacher' && (
            <div className="mt-3 p-3 bg-blue-50/50 border border-blue-200/50 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Teacher accounts require admin approval. 
                You'll be able to use the platform as a student while your application is reviewed.
              </p>
            </div>
          )}
        </div>

        {/* Teacher Application Fields - Shown only when teacher role is selected */}
        {formData.role === 'teacher' && (
          <div className="space-y-3 sm:space-y-4 pt-4 border-t border-gray-100">
            <div className="hidden sm:block">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Teacher Application</h3>
            </div>

            {/* Application Text */}
            <div className="space-y-1">
              <label htmlFor="applicationText" className="block text-xs sm:text-sm font-semibold text-gray-900">
                Why do you want to teach?
                <span className="text-red-500 ml-1" aria-label="required">*</span>
              </label>
              <textarea
                id="applicationText"
                name="applicationText"
                value={formData.applicationText}
                onChange={handleChange}
                onBlur={handleBlur}
                required={formData.role === 'teacher'}
                placeholder="Tell us about your passion for teaching and why you want to share your knowledge..."
                rows={4}
                disabled={isLoading}
                className={`
                  block w-full px-3 py-2 sm:py-3
                  border-2 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/20 
                  transition-all duration-200 
                  bg-gray-50/50 focus:bg-white 
                  text-gray-900
                  text-sm sm:text-base
                  resize-y
                  ${validationErrors.applicationText && touched.applicationText 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-[#4FC3F7]'}
                  ${isLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
                `}
                aria-invalid={!!(validationErrors.applicationText && touched.applicationText)}
                aria-describedby={validationErrors.applicationText && touched.applicationText ? 'applicationText-error' : undefined}
              />
              {validationErrors.applicationText && touched.applicationText && (
                <p id="applicationText-error" className="text-xs sm:text-sm text-red-600" role="alert">
                  {validationErrors.applicationText}
                </p>
              )}
            </div>

            {/* Qualifications */}
            <div className="space-y-1">
              <label htmlFor="qualifications" className="block text-xs sm:text-sm font-semibold text-gray-900">
                Qualifications
                <span className="text-red-500 ml-1" aria-label="required">*</span>
              </label>
              <textarea
                id="qualifications"
                name="qualifications"
                value={formData.qualifications}
                onChange={handleChange}
                onBlur={handleBlur}
                required={formData.role === 'teacher'}
                placeholder="List your educational background, certifications, degrees, etc."
                rows={3}
                disabled={isLoading}
                className={`
                  block w-full px-3 py-2 sm:py-3
                  border-2 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/20 
                  transition-all duration-200 
                  bg-gray-50/50 focus:bg-white 
                  text-gray-900
                  text-sm sm:text-base
                  resize-y
                  ${validationErrors.qualifications && touched.qualifications 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-[#4FC3F7]'}
                  ${isLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
                `}
                aria-invalid={!!(validationErrors.qualifications && touched.qualifications)}
                aria-describedby={validationErrors.qualifications && touched.qualifications ? 'qualifications-error' : undefined}
              />
              {validationErrors.qualifications && touched.qualifications && (
                <p id="qualifications-error" className="text-xs sm:text-sm text-red-600" role="alert">
                  {validationErrors.qualifications}
                </p>
              )}
            </div>

            {/* Experience (Optional) */}
            <div className="space-y-1">
              <label htmlFor="experience" className="block text-xs sm:text-sm font-semibold text-gray-900">
                Teaching Experience <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <textarea
                id="experience"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Describe your teaching experience, if any..."
                rows={3}
                disabled={isLoading}
                className={`
                  block w-full px-3 py-2 sm:py-3
                  border-2 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/20 
                  transition-all duration-200 
                  bg-gray-50/50 focus:bg-white 
                  text-gray-900
                  text-sm sm:text-base
                  resize-y
                  border-gray-200 focus:border-[#00FFFF]
                  ${isLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
                `}
              />
            </div>

            {/* Subject Areas (Optional) */}
            <div className="space-y-1">
              <label htmlFor="subjectAreas" className="block text-xs sm:text-sm font-semibold text-gray-900">
                Subject Areas of Interest <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <input
                id="subjectAreas"
                name="subjectAreas"
                type="text"
                value={formData.subjectAreas}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., Theology, Church History, Scripture Study, etc."
                disabled={isLoading}
                className={`
                  block w-full px-3 py-2 sm:py-3
                  border-2 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/20 
                  transition-all duration-200 
                  bg-gray-50/50 focus:bg-white 
                  text-gray-900
                  text-sm sm:text-base
                  border-gray-200 focus:border-[#00FFFF]
                  ${isLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
                `}
              />
            </div>
          </div>
        )}

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
                : 'text-gray-400 group-focus-within:text-blue-500'
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
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 
              transition-all duration-200 
              bg-gray-50/50 focus:bg-white 
              text-gray-900
              text-sm sm:text-base
              min-h-[44px]
              appearance-none
              ${validationErrors.chapter && touched.chapter 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-200 focus:border-blue-500'}
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

      {/* Alternative Login Section */}
      <div className="space-y-4 pt-2">
        <div className="relative" role="separator" aria-label="Or continue with social login">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-xs sm:text-sm">
            <span className="px-3 bg-white text-gray-500 font-medium">Or continue with</span>
          </div>
        </div>

        <SocialLoginButtons />
      </div>

      {/* Login Link */}
      <div className="text-center pt-4 sm:pt-5 border-t border-gray-200" role="navigation" aria-label="Sign in navigation">
        <p className="text-xs sm:text-sm text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-1"
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