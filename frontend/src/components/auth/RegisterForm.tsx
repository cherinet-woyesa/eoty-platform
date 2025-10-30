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
    role: 'student'
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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate]);

  // Fetch chapters
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
    
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    } else {
      setPasswordStrength(0);
    }
  }, [formData, touched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({ 
      firstName: true, 
      lastName: true, 
      email: true, 
      password: true, 
      confirmPassword: true, 
      chapter: true 
    });
    
    if (!validateForm()) return;

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
      
      setSuccessMessage('Account created successfully! Redirecting...');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      
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

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg flex items-start text-sm">
          <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg flex items-start text-sm">
          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Name Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="firstName" className="block text-xs font-semibold text-gray-900">
            First Name *
          </label>
          <div className="relative">
            <User className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 ${
              validationErrors.firstName && touched.firstName ? 'text-red-400' : 'text-gray-400'
            }`} />
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full pl-7 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
                validationErrors.firstName && touched.firstName 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="First name"
            />
          </div>
          {validationErrors.firstName && touched.firstName && (
            <p className="text-xs text-red-600">{validationErrors.firstName}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="lastName" className="block text-xs font-semibold text-gray-900">
            Last Name *
          </label>
          <div className="relative">
            <User className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 ${
              validationErrors.lastName && touched.lastName ? 'text-red-400' : 'text-gray-400'
            }`} />
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full pl-7 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
                validationErrors.lastName && touched.lastName 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="Last name"
            />
          </div>
          {validationErrors.lastName && touched.lastName && (
            <p className="text-xs text-red-600">{validationErrors.lastName}</p>
          )}
        </div>
      </div>

      {/* Email Input */}
      <div className="space-y-1">
        <label htmlFor="email" className="block text-xs font-semibold text-gray-900">
          Email Address *
        </label>
        <div className="relative">
          <Mail className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 ${
            validationErrors.email && touched.email ? 'text-red-400' : 'text-gray-400'
          }`} />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full pl-7 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
              validationErrors.email && touched.email 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="email@example.com"
          />
        </div>
        {validationErrors.email && touched.email && (
          <p className="text-xs text-red-600">{validationErrors.email}</p>
        )}
      </div>

      {/* Chapter Selection */}
      <div className="space-y-1">
        <label htmlFor="chapter" className="block text-xs font-semibold text-gray-900">
          Local Chapter *
        </label>
        <div className="relative">
          <MapPin className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 ${
            validationErrors.chapter && touched.chapter ? 'text-red-400' : 'text-gray-400'
          }`} />
          <select
            id="chapter"
            name="chapter"
            autoComplete="country"
            required
            value={formData.chapter}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full pl-7 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 appearance-none ${
              validationErrors.chapter && touched.chapter 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          >
            <option value="">Select your chapter</option>
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
        </div>
        {validationErrors.chapter && touched.chapter ? (
          <p className="text-xs text-red-600">{validationErrors.chapter}</p>
        ) : loadingChapters && (
          <p className="text-xs text-gray-500 flex items-center">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Loading chapters...
          </p>
        )}
      </div>

      {/* Password Input */}
      <div className="space-y-1">
        <label htmlFor="password" className="block text-xs font-semibold text-gray-900">
          Password *
        </label>
        <div className="relative">
          <Lock className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 ${
            validationErrors.password && touched.password ? 'text-red-400' : 'text-gray-400'
          }`} />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full pl-7 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
              validationErrors.password && touched.password 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="Create password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>
        {validationErrors.password && touched.password && (
          <p className="text-xs text-red-600">{validationErrors.password}</p>
        )}
      </div>

      {/* Confirm Password Input */}
      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-900">
          Confirm Password *
        </label>
        <div className="relative">
          <Lock className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 ${
            validationErrors.confirmPassword && touched.confirmPassword ? 'text-red-400' : 'text-gray-400'
          }`} />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full pl-7 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
              validationErrors.confirmPassword && touched.confirmPassword 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="Confirm password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>
        {validationErrors.confirmPassword && touched.confirmPassword && (
          <p className="text-xs text-red-600">{validationErrors.confirmPassword}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !isFormValid}
        className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            Creating Account...
          </>
        ) : (
          <>
            Create Account
            <ArrowRight className="w-3 h-3 ml-2" />
          </>
        )}
      </button>

      {/* Social Login */}
      <div className="mt-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            
          </div>
        </div>

        <SocialLoginButtons />
      </div>

      {/* Login Link */}
      <div className="text-center pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;