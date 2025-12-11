import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, ArrowRight, Check, X, BookOpen, GraduationCap, Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';
import { chaptersApi } from '@/services/api/chapters';
import FormInput from './FormInput';
import FormError from './FormError';
import LoadingButton from './LoadingButton';
import { extractErrorMessage } from '@/utils/errorMessages';
import { useGeolocation } from '@/hooks/useGeolocation';
import { brandColors } from '@/theme/brand';

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

const RegisterForm: React.FC = () => {
  const { t } = useTranslation();
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
  const [chapters, setChapters] = useState<{id: number, name: string, location: string, distance?: number | null}[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [chapterError, setChapterError] = useState(false);
  const [useNearby, setUseNearby] = useState(false);
  const distanceKm = 50;
  const { coords, isLoading: isLocating, error: locError, requestLocation, clearError } = useGeolocation({
    timeoutMs: 8000,
    maximumAgeMs: 60000,
    highAccuracy: true
  });
  const [autoSelectedChapter, setAutoSelectedChapter] = useState<{ id: number; name: string; distance?: number | null } | null>(null);
  const [userTouchedChapter, setUserTouchedChapter] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const navigate = useNavigate();
  const { register, verify2FA, isAuthenticated } = useAuth();

  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // Redirect if already authenticated
  // Only redirect if we're on the /register route, not if we're on the landing page
  useEffect(() => {
    // Don't redirect if we are in 2FA mode
    if (isAuthenticated && window.location.pathname === '/register' && !requires2FA) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate, requires2FA]);

  // Fetch chapters with error handling and fallback
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        let response;
        if (useNearby && coords) {
          response = await chaptersApi.getNearby({ lat: coords.lat, lng: coords.lng, radiusKm: distanceKm, limit: 50 });
        } else {
          response = await chaptersApi.getChapters();
        }
        if (response.success) {
          const mapped = (response.data.chapters || []).map((ch: any) => ({
            ...ch,
            distance: ch.distance_km ?? ch.distance ?? ch.distanceKm ?? null
          }));
          setChapters(mapped);
          setChapterError(false);
        } else {
          throw new Error('Failed to fetch chapters');
        }
      } catch (err) {
        console.error('Failed to fetch chapters:', err);
        setChapterError(true);
        // Fallback data
        setChapters([
          { id: 7, name: 'Main Headquarters', location: 'Addis Ababa, Ethiopia' },
          { id: 8, name: 'Addis Ababa Chapter', location: 'Addis Ababa, Ethiopia' },
          { id: 9, name: 'Bahir Dar Chapter', location: 'Bahir Dar, Ethiopia' },
        ]);
        if (useNearby) {
          setUseNearby(false);
          clearError();
        }
      } finally {
        setLoadingChapters(false);
      }
    };

    fetchChapters();
  }, [useNearby, coords, distanceKm]);

  // Auto-select nearest when using nearby and distances are available
  useEffect(() => {
    if (!useNearby || !coords || !chapters.length || userTouchedChapter) return;
    const withDistance = chapters.filter(ch => typeof ch.distance === 'number' && isFinite(ch.distance as number));
    if (!withDistance.length) return;
    const nearest = withDistance.reduce((best, ch) => {
      if (!best) return ch;
      return (ch.distance as number) < (best.distance as number) ? ch : best;
    }, withDistance[0]);
    if (nearest && (!formData.chapter || formData.chapter === autoSelectedChapter?.id.toString())) {
      setFormData((prev) => ({ ...prev, chapter: nearest.id.toString() }));
      setAutoSelectedChapter(nearest);
    }
  }, [useNearby, coords, chapters, formData.chapter, autoSelectedChapter?.id, userTouchedChapter]);

  // Validation
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return t('auth.register.validation.first_name_required');
        if (value.trim().length < 2) return t('auth.register.validation.first_name_min');
        return '';
      case 'lastName':
        if (!value.trim()) return t('auth.register.validation.last_name_required');
        if (value.trim().length < 2) return t('auth.register.validation.last_name_min');
        return '';
      case 'email':
        if (!value.trim()) return t('auth.register.validation.email_required');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('auth.register.validation.email_invalid');
        // Check for common email typos
        if (value.includes('gmail.com') && value.includes('@')) {
          const localPart = value.split('@')[0];
          if (localPart.includes('..') || localPart.startsWith('.') || localPart.endsWith('.')) {
            return t('auth.register.validation.email_invalid');
          }
        }
        return '';
      case 'password':
        if (!value) return t('auth.register.validation.password_required');
        if (value.length < 8) return t('auth.register.validation.password_length');
        if (!/(?=.*[a-z])(?=.*[A-Z])/.test(value)) return t('auth.register.validation.password_case');
        if (!/(?=.*\d)/.test(value)) return t('auth.register.validation.password_number');
        if (!/(?=.*[^A-Za-z0-9])/.test(value)) return t('auth.register.validation.password_special');
        if (/\s/.test(value)) return t('auth.register.validation.password_spaces');
        if (value.toLowerCase().includes('password')) return t('auth.register.validation.password_common');
        return '';
      case 'confirmPassword':
        if (!value) return t('auth.register.validation.confirm_required');
        if (value !== formData.password) return t('auth.register.validation.confirm_mismatch');
        return '';
      case 'chapter':
        if (!value) return t('auth.register.validation.chapter_required');
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

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Handle 2FA submission
    if (requires2FA) {
      if (!twoFactorCode || twoFactorCode.length !== 6) {
        setError(t('auth.register.validation.code_invalid'));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await verify2FA(userId!, twoFactorCode);
        setSuccessMessage(t('auth.register.messages.verified'));
        // Store flag to show profile completion notification after redirect
        localStorage.setItem('show_profile_completion', 'true');
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        console.error('2FA error:', err);
        setError(extractErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
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

      console.log('Submitting registration data:', registerData);
      const response = await register(registerData);
      console.log('Registration response received in component:', response);
      
      // Check for 2FA requirement - handle both direct property and nested data property
      if (response && (response.requires2FA || (response.data && response.data.requires2FA))) {
        console.log('2FA required detected, setting state...');
        setRequires2FA(true);
        setUserId(response.data?.userId || response.userId);
        setSuccessMessage(t('auth.register.messages.verify_code'));
        setIsLoading(false);
        console.log('State set: requires2FA=true');
        return;
      } else {
        console.log('No 2FA flag in response:', response);
      }
      
      console.log('Proceeding to standard success flow');
      // Show success message with email verification instruction
      setSuccessMessage(
        t('auth.register.messages.success_with_email', { email: formData.email })
      );
      setToast({ type: 'success', message: t('auth.register.messages.success_toast') });

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
      setToast({ type: 'error', message: errorMessage });
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
        return { label: t('auth.register.strength.very_weak'), color: 'bg-red-500', textColor: 'text-red-600' };
      case 2:
        return { label: t('auth.register.strength.weak'), color: 'bg-red-400', textColor: 'text-red-600' };
      case 3:
        return { label: t('auth.register.strength.fair'), color: 'bg-yellow-500', textColor: 'text-yellow-600' };
      case 4:
        return { label: t('auth.register.strength.good'), color: 'bg-[color:#1e1b4b]', textColor: 'text-[color:#1e1b4b]' };
      case 5:
        return { label: t('auth.register.strength.strong'), color: 'bg-green-500', textColor: 'text-green-600' };
      default:
        return { label: t('auth.register.strength.very_weak'), color: 'bg-gray-300', textColor: 'text-gray-600' };
    }
  }, [passwordStrength, t]);

  const passwordCriteria = useMemo<PasswordCriteria[]>(() => [
    { label: t('auth.register.criteria.at_least_8'), test: (p) => p.length >= 8 },
    { label: t('auth.register.criteria.uppercase_lowercase'), test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { label: t('auth.register.criteria.number'), test: (p) => /[0-9]/.test(p) },
    { label: t('auth.register.criteria.special_char'), test: (p) => /[^A-Za-z0-9]/.test(p) },
    { label: t('auth.register.criteria.no_spaces'), test: (p) => !/\s/.test(p) },
    { label: t('auth.register.criteria.no_password_word'), test: (p) => !p.toLowerCase().includes('password') },
  ], [t]);

  // Debug log for render
  console.log('RegisterForm render:', { requires2FA, isLoading, userId });

  if (requires2FA) {
    return (
      <div className="relative">
        {toast && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div
              className="pointer-events-auto px-5 py-3 rounded-xl shadow-2xl border text-white text-sm font-semibold"
              style={{
                background: toast.type === 'success'
                  ? `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})`
                  : 'linear-gradient(120deg, #ef4444, #b91c1c)',
                borderColor: toast.type === 'success' ? 'rgba(49,46,129,0.25)' : 'rgba(239,68,68,0.35)'
              }}
            >
              {toast.message}
            </div>
          </div>
        )}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-label="2FA Verification">
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900 text-center">{t('auth.register.twofa_title')}</h3>
          <p className="text-sm text-gray-500 text-center">
            {t('auth.register.twofa_subtitle')}
          </p>
          
          {error && (
            <FormError
              type="error"
              message={error}
              dismissible={true}
              size="md"
              onDismiss={() => setError(null)}
            />
          )}
          
          {successMessage && (
            <FormError
              type="success"
              message={successMessage}
              autoDismiss={true}
              autoDismissDelay={4000}
              size="md"
            />
          )}
        </div>

        <div className="space-y-5">
          <FormInput
            id="twoFactorCode"
            name="twoFactorCode"
            type="text"
            label={t('auth.register.twofa_label')}
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder={t('auth.register.twofa_placeholder')}
            icon={<Lock className="h-4 w-4" />}
            autoComplete="one-time-code"
            disabled={isLoading}
          />
        </div>

        <LoadingButton
          type="submit"
          isLoading={isLoading}
          loadingText={t('auth.register.twofa_verify_loading')}
          className="w-full text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
        >
          {t('auth.register.twofa_verify')}
        </LoadingButton>
        
        <div className="text-center">
          <button 
            type="button" 
            onClick={() => setRequires2FA(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t('auth.register.twofa_back')}
          </button>
        </div>
      </form>
      </div>
    );
  }

  return (
    <div className="relative">
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className="pointer-events-auto px-5 py-3 rounded-xl shadow-2xl border text-white text-sm font-semibold"
            style={{
              background: toast.type === 'success'
                ? `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})`
                : 'linear-gradient(120deg, #ef4444, #b91c1c)',
              borderColor: toast.type === 'success' ? 'rgba(49,46,129,0.25)' : 'rgba(239,68,68,0.35)'
            }}
          >
            {toast.message}
          </div>
        </div>
        
      )}
    <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-label="Registration form">
        {/* Role Selection remove for Google sign up; email signup defaults to 'user' */}

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
            message={t('auth.register.chapter_error')}
            size="sm"
            dismissible={true}
            onDismiss={() => setChapterError(false)}
          />
        )}
        {locError && (
          <FormError
            type="warning"
            message={locError}
            size="sm"
            dismissible={true}
            onDismiss={() => clearError()}
          />
        )}
      </div>


      {/* Social Login Section - Moved to top for better UX */}
     

      {/* Personal Information Section - Grouped inputs */}
      <div className="space-y-5">
        <div className="hidden sm:block">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('auth.register.personal_info_title')}</h3>
        </div>
        
        {/* Name Row - Single column on mobile, two columns on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            id="firstName"
            name="firstName"
            type="text"
            label={t('common.first_name')}
            value={formData.firstName}
              onChange={(e) => {
                handleChange(e);
                setUserTouchedChapter(true);
              }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            error={validationErrors.firstName}
            touched={touched.firstName}
            required
            placeholder={t('auth.register.first_name_placeholder')}
            icon={<User className="h-4 w-4" />}
            autoComplete="given-name"
            disabled={isLoading}
          />

          <FormInput
            id="lastName"
            name="lastName"
            type="text"
            label={t('common.last_name')}
            value={formData.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            error={validationErrors.lastName}
            touched={touched.lastName}
            required
            placeholder={t('auth.register.last_name_placeholder')}
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
          label={t('common.email')}
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          error={validationErrors.email}
          touched={touched.email}
          required
          placeholder={t('auth.register.email_placeholder')}
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          disabled={isLoading}
        />

        {/* Role Selection - Visual Cards */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-semibold text-gray-900">
            {t('auth.register.role_label')}
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
                  ? 'border-indigo-600 bg-indigo-50 shadow-lg scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isLoading}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  formData.role === 'user' 
                    ? 'bg-indigo-100' 
                    : 'bg-slate-100'
                }`}>
                  <BookOpen className={`h-5 w-5 ${
                    formData.role === 'user' 
                      ? 'text-indigo-700' 
                      : 'text-slate-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-slate-700">{t('auth.register.role_member')}</h3>
                    {formData.role === 'user' && (
                      <Check className="h-5 w-5 text-indigo-700" />
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
                  ? 'border-indigo-600 bg-indigo-50 shadow-lg scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isLoading}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  formData.role === 'teacher' 
                    ? 'bg-indigo-100' 
                    : 'bg-slate-100'
                }`}>
                  <GraduationCap className={`h-5 w-5 ${
                    formData.role === 'teacher' 
                      ? 'text-indigo-700' 
                      : 'text-slate-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-slate-700">{t('auth.register.role_teacher')}</h3>
                    {formData.role === 'teacher' && (
                      <Check className="h-5 w-5 text-indigo-700" />
                    )}
                  </div>
                </div>
              </div>
            </button>
          </div>
          {validationErrors.role && touched.role && (
            <p className="text-xs text-red-600 mt-1">{t('auth.register.role_required')}</p>
          )}
        </div>

        {/* Chapter Selection - Native select optimized for mobile */}
        <div className="space-y-1">
        <label htmlFor="chapter" className="block text-xs sm:text-sm font-semibold text-gray-900">
          {t('auth.register.chapter_label')}
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
            <MapPin className={`h-4 w-4 transition-colors duration-200 ${
              validationErrors.chapter && touched.chapter 
                ? 'text-red-400' 
                : 'text-gray-400 group-focus-within:text-indigo-600'
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
              focus:outline-none focus:ring-2 focus:ring-indigo-100 
              transition-all duration-200 
              bg-gray-50/50 focus:bg-white 
              text-gray-900
              text-sm sm:text-base
              min-h-[44px]
              appearance-none
              ${validationErrors.chapter && touched.chapter 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-200 focus:border-indigo-600'}
              ${(isLoading || loadingChapters) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
            `}
            aria-invalid={!!(validationErrors.chapter && touched.chapter)}
            aria-describedby={validationErrors.chapter && touched.chapter ? 'chapter-error' : chapterError ? 'chapter-warning' : undefined}
            aria-required="true"
            aria-label="Select your local chapter"
          >
            <option value="">
              {(loadingChapters || isLocating) ? t('auth.register.chapter_loading') : t('auth.register.chapter_placeholder')}
            </option>
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name} - {chapter.location}{typeof chapter.distance === 'number' && isFinite(chapter.distance) ? ` (${chapter.distance.toFixed(1)} km)` : ''}
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
            {t('auth.register.chapter_fallback')}
          </p>
        ) : null}
        <div className="flex items-center gap-3 pt-2">
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={useNearby}
              onChange={(e) => {
                if (e.target.checked) {
                setUseNearby(true);
                requestLocation();
                } else {
                  setUseNearby(false);
                clearError();
                }
              }}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="inline-flex items-center gap-1">
              <Compass className="h-4 w-4 text-indigo-600" />
              {t('auth.register.use_nearest')}
            </span>
          </label>
        {locError && <p className="text-xs text-amber-700 mt-1">{locError}</p>}
        {autoSelectedChapter && !userTouchedChapter && (
          <p className="text-xs text-green-700 mt-1">
            {t('auth.register.auto_selected', {
              name: autoSelectedChapter.name,
              distance: typeof autoSelectedChapter.distance === 'number' ? ` (~${autoSelectedChapter.distance.toFixed(1)} km)` : ''
            })}
          </p>
        )}
        </div>
        </div>
      </div>
        
      {/* Security Section - Grouped password inputs */}
      <div className="space-y-3 sm:space-y-4 pt-2 border-t border-gray-100">
        <div className="hidden sm:block">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('auth.register.security_title')}</h3>
        </div>
        
        {/* Password Input with Strength Indicator */}
        <div className="space-y-1">
        <FormInput
          id="password"
          name="password"
          type="password"
          label={t('common.password')}
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          error={validationErrors.password}
          touched={touched.password}
          required
          placeholder={t('auth.register.password_placeholder')}
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
                <span className="text-xs text-gray-600" id="password-strength-label">{t('auth.register.password_strength_label')}</span>
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
              <p className="text-xs font-semibold text-gray-700 mb-1.5" id="password-requirements">{t('auth.register.password_requirements')}</p>
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
          label={t('auth.register.confirm_password_placeholder')}
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          error={validationErrors.confirmPassword}
          touched={touched.confirmPassword}
          required
          placeholder={t('auth.register.confirm_password_placeholder')}
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
          loadingText={t('auth.register.register_loading')}
          variant="primary"
          icon={<ArrowRight className="w-4 h-4 ml-2" />}
        >
          {t('auth.register.register_button')}
        </LoadingButton>
      </div>
       <div className="space-y-4">
        <SocialLoginButtons 
          onRequires2FA={(uid) => {
            setRequires2FA(true);
            setUserId(uid);
            setSuccessMessage(t('auth.register.messages.verify_code'));
          }}
        />
        
        <div className="flex items-center gap-3 my-2">
          <div className="h-px flex-1 bg-gray-200"></div>
          <span className="text-xs sm:text-sm text-gray-500 font-medium">{t('auth.register.email_divider')}</span>
          <div className="h-px flex-1 bg-gray-200"></div>
        </div>
      </div>
      {/* Login Link */}
      <div className="text-center pt-4 sm:pt-5 border-t border-gray-200" role="navigation" aria-label="Sign in navigation">
        <p className="text-xs sm:text-sm text-gray-600">
          {t('auth.register.have_account')}{' '}
          <Link 
            to="/login" 
            className="text-indigo-700 hover:text-indigo-900 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 rounded px-1 py-1"
            aria-label="Sign in to your existing account"
          >
            {t('auth.register.login_link')}
          </Link>
        </p>
      </div>
    </form>
  </div>
  );
};

export default RegisterForm;