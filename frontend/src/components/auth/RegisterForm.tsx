import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, MapPin, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';

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
  const [chapters, setChapters] = useState<{id: string, name: string}[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

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
        // For now, we'll use static chapters but in a real implementation,
        // this would fetch from an API endpoint
        const staticChapters = [
          { id: 'addis-ababa', name: 'Addis Ababa' },
          { id: 'toronto', name: 'Toronto' },
          { id: 'washington', name: 'Washington DC' },
          { id: 'london', name: 'London' },
        ];
        setChapters(staticChapters);
      } catch (err) {
        console.error('Failed to fetch chapters:', err);
        // Fallback to static chapters
        setChapters([
          { id: 'addis-ababa', name: 'Addis Ababa' },
          { id: 'toronto', name: 'Toronto' },
          { id: 'washington', name: 'Washington DC' },
          { id: 'london', name: 'London' },
        ]);
      } finally {
        setLoadingChapters(false);
      }
    };

    fetchChapters();
  }, []);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email address is invalid';
    }
    
    if (!formData.chapter) {
      errors.chapter = 'Please select a chapter';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Use the register function from AuthContext
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        chapter: formData.chapter,
        role: formData.role
      });
      
      // The redirect will happen through the useEffect above when isAuthenticated becomes true
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.response?.status === 409) {
        setError('An account with this email already exists. Please try logging in.');
      } else {
        setError(err.message || 'An error occurred during registration. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[e.target.name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[e.target.name];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Name Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
            First Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={handleChange}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white ${
                validationErrors.firstName ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="First name"
              aria-invalid={!!validationErrors.firstName}
              aria-describedby={validationErrors.firstName ? "firstName-error" : undefined}
            />
          </div>
          {validationErrors.firstName && (
            <p id="firstName-error" className="mt-1 text-sm text-red-600">
              {validationErrors.firstName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
            Last Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={handleChange}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white ${
                validationErrors.lastName ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Last name"
              aria-invalid={!!validationErrors.lastName}
              aria-describedby={validationErrors.lastName ? "lastName-error" : undefined}
            />
          </div>
          {validationErrors.lastName && (
            <p id="lastName-error" className="mt-1 text-sm text-red-600">
              {validationErrors.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`block w-full pl-10 pr-3 py-3 border rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white ${
              validationErrors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your email"
            aria-invalid={!!validationErrors.email}
            aria-describedby={validationErrors.email ? "email-error" : undefined}
          />
        </div>
        {validationErrors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600">
            {validationErrors.email}
          </p>
        )}
      </div>

      {/* Chapter Selection */}
      <div>
        <label htmlFor="chapter" className="block text-sm font-medium text-gray-700 mb-2">
          Local Chapter
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <select
            id="chapter"
            name="chapter"
            required
            value={formData.chapter}
            onChange={handleChange}
            className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white appearance-none ${
              validationErrors.chapter ? 'border-red-300' : 'border-gray-300'
            }`}
            aria-invalid={!!validationErrors.chapter}
            aria-describedby={validationErrors.chapter ? "chapter-error" : undefined}
          >
            <option value="">Select your chapter</option>
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {validationErrors.chapter && (
          <p id="chapter-error" className="mt-1 text-sm text-red-600">
            {validationErrors.chapter}
          </p>
        )}
        {loadingChapters && (
          <p className="mt-1 text-sm text-gray-500">Loading chapters...</p>
        )}
      </div>

      {/* Role Selection - Only show student option for public registration */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
          Role
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-gray-400" />
          </div>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white appearance-none"
            disabled
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher (Admin Assignment Only)</option>
            <option value="chapter_admin">Chapter Admin (Admin Assignment Only)</option>
            <option value="platform_admin">Platform Admin (Admin Assignment Only)</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Teachers and administrators must be assigned by existing admins.
        </p>
      </div>

      {/* Password Input */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={formData.password}
            onChange={handleChange}
            className={`block w-full pl-10 pr-12 py-3 border rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white ${
              validationErrors.password ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Create a password"
            aria-invalid={!!validationErrors.password}
            aria-describedby={validationErrors.password ? "password-error" : undefined}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
        {validationErrors.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600">
            {validationErrors.password}
          </p>
        )}
      </div>

      {/* Confirm Password Input */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`block w-full pl-10 pr-12 py-3 border rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white ${
              validationErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Confirm your password"
            aria-invalid={!!validationErrors.confirmPassword}
            aria-describedby={validationErrors.confirmPassword ? "confirmPassword-error" : undefined}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
        {validationErrors.confirmPassword && (
          <p id="confirmPassword-error" className="mt-1 text-sm text-red-600">
            {validationErrors.confirmPassword}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
            Creating account...
          </div>
        ) : (
          'Create your account'
        )}
      </button>

      {/* Social Login Buttons */}
      <SocialLoginButtons />

      {/* Sign in link */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
            Sign in here
          </Link>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;